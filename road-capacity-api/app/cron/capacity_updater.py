import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.segment_service import SegmentService
from config import CRON_INTERVAL_MINUTES

logger = logging.getLogger(__name__)

class CapacityUpdater:
    def __init__(self, db: Session):
        self.db = db
        self.segment_service = SegmentService(db)
        
    def update_capacities(self):
        """
        Update road segment capacities by releasing capacity from expired bookings.
        """
        # Calculate threshold time (15 minutes ago)
        threshold = datetime.now() - timedelta(minutes=CRON_INTERVAL_MINUTES)
        
        logger.info(f"Running capacity update at {datetime.now()}, checking bookings that ended before {threshold}")
        
        # Release capacity for expired bookings
        updated_count = self.segment_service.release_segments_for_expired_bookings(threshold)
        
        logger.info(f"Updated capacity for {updated_count} segments")
