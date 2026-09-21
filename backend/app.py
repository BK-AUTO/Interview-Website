import os
import re
import secrets
import uuid
import json
import queue
import random
import threading
import csv
import io
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, request, redirect, send_from_directory, Response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, event
from sqlalchemy.engine import Engine
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt, decode_token
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)

class ReverseProxyFix:
    """WSGI middleware to extract the real visitor IP behind Cloudflare and Nginx Proxy Manager.
    Sets environ['REMOTE_ADDR'] so that Werkzeug access logging and request.remote_addr
    accurately reflect the client's public IP instead of the internal Docker/proxy IP.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        # 1. Cloudflare sends real client IP in CF-Connecting-IP
        cf_ip = environ.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            environ['REMOTE_ADDR'] = cf_ip.strip()
        # 2. Nginx Proxy Manager / standard reverse proxy sends X-Real-IP
        elif environ.get('HTTP_X_REAL_IP'):
            environ['REMOTE_ADDR'] = environ['HTTP_X_REAL_IP'].strip()
        # 3. X-Forwarded-For (the leftmost IP is the original client)
        elif environ.get('HTTP_X_FORWARDED_FOR'):
            client_ip = environ['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
            if client_ip:
                environ['REMOTE_ADDR'] = client_ip

        # Preserve https protocol when terminated at reverse proxy
        proto = environ.get('HTTP_X_FORWARDED_PROTO')
        if proto:
            environ['wsgi.url_scheme'] = proto.strip()

        # Preserve original host
        host = environ.get('HTTP_X_FORWARDED_HOST')
        if host:
            environ['HTTP_HOST'] = host.strip()

        return self.wsgi_app(environ, start_response)

app.wsgi_app = ReverseProxyFix(app.wsgi_app)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
raw_db_uri = os.environ.get('DATABASE_URL') or os.environ.get('DATABASE_URI') or 'sqlite:///new.db'
if raw_db_uri.startswith('postgres://'):
    raw_db_uri = raw_db_uri.replace('postgres://', 'postgresql://', 1)
elif raw_db_uri.startswith('sqlite:///instance/'):
    raw_db_uri = raw_db_uri.replace('sqlite:///instance/', 'sqlite:///', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = raw_db_uri
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {'check_same_thread': False}
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')  # override in production
# Flask-JWT-Extended defaults to a 15-minute access token with no refresh-token
# flow in this app. Admins keep the interview tracker dashboard (and its SSE
# connection) open for an entire interview day, so a token that short forces
# an unexpected logout — and silently kills the SSE stream, since a browser's
# EventSource does not retry after a fatal 401 (only after network-level
# drops). 12h comfortably covers a working day; revisit if a real
# refresh-token flow is added later.
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=12)

# Public application submissions (/api/apply) carry candidate PII, so they get
# a narrower CORS allowlist than the rest of /api/* (used internally by the
# admin frontend and by trusted devices like the ESP32 checkin kiosk).
WEBSITE_ORIGINS = [o.strip() for o in os.environ.get(
    'WEBSITE_ORIGINS', 'https://bkauto.vn,http://localhost:5200,http://localhost:5173'
).split(',') if o.strip()]

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'cv')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_CV_EXTENSIONS = {'pdf'}
MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5MB, matches the limit enforced in RecruitmentForm.vue

db = SQLAlchemy(app)

APPLICATION_TRACKS = ('engineering', 'media')
TRACK_MAIN_DEPARTMENTS = {
    'engineering': {'ai', 'electrical', 'simulation', 'experiment'},
    'media': {'communication'},
}
SUB_DEPARTMENTS = {'communication', 'english', 'manufacturing', 'event'}
DEPARTMENT_LABELS = {
    'ai': 'AI for Automobile', 'electrical': 'Điện - Điện tử',
    'simulation': 'Mô phỏng', 'experiment': 'Thí nghiệm',
    'communication': 'Truyền thông', 'english': 'Tiếng Anh',
    'manufacturing': 'Cơ khí', 'event': 'Sự kiện',
}
TRACK_LABELS = {
    'engineering': 'Kỹ thuật',
    'media': 'Truyền thông',
}

# Main state pipeline levels for sequential gating
MAIN_STATE_LEVELS = {
    'Chờ duyệt': 0,
    'Trượt vòng đơn': 0,
    'Đậu vòng đơn': 1,
    'Xin đổi lịch': 1,
    'Đã xác nhận': 2,
    'Đã checkin': 3,
    'Gọi PV': 4,
    'Đang phỏng vấn': 5,
    'Đã phỏng vấn': 6,
}
SUB_SCREENING_STATES = {'Chờ duyệt', 'Đậu vòng đơn', 'Trượt vòng đơn'}
SUB_INTERVIEW_STATES = {'Gọi PV', 'Đang phỏng vấn', 'Đã phỏng vấn', 'Đạt', 'Không đạt'}


# --- High-Performance SQLite PRAGMAs (WAL Mode, Cache, Temp in RAM) ---
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if 'sqlite' in str(app.config.get('SQLALCHEMY_DATABASE_URI', '')):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA busy_timeout = 10000;")
        cursor.execute("PRAGMA cache_size = -64000;")
        cursor.execute("PRAGMA temp_store = MEMORY;")
        cursor.execute("PRAGMA mmap_size = 268435456;")
        cursor.close()

# --- Lightweight Thread-safe SSE Broadcaster ---
# Single-process, in-memory pub/sub: every listener queue lives in this
# worker's heap. This is why the backend MUST keep running as a single
# gunicorn worker (see Dockerfile) — spreading listeners across multiple
# worker processes would mean events announced in one process silently never
# reach clients connected to another. If this ever needs to scale beyond one
# process/instance, this broadcaster has to move to a shared bus (e.g. Redis
# pub/sub) instead of an in-memory list.
SSE_QUEUE_MAXSIZE = 300

class MessageAnnouncer:
    """Thread-safe Server-Sent Events broadcaster.

    Slow consumers never get silently abandoned: once a listener's queue is
    full we drop its oldest queued message to make room for the newest one,
    rather than dropping the listener itself. Every event we announce carries
    a full member snapshot (not a diff), so losing a stale intermediate event
    is harmless as long as the connection keeps receiving newer ones — and
    the connection self-heals instead of freezing silently. Actual listener
    cleanup only happens when the client itself disconnects (GeneratorExit).
    """
    def __init__(self):
        self.listeners = []
        self.lock = threading.Lock()

    def listen(self):
        q = queue.Queue(maxsize=SSE_QUEUE_MAXSIZE)
        with self.lock:
            self.listeners.append(q)
            count = len(self.listeners)
        logging.info(f"SSE client connected ({count} active)")
        return q

    def announce(self, event_name: str, data: dict):
        formatted_data = json.dumps(data, ensure_ascii=False)
        msg = f"event: {event_name}\ndata: {formatted_data}\n\n"
        with self.lock:
            for q in self.listeners:
                try:
                    q.put_nowait(msg)
                except queue.Full:
                    # Slow consumer: evict the oldest queued message instead
                    # of dropping the client, so it stays connected and
                    # simply catches up on the latest state.
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        pass
                    try:
                        q.put_nowait(msg)
                    except queue.Full:
                        pass

    def remove_listener(self, q):
        with self.lock:
            if q in self.listeners:
                self.listeners.remove(q)
            count = len(self.listeners)
        logging.info(f"SSE client disconnected ({count} active)")

announcer = MessageAnnouncer()

# Enable CORS with more specific settings. More specific resource patterns
# take precedence over the catch-all, so /api/apply gets its own allowlist.
CORS(app, resources={
    r"/api/apply": {"origins": WEBSITE_ORIGINS},
    r"/api/*": {"origins": "*"},
}, supports_credentials=True)
jwt = JWTManager(app)

# Authentik SSO (OIDC). Access to this app is controlled by policy bindings
# on the Authentik side, not by role checks here — anyone who completes login
# successfully gets full access.
AUTHENTIK_ISSUER = os.environ.get('AUTHENTIK_ISSUER', '')
AUTHENTIK_CLIENT_ID = os.environ.get('AUTHENTIK_CLIENT_ID', '')
AUTHENTIK_CLIENT_SECRET = os.environ.get('AUTHENTIK_CLIENT_SECRET', '')
AUTHENTIK_REDIRECT_URI = os.environ.get('AUTHENTIK_REDIRECT_URI', 'http://localhost:5000/api/auth/callback')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# Shown on the public /confirm/<token> page. Free text, set per recruitment
# round — deliberately not an admin-editable setting (out of scope for now).
INTERVIEW_SESSION_INFO = os.environ.get('INTERVIEW_SESSION_INFO', '')

oauth = OAuth(app)
if AUTHENTIK_ISSUER:
    oauth.register(
        name='authentik',
        client_id=AUTHENTIK_CLIENT_ID,
        client_secret=AUTHENTIK_CLIENT_SECRET,
        server_metadata_url=f'{AUTHENTIK_ISSUER}/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'},
    )

# Configure production-optimized logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Helper function to get GMT+7 time
def get_gmt7_time():
    """Get current time in GMT+7 timezone"""
    gmt7 = timezone(timedelta(hours=7))
    return datetime.now(gmt7)

def format_gmt7_time(dt=None):
    """Format GMT+7 time as string"""
    if dt is None:
        dt = get_gmt7_time()
    return dt.strftime('%H:%M:%S %d/%m/%Y')

# Candidate pipeline (Member.state):
#   Chờ duyệt -> Đậu vòng đơn -> [candidate confirms via /confirm/<token>] -> Đã xác nhận
#                             -> [candidate asks to reschedule]           -> Xin đổi lịch (admin handles manually)
#              \> Trượt vòng đơn (terminal)
#   Đã xác nhận -> Đã checkin -> Gọi PV -> Đang phỏng vấn -> Đã phỏng vấn
# Only candidates in CHECKIN_ELIGIBLE_STATES may check in for interview day —
# i.e. screening alone is not enough, they must have confirmed attendance.
CHECKIN_ELIGIBLE_STATES = ('Đã xác nhận', 'Đã checkin')

CONFIRM_PASSWORD_LENGTH = 6

def generate_confirm_password():
    return ''.join(secrets.choice('0123456789') for _ in range(CONFIRM_PASSWORD_LENGTH))

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    MSSV = db.Column(db.String(100), nullable=False, unique=True)  # Increased size for MSSV / external key
    email = db.Column(db.String(100), index=True)
    phone = db.Column(db.String(20))
    specialist = db.Column(db.String(100), index=True)
    major_class = db.Column(db.String(200))
    student_type = db.Column(db.String(20))  # 'hust' / 'external'
    sub_departments = db.Column(db.String(300))  # JSON array string, e.g. '["electrical","simulation"]'
    sub_department_states = db.Column(db.String(500), nullable=True, default='{}')  # JSON dict e.g. '{"communication": "Đã phỏng vấn"}'
    linkCV = db.Column(db.String(500))  # Increased size for long URLs
    checkin_time = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True, default='Chưa checkin', index=True)
    note = db.Column(db.String(500), nullable=True)  # New field for notes
    school = db.Column(db.String(200), nullable=True)
    application_track = db.Column(db.String(20), default='engineering')
    is_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)
    # Interview participation confirmation portal (/confirm/<token>).
    confirm_token = db.Column(db.String(64), unique=True, nullable=True)
    confirm_password = db.Column(db.String(20), nullable=True)
    confirm_password_hash = db.Column(db.String(200), nullable=True)
    reschedule_request = db.Column(db.String(500), nullable=True)
    confirmed_at = db.Column(db.String(100), nullable=True)

def member_to_dict(member):
    return {
        'id': member.id,
        'MSSV': member.MSSV,
        'name': member.name,
        'email': member.email,
        'phone': member.phone,
        'specialist': member.specialist,
        'major_class': member.major_class,
        'student_type': member.student_type,
        'school': member.school,
        'application_track': member.application_track or 'engineering',
        'sub_departments': member.sub_departments,
        'sub_department_states': member.sub_department_states or '{}',
        'linkCV': member.linkCV,
        'checkin_time': member.checkin_time,
        'state': member.state,
        'note': member.note,
        # Safe to expose: every endpoint that serializes a Member this way is
        # @jwt_required() (admin-only).
        'confirm_token': member.confirm_token,
        'confirm_password': member.confirm_password,
        'confirm_url': f"{FRONTEND_URL}/confirm/{member.confirm_token}" if member.confirm_token else None,
        'reschedule_request': member.reschedule_request,
        'confirmed_at': member.confirmed_at,
        'is_deleted': bool(member.is_deleted)
    }

class AuditLog(db.Model):
    # Audit trail is intentionally append-only and must outlive the Member it
    # is about: ondelete='SET NULL' (not CASCADE) means deleting a candidate
    # NEVER deletes their history, it only detaches the FK. member_*_snapshot
    # is a denormalized copy of the candidate's identity taken at the moment
    # each log line is written, so the row stays human-readable forever even
    # after member_id goes NULL — a bare orphaned id would otherwise be
    # useless for anyone auditing who a deleted candidate was.
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id', ondelete='SET NULL'), nullable=True, index=True)
    member_name_snapshot = db.Column(db.String(100), nullable=True)
    member_mssv_snapshot = db.Column(db.String(200), nullable=True)
    actor_username = db.Column(db.String(100), nullable=True) # e.g. duc.na238345
    actor_name = db.Column(db.String(100), nullable=True)     # e.g. Nguyễn Anh Đức
    actor_email = db.Column(db.String(100), nullable=True)    # e.g. duc.na238345@sis.hust.edu.vn
    actor_type = db.Column(db.String(50), default='admin')    # 'admin', 'candidate', 'system'
    action = db.Column(db.String(100), nullable=False)        # e.g. 'Duyệt đậu vòng đơn', 'Đổi lịch phỏng vấn', 'Check-in'
    details = db.Column(db.Text, nullable=True)               # e.g. 'Chuyển từ Chờ duyệt sang Đậu vòng đơn'
    created_at = db.Column(db.String(100), nullable=False)   # formatted GMT+7 time

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'member_name_snapshot': self.member_name_snapshot,
            'member_mssv_snapshot': self.member_mssv_snapshot,
            'actor_username': self.actor_username,
            'actor_name': self.actor_name,
            'actor_email': self.actor_email,
            'actor_type': self.actor_type,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at
        }

def get_current_actor():
    try:
        claims = get_jwt()
        if not claims:
            return {'username': 'Admin', 'name': 'Ban Quản Trị', 'email': ''}
        username = claims.get('username') or claims.get('name') or claims.get('email') or 'Admin'
        display_name = claims.get('display_name') or claims.get('name') or username
        email = claims.get('email') or ''
        return {
            'username': username,
            'name': display_name,
            'email': email
        }
    except Exception:
        return {'username': 'Admin', 'name': 'Ban Quản Trị', 'email': ''}

def record_audit_log(member_id, action, details=None, actor=None, actor_type='admin',
                      member_name=None, member_mssv=None):
    """Always call this with the subject candidate's current name/MSSV in
    member_name/member_mssv when a Member row is in scope — it is snapshotted
    onto the log row so the entry stays attributable even after the member
    is edited (name/MSSV changed) or deleted (member_id set to NULL, see
    AuditLog.member_id ondelete='SET NULL'). This function must never let a
    logging failure abort the caller's already-committed change to Member —
    hence the broad except that only logs, never re-raises."""
    try:
        if actor is None and actor_type == 'admin':
            actor = get_current_actor()
        elif actor is None:
            actor = {'username': 'Ứng viên', 'name': 'Ứng viên', 'email': ''}

        log = AuditLog(
            member_id=member_id,
            member_name_snapshot=member_name,
            member_mssv_snapshot=member_mssv,
            actor_username=actor.get('username'),
            actor_name=actor.get('name'),
            actor_email=actor.get('email'),
            actor_type=actor_type,
            action=action,
            details=details,
            created_at=format_gmt7_time()
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error recording audit log: {e}")

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    MSSV = db.Column(db.String(20), db.ForeignKey('member.MSSV'), nullable=False)
    member = db.relationship('Member', backref=db.backref('user', lazy=True))

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'interview-backend'}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    MSSV = data.get('MSSV')

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(username=username, password=hashed_password, MSSV=MSSV)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity={'username': user.username, 'MSSV': user.MSSV})
    return jsonify({'access_token': access_token}), 200

@app.route('/api/auth/login', methods=['GET'])
def auth_login():
    if not AUTHENTIK_ISSUER:
        return jsonify({'message': 'Authentik chưa được cấu hình (thiếu AUTHENTIK_ISSUER)'}), 500
    return oauth.authentik.authorize_redirect(AUTHENTIK_REDIRECT_URI)

@app.route('/api/auth/callback', methods=['GET'])
def auth_callback():
    try:
        token = oauth.authentik.authorize_access_token()
        userinfo = token.get('userinfo') or {}
        
        # Extract Authentik OIDC profile fields
        preferred_username = userinfo.get('preferred_username') or userinfo.get('nickname') or userinfo.get('name') or userinfo.get('email')
        display_name = userinfo.get('display_name') or userinfo.get('name') or preferred_username
        name = userinfo.get('name') or display_name
        email = userinfo.get('email') or ''
        picture = userinfo.get('picture') or ''
        mssv = userinfo.get('mssv') or ''
        role_clb = userinfo.get('role_clb') or ''
        groups = userinfo.get('groups') or []

        access_token = create_access_token(
            identity=userinfo.get('sub'),
            additional_claims={
                'username': preferred_username,
                'display_name': display_name,
                'name': name,
                'email': email,
                'picture': picture,
                'mssv': mssv,
                'role_clb': role_clb,
                'groups': groups,
            },
        )
        logging.info(f"Authentik login success: {preferred_username} ({email})")
        return redirect(f"{FRONTEND_URL}/?token={access_token}")
    except Exception as e:
        logging.error(f"Authentik callback error: {e}")
        return redirect(f"{FRONTEND_URL}/?auth_error=1")

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def auth_me():
    claims = get_jwt()
    return jsonify({
        'sub': get_jwt_identity(),
        'username': claims.get('username') or claims.get('name') or 'Admin',
        'display_name': claims.get('display_name') or claims.get('name') or claims.get('username') or 'Admin',
        'name': claims.get('name') or 'Admin',
        'email': claims.get('email') or '',
        'picture': claims.get('picture') or '',
        'mssv': claims.get('mssv') or '',
        'role_clb': claims.get('role_clb') or '',
        'groups': claims.get('groups') or [],
    })

@app.route('/api/members', methods=['GET'])
@jwt_required()
def get_members():
    try:
        members = Member.query.filter_by(is_deleted=False).all()
        return jsonify([member_to_dict(member) for member in members])
    except Exception as e:
        logging.error(f"Error getting members: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/export-csv', methods=['GET'])
@jwt_required()
def export_members_csv():
    try:
        members = Member.query.filter_by(is_deleted=False).order_by(Member.id.asc()).all()
        output = io.StringIO()
        # UTF-8 BOM for Microsoft Excel compatibility
        output.write('\ufeff')
        writer = csv.writer(output)

        headers = [
            'STT',
            'MSSV / Mã định danh',
            'Họ và tên',
            'Số điện thoại',
            'Email',
            'Khối ứng tuyển',
            'Lớp / Chuyên ngành',
            'Loại sinh viên',
            'Trường đang theo học',
            'Mảng chuyên môn chính',
            'Trạng thái mảng chính',
            'Mảng chuyên môn phụ',
            'Trạng thái từng mảng phụ',
            'Thời gian Check-in',
            'Trạng thái xác nhận',
            'Thời gian xác nhận',
            'Link xác nhận cá nhân',
            'Mã xác nhận (6 số)',
            'Yêu cầu đổi lịch PV',
            'Link CV / Hồ sơ',
            'Ghi chú'
        ]
        writer.writerow(headers)

        for idx, m in enumerate(members, start=1):
            main_dept = DEPARTMENT_LABELS.get(m.specialist, m.specialist or 'Chung')

            sub_list = []
            if m.sub_departments:
                try:
                    parsed_subs = json.loads(m.sub_departments) if isinstance(m.sub_departments, str) else m.sub_departments
                    if isinstance(parsed_subs, list):
                        sub_list = parsed_subs
                except Exception:
                    pass
            sub_depts_text = ', '.join([DEPARTMENT_LABELS.get(s, s) for s in sub_list]) if sub_list else 'Không có'

            sub_states_dict = {}
            if m.sub_department_states:
                try:
                    parsed_states = json.loads(m.sub_department_states) if isinstance(m.sub_department_states, str) else m.sub_department_states
                    if isinstance(parsed_states, dict):
                        sub_states_dict = parsed_states
                except Exception:
                    pass
            sub_states_text = ' | '.join([f"{DEPARTMENT_LABELS.get(s, s)}: {sub_states_dict.get(s, 'Chờ duyệt')}" for s in sub_list]) if sub_list else 'Không có'

            track_label = TRACK_LABELS.get(m.application_track, 'Truyền thông' if m.application_track == 'media' else 'Kỹ thuật')
            student_type_label = 'ĐHBK Hà Nội (HUST)' if m.student_type == 'hust' else 'Trường ngoài' if m.student_type == 'external' else (m.student_type or '')
            school_label = m.school or ('ĐHBK Hà Nội' if m.student_type == 'hust' else '')

            confirm_status = 'Đã xác nhận tham gia' if m.confirmed_at else ('Chờ ứng viên xác nhận' if m.confirm_token else 'Chưa cấp link')
            confirm_url = f"{FRONTEND_URL}/confirm/{m.confirm_token}" if m.confirm_token else ''

            writer.writerow([
                idx,
                m.MSSV or '',
                m.name or '',
                m.phone or '',
                m.email or '',
                track_label,
                m.major_class or '',
                student_type_label,
                school_label,
                main_dept,
                m.state or '',
                sub_depts_text,
                sub_states_text,
                m.checkin_time or 'Chưa check-in',
                confirm_status,
                m.confirmed_at or '',
                confirm_url,
                m.confirm_password or '',
                m.reschedule_request or '',
                m.linkCV or '',
                m.note or ''
            ])

        csv_bytes = output.getvalue().encode('utf-8-sig')
        current_time_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"danh_sach_ung_vien_bk_auto_{current_time_str}.csv"

        return Response(
            csv_bytes,
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logging.error(f"Error exporting members CSV: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members', methods=['POST'])
@jwt_required()
def add_member():
    try:
        data = request.get_json()
        sub_deps_raw = data.get('sub_departments')
        sub_deps_str = json.dumps(sub_deps_raw) if isinstance(sub_deps_raw, list) else sub_deps_raw

        raw_confirm_pwd = generate_confirm_password()
        new_member = Member(
            name=data['name'],
            MSSV=data['MSSV'],
            email=data.get('email'),
            phone=data.get('phone'),
            specialist=data.get('specialist'),
            major_class=data.get('major_class'),
            student_type=data.get('student_type'),
            sub_departments=sub_deps_str,
            sub_department_states=data.get('sub_department_states', '{}') if isinstance(data.get('sub_department_states'), str) else json.dumps(data.get('sub_department_states', {})),
            linkCV=data.get('linkCV'),
            # Members added manually by an admin are assumed already vetted,
            # so they default to 'Đậu vòng đơn' if not specified.
            state=data.get('state', 'Đậu vòng đơn'),
            note=data.get('note'),
            confirm_token=secrets.token_urlsafe(24),
            confirm_password=raw_confirm_pwd,
            confirm_password_hash=generate_password_hash(raw_confirm_pwd)
        )
        db.session.add(new_member)
        db.session.commit()
        
        # Record audit log
        record_audit_log(
            member_id=new_member.id,
            action='Thêm ứng viên',
            details=f"Thêm thủ công ứng viên {new_member.name} ({new_member.specialist or 'Chưa phân mảng'})",
            actor_type='admin',
            member_name=new_member.name,
            member_mssv=new_member.MSSV
        )

        member_data = member_to_dict(new_member)
        announcer.announce('member_added', member_data)
        logging.info(f"Member added: {new_member.name}")
        return jsonify({'message': 'Member added successfully', 'member': member_data}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error adding member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>', methods=['PUT'])
@jwt_required()
def edit_member(id):
    try:
        data = request.get_json()
        member = Member.query.get(id)
        if member:
            previous_state = member.state  # Store previous state to check for transitions
            prev_sub_states = member.sub_department_states

            # Determine target state for main department
            target_main_state = data.get('state', member.state)
            main_level = MAIN_STATE_LEVELS.get(target_main_state, 0)

            # Update member data
            member.name = data.get('name', member.name)
            member.MSSV = data.get('MSSV', member.MSSV)
            member.email = data.get('email', member.email)
            member.phone = data.get('phone', member.phone)
            member.specialist = data.get('specialist', member.specialist)
            member.major_class = data.get('major_class', member.major_class)
            member.student_type = data.get('student_type', member.student_type)
            if 'sub_departments' in data:
                sub_deps = data['sub_departments']
                member.sub_departments = json.dumps(sub_deps) if isinstance(sub_deps, list) else str(sub_deps)


            if 'sub_department_states' in data:
                sub_val = data['sub_department_states']
                if isinstance(sub_val, str):
                    try:
                        parsed_sub_val = json.loads(sub_val)
                    except Exception:
                        return jsonify({'error': 'Dữ liệu mảng phụ không đúng định dạng JSON'}), 400
                elif isinstance(sub_val, dict):
                    parsed_sub_val = sub_val
                else:
                    return jsonify({'error': 'Dữ liệu mảng phụ không hợp lệ'}), 400

                # Existing states
                existing_sub_states = {}
                if member.sub_department_states:
                    try:
                        existing_sub_states = json.loads(member.sub_department_states) if isinstance(member.sub_department_states, str) else member.sub_department_states
                        if not isinstance(existing_sub_states, dict):
                            existing_sub_states = {}
                    except Exception:
                        existing_sub_states = {}

                # Gate validation
                for dept_key, new_st in parsed_sub_val.items():
                    old_st = existing_sub_states.get(dept_key, 'Chờ duyệt')
                    if new_st != old_st:
                        dept_name = DEPARTMENT_LABELS.get(dept_key, dept_key)
                        # Gate 1: Main department must be at least 'Đậu vòng đơn' (main_level >= 1)
                        if main_level < 1 and new_st != 'Chờ duyệt':
                            return jsonify({
                                'error': f"Không thể cập nhật mảng phụ '{dept_name}' ({new_st}): mảng chính chưa đậu vòng đơn (trạng thái: {target_main_state})"
                            }), 400

                        # Gate 2: Sub-dept interview states require main to be 'Đã phỏng vấn' (main_level >= 6)
                        if new_st in SUB_INTERVIEW_STATES and main_level < 6:
                            return jsonify({
                                'error': f"Không thể phỏng vấn mảng phụ '{dept_name}': mảng chính chưa hoàn thành phỏng vấn (trạng thái: {target_main_state})"
                            }), 400

                member.sub_department_states = json.dumps(parsed_sub_val)

            member.linkCV = data.get('linkCV', member.linkCV)
            member.note = data.get('note', member.note)
            if 'school' in data:
                member.school = data.get('school', member.school)
            if 'application_track' in data:
                member.application_track = data.get('application_track', member.application_track)

            # Check for state change
            if 'state' in data:
                member.state = data['state']

            # Auto-initialize sub_department_states for registered sub_departments when passing screening (main_level >= 1)
            if main_level >= 1 and member.sub_departments:
                try:
                    sub_list = json.loads(member.sub_departments) if isinstance(member.sub_departments, str) else member.sub_departments
                    if isinstance(sub_list, list) and sub_list:
                        current_states = {}
                        if member.sub_department_states:
                            try:
                                current_states = json.loads(member.sub_department_states) if isinstance(member.sub_department_states, str) else member.sub_department_states
                                if not isinstance(current_states, dict):
                                    current_states = {}
                            except Exception:
                                current_states = {}
                        needs_update = False
                        for sd in sub_list:
                            if sd not in current_states:
                                current_states[sd] = 'Chờ duyệt'
                                needs_update = True
                        if needs_update:
                            member.sub_department_states = json.dumps(current_states)
                except Exception as e:
                    logging.warning(f"Error auto-initializing sub_department_states: {e}")

            # First time this candidate passes screening: mint their
            # confirmation link + one-time password. Re-approving later
            # (state already 'Đậu vòng đơn' -> 'Đậu vòng đơn' again, e.g.
            # after resolving a reschedule request) reuses the existing
            # token/password rather than silently invalidating a link the
            # admin may have already sent — use reset-confirmation for that.
            new_plaintext_password = None
            if (member.state == 'Đậu vòng đơn' and not member.confirm_token) or (not member.confirm_password):
                new_plaintext_password = generate_confirm_password()
                if not member.confirm_token:
                    member.confirm_token = secrets.token_urlsafe(24)
                member.confirm_password = new_plaintext_password
                member.confirm_password_hash = generate_password_hash(new_plaintext_password)

            db.session.commit()

            # Record audit log based on state transition or data update
            sub_called = False
            sub_started = False
            if member.state != previous_state:
                if member.state == 'Đậu vòng đơn':
                    action_name = 'Duyệt đậu vòng đơn'
                    details_text = 'Duyệt hồ sơ đạt yêu cầu vòng đơn, sinh mã và link xác nhận'
                elif member.state == 'Trượt vòng đơn':
                    action_name = 'Duyệt trượt vòng đơn'
                    details_text = 'Đánh giá hồ sơ không đạt vòng đơn'
                elif member.state == 'Gọi PV':
                    action_name = 'Gọi phỏng vấn'
                    details_text = 'Mời ứng viên chuẩn bị vào phòng phỏng vấn'
                elif member.state == 'Đang phỏng vấn':
                    action_name = 'Bắt đầu phỏng vấn'
                    details_text = 'Ứng viên bắt đầu lượt phỏng vấn trực tiếp'
                elif member.state == 'Đã phỏng vấn':
                    action_name = 'Hoàn thành phỏng vấn'
                    details_text = 'Kết thúc lượt phỏng vấn của ứng viên'
                else:
                    action_name = 'Chuyển trạng thái'
                    details_text = f"Chuyển trạng thái từ '{previous_state}' sang '{member.state}'"
            elif member.sub_department_states != prev_sub_states:
                action_name = 'Chuyển trạng thái'
                try:
                    p_sub = json.loads(prev_sub_states) if prev_sub_states else {}
                    n_sub = json.loads(member.sub_department_states) if member.sub_department_states else {}
                    changes = []
                    for k, v in n_sub.items():
                        if p_sub.get(k) != v:
                            if v == 'Gọi PV':
                                sub_called = True
                            elif v == 'Đang phỏng vấn':
                                sub_started = True
                            d_name = DEPARTMENT_LABELS.get(k, k)
                            changes.append(f"{d_name}: {p_sub.get(k, 'Chưa có')} -> {v}")
                    details_text = f"Cập nhật mảng phụ: {', '.join(changes)}"
                except Exception:
                    details_text = 'Cập nhật trạng thái mảng phụ'
            else:
                action_name = 'Cập nhật thông tin'
                details_text = 'Chỉnh sửa thông tin chi tiết hồ sơ ứng viên'

            record_audit_log(
                member_id=member.id,
                action=action_name,
                details=details_text,
                actor_type='admin',
                member_name=member.name,
                member_mssv=member.MSSV
            )

            member_data = member_to_dict(member)
            response_payload = {'message': 'Member edited successfully', 'member': member_data}
            if new_plaintext_password:
                # One-time reveal — only the hash is persisted, so this is the
                # only response that will ever contain the plaintext password.
                response_payload['confirm_password'] = new_plaintext_password

            # Emit different events based on state changes and transitions
            if member.state == 'Đậu vòng đơn' and previous_state != 'Đậu vòng đơn':
                announcer.announce('member_screening_passed', member_data)
            elif member.state == 'Trượt vòng đơn' and previous_state != 'Trượt vòng đơn':
                announcer.announce('member_screening_failed', member_data)
            elif (member.state == 'Gọi PV' and previous_state != 'Gọi PV') or sub_called:
                announcer.announce('member_interview_called', member_data)
            elif (member.state == 'Đang phỏng vấn' and previous_state != 'Đang phỏng vấn') or sub_started:
                announcer.announce('member_interview_started', member_data)
            elif member.state == 'Đã phỏng vấn' and previous_state != 'Đã phỏng vấn':
                announcer.announce('member_interview_ended', member_data)
            elif member.state == 'Đã xác nhận' and previous_state != 'Đã xác nhận':
                announcer.announce('member_confirmed', member_data)
            elif member.state == 'Xin đổi lịch' and previous_state != 'Xin đổi lịch':
                announcer.announce('member_reschedule_requested', member_data)
            else:
                announcer.announce('member_edited', member_data)


            logging.info(f"Member edited: {member.name}, state changed from {previous_state} to {member.state}")
            return jsonify(response_payload)
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error editing member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>/reset-confirmation', methods=['POST'])
@jwt_required()
def reset_confirmation(id):
    """Mint a fresh confirm_token + password, killing the previous link.
    Used when the admin needs to resend (password was already shown once),
    or after manually resolving a 'Xin đổi lịch' request."""
    try:
        member = Member.query.get(id)
        if not member:
            return jsonify({'message': 'Member not found'}), 404

        member.confirm_token = secrets.token_urlsafe(24)
        new_plaintext_password = generate_confirm_password()
        member.confirm_password = new_plaintext_password
        member.confirm_password_hash = generate_password_hash(new_plaintext_password)
        db.session.commit()

        record_audit_log(
            member_id=member.id,
            action='Tạo lại mật khẩu xác nhận',
            details='Admin tạo lại mã xác nhận và đường link mới (link cũ bị vô hiệu hoá)',
            actor_type='admin',
            member_name=member.name,
            member_mssv=member.MSSV
        )

        member_data = member_to_dict(member)
        logging.info(f"Confirmation reset for member: {member.name}")
        return jsonify({
            'message': 'Confirmation reset successfully',
            'member': member_data,
            'confirm_password': new_plaintext_password
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error resetting confirmation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_member(id):
    try:
        member = Member.query.get(id)
        if member and not member.is_deleted:
            # SOFT DELETE: Mark is_deleted=True. NEVER physically remove the candidate record from the DB.
            # All applicant data, contact details, CV link, and audit logs are retained permanently.
            record_audit_log(
                member_id=member.id,
                action='Xoá ứng viên',
                details=f"Xoá hồ sơ ứng viên {member.name} ({member.MSSV}) (Đã đánh dấu xoá, bản ghi được lưu trữ an toàn vĩnh viễn trong CSDL)",
                actor_type='admin',
                member_name=member.name,
                member_mssv=member.MSSV
            )
            member.is_deleted = True
            db.session.commit()
            announcer.announce('member_deleted', {'id': id})
            logging.info(f"Member soft-deleted (DB record preserved): {member.name} ({member.MSSV})")
            return jsonify({'message': 'Member deleted successfully'})
        elif member and member.is_deleted:
            return jsonify({'message': 'Member already deleted'}), 400
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>/audit-logs', methods=['GET'])
@jwt_required()
def get_member_audit_logs(id):
    try:
        logs = AuditLog.query.filter_by(member_id=id).order_by(AuditLog.id.desc()).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        logging.error(f"Error getting audit logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/audit-logs', methods=['GET'])
@jwt_required()
def get_all_audit_logs():
    """Full audit trail across every candidate, including ones since deleted
    (member_id NULL — identified via member_name_snapshot/member_mssv_snapshot
    instead). This is the only way to review history for a deleted candidate,
    since /api/members/<id>/audit-logs requires an id that no longer resolves
    to anything once the Member row is gone."""
    try:
        limit = request.args.get('limit', type=int) or 500
        logs = AuditLog.query.order_by(AuditLog.id.desc()).limit(min(limit, 2000)).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        logging.error(f"Error getting all audit logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/checkin', methods=['POST'])
# Remove the @jwt_required() decorator
def checkin_member():
    try:
        data = request.get_json()
        uid = data.get('uid')  # uid có thể là MSSV hoặc ID khác

        # Try to find member by MSSV
        member = Member.query.filter_by(MSSV=uid, is_deleted=False).first()

        if member:
            if member.state not in CHECKIN_ELIGIBLE_STATES:
                logging.warning(f"Member {member.name} cannot check in from state '{member.state}'")
                return jsonify({
                    'message': f"Không thể check-in: ứng viên đang ở trạng thái '{member.state}'"
                }), 400

            current_time = format_gmt7_time()
            member.checkin_time = current_time
            member.state = 'Đã checkin'
            db.session.commit()

            record_audit_log(
                member_id=member.id,
                action='Check-in tại sự kiện',
                details=f"Check-in thành công lúc {current_time}",
                actor={'username': member.MSSV, 'name': member.name, 'email': member.email},
                actor_type='candidate',
                member_name=member.name,
                member_mssv=member.MSSV
            )

            member_data = member_to_dict(member)
            announcer.announce('member_checked_in', member_data)

            logging.info(f"Member checked in: {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            logging.warning(f"Member not found with uid: {uid}")
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error checking in member: {e}")
        return jsonify({'error': str(e)}), 500

# @jwt_required()
@app.route('/api/esp/checkin', methods=['POST'])
def checkin_member_esp():
    try:
        data = request.get_json()
        mssv = data.get('MSSV')  # Changed from IDcard to MSSV
        member = Member.query.filter_by(MSSV=mssv, is_deleted=False).first()
        if member:
            if member.state not in CHECKIN_ELIGIBLE_STATES:
                logging.warning(f"Member {member.name} cannot check in from state '{member.state}' (ESP)")
                return jsonify({
                    'message': f"Không thể check-in: ứng viên đang ở trạng thái '{member.state}'"
                }), 400
            current_time = format_gmt7_time()
            member.checkin_time = current_time
            member.state = 'Đã checkin'
            db.session.commit()

            record_audit_log(
                member_id=member.id,
                action='Check-in tại sự kiện',
                details=f"Check-in (thiết bị kiosk ESP) lúc {current_time}",
                actor={'username': member.MSSV, 'name': member.name, 'email': member.email},
                actor_type='candidate',
                member_name=member.name,
                member_mssv=member.MSSV
            )

            member_data = member_to_dict(member)
            announcer.announce('member_checked_in', member_data)
            logging.info(f"Member checked in (ESP): {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error checking in member (ESP): {e}")
        return jsonify({'error': str(e)}), 500



HUST_EMAIL_RE = re.compile(r'^[^@\s]+@(sis\.)?hust\.edu\.vn$', re.IGNORECASE)

def allowed_cv_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_CV_EXTENSIONS

@app.route('/api/apply', methods=['POST'])
def apply():
    """Public endpoint used by the BK-AUTO Website recruitment form. Creates a
    Member in the 'Chờ duyệt' screening state — it does not go straight into
    the interview-day pipeline."""
    try:
        application_track = (request.form.get('applicationTrack') or 'engineering').strip()
        if application_track not in APPLICATION_TRACKS:
            return jsonify({'message': 'Mảng ứng tuyển không hợp lệ'}), 400

        full_name = (request.form.get('fullName') or '').strip()
        identifier = (request.form.get('identifier') or '').strip()
        email = (request.form.get('email') or '').strip()
        phone = (request.form.get('phone') or '').strip()
        major_class = (request.form.get('majorClass') or '').strip()
        student_type = (request.form.get('studentType') or '').strip()
        raw_main_dept = (request.form.get('mainDepartment') or '').strip()

        if application_track == 'media':
            main_department = 'communication'
        else:
            main_department = raw_main_dept
            if main_department not in TRACK_MAIN_DEPARTMENTS['engineering']:
                return jsonify({'message': 'Mảng chuyên môn chính không hợp lệ'}), 400

        raw_sub = request.form.get('subDepartments') or '[]'
        try:
            parsed_sub = json.loads(raw_sub)
            if isinstance(parsed_sub, list):
                sub_departments = json.dumps([item for item in parsed_sub if item in SUB_DEPARTMENTS])
            else:
                sub_departments = '[]'
        except Exception:
            sub_departments = '[]'

        questions = request.form.get('questions') or ''

        required = {'fullName': full_name, 'identifier': identifier, 'email': email,
                    'phone': phone, 'mainDepartment': main_department}
        missing = [name for name, value in required.items() if not value]
        if missing:
            return jsonify({'message': f"Thiếu thông tin bắt buộc: {', '.join(missing)}"}), 400

        if student_type == 'hust' and not HUST_EMAIL_RE.match(email):
            return jsonify({'message': 'Sinh viên HUST phải dùng email @sis.hust.edu.vn hoặc @hust.edu.vn'}), 400

        if student_type == 'external':
            school = identifier
            mssv_key = email.lower()
        else:
            school = None
            mssv_key = identifier

        dup = Member.query.filter(
            or_(Member.email == email, Member.MSSV == mssv_key)
        ).first()
        if dup and not dup.is_deleted:
            return jsonify({'message': 'Bạn đã nộp đơn rồi'}), 409

        link_cv = None
        cv_file = request.files.get('cvFile')
        if cv_file and cv_file.filename:
            if not allowed_cv_file(cv_file.filename):
                return jsonify({'message': 'CV chỉ chấp nhận định dạng PDF'}), 400
            cv_file.seek(0, os.SEEK_END)
            size = cv_file.tell()
            cv_file.seek(0)
            if size > MAX_CV_SIZE_BYTES:
                return jsonify({'message': 'File CV vượt quá giới hạn 5MB'}), 400
            stored_name = f"{uuid.uuid4().hex}_{secure_filename(cv_file.filename)}"
            cv_file.save(os.path.join(UPLOAD_FOLDER, stored_name))
            link_cv = f"/api/uploads/cv/{stored_name}"

        track_label = TRACK_LABELS.get(application_track, application_track)

        if dup and dup.is_deleted:
            # Candidate was previously soft-deleted; reactivate & update their record
            dup.is_deleted = False
            dup.name = full_name
            dup.MSSV = mssv_key
            dup.email = email
            dup.phone = phone
            dup.specialist = main_department
            dup.major_class = major_class
            dup.student_type = student_type
            dup.school = school
            dup.application_track = application_track
            dup.sub_departments = sub_departments
            if link_cv:
                dup.linkCV = link_cv
            dup.state = 'Chờ duyệt'
            dup.note = questions
            db.session.commit()

            dept_label = DEPARTMENT_LABELS.get(dup.specialist, dup.specialist)
            record_audit_log(
                member_id=dup.id,
                action='Nộp lại hồ sơ ứng tuyển',
                details=f"Ứng viên nộp lại hồ sơ {track_label} - mảng {dept_label} (sau khi được khôi phục hồ sơ đã xoá)",
                actor={'username': dup.MSSV, 'name': dup.name, 'email': dup.email},
                actor_type='candidate',
                member_name=dup.name,
                member_mssv=dup.MSSV
            )

            member_data = member_to_dict(dup)
            announcer.announce('member_added', member_data)
            logging.info(f"Re-application received for reactivated member: {dup.name} ({dup.MSSV})")
            return jsonify({'message': 'Nộp đơn thành công', 'member': member_data}), 201

        new_member = Member(
            name=full_name,
            MSSV=mssv_key,
            email=email,
            phone=phone,
            specialist=main_department,
            major_class=major_class,
            student_type=student_type,
            school=school,
            application_track=application_track,
            sub_departments=sub_departments,
            linkCV=link_cv,
            state='Chờ duyệt',
            note=questions,
            is_deleted=False
        )
        db.session.add(new_member)
        db.session.commit()

        dept_label = DEPARTMENT_LABELS.get(new_member.specialist, new_member.specialist)
        record_audit_log(
            member_id=new_member.id,
            action='Nộp hồ sơ ứng tuyển',
            details=f"Ứng viên nộp hồ sơ {track_label} - mảng {dept_label}",
            actor={'username': new_member.MSSV, 'name': new_member.name, 'email': new_member.email},
            actor_type='candidate',
            member_name=new_member.name,
            member_mssv=new_member.MSSV
        )

        member_data = member_to_dict(new_member)
        announcer.announce('member_added', member_data)
        logging.info(f"New application received: {new_member.name} ({new_member.MSSV})")
        return jsonify({'message': 'Nộp đơn thành công', 'member': member_data}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Bạn đã nộp đơn rồi'}), 409
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error receiving application: {e}")
        return jsonify({'message': f'Có lỗi xảy ra trên hệ thống: {str(e)}', 'error': str(e)}), 500

@app.route('/api/uploads/cv/<path:filename>', methods=['GET'])
@jwt_required()
def get_cv_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# --- Public interview-participation confirmation portal -------------------
# No JWT here by design: candidates reach this via an unguessable URL
# (confirm_token) plus a one-time password the admin sends them manually.
# Every mutating call re-checks the password against the stored hash rather
# than issuing its own session token, to avoid a second auth/expiry system.

def check_confirm_password(member, password):
    if not password:
        return False
    entered = str(password).strip()
    if member.confirm_password:
        return member.confirm_password.strip() == entered
    if member.confirm_password_hash:
        return check_password_hash(member.confirm_password_hash, entered)
    return False

def confirm_summary(member):
    return {
        'name': member.name,
        'specialist': member.specialist,
        'state': member.state,
        'reschedule_request': member.reschedule_request,
        'interview_info': INTERVIEW_SESSION_INFO,
    }

@app.route('/api/confirm/<token>', methods=['GET'])
def confirm_check_token(token):
    member = Member.query.filter_by(confirm_token=token).first()
    return jsonify({'valid': bool(member)}), (200 if member else 404)

@app.route('/api/confirm/<token>/verify', methods=['POST'])
def confirm_verify(token):
    member = Member.query.filter_by(confirm_token=token).first()
    if not member:
        return jsonify({'message': 'Link không hợp lệ hoặc đã hết hạn'}), 404
    password = (request.get_json(silent=True) or {}).get('password')
    if not check_confirm_password(member, password):
        return jsonify({'message': 'Mật khẩu không đúng'}), 401
    return jsonify(confirm_summary(member))

@app.route('/api/confirm/<token>/confirm', methods=['POST'])
def confirm_participation(token):
    member = Member.query.filter_by(confirm_token=token).first()
    if not member:
        return jsonify({'message': 'Link không hợp lệ hoặc đã hết hạn'}), 404
    password = (request.get_json(silent=True) or {}).get('password')
    if not check_confirm_password(member, password):
        return jsonify({'message': 'Mật khẩu không đúng'}), 401
    if member.state not in ('Đậu vòng đơn', 'Xin đổi lịch'):
        return jsonify({'message': f"Không thể xác nhận từ trạng thái hiện tại"}), 400

    member.state = 'Đã xác nhận'
    member.confirmed_at = format_gmt7_time()
    db.session.commit()

    record_audit_log(
        member_id=member.id,
        action='Xác nhận tham gia phỏng vấn',
        details='Ứng viên tự xác nhận tham gia buổi phỏng vấn qua link và mật khẩu bảo mật',
        actor={'username': member.MSSV, 'name': member.name, 'email': member.email},
        actor_type='candidate',
        member_name=member.name,
        member_mssv=member.MSSV
    )

    member_data = member_to_dict(member)
    announcer.announce('member_confirmed', member_data)
    logging.info(f"Candidate confirmed participation: {member.name} ({member.MSSV})")
    return jsonify(confirm_summary(member))

@app.route('/api/confirm/<token>/reschedule', methods=['POST'])
def confirm_reschedule(token):
    member = Member.query.filter_by(confirm_token=token).first()
    if not member:
        return jsonify({'message': 'Link không hợp lệ hoặc đã hết hạn'}), 404
    data = request.get_json(silent=True) or {}
    if not check_confirm_password(member, data.get('password')):
        return jsonify({'message': 'Mật khẩu không đúng'}), 401
    if member.state != 'Đậu vòng đơn':
        return jsonify({'message': f"Không thể xin đổi lịch từ trạng thái hiện tại"}), 400
    reason = (data.get('reason') or '').strip()
    if not reason:
        return jsonify({'message': 'Vui lòng nhập lý do/thời gian mong muốn'}), 400

    member.state = 'Xin đổi lịch'
    member.reschedule_request = reason
    db.session.commit()

    record_audit_log(
        member_id=member.id,
        action='Yêu cầu đổi lịch phỏng vấn',
        details=f"Lý do / thời gian mong muốn: {reason}",
        actor={'username': member.MSSV, 'name': member.name, 'email': member.email},
        actor_type='candidate',
        member_name=member.name,
        member_mssv=member.MSSV
    )

    member_data = member_to_dict(member)
    announcer.announce('member_reschedule_requested', member_data)
    logging.info(f"Candidate requested reschedule: {member.name} ({member.MSSV})")
    return jsonify(confirm_summary(member))

@app.route('/api/events', methods=['GET'])
def sse_events():
    """Server-Sent Events endpoint for realtime one-way streaming updates."""
    token = request.args.get('token')
    if not token:
        return jsonify({'message': 'Missing authentication token'}), 401
    try:
        decode_token(token)
    except Exception as e:
        logging.warning(f"SSE connection rejected, invalid token: {e}")
        return jsonify({'message': 'Invalid or expired token'}), 401

    def stream():
        q = announcer.listen()
        try:
            # Randomized reconnect delay: if the server restarts (or a proxy
            # briefly drops every connection), every open dashboard would
            # otherwise reconnect at the same instant. Jittering `retry`
            # per-connection spreads that reconnect storm out over a window
            # instead of everyone hammering the backend at once.
            retry_ms = random.randint(3000, 6000)
            yield f"retry: {retry_ms}\n\n"
            # Initial greeting event
            yield f"event: connected\ndata: {json.dumps({'status': 'ok'})}\n\n"
            while True:
                try:
                    # 20-second timeout to send keepalive comment to keep proxy connection alive
                    msg = q.get(timeout=20)
                    yield msg
                except queue.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            announcer.remove_listener(q)

    response = Response(stream(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache, no-transform'
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Connection'] = 'keep-alive'
    return response

def ensure_schema():
    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE member ADD COLUMN sub_department_states TEXT DEFAULT '{}'"))
                conn.commit()
        except Exception:
            pass
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE member ADD COLUMN confirm_password VARCHAR(20)"))
                conn.commit()
        except Exception:
            pass

        # Auto-migrate existing members without confirm_password: generate new token and raw password
        try:
            members_to_update = Member.query.filter(
                (Member.confirm_password == None) | (Member.confirm_password == '')
            ).all()
            if members_to_update:
                for m in members_to_update:
                    m.confirm_token = secrets.token_urlsafe(24)
                    m.confirm_password = generate_confirm_password()
                    m.confirm_password_hash = generate_password_hash(m.confirm_password)
                db.session.commit()
                logging.info(f"Auto-migrated {len(members_to_update)} existing members with new token & raw password")
        except Exception as e:
            logging.error(f"Error auto-migrating confirm passwords: {e}")
            db.session.rollback()

ensure_schema()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
