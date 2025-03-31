import React, { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  Autocomplete,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import "./Booking.css";

const center = {
  lat: 53.3498053,
  lng: -6.2603097,
};

export default function Booking() {
  const { isLoaded } = useMaps();
  const [startAutocomplete, setStartAutocomplete] = useState(null);
  const [endAutocomplete, setEndAutocomplete] = useState(null);

  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [license, setLicense] = useState("");

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [directions, setDirections] = useState(null);

  const mapRef = useRef(null);

  const handleStartPlaceChanged = () => {
    const place = startAutocomplete.getPlace();
    if (place && place.geometry) {
      const location = place.geometry.location;
      setStartLocation(place.formatted_address || place.name);
      setStartCoords({ lat: location.lat(), lng: location.lng() });
    }
  };

  const handleEndPlaceChanged = () => {
    const place = endAutocomplete.getPlace();
    if (place && place.geometry) {
      const location = place.geometry.location;
      setEndLocation(place.formatted_address || place.name);
      setEndCoords({ lat: location.lat(), lng: location.lng() });
    }
  };

  useEffect(() => {
    if (isLoaded && startCoords && endCoords && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: startCoords,
          destination: endCoords,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, startCoords, endCoords]);

  const handleBooking = () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !startLocation.trim() ||
      !endLocation.trim() ||
      !license.trim()
    ) {
      alert("All fields are required, and driving license is mandatory.");
      return;
    }

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    alert(`Your journey has been booked!\nYour secret OTP is: ${otp}`);
  };

  return (
    <>
      <div className="booking_main">
        <div className="booking_settings">
          <div className="booking_heading">booking</div>
          <div className="booking_form">
            <div className="name">
              <span id="name">Name</span>
              <span id="name_field">
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </div>

            <div className="email">
              <span id="email">Email</span>
              <span id="email_field">
                <input
                  type="email"
                  placeholder="Enter your Email Id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </div>

            {isLoaded && (
              <>
                <div className="startlocation">
                  <span id="start">Start Location</span>
                  <span id="start_field">
                    <Autocomplete
                      onLoad={setStartAutocomplete}
                      onPlaceChanged={handleStartPlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search start location"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                      />
                    </Autocomplete>
                  </span>
                </div>

                <div className="endlocation">
                  <span id="end">End Location</span>
                  <span id="end_field">
                    <Autocomplete
                      onLoad={setEndAutocomplete}
                      onPlaceChanged={handleEndPlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search end location"
                        value={endLocation}
                        onChange={(e) => setEndLocation(e.target.value)}
                      />
                    </Autocomplete>
                  </span>
                </div>
              </>
            )}

            <div className="drivinglicense">
              <span id="driving">Driving Licence</span>
              <span id="driving_field">
                <input
                  type="text"
                  placeholder="Enter your driving license number"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                />
              </span>
            </div>

            <div className="book_btn">
              <button id="book_btns" onClick={handleBooking}>
                Book Journey
              </button>
            </div>
          </div>
        </div>

        <div className="booking_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={center}
              zoom={12}
              onLoad={(map) => (mapRef.current = map)}
            >
              {startCoords && <Marker position={startCoords} />}
              {endCoords && <Marker position={endCoords} />}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
    </>
  );
}