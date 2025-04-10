import logging
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from db.database import get_db
from config import APP_NAME, APP_VERSION, APP_DESCRIPTION, CRON_INTERVAL_MINUTES
from api.routes.bookings import router as bookings_router
from cron.capacity_updater import CapacityUpdater

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

# Include routers
app.include_router(bookings_router, prefix="/api", tags=["bookings"])

# Initialize scheduler
scheduler = BackgroundScheduler()

@app.on_event("startup")
def startup_event():
    """
    Start the background scheduler for the capacity updater cron job
    """
    logger.info("Starting capacity updater cron job")
    
    # Create updater function that gets a new DB session each time
    def update_capacities():
        db = next(get_db())
        try:
            CapacityUpdater(db).update_capacities()
        finally:
            db.close()
    
    # Add job to scheduler
    scheduler.add_job(
        update_capacities,
        trigger=IntervalTrigger(minutes=CRON_INTERVAL_MINUTES),
        id="capacity_updater",
        name="Update road segment capacities",
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    logger.info(f"Capacity updater scheduled to run every {CRON_INTERVAL_MINUTES} minutes")

@app.on_event("shutdown")
def shutdown_event():
    """
    Shutdown the background scheduler
    """
    logger.info("Shutting down capacity updater")
    scheduler.shutdown()

@app.get("/api/health")
def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}
