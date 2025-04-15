import React, { useState, useRef } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import RouteSegments from "./RouteSegments";
import './Capacity.css';

const center = {
  lat: 53.3498053, // Dublin, Ireland as center
  lng: -6.2603097
};

export default function Capacity() {
  const { isLoaded } = useMaps();
  const [bookingId, setBookingId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(5);
  const mapRef = useRef(null);

  // -----------------------------------------------------
  // NEW: Helper to compute the status based on capacity %
  // -----------------------------------------------------
  function computeSegmentStatus(percentage) {
    if (percentage >= 70) {
      return "full";      // Mark as "full" => (red)
    } else if (percentage >= 50) {
      return "limited";   // Mark as "limited" => (yellow)
    } else {
      return "available"; // Mark as "available" => (green)
    }
  }

  // -----------------------------------------------------
  // UPDATED: handleCheckBooking to fetch from your API
  // -----------------------------------------------------
  const handleCheckBooking = async () => {
    if (!bookingId.trim()) {
      alert("Please enter a booking ID.");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/get_segments/${bookingId}`);
      if (!response.ok) {
        // If the server returns a 404 or other error:
        throw new Error(`Booking not found or server error: ${response.status}`);
      }
      console.log(response);

      // Parse JSON data from server
      const data = await response.json();
      // Expected shape (per your example):
      // {
      //   "booking_id": "...",
      //   "complete": true,
      //   "segments": {
      //     "ireland": {
      //       "booking_id": "...",
      //       "segments": [ { segment_id, current_load, capacity, coordinates, name, ...}, ... ]
      //     },
      //     "some_other_region": { ... },
      //     ...
      //   }
      // }

      // If data.complete is true => treat it as "success" for your UI
      // If false => treat as "failed" (or however you prefer)
      const bookingStatus = data.complete ? "success" : "failed";

      // Flatten or combine all region segments into a single array for your UI
      let allSegments = [];
      if (data.segments && typeof data.segments === 'object') {
        Object.values(data.segments).forEach(region => {
          // region.segments is an array of segment objects
          region.segments.forEach(seg => {
            // capacity percentage
            const capacityPercentage = (seg.current_load / seg.capacity) * 100;
            // Convert the array of [lng, lat] into { lat, lng } pairs 
            // so you can pick the "startCoords" and "endCoords".
            // We'll assume the first coordinate is "startCoords" and the last is "endCoords".
            if (seg.coordinates.length > 0) {
              const start = seg.coordinates[0]; // [lng, lat]
              const end = seg.coordinates[seg.coordinates.length - 1]; // [lng, lat]

              allSegments.push({
                name: seg.name || "Unnamed Road",
                // capacity for display in your info window
                capacity: Math.round(capacityPercentage), 
                // status for color in your <RouteSegments /> or InfoWindow
                status: computeSegmentStatus(capacityPercentage),
                // isGateway? (Your code references isGateway, but it’s not in the API data.
                // We'll default to false or you can set a condition if you have that info)
                isGateway: false,
                // Convert the first & last array coords to {lat, lng} for the existing code
                startCoords: { lat: start[1], lng: start[0] },
                endCoords: { lat: end[1], lng: end[0] }
              });
            }
          });
        });
      }

      // Build the final bookingInfo object that your code expects
      const newBooking = {
        status: bookingStatus,
        startCoords: allSegments.length > 0 ? allSegments[0].startCoords : undefined,
        endCoords: allSegments.length > 0
          ? allSegments[allSegments.length - 1].endCoords
          : undefined,
        segments: allSegments,
        // For the InfoWindow Marker titles
        startLocation: "Unknown Start",
        endLocation: "Unknown End",
        alternativeSegments: [] // if you need it; else remove
      };

      // Set in state and display the dialog
      setBookingInfo(newBooking);
      setShowDialog(true);

      // ------------------------------------------------------
      // If "success" and we have at least one start/end coords
      // recenter and zoom the map
      // ------------------------------------------------------
      if (
        newBooking.status === "success" &&
        newBooking.startCoords &&
        newBooking.endCoords
      ) {
        const newCenter = {
          lat: (newBooking.startCoords.lat + newBooking.endCoords.lat) / 2,
          lng: (newBooking.startCoords.lng + newBooking.endCoords.lng) / 2
        };

        setMapCenter(newCenter);

        const distance = getDistanceFromLatLonInKm(
          newBooking.startCoords.lat,
          newBooking.startCoords.lng,
          newBooking.endCoords.lat,
          newBooking.endCoords.lng
        );

        let zoom = 5;
        if (distance < 100) zoom = 8;
        else if (distance < 500) zoom = 6;
        else if (distance < 1000) zoom = 5;
        else zoom = 4;

        setMapZoom(zoom);
      }

    } catch (err) {
      console.error("API error:", err);

      // If fetch or JSON parse fails, or 404 => treat as "not-found"
      setBookingInfo({
        status: "not-found",
        message: "No booking found with this ID. Please check and try again."
      });
      setShowDialog(true);
    }
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleSegmentClick = (segment) => {
    setSelectedSegment(segment);
  };

  const renderSegments = () => {
    if (!bookingInfo || bookingInfo.status !== "success" || !bookingInfo.segments) {
      return null;
    }

    // We build a mockDirections object from bookingInfo.segments for <RouteSegments />
    const mockDirections = {
      routes: [{
        legs: [{
          steps: bookingInfo.segments.map(segment => ({
            instructions: segment.name,
            distance: { text: "N/A" },
            duration: { text: "N/A" }
          })),
          start_location: bookingInfo.segments[0].startCoords,
          end_location: bookingInfo.segments[bookingInfo.segments.length - 1].endCoords,
          start_address: bookingInfo.startLocation,
          end_address: bookingInfo.endLocation
        }]
      }]
    };

    return (
      <RouteSegments 
        directions={mockDirections} 
        routeNotPossible={false}
        startCoords={bookingInfo.startCoords}
        endCoords={bookingInfo.endCoords}
        showLegend={true}
        customSegments={bookingInfo.segments}
        alternativeSegments={bookingInfo.alternativeSegments}
        onSegmentClick={handleSegmentClick}
      />
    );
  };

  return (
    <>
      <div className="capacity_main">
        <div className="capacity_settings">
          <div className="capacity_heading">Check Booking & Capacity</div>
          <div className="capacity_form">
            <div className="booking_id">
              <span id="booking_id_label">Booking ID</span>
              <span id="booking_id_field">
                <input 
                  type="text"
                  placeholder="Enter your booking ID"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </span>
            </div>
            <div className="check_btn">
              <button id="check_btns" onClick={handleCheckBooking}>
                Check Booking Status
              </button>
            </div>
          </div>
        </div>

        <div className="capacity_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={mapCenter}
              zoom={mapZoom}
              onLoad={(map) => (mapRef.current = map)}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {renderSegments()}

              {/* Display markers for start and end if booking is successful */}
              {bookingInfo && bookingInfo.status === "success" && bookingInfo.startCoords && bookingInfo.endCoords && (
                <>
                  <Marker
                    position={bookingInfo.startCoords}
                    label="A"
                    title={bookingInfo.startLocation}
                  />
                  <Marker
                    position={bookingInfo.endCoords}
                    label="B"
                    title={bookingInfo.endLocation}
                  />
                </>
              )}

              {selectedSegment && (
                <InfoWindow
                  position={{
                    lat: (selectedSegment.startCoords.lat + selectedSegment.endCoords.lat) / 2,
                    lng: (selectedSegment.startCoords.lng + selectedSegment.endCoords.lng) / 2
                  }}
                  onCloseClick={() => setSelectedSegment(null)}
                >
                  <div className="segment-info">
                    <h3>{selectedSegment.name}</h3>
                    <p className={`status status-${selectedSegment.status}`}>
                      Status: {selectedSegment.status === 'available' ? 'Available' : 
                               selectedSegment.status === 'limited' ? 'Limited' : 'Full'}
                    </p>
                    <p>
                      <strong>Current Capacity:</strong> {selectedSegment.capacity}%
                    </p>
                    {selectedSegment.isGateway && (
                      <p className="gateway-info">
                        This is a gateway node between regions/countries
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>

      {/* Booking Status Dialog */}
      {showDialog && bookingInfo && (
        <div className="booking-dialog-overlay">
          <div className="booking-dialog">
            <div className="dialog-header">
              <h2>Booking Status</h2>
              <button className="close-btn" onClick={handleCloseDialog}>×</button>
            </div>
            <div className="dialog-content">
              {bookingInfo.status === "success" && (
                <>
                  <div className="status-badge success">Successfully Booked</div>
                  <div className="booking-details">
                    <p><strong>Booking ID:</strong> {bookingId}</p>
                  </div>
                </>
              )}

              {bookingInfo.status === "failed" && (
                <>
                  <div className="status-badge failed">Booking Failed</div>
                  <div className="booking-details">
                    <p><strong>Booking ID:</strong> {bookingId}</p>
                  </div>
                </>
              )}

              {bookingInfo.status === "not-found" && (
                <>
                  <div className="status-badge not-found">Not Found</div>
                  <p>{bookingInfo.message}</p>
                </>
              )}
            </div>
            <div className="dialog-footer">
              <button className="primary-btn" onClick={handleCloseDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
