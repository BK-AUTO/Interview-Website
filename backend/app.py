from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///memberlist251.db'
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

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    MSSV = db.Column(db.String(20), nullable=False, unique=True)  # Increased size for MSSV
    email = db.Column(db.String(100))
    specialist = db.Column(db.String(100))
    linkCV = db.Column(db.String(500))  # Increased size for long URLs
    checkin_time = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True, default='Chưa checkin')
    note = db.Column(db.String(500), nullable=True)  # New field for notes

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

@app.route('/api/members', methods=['GET'])
# @jwt_required()
def get_members():
    try:
        members = Member.query.all()
        return jsonify([{
            'id': member.id,
            'MSSV': member.MSSV,
            'name': member.name,
            'email': member.email,
            'specialist': member.specialist,
            'linkCV': member.linkCV,
            'checkin_time': member.checkin_time,
            'state': member.state,
            'note': member.note
        } for member in members])
    except Exception as e:
        logging.error(f"Error getting members: {e}")
        return jsonify({'error': str(e)}), 500

# @jwt_required()
@app.route('/api/members', methods=['POST'])
def add_member():
    try:
        data = request.get_json()
        new_member = Member(
            name=data['name'],
            MSSV=data['MSSV'],
            email=data.get('email'),
            specialist=data.get('specialist'),
            linkCV=data.get('linkCV'),
            state='Chưa checkin',
            note=data.get('note')
        )
        db.session.add(new_member)
        db.session.commit()
        socketio.emit('member_added', {
            'id': new_member.id,
            'MSSV': new_member.MSSV,
            'name': new_member.name,
            'email': new_member.email,
            'specialist': new_member.specialist,
            'linkCV': new_member.linkCV,
            'checkin_time': new_member.checkin_time,
            'state': new_member.state,
            'note': new_member.note
        })
        logging.info(f"Member added: {new_member.name}")
        return jsonify({'message': 'Member added successfully', 'member': {
            'id': new_member.id,
            'MSSV': new_member.MSSV,
            'name': new_member.name,
            'email': new_member.email,
            'specialist': new_member.specialist,
            'linkCV': new_member.linkCV,
            'checkin_time': new_member.checkin_time,
            'state': new_member.state,
            'note': new_member.note
        }}), 201
    except Exception as e:
        logging.error(f"Error adding member: {e}")
        return jsonify({'error': str(e)}), 500

# @jwt_required()
@app.route('/api/members/<int:id>', methods=['PUT'])
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
            member.specialist = data.get('specialist', member.specialist)
            member.linkCV = data.get('linkCV', member.linkCV)
            member.note = data.get('note', member.note)
            
            # Check for state change
            if 'state' in data:
                member.state = data['state']
                
            db.session.commit()
            
            # Create response data
            member_data = {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'state': member.state,
                'checkin_time': member.checkin_time,
                'note': member.note
            }
            
            # Emit different events based on state changes and transitions
            if member.state == 'Gọi PV' and previous_state != 'Gọi PV':
                # logging.info(f"Emitting interview call event for: {member.name}")
                socketio.emit('member_interview_called', member_data)
            elif member.state == 'Đang phỏng vấn' and previous_state != 'Đang phỏng vấn':
                # logging.info(f"Emitting interview started event for: {member.name}")
                socketio.emit('member_interview_started', member_data)
            elif member.state == 'Đã phỏng vấn' and previous_state != 'Đã phỏng vấn':
                # logging.info(f"Emitting interview completed event for: {member.name}")
                socketio.emit('member_interview_ended', member_data)
            else:
                socketio.emit('member_edited', member_data)
                
            logging.info(f"Member edited: {member.name}, state changed from {previous_state} to {member.state}")
            return jsonify({'message': 'Member edited successfully', 'member': member_data})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error editing member: {e}")
        return jsonify({'error': str(e)}), 500

# @jwt_required()
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
# Remove the @jwt_required() decorator
def checkin_member():
    try:
        data = request.get_json()
        uid = data.get('uid')  # uid có thể là MSSV hoặc ID khác
        
        # Try to find member by MSSV
        member = Member.query.filter_by(MSSV=uid).first()
            
        if member:
            # Check if member is currently in an interview or has completed interview
            if member.state == 'Đang phỏng vấn':
                logging.warning(f"Member {member.name} is currently in an interview and cannot check in")
                return jsonify({
                    'message': 'Cannot check in. Member is currently in an interview'
                }), 400
            elif member.state == 'Đã phỏng vấn':
                logging.warning(f"Member {member.name} has already completed their interview")
                return jsonify({
                    'message': 'Member has already completed their interview'
                }), 400
                
            current_time = format_gmt7_time()
            member.checkin_time = current_time
            member.state = 'Đã checkin'
            db.session.commit()
            
            socketio.emit('member_checked_in', {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            })
            
            logging.info(f"Member checked in: {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            }})
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
            member.checkin_time = format_gmt7_time()
            member.state = 'Đã checkin'
            db.session.commit()
            socketio.emit('member_checked_in', {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            })
            logging.info(f"Member checked in (ESP): {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            }})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error checking in member (ESP): {e}")
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    try:
        logging.info("Client connected to SocketIO")
        with app.app_context():
            members = Member.query.all()
            member_list = [{
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            } for member in members]
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
            member_list = [{
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'email': member.email,
                'specialist': member.specialist,
                'linkCV': member.linkCV,
                'checkin_time': member.checkin_time,
                'state': member.state,
                'note': member.note
            } for member in members]
            emit('members_list', member_list)
    except Exception as e:
        logging.error(f"Error handling update request: {e}")
        emit('error', {'message': f'Internal server error: {str(e)}'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Use threading mode for compatibility
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)