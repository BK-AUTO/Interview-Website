from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import pytz
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///memberlist.db'
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {'check_same_thread': False}
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string'  # Change this to a random secret key

db = SQLAlchemy(app)
# Use threading async_mode which is compatible with Python 3.12
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)

# Enable CORS with more specific settings
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)

# Configure timezone for Vietnam (GMT+7)
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    """Get current time in Vietnam timezone"""
    return datetime.now(VN_TZ)

def format_vn_time(dt=None):
    """Format datetime to Vietnam timezone string"""
    if dt is None:
        dt = get_vn_time()
    elif dt.tzinfo is None:
        # If datetime is naive, assume it's UTC and convert to VN time
        dt = pytz.UTC.localize(dt).astimezone(VN_TZ)
    elif dt.tzinfo != VN_TZ:
        # Convert to VN time if it's in different timezone
        dt = dt.astimezone(VN_TZ)
    
    return dt.strftime('%Y-%m-%d %H:%M:%S')

# Configure detailed logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    khoa = db.Column(db.String(50))  # K61, K62, ..., K70, NCS
    MSSV = db.Column(db.String(20))
    participation_type = db.Column(db.String(50))  # Phần lễ, Phần hội, Cả hai
    member_type = db.Column(db.String(20))  # CSV (cựu SV) / CURRENT (SV hiện tại)
    checkin_time = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), default='Chưa checkin')
    checkin_ceremony = db.Column(db.Boolean, default=False)  # Đã check-in phần lễ
    checkin_party = db.Column(db.Boolean, default=False)  # Đã check-in phần hội

def member_to_dict(member):
    """Convert member object to dictionary"""
    return {
        'id': member.id,
        'name': member.name,
        'khoa': member.khoa,
        'MSSV': member.MSSV,
        'participation_type': member.participation_type,
        'member_type': member.member_type,
        'checkin_time': member.checkin_time,
        'state': member.state,
        'checkin_ceremony': member.checkin_ceremony,
        'checkin_party': member.checkin_party
    }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    MSSV = db.Column(db.String(10), db.ForeignKey('member.MSSV'), nullable=False)
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

