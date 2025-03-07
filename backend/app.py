from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///memberlist.db'
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string'  # Change this to a random secret key

db = SQLAlchemy(app)
# Use threading async_mode which is compatible with Python 3.12
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)
CORS(app)  # Enable CORS for the app
jwt = JWTManager(app)

# Configure detailed logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    MSSV = db.Column(db.String(10))
    specialist = db.Column(db.String(100))
    role = db.Column(db.String(100))
    IDcard = db.Column(db.String(100))

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    MSSV = db.Column(db.String(10), db.ForeignKey('member.MSSV'), nullable=False)
    member = db.relationship('Member', backref=db.backref('user', lazy=True))

@app.route('/register', methods=['POST'])
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

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity={'username': user.username, 'MSSV': user.MSSV})
    return jsonify({'access_token': access_token}), 200

@app.route('/members', methods=['GET'])
# @jwt_required()
def get_members():
    try:
        members = Member.query.all()
        return jsonify([{
            'id': member.id,
            'MSSV': member.MSSV,
            'name': member.name,
            'specialist': member.specialist,
            'role': member.role,
            'IDcard': member.IDcard
        } for member in members])
    except Exception as e:
        logging.error(f"Error getting members: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/members', methods=['POST'])
@jwt_required()
def add_member():
    try:
        data = request.get_json()
        new_member = Member(
            name=data['name'],
            MSSV=data['MSSV'],
            specialist=data['specialist'],
            role=data['role'],
            IDcard=data['IDcard']
        )
        db.session.add(new_member)
        db.session.commit()
        socketio.emit('member_added', {
            'id': new_member.id,
            'MSSV': new_member.MSSV,
            'name': new_member.name,
            'specialist': new_member.specialist,
            'role': new_member.role,
            'IDcard': new_member.IDcard
        })
        logging.info(f"Member added: {new_member.name}")
        return jsonify({'message': 'Member added successfully', 'member': {
            'id': new_member.id,
            'MSSV': new_member.MSSV,
            'name': new_member.name,
            'specialist': new_member.specialist,
            'role': new_member.role,
            'IDcard': new_member.IDcard
        }}), 201
    except Exception as e:
        logging.error(f"Error adding member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/members/<int:id>', methods=['PUT'])
@jwt_required()
def edit_member(id):
    try:
        data = request.get_json()
        member = Member.query.get(id)
        if member:
            member.name = data['name']
            member.MSSV = data['MSSV']
            member.specialist = data['specialist']
            member.role = data['role']
            member.IDcard = data['IDcard']
            db.session.commit()
            socketio.emit('member_edited', {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            })
            logging.info(f"Member edited: {member.name}")
            return jsonify({'message': 'Member edited successfully', 'member': {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            }})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error editing member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/members/<int:id>', methods=['DELETE'])
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

@app.route('/checkin', methods=['POST'])
# @jwt_required()
def checkin_member():
    try:
        data = request.get_json()
        MSSV = data.get('MSSV')
        member = Member.query.filter_by(MSSV=MSSV).first()
        if member:
            member.checkin_time = datetime.now().strftime('%H:%M:%S %d/%m/%Y')
            member.state = 'Đã checkin'
            db.session.commit()
            socketio.emit('member_checked_in', {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            })
            logging.info(f"Member checked in: {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            }})
        else:
            return jsonify({'message': 'Member not found'}), 404
    except Exception as e:
        logging.error(f"Error checking in member: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/esp/checkin', methods=['POST'])
@jwt_required()
def checkin_member_esp():
    try:
        data = request.get_json()
        IDcard = data.get('IDcard')
        member = Member.query.filter_by(IDcard=IDcard).first()
        if member:
            member.checkin_time = datetime.now().strftime('%H:%M:%S %d/%m/%Y')
            member.state = 'Đã checkin'
            db.session.commit()
            socketio.emit('member_checked_in', {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            })
            logging.info(f"Member checked in (ESP): {member.name}")
            return jsonify({'message': 'Check-in successful', 'member': {
                'id': member.id,
                'MSSV': member.MSSV,
                'name': member.name,
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
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
                'specialist': member.specialist,
                'role': member.role,
                'IDcard': member.IDcard
            } for member in members]
            logging.info(f"Sending members list: {len(member_list)} members")
            emit('members_list', member_list)
    except Exception as e:
        logging.error(f"Error during socket connection: {e}")
        emit('error', {'message': f'Internal server error: {str(e)}'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Use threading mode for compatibility
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)