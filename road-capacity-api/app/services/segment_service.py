from typing import List, Tuple, Dict, Any
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString, Point
from datetime import datetime, timedelta

from models.segment import RoadSegment
from models.booking import BookingSegment

logger = logging.getLogger(__name__)

class SegmentService:
    def __init__(self, db: Session):
        self.db = db
        
    def convert_route_to_segments(self, coordinates: List[List[float]]) -> List[str]:
        """
        Convert a route's coordinates to a list of segment IDs.
        
        Args:
            coordinates: List of [lon, lat] coordinates from OSRM
            
        Returns:
            List of segment IDs
        """
        if len(coordinates) < 2:
            raise ValueError("Route must have at least two coordinates")
            
        segment_ids = []
        
        # Convert to LineString for PostGIS
        route_line = LineString(coordinates)
        route_geom = from_shape(route_line, srid=4326)
        
        # Query to find segments that intersect with the route
        query = text("""
            WITH route AS (
                SELECT ST_Transform(ST_SetSRID(ST_GeomFromText(:route_wkt), 4326), 4326) AS geom
            )
            SELECT 
                rs.segment_id,
                ST_AsText(rs.geom) AS geom_wkt,
                ST_Length(ST_Intersection(rs.geom, route.geom)) AS intersection_length
            FROM road_segments rs, route
            WHERE ST_Intersects(rs.geom, route.geom)
            ORDER BY ST_LineLocatePoint(route.geom, ST_StartPoint(ST_Intersection(rs.geom, route.geom)))
        """)
        
        result = self.db.execute(query, {"route_wkt": route_line.wkt})
        
        for row in result:
            segment_ids.append(row.segment_id)
            
        return segment_ids
        
    def check_segments_capacity(self, segment_ids: List[str], start_time: datetime) -> bool:
        """
        Check if all segments in the route have sufficient capacity.
        
        Args:
            segment_ids: List of segment IDs
            start_time: Start time of the booking
            
        Returns:
            True if all segments have capacity, False otherwise
        """
        # Get current load for all segments at the specific time
        for segment_id in segment_ids:
            segment = self.db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
            
            if not segment:
                logger.warning(f"Segment {segment_id} not found in database")
                return False
                
            # Check if adding one more would exceed capacity
            if segment.current_load >= segment.capacity:
                logger.info(f"Segment {segment_id} at capacity (current: {segment.current_load}, max: {segment.capacity})")
                return False
                
        return True
        
    def reserve_segments(self, booking_id: str, segment_ids: List[str]) -> None:
        """
        Reserve capacity on segments for a booking.
        
        Args:
            booking_id: ID of the booking
            segment_ids: List of segment IDs
        """
        # Increment current_load for each segment
        for i, segment_id in enumerate(segment_ids):
            segment = self.db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
            
            if segment:
                segment.current_load += 1
                
                # Create booking segment relation
                booking_segment = BookingSegment(
                    booking_id=booking_id,
                    segment_id=segment_id,
                    segment_order=i
                )
                
                self.db.add(booking_segment)
                
        self.db.commit()
        
    def release_segments_for_expired_bookings(self, time_threshold: datetime) -> int:
        """
        Release capacity for bookings that have expired.
        
        Args:
            time_threshold: Time to check for expired bookings
            
        Returns:
            Number of segments updated
        """
        # Find bookings that have ended before the threshold
        query = text("""
            UPDATE road_segments rs
            SET current_load = GREATEST(current_load - subquery.segment_count, 0)
            FROM (
                SELECT bs.segment_id, COUNT(*) as segment_count
                FROM booking_segments bs
                JOIN bookings b ON bs.booking_id = b.id
                WHERE b.end_time < :threshold
                AND NOT EXISTS (
                    SELECT 1 FROM booking_segments bs2
                    WHERE bs2.segment_id = bs.segment_id
                    AND bs2.booking_id != bs.booking_id
                    AND bs2.booking_id IN (
                        SELECT id FROM bookings 
                        WHERE end_time >= :threshold
                    )
                )
                GROUP BY bs.segment_id
            ) as subquery
            WHERE rs.segment_id = subquery.segment_id
            RETURNING rs.segment_id
        """)
        
        result = self.db.execute(query, {"threshold": time_threshold})
        updated_segments = result.rowcount
        
        self.db.commit()
        return updated_segments
