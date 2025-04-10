import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    drivers_license = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lon = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    
    # Relationship with booking segments
    segments = relationship("BookingSegment", back_populates="booking")

class BookingSegment(Base):
    __tablename__ = "booking_segments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"))
    segment_id = Column(String, ForeignKey("road_segments.segment_id"))
    segment_order = Column(Integer, nullable=False)
    
    # Relationships
    booking = relationship("Booking", back_populates="segments")
    segment = relationship("RoadSegment")
