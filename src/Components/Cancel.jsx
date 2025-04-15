import React, { useState, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import "./Cancel.css";

const center = {
  lat: 53.3498053, 
  lng: -6.2603097,
};

export default function Cancel() {
  const { isLoaded } = useMaps();
  const [bookingId, setBookingId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [cancelData, setCancelData] = useState(null);
  const mapRef = useRef(null);

  const handleCancel = async () => {
    if (!bookingId.trim()) {
      alert("Please enter the Booking ID to cancel your booking.");
      return;
    }

    try {
      const response = await fetch(
        `http://192.168.118.5:8000/cancel_booking/${bookingId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Cancel booking request failed.\nStatus: ${response.status}\nResponse: ${errorText}`
        );
      }

      const data = await response.json();
      setCancelData(data);
      setShowDialog(true);
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert(`Unable to cancel booking. Reason:\n${error.message}`);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
  };

  return (
    <>
      <div className="cancel_main">
        <div className="cancel_settings">
          <div className="cancel_heading">Cancel Journey</div>
          <div className="cancel_form">
            <div className="secretkey">
              <span id="secret_key">Booking ID</span>
              <span id="cancelsecret_field">
                <input
                  type="text"
                  placeholder="Enter Booking ID used while booking"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </span>
            </div>

            <div className="cancelbtn">
              <button id="cancel_btns" onClick={handleCancel}>
                Cancel Booking
              </button>
            </div>
          </div>
        </div>

        <div className="cancel_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={center}
              zoom={6}
              onLoad={(map) => (mapRef.current = map)}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            />
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>

      {/* Cancellation Success Dialog */}
      {showDialog && cancelData && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h2>Booking Cancellation</h2>
              <button className="close-dialog-btn" onClick={closeDialog}>×</button>
            </div>
            <div className="dialog-content">
              <div className="status-badge success">Successfully Cancelled</div>
              <div className="booking-details">
                <p><strong>Booking ID:</strong> {cancelData.booking_id}</p>
                <p><strong>Status:</strong> {cancelData.status}</p>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="confirm-btn" onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}