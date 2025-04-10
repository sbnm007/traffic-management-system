from sqlalchemy import Column, String, Integer, BigInteger
from geoalchemy2 import Geometry

from db.database import Base

class RoadSegment(Base):
    __tablename__ = "road_segments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    segment_id = Column(String, unique=True, nullable=False)
    geom = Column(Geometry('LINESTRING', srid=4326), nullable=False)
    capacity = Column(Integer, default=100, nullable=False)
    current_load = Column(Integer, default=0, nullable=False)
    osm_id = Column(BigInteger)
    name = Column(String)
