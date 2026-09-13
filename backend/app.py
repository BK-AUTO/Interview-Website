import os
import re
import secrets
import uuid
import json
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, request, redirect, send_from_directory
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from authlib.integrations.flask_client import OAuth
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
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
# Use threading async_mode which is compatible with Python 3.12
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)

# Enable CORS with more specific settings. More specific resource patterns
# take precedence over the catch-all, so /api/apply gets its own allowlist.
CORS(app, resources={
    r"/api/apply": {"origins": WEBSITE_ORIGINS},
    r"/api/*": {"origins": "*"},
}, supports_credentials=True)
jwt = JWTManager(app)

limiter = Limiter(key_func=get_remote_address, app=app, default_limits=[])

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

# Configure detailed logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

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
    email = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    specialist = db.Column(db.String(100))
    major_class = db.Column(db.String(200))
    student_type = db.Column(db.String(20))  # 'hust' / 'external'
    sub_departments = db.Column(db.String(300))  # JSON array string, e.g. '["electrical","simulation"]'
    linkCV = db.Column(db.String(500))  # Increased size for long URLs
    checkin_time = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True, default='Chưa checkin')
    note = db.Column(db.String(500), nullable=True)  # New field for notes
    school = db.Column(db.String(200), nullable=True)
    application_track = db.Column(db.String(20), default='engineering')
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    # Interview participation confirmation portal (/confirm/<token>).
    confirm_token = db.Column(db.String(64), unique=True, nullable=True)
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
        'linkCV': member.linkCV,
        'checkin_time': member.checkin_time,
        'state': member.state,
        'note': member.note,
        # Safe to expose: every endpoint that serializes a Member this way is
        # @jwt_required() (admin-only). The token alone is useless without the
        # password, which is never returned here (only its hash is stored).
        'confirm_token': member.confirm_token,
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

@app.route('/api/members', methods=['POST'])
@jwt_required()
def add_member():
    try:
        data = request.get_json()
        new_member = Member(
            name=data['name'],
            MSSV=data['MSSV'],
            email=data.get('email'),
            phone=data.get('phone'),
            specialist=data.get('specialist'),
            major_class=data.get('major_class'),
            student_type=data.get('student_type'),
            sub_departments=data.get('sub_departments'),
            linkCV=data.get('linkCV'),
            # Members added manually by an admin are assumed already vetted,
            # so they skip the "Chờ duyệt" screening step used by public /api/apply submissions.
            state='Đậu vòng đơn',
            note=data.get('note')
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
        socketio.emit('member_added', member_data)
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

            # Update member data
            member.name = data.get('name', member.name)
            member.MSSV = data.get('MSSV', member.MSSV)
            member.email = data.get('email', member.email)
            member.phone = data.get('phone', member.phone)
            member.specialist = data.get('specialist', member.specialist)
            member.major_class = data.get('major_class', member.major_class)
            member.student_type = data.get('student_type', member.student_type)
            member.sub_departments = data.get('sub_departments', member.sub_departments)
            member.linkCV = data.get('linkCV', member.linkCV)
            member.note = data.get('note', member.note)
            if 'school' in data:
                member.school = data.get('school', member.school)
            if 'application_track' in data:
                member.application_track = data.get('application_track', member.application_track)

            # Check for state change
            if 'state' in data:
                member.state = data['state']

            # First time this candidate passes screening: mint their
            # confirmation link + one-time password. Re-approving later
            # (state already 'Đậu vòng đơn' -> 'Đậu vòng đơn' again, e.g.
            # after resolving a reschedule request) reuses the existing
            # token/password rather than silently invalidating a link the
            # admin may have already sent — use reset-confirmation for that.
            new_plaintext_password = None
            if member.state == 'Đậu vòng đơn' and not member.confirm_token:
                member.confirm_token = secrets.token_urlsafe(24)
                new_plaintext_password = generate_confirm_password()
                member.confirm_password_hash = generate_password_hash(new_plaintext_password)

            db.session.commit()

            # Record audit log based on state transition or data update
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
                socketio.emit('member_screening_passed', member_data)
            elif member.state == 'Trượt vòng đơn' and previous_state != 'Trượt vòng đơn':
                socketio.emit('member_screening_failed', member_data)
            elif member.state == 'Gọi PV' and previous_state != 'Gọi PV':
                socketio.emit('member_interview_called', member_data)
            elif member.state == 'Đang phỏng vấn' and previous_state != 'Đang phỏng vấn':
                socketio.emit('member_interview_started', member_data)
            elif member.state == 'Đã phỏng vấn' and previous_state != 'Đã phỏng vấn':
                socketio.emit('member_interview_ended', member_data)
            elif member.state == 'Đã xác nhận' and previous_state != 'Đã xác nhận':
                socketio.emit('member_confirmed', member_data)
            elif member.state == 'Xin đổi lịch' and previous_state != 'Xin đổi lịch':
                socketio.emit('member_reschedule_requested', member_data)
            else:
                socketio.emit('member_edited', member_data)

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
            socketio.emit('member_deleted', {'id': id})
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
            socketio.emit('member_checked_in', member_data)

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
            socketio.emit('member_checked_in', member_data)
            logging.info(f"Member checked in (ESP): {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error checking in member (ESP): {e}")
        return jsonify({'error': str(e)}), 500

APPLICATION_TRACKS = ('engineering', 'media')
TRACK_MAIN_DEPARTMENTS = {
    'engineering': {'ai', 'electrical', 'simulation', 'experiment'},
    'media': {'communication'},
}
SUB_DEPARTMENTS = {'communication', 'english', 'manufacturing'}
DEPARTMENT_LABELS = {
    'ai': 'AI for Automobile', 'electrical': 'Điện - Điện tử',
    'simulation': 'Mô phỏng', 'experiment': 'Thí nghiệm',
    'communication': 'Truyền thông', 'english': 'Tiếng Anh',
    'manufacturing': 'Cơ khí',
}
TRACK_LABELS = {
    'engineering': 'Kỹ thuật',
    'media': 'Truyền thông',
}

HUST_EMAIL_RE = re.compile(r'^[^@\s]+@(sis\.)?hust\.edu\.vn$', re.IGNORECASE)

def allowed_cv_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_CV_EXTENSIONS

@app.route('/api/apply', methods=['POST'])
@limiter.limit('5 per hour')
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
            socketio.emit('member_added', member_data)
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
        socketio.emit('member_added', member_data)
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
    return bool(member.confirm_password_hash) and check_password_hash(member.confirm_password_hash, password or '')

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
@limiter.limit('10 per hour')
def confirm_verify(token):
    member = Member.query.filter_by(confirm_token=token).first()
    if not member:
        return jsonify({'message': 'Link không hợp lệ hoặc đã hết hạn'}), 404
    password = (request.get_json(silent=True) or {}).get('password')
    if not check_confirm_password(member, password):
        return jsonify({'message': 'Mật khẩu không đúng'}), 401
    return jsonify(confirm_summary(member))

@app.route('/api/confirm/<token>/confirm', methods=['POST'])
@limiter.limit('10 per hour')
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
    socketio.emit('member_confirmed', member_data)
    logging.info(f"Candidate confirmed participation: {member.name} ({member.MSSV})")
    return jsonify(confirm_summary(member))

@app.route('/api/confirm/<token>/reschedule', methods=['POST'])
@limiter.limit('10 per hour')
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
    socketio.emit('member_reschedule_requested', member_data)
    logging.info(f"Candidate requested reschedule: {member.name} ({member.MSSV})")
    return jsonify(confirm_summary(member))

@socketio.on('connect')
def handle_connect():
    try:
        logging.info("Client connected to SocketIO")
        with app.app_context():
            members = Member.query.filter_by(is_deleted=False).all()
            member_list = [member_to_dict(member) for member in members]
            logging.info(f"Sending members list: {len(member_list)} members")
            emit('members_list', member_list)
    except Exception as e:
        logging.error(f"Error during socket connection: {e}")
        emit('error', {'message': f'Internal server error: {str(e)}'})

# Add a socket event handler for client requests
@socketio.on('request_update')
def handle_update_request():
    try:
        with app.app_context():
            members = Member.query.filter_by(is_deleted=False).all()
            member_list = [member_to_dict(member) for member in members]
            emit('members_list', member_list)
    except Exception as e:
        logging.error(f"Error handling update request: {e}")
        emit('error', {'message': f'Internal server error: {str(e)}'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Use threading mode for compatibility
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)
