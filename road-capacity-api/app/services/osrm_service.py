import requests
from typing import List, Tuple, Dict, Any
import logging

from config import OSRM_SERVER_URL

logger = logging.getLogger(__name__)

class OSRMService:
    def __init__(self, server_url: str = OSRM_SERVER_URL):
        self.server_url = server_url
        
    def get_route(self, origin: Tuple[float, float], destination: Tuple[float, float]) -> Dict[str, Any]:
        """
        Get a route from OSRM between origin and destination coordinates.
        
        Args:
            origin: Tuple of (latitude, longitude)
            destination: Tuple of (latitude, longitude)
            
        Returns:
            Dict containing the route information
        """
        url = f"{self.server_url}/route/v1/driving/{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true"
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error communicating with OSRM server: {e}")
            raise Exception(f"Failed to get route from OSRM: {e}")
    
    def extract_geometry(self, route_response: Dict[str, Any]) -> List[List[float]]:
        """
        Extract the geometry coordinates from the OSRM route response.
        
        Args:
            route_response: OSRM route response dictionary
            
        Returns:
            List of coordinate pairs [lon, lat]
        """
        try:
            if (
                "routes" not in route_response or 
                len(route_response["routes"]) == 0 or
                "geometry" not in route_response["routes"][0]
            ):
                raise ValueError("Invalid OSRM response format")
                
            return route_response["routes"][0]["geometry"]["coordinates"]
        except (KeyError, IndexError) as e:
            logger.error(f"Error extracting geometry from OSRM response: {e}")
            raise ValueError(f"Could not extract geometry from OSRM response: {e}")
            
    def get_travel_time(self, route_response: Dict[str, Any]) -> int:
        """
        Extract the estimated travel time in seconds from the OSRM route response.
        
        Args:
            route_response: OSRM route response dictionary
            
        Returns:
            Travel time in seconds
        """
        try:
            if (
                "routes" not in route_response or 
                len(route_response["routes"]) == 0 or
                "duration" not in route_response["routes"][0]
            ):
                raise ValueError("Invalid OSRM response format")
                
            return int(route_response["routes"][0]["duration"])
        except (KeyError, IndexError) as e:
            logger.error(f"Error extracting travel time from OSRM response: {e}")
            raise ValueError(f"Could not extract travel time from OSRM response: {e}")
