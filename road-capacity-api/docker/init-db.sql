-- Create extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Road segments table
CREATE TABLE IF NOT EXISTS road_segments (
    id SERIAL PRIMARY KEY,
    segment_id VARCHAR(255) UNIQUE NOT NULL,
    geom GEOMETRY(LINESTRING, 4326) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    current_load INTEGER NOT NULL DEFAULT 0,
    osm_id BIGINT,
    name VARCHAR(255)
);

-- Create spatial index on geom column
CREATE INDEX IF NOT EXISTS road_segments_geom_idx ON road_segments USING GIST(geom);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    drivers_license VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lon DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lon DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking segments join table
CREATE TABLE IF NOT EXISTS booking_segments (
    id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    segment_id VARCHAR(255) REFERENCES road_segments(segment_id),
    segment_order INTEGER NOT NULL
);