from typing import Dict, Any, Tuple, List
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models.booking import Booking
from schemas.booking import BookingCreate
from services.osrm_service import OSRMService
from services.segment_service import SegmentService

class BookingService:
    def __init__(self, db: Session):
        self.db = db
        self.osrm_service = OSRMService()
        self.segment_service = SegmentService(db)
        
    def create_booking(self, booking_data: BookingCreate) -> Tuple[Booking, bool]:
        """
        Create a new booking if there's enough capacity on all road segments.
        
        Args:
            booking_data: Booking data from request
            
        Returns:
            Tuple of (Booking object, success flag)
        """
        # Get route from OSRM
        origin = (booking_data.origin_lat, booking_data.origin_lon)
        destination = (booking_data.destination_lat, booking_data.destination_lon)
        
        route_response = self.osrm_service.get_route(origin, destination)
        coordinates = self.osrm_service.extract_geometry(route_response)
        
        # Calculate end time based on travel time
        travel_time_seconds = self.osrm_service.get_travel_time(route_response)
        end_time = booking_data.start_time + timedelta(seconds=travel_time_seconds)
        
        # Convert route to segments
        segment_ids = self.segment_service.convert_route_to_segments(coordinates)
        
        # Check if all segments have enough capacity
        if not self.segment_service.check_segments_capacity(segment_ids, booking_data.start_time):
            return None, False
        
        # Create booking record
        booking = Booking(
            id=uuid.uuid4(),
            name=booking_data.name,
            email=booking_data.email,
            drivers_license=booking_data.drivers_license,
            start_time=booking_data.start_time,
            end_time=end_time,
            origin_lat=booking_data.origin_lat,
            origin_lon=booking_data.origin_lon,
            destination_lat=booking_data.destination_lat,
            destination_lon=booking_data.destination_lon,
            created_at=datetime.now()
        )
        
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)
        
        # Reserve capacity on segments
        self.segment_service.reserve_segments(str(booking.id), segment_ids)
        
        return booking, True
        
    def get_booking(self, booking_id: str) -> Booking:
        """
        Get a booking by ID.
        
        Args:
            booking_id: ID of the booking
            
        Returns:
            Booking object or None
        """
        return self.db.query(Booking).filter(Booking.id == booking_id).first()
