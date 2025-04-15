import React, { useState, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import Modal from "react-modal";
import "./Cancel.css";

const center = {
  lat: 53.3498053,
  lng: -6.2603097,
};

// Required for accessibility by react-modal
Modal.setAppElement("#root");

export default function Cancel() {
  const { isLoaded } = useMaps();
  const [bookingId, setBookingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelData, setCancelData] = useState(null);
  const mapRef = useRef(null);

  const handleCancel = async () => {
    if (!bookingId.trim()) {
      alert("Please enter the Booking ID to cancel your booking.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/cancel_booking/${bookingId.trim()}`,
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
      setModalOpen(true);
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert(`Unable to cancel booking. Reason:\n${error.message}`);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setBookingId("");
    setCancelData(null);
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

      <Modal
        isOpen={modalOpen}
        onRequestClose={closeModal}
        contentLabel="Booking Cancelled"
        className="popup_modal"
        overlayClassName="popup_overlay"
      >
        <h2>Booking Cancelled</h2>
        <div className="success_tag">Successfully Cancelled</div>
        <div className="booking_info">
          <strong>Booking ID:</strong> {cancelData?.booking_id}
          <p>
            Your journey has been successfully cancelled.{" "}
            {cancelData?.total_segments_freed} segments freed.
          </p>
        </div>
        <button className="close_btn" onClick={closeModal}>
          Close
        </button>
      </Modal>
    </>
  );
}
