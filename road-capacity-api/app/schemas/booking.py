from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, validator, constr

class BookingBase(BaseModel):
    name: str
    email: EmailStr
    drivers_license: constr(min_length=5, max_length=50)
    start_time: datetime
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float

    @validator('origin_lat', 'destination_lat')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @validator('origin_lon', 'destination_lon')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v

class BookingCreate(BookingBase):
    pass

class BookingResponse(BookingBase):
    id: UUID
    end_time: datetime
    created_at: datetime

    class Config:
        orm_mode = True

class SegmentBase(BaseModel):
    segment_id: str
    capacity: int
    current_load: int
    
    class Config:
        orm_mode = True

class BookingWithSegments(BookingResponse):
    segments: List[SegmentBase] = []