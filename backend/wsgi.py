from app import app, socketio
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting application with threading mode")
    try:
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