@app.route('/api/members', methods=['GET'])
def get_members():
    try:
        members = Member.query.all()
        return jsonify([member_to_dict(member) for member in members])
    except Exception as e:
        logging.error(f"Error getting members: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members', methods=['POST'])
def add_member():
    try:
        data = request.get_json()
        new_member = Member(
            name=data['name'],
            khoa=data.get('khoa'),
            MSSV=data.get('MSSV'),
            participation_type=data.get('participation_type'),
            member_type=data.get('member_type', 'CURRENT'),
            state='Chưa checkin',
            checkin_ceremony=False,
            checkin_party=False
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
def edit_member(id):
    try:
        data = request.get_json()
        member = Member.query.get(id)
        if member:
            # Update member data
            member.name = data.get('name', member.name)
            member.khoa = data.get('khoa', member.khoa)
            member.MSSV = data.get('MSSV', member.MSSV)
            member.participation_type = data.get('participation_type', member.participation_type)
            member.member_type = data.get('member_type', member.member_type)
            
            # Handle state and checkin updates
            new_state = data.get('state', member.state)
            new_checkin_time = data.get('checkin_time', member.checkin_time)
            
            # Update ceremony/party checkin flags
            if 'checkin_ceremony' in data:
                member.checkin_ceremony = data['checkin_ceremony']
            if 'checkin_party' in data:
                member.checkin_party = data['checkin_party']
            
            # If state changes to "Đã checkin" and no checkin_time provided, set current time
            if new_state == 'Đã checkin' and not new_checkin_time:
                new_checkin_time = format_vn_time()
            # If state changes to "Chưa checkin", clear checkin_time
            elif new_state == 'Chưa checkin':
                new_checkin_time = None
            # If checkin_time is provided and state is not "Đã checkin", update state
            elif new_checkin_time and new_state != 'Đã checkin':
                new_state = 'Đã checkin'
            
            member.state = new_state
            member.checkin_time = new_checkin_time
            
            db.session.commit()
            
            member_data = member_to_dict(member)
            socketio.emit('member_edited', member_data)
            logging.info(f"Member edited: {member.name}")
            return jsonify({'message': 'Member edited successfully', 'member': member_data})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error editing member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/<int:id>', methods=['DELETE'])
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
def checkin_member():
    try:
        data = request.get_json()
        uid = data.get('uid')
        checkin_type = data.get('checkin_type', 'both')  # 'ceremony', 'party', 'both'
            
        # Try to find member by MSSV or name
        member = Member.query.filter_by(MSSV=uid).first() or \
                 Member.query.filter_by(name=uid).first()
            
        if member:
            # Update check-in flags based on type
            if checkin_type == 'ceremony':
                if member.checkin_ceremony:
                    return jsonify({'message': 'Thành viên đã check-in phần lễ rồi'}), 400
                member.checkin_ceremony = True
            elif checkin_type == 'party':
                if member.checkin_party:
                    return jsonify({'message': 'Thành viên đã check-in phần hội rồi'}), 400
                member.checkin_party = True
            else:  # both
                if member.checkin_ceremony and member.checkin_party:
                    return jsonify({'message': 'Thành viên đã check-in cả hai phần rồi'}), 400
                member.checkin_ceremony = True
                member.checkin_party = True
            
            # Update overall state
            if member.checkin_ceremony or member.checkin_party:
                member.state = 'Đã checkin'
                if not member.checkin_time:
                    member.checkin_time = format_vn_time()
            
            db.session.commit()
            
            member_data = member_to_dict(member)
            socketio.emit('member_checked_in', member_data)
            
            logging.info(f"Member checked in: {member.name} ({checkin_type})")
            return jsonify({'message': 'Check-in successful', 'member': member_data})
        else:
            logging.warning(f"Member not found with uid: {uid}")
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error checking in member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/esp/checkin', methods=['POST'])
def checkin_member_esp():
    try:
        data = request.get_json()
        MSSV = data.get('MSSV')
        member = Member.query.filter_by(MSSV=MSSV).first()
        if member:
            # Use Vietnam timezone for ESP check-in
            member.checkin_time = format_vn_time()
            member.state = 'Đã checkin'
            member.checkin_ceremony = True
            member.checkin_party = True
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

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get detailed statistics for YEP 2025"""
    try:
        members = Member.query.all()
        
        total = len(members)
        checked_in = len([m for m in members if m.state == 'Đã checkin'])
        ceremony_checked = len([m for m in members if m.checkin_ceremony])
        party_checked = len([m for m in members if m.checkin_party])
        
        # Stats by khoa
        khoa_stats = {}
        for member in members:
            khoa = member.khoa or 'Không xác định'
            if khoa not in khoa_stats:
                khoa_stats[khoa] = {'total': 0, 'checked_in': 0, 'ceremony': 0, 'party': 0}
            khoa_stats[khoa]['total'] += 1
            if member.state == 'Đã checkin':
                khoa_stats[khoa]['checked_in'] += 1
            if member.checkin_ceremony:
                khoa_stats[khoa]['ceremony'] += 1
            if member.checkin_party:
                khoa_stats[khoa]['party'] += 1
        
        # Stats by member type
        type_stats = {'CSV': {'total': 0, 'checked_in': 0}, 'CURRENT': {'total': 0, 'checked_in': 0}}
        for member in members:
            mtype = member.member_type or 'CURRENT'
            if mtype not in type_stats:
                type_stats[mtype] = {'total': 0, 'checked_in': 0}
            type_stats[mtype]['total'] += 1
            if member.state == 'Đã checkin':
                type_stats[mtype]['checked_in'] += 1
        
        # Stats by participation type
        participation_stats = {}
        for member in members:
            ptype = member.participation_type or 'Không xác định'
            if ptype not in participation_stats:
                participation_stats[ptype] = {'total': 0, 'checked_in': 0, 'ceremony': 0, 'party': 0}
            participation_stats[ptype]['total'] += 1
            if member.state == 'Đã checkin':
                participation_stats[ptype]['checked_in'] += 1
            if member.checkin_ceremony:
                participation_stats[ptype]['ceremony'] += 1
            if member.checkin_party:
                participation_stats[ptype]['party'] += 1
        
        return jsonify({
            'total': total,
            'checked_in': checked_in,
            'ceremony_checked': ceremony_checked,
            'party_checked': party_checked,
            'khoa_stats': khoa_stats,
            'type_stats': type_stats,
            'participation_stats': participation_stats
        })
    except Exception as e:
        logging.error(f"Error getting statistics: {e}")
        return jsonify({'error': str(e)}), 500

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
