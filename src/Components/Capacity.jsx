import React, { useState, useRef } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import RouteSegments from "./RouteSegments";
import './Capacity.css';

const center = {
  lat: 53.3498053, // Dublin, Ireland as center
  lng: -6.2603097
};

const mockBookings = {
  "12345": {
    status: "success"
  },
  "67890": {
    status: "failed"
  }
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

  const handleCheckBooking = () => {
    if (!bookingId.trim()) {
      alert("Please enter a booking ID.");
      return;
    }
    
    // In a real implementation, you would fetch this from your backend
    const booking = mockBookings[bookingId];
    
    if (booking) {
      setBookingInfo(booking);
      setShowDialog(true);
      
      if (booking.status === "success" && booking.startCoords && booking.endCoords) {
        const newCenter = {
          lat: (booking.startCoords.lat + booking.endCoords.lat) / 2,
          lng: (booking.startCoords.lng + booking.endCoords.lng) / 2
        };
        
        setMapCenter(newCenter);
       
        const distance = getDistanceFromLatLonInKm(
          booking.startCoords.lat, booking.startCoords.lng,
          booking.endCoords.lat, booking.endCoords.lng
        );
     
        let zoom = 5;
        if (distance < 100) zoom = 8;
        else if (distance < 500) zoom = 6;
        else if (distance < 1000) zoom = 5;
        else zoom = 4;
        
        setMapZoom(zoom);
      }
    } else {
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
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
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
              {bookingInfo && bookingInfo.status === "success" && (
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
                    <p><strong>Current Capacity:</strong> {selectedSegment.capacity}%</p>
                    {selectedSegment.isGateway && (
                      <p className="gateway-info">This is a gateway node between regions/countries</p>
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