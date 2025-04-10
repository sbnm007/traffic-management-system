import os
from dotenv import load_dotenv

load_dotenv()

# Database settings
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/road_capacity")

# OSRM settings
OSRM_SERVER_URL = os.getenv("OSRM_SERVER_URL", "http://osrm-server:5000")

# Application settings
APP_NAME = "Road Capacity Management API"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "API for managing road capacity and bookings"

# Cron job settings
CRON_INTERVAL_MINUTES = 15
