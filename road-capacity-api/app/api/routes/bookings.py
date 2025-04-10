from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from db.database import get_db
from schemas.booking import BookingCreate, BookingResponse, BookingWithSegments
from services.booking_service import BookingService

router = APIRouter()

@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    """
    Create a new booking if there's capacity on all road segments.
    """
    booking_service = BookingService(db)
    new_booking, success = booking_service.create_booking(booking)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insufficient capacity on one or more road segments for this route"
        )
    
    return new_booking

@router.get("/bookings/{booking_id}", response_model=BookingWithSegments)
def get_booking(booking_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Get a booking by ID.
    """
    booking_service = BookingService(db)
    booking = booking_service.get_booking(booking_id)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found"
        )
    
    return booking
