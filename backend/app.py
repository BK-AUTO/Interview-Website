from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from datetime import datetime
import os
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
# CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins
socketio = SocketIO(app, cors_allowed_origins="*")

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///checkinfirstmeet.db'
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

frontend_folder = os.path.join(os.getcwd(),"..","frontend")
dist_folder = os.path.join(frontend_folder,"dist")

# Server static files from the "dist" folder under the "frontend" directory
@app.route("/",defaults={"filename":""})
@app.route("/<path:filename>")
def index(filename):
  if not filename:
    filename = "index.html"
  return send_from_directory(dist_folder,filename)


class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    mssv = db.Column(db.String(10))
    emailschool = db.Column(db.String(100))
    speciality1 = db.Column(db.String(100))
    uid = db.Column(db.String(100))
    state = db.Column(db.String(100))
    checkin_time = db.Column(db.String(100))

@app.route('/api/members', methods=['GET'])
def get_members():
    members = Member.query.all()
    return jsonify([{
        'id': member.id,
        'uid': member.uid,
        'name': member.name,
        'speciality': member.speciality1,
        'checkin_time': member.checkin_time,
        'state': member.state
    } for member in members])

@app.route('/api/checkin', methods=['POST'])
def checkin_member():
    data = request.get_json()
    uid = data.get('uid')
    member = Member.query.filter_by(uid=uid).first()
    if member:
        member.checkin_time = datetime.now().strftime('%H:%M:%S %d/%m/%Y')
        member.state = 'checked in'
        db.session.commit()
        # Emit an event to notify clients about the check-in
        socketio.emit('member_checked_in', {
            'id': member.id,
            'uid': member.uid,
            'name': member.name,
            'checkin_time': member.checkin_time,
            'state': member.state,
            'speciality': member.speciality1,
        })
        return jsonify({'message': 'Check-in successful', 'member': {
            'id': member.id,
            'uid': member.uid,
            'name': member.name,
            'speciality': member.speciality1,
            'checkin_time': member.checkin_time,
            'state': member.state
        }})
    else:
        return jsonify({'message': 'Member not found'}), 404

@socketio.on('connect')
def handle_connect():
    members = Member.query.all()
    emit('members_list', [{
        'id': member.id,
        'uid': member.uid,
        'name': member.name,
        'checkin_time': member.checkin_time,
        'state': member.state,
        'speciality': member.speciality1,
    } for member in members])

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)