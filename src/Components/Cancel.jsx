import React, { useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import './Cancel.css';

const center = {
  lat: 53.3498053,
  lng: -6.2603097
};

export default function Cancel() {
  const { isLoaded } = useMaps();
  const [email, setEmail] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const handleCancel = () => {
    if (!email.trim() || !secretKey.trim()) {
      alert("Please enter both email and secret key to cancel your booking.");
      return;
    }
    
    // In a real implementation, you would send this to your backend
    alert(`Booking cancellation request submitted for ${email}.\nYou will receive a confirmation email shortly.`);
  };

  return (
    <>
      <div className="cancel_main">
        <div className="cancel_settings">
          <div className="cancel_heading">Cancel</div>
          <div className="cancel_form">
            <div className="enteremail">
              <span id="email">Email</span>
              <span id="email_field">
                <input 
                  type="text" 
                  placeholder="Enter the email id used while booking"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </div>
            <div className="secretkey">
              <span id="secret_key">Secret key</span>
              <span id="cancelsecret_field">
                <input 
                  type="text" 
                  placeholder="Enter secret key used while booking"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </span>
            </div>
            <div className="cancelbtn">
              <button id="cancel_btns" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        </div>
        <div className="cancel_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={center}
              zoom={12}
            />
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
    </>
  );
}