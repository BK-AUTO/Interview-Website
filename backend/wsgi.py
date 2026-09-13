from app import app, db
import logging
import os

# Set up production logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure tables exist at startup
with app.app_context():
    try:
        db.create_all()
        logger.info("Database initialized successfully with WAL optimizations")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")

if __name__ == "__main__":
    logger.info("Starting development server on port 8091")
    app.run(
        host='0.0.0.0',
        port=8091,
        debug=False,
        threaded=True
    )