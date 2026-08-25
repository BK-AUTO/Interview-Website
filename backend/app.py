import os
import re
import secrets
import uuid
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
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from authlib.integrations.flask_client import OAuth
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///new.db'
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
ALLOWED_CV_EXTENSIONS = {'pdf', 'doc', 'docx'}
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
    MSSV = db.Column(db.String(20), nullable=False, unique=True)  # Increased size for MSSV
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
        'confirmed_at': member.confirmed_at
    }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    MSSV = db.Column(db.String(20), db.ForeignKey('member.MSSV'), nullable=False)
    member = db.relationship('Member', backref=db.backref('user', lazy=True))

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
        access_token = create_access_token(
            identity=userinfo.get('sub'),
            additional_claims={'email': userinfo.get('email'), 'name': userinfo.get('name')},
        )
        logging.info(f"Authentik login: {userinfo.get('email') or userinfo.get('sub')}")
        return redirect(f"{FRONTEND_URL}/?token={access_token}")
    except Exception as e:
        logging.error(f"Authentik callback error: {e}")
        return redirect(f"{FRONTEND_URL}/?auth_error=1")

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def auth_me():
    claims = get_jwt()
    return jsonify({'sub': get_jwt_identity(), 'email': claims.get('email'), 'name': claims.get('name')})

@app.route('/api/members', methods=['GET'])
@jwt_required()
def get_members():
    try:
        members = Member.query.all()
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
        member_data = member_to_dict(new_member)
        socketio.emit('member_added', member_data)
        logging.info(f"Member added: {new_member.name}")
        return jsonify({'message': 'Member added successfully', 'member': member_data}), 201
    except Exception as e:
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
                # logging.info(f"Emitting interview call event for: {member.name}")
                socketio.emit('member_interview_called', member_data)
            elif member.state == 'Đang phỏng vấn' and previous_state != 'Đang phỏng vấn':
                # logging.info(f"Emitting interview started event for: {member.name}")
                socketio.emit('member_interview_started', member_data)
            elif member.state == 'Đã phỏng vấn' and previous_state != 'Đã phỏng vấn':
                # logging.info(f"Emitting interview completed event for: {member.name}")
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

        member_data = member_to_dict(member)
        logging.info(f"Confirmation reset for member: {member.name}")
        return jsonify({
            'message': 'Confirmation reset successfully',
            'member': member_data,
            'confirm_password': new_plaintext_password
        })
    except Exception as e:
        logging.error(f"Error resetting confirmation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_member(id):
    try:
        member = Member.query.get(id)
        if member:
            db.session.delete(member)
            db.session.commit()
            socketio.emit('member_deleted', {'id': id})
            logging.info(f"Member deleted: {member.name}")
            return jsonify({'message': 'Member deleted successfully'})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error deleting member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/checkin', methods=['POST'])
# Remove the @jwt_required() decorator
def checkin_member():
    try:
        data = request.get_json()
        uid = data.get('uid')  # uid có thể là MSSV hoặc ID khác

        # Try to find member by MSSV
        member = Member.query.filter_by(MSSV=uid).first()

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

            member_data = member_to_dict(member)
            socketio.emit('member_checked_in', member_data)

            logging.info(f"Member checked in: {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            logging.warning(f"Member not found with uid: {uid}")
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error checking in member: {e}")
        return jsonify({'error': str(e)}), 500

# @jwt_required()
@app.route('/api/esp/checkin', methods=['POST'])
def checkin_member_esp():
    try:
        data = request.get_json()
        mssv = data.get('MSSV')  # Changed from IDcard to MSSV
        member = Member.query.filter_by(MSSV=mssv).first()
        if member:
            if member.state not in CHECKIN_ELIGIBLE_STATES:
                logging.warning(f"Member {member.name} cannot check in from state '{member.state}' (ESP)")
                return jsonify({
                    'message': f"Không thể check-in: ứng viên đang ở trạng thái '{member.state}'"
                }), 400
            member.checkin_time = format_gmt7_time()
            member.state = 'Đã checkin'
            db.session.commit()
            member_data = member_to_dict(member)
            socketio.emit('member_checked_in', member_data)
            logging.info(f"Member checked in (ESP): {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error checking in member (ESP): {e}")
        return jsonify({'error': str(e)}), 500

HUST_EMAIL_RE = re.compile(r'^[^@\s]+@sis\.hust\.edu\.vn$', re.IGNORECASE)

def allowed_cv_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_CV_EXTENSIONS

@app.route('/api/apply', methods=['POST'])
@limiter.limit('5 per hour')
def apply():
    """Public endpoint used by the BK-AUTO Website recruitment form. Creates a
    Member in the 'Chờ duyệt' screening state — it does not go straight into
    the interview-day pipeline."""
    try:
        full_name = (request.form.get('fullName') or '').strip()
        identifier = (request.form.get('identifier') or '').strip()
        email = (request.form.get('email') or '').strip()
        phone = (request.form.get('phone') or '').strip()
        major_class = (request.form.get('majorClass') or '').strip()
        student_type = (request.form.get('studentType') or '').strip()
        main_department = (request.form.get('mainDepartment') or '').strip()
        sub_departments = request.form.get('subDepartments') or '[]'
        questions = request.form.get('questions') or ''

        required = {'fullName': full_name, 'identifier': identifier, 'email': email,
                    'phone': phone, 'mainDepartment': main_department}
        missing = [name for name, value in required.items() if not value]
        if missing:
            return jsonify({'message': f"Thiếu thông tin bắt buộc: {', '.join(missing)}"}), 400

        if student_type == 'hust' and not HUST_EMAIL_RE.match(email):
            return jsonify({'message': 'Sinh viên HUST phải dùng email @sis.hust.edu.vn'}), 400

        if Member.query.filter_by(MSSV=identifier).first():
            return jsonify({'message': 'Bạn đã nộp đơn rồi'}), 409

        link_cv = None
        cv_file = request.files.get('cvFile')
        if cv_file and cv_file.filename:
            if not allowed_cv_file(cv_file.filename):
                return jsonify({'message': 'CV chỉ chấp nhận định dạng PDF, DOC hoặc DOCX'}), 400
            cv_file.seek(0, os.SEEK_END)
            size = cv_file.tell()
            cv_file.seek(0)
            if size > MAX_CV_SIZE_BYTES:
                return jsonify({'message': 'File CV vượt quá giới hạn 5MB'}), 400
            stored_name = f"{uuid.uuid4().hex}_{secure_filename(cv_file.filename)}"
            cv_file.save(os.path.join(UPLOAD_FOLDER, stored_name))
            link_cv = f"/api/uploads/cv/{stored_name}"

        new_member = Member(
            name=full_name,
            MSSV=identifier,
            email=email,
            phone=phone,
            specialist=main_department,
            major_class=major_class,
            student_type=student_type,
            sub_departments=sub_departments,
            linkCV=link_cv,
            state='Chờ duyệt',
            note=questions
        )
        db.session.add(new_member)
        db.session.commit()
        member_data = member_to_dict(new_member)
        socketio.emit('member_added', member_data)
        logging.info(f"New application received: {new_member.name} ({new_member.MSSV})")
        return jsonify({'message': 'Nộp đơn thành công', 'member': member_data}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Bạn đã nộp đơn rồi'}), 409
    except Exception as e:
        logging.error(f"Error receiving application: {e}")
        return jsonify({'error': str(e)}), 500

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
    member_data = member_to_dict(member)
    socketio.emit('member_reschedule_requested', member_data)
    logging.info(f"Candidate requested reschedule: {member.name} ({member.MSSV})")
    return jsonify(confirm_summary(member))

@socketio.on('connect')
def handle_connect():
    try:
        logging.info("Client connected to SocketIO")
        with app.app_context():
            members = Member.query.all()
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
            members = Member.query.all()
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
