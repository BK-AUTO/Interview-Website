from app import app, socketio, db
import logging
import os

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting application with threading mode")
    try:
        # Make sure CORS is properly handled
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
        
        # Create database tables if they don't exist
        with app.app_context():
            # Uncomment the next line if you need to recreate the database with the new columns
            db.drop_all()  # Be careful with this in production!
            db.create_all()
            logger.info("Database tables created/updated successfully")
        
        socketio.run(
            app,
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=True,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        logger.error(f"Error starting the application: {e}")