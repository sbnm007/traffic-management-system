import React, { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";
import "./Booking.css";
import RouteSegments from "./RouteSegments"; // Import RouteSegments component
import DataConfig from "./utils/Dataconfig";

const center = {
  lat: 53.3498053, // Dublin, Ireland as center
  lng: -6.2603097,
};

export default function Booking() {
  // State for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [license, setLicense] = useState("");

  // State for location inputs
  const [startAutocomplete, setStartAutocomplete] = useState(null);
  const [endAutocomplete, setEndAutocomplete] = useState(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");

  // State for map interaction
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [directions, setDirections] = useState(null);
  const [selectionMode, setSelectionMode] = useState("start"); // "start" or "end"
  const [currentZoom, setCurrentZoom] = useState(6); // Track the current zoom level
  const [routeNotPossible, setRouteNotPossible] = useState(false); // Track if direct driving route is not possible

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: DataConfig.GOOGLE_API_KEY,
    libraries: ["places"],
  });

  // Handle manual changes to the Autocomplete inputs
  const handleStartPlaceChanged = () => {
    if (startAutocomplete) {
      const place = startAutocomplete.getPlace();
      if (place && place.geometry) {
        const location = place.geometry.location;
        setStartLocation(place.formatted_address || place.name);
        setStartCoords({ lat: location.lat(), lng: location.lng() });
      }
    }
  };

  const handleEndPlaceChanged = () => {
    if (endAutocomplete) {
      const place = endAutocomplete.getPlace();
      if (place && place.geometry) {
        const location = place.geometry.location;
        setEndLocation(place.formatted_address || place.name);
        setEndCoords({ lat: location.lat(), lng: location.lng() });
      }
    }
  };

  // Handle changes to input fields, clearing map selections if input is emptied
  const handleStartLocationChange = (e) => {
    const value = e.target.value;
    setStartLocation(value);

    if (!value.trim()) {
      setStartCoords(null);
      if (directions) {
        setDirections(null);
      }
      setRouteNotPossible(false);
    }
  };

  const handleEndLocationChange = (e) => {
    const value = e.target.value;
    setEndLocation(value);

    if (!value.trim()) {
      setEndCoords(null);
      if (directions) {
        setDirections(null);
      }
      setRouteNotPossible(false);
    }
  };

  // Handle clicks on POIs (Points of Interest) such as city names
  const handlePoiClick = (e) => {
    if (e && e.placeId) {
      // Prevent the default info window from appearing
      e.stop();

      // Get details about the clicked place
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        {
          placeId: e.placeId,
          fields: ["name", "geometry", "formatted_address", "types", "address_components"],
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            let locationName = place.name;

            // Add country info if available
            if (place.address_components) {
              const countryComponent = place.address_components.find((component) =>
                component.types.includes("country")
              );
              if (countryComponent && !locationName.includes(countryComponent.short_name)) {
                locationName += ", " + countryComponent.short_name;
              }
            }

            const coords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            // If both start and end are set, reset them and pick new start
            if (startCoords && endCoords) {
              setEndCoords(null);
              setEndLocation("");
              setDirections(null);
              setRouteNotPossible(false);

              setStartCoords(coords);
              setStartLocation(locationName);
              setSelectionMode("end");
            } else {
              if (selectionMode === "start") {
                setStartCoords(coords);
                setStartLocation(locationName);
                setSelectionMode("end");
              } else {
                setEndCoords(coords);
                setEndLocation(locationName);
                setSelectionMode("start");
              }
            }
          }
        }
      );
    }
  };

  // Handle map clicks for selecting start/end points
  const handleMapClick = async (e) => {
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    const coords = { lat: clickedLat, lng: clickedLng };

    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: coords });

      if (response.results && response.results.length > 0) {
        let locationName = "";
        let selectedCoords = coords;

        // If zoomed out, prefer city-level info
        if (currentZoom < 8) {
          const cityComponent = findAddressComponent(
            response.results[0].address_components,
            "locality"
          );
          const districtComponent = findAddressComponent(
            response.results[0].address_components,
            "administrative_area_level_2"
          );
          const adminComponent = findAddressComponent(
            response.results[0].address_components,
            "administrative_area_level_1"
          );

          if (cityComponent) {
            locationName = cityComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }

            // Possibly refine coords to city center
            const cityResult = response.results.find((r) => r.types.includes("locality"));
            if (cityResult) {
              selectedCoords = {
                lat: cityResult.geometry.location.lat(),
                lng: cityResult.geometry.location.lng(),
              };
            }
          } else if (districtComponent) {
            locationName = districtComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }
          } else if (adminComponent) {
            locationName = adminComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (
              countryComponent &&
              countryComponent.short_name !== adminComponent.long_name
            ) {
              locationName += ", " + countryComponent.short_name;
            }
          } else {
            locationName = response.results[0].formatted_address;
          }
        } else {
          // If zoomed in
          locationName = response.results[0].formatted_address;
        }

        // If both set, reset end
        if (startCoords && endCoords) {
          setEndCoords(null);
          setEndLocation("");
          setDirections(null);
          setRouteNotPossible(false);

          setStartCoords(selectedCoords);
          setStartLocation(locationName);
          setSelectionMode("end");
        } else {
          if (selectionMode === "start") {
            setStartCoords(selectedCoords);
            setStartLocation(locationName);
            setSelectionMode("end");
          } else {
            setEndCoords(selectedCoords);
            setEndLocation(locationName);
            setSelectionMode("start");
          }
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Helper to find a specific type of address component
  const findAddressComponent = (components, type) => {
    return components.find((component) => component.types.includes(type));
  };

  // Clear all
  const clearAllLocations = () => {
    setName("");
    setEmail("");
    setLicense("");
    setStartLocation("");
    setStartCoords(null);
    setEndLocation("");
    setEndCoords(null);
    setDirections(null);
    setRouteNotPossible(false);
    setSelectionMode("start");
  };

  // Watch for start/end coords to auto-generate route
  useEffect(() => {
    if (startCoords && endCoords) {
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
            setRouteNotPossible(false);

            const route = result.routes[0];
            console.log(
              "Route segments:",
              route.legs[0].steps.map((step) => ({
                instructions: step.instructions,
                distance: step.distance.text,
                duration: step.duration.text,
              }))
            );
          } else {
            setDirections(null);
            setRouteNotPossible(true);
            console.log("Could not calculate driving directions. Status:", status);
          }
        }
      );
    } else {
      setRouteNotPossible(false);
    }
  }, [startCoords, endCoords]);

  // Close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Reset dialog state if needed
    setBookingResult(null);
  };

  // Send data to backend & retrieve segments
  const handleBooking = async () => {
    // Form validation
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

    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations on the map.");
      return;
    }

    setIsDialogOpen(true);
    setIsLoading(true);
    setBookingResult(null);

    const bookingData = {
      name: name.trim(),
      email: email.trim(),
      driving_license: license.trim(),
      start_coordinates: `${startCoords.lat},${startCoords.lng}`,
      start_location: startLocation,
      destination_coordinates: `${endCoords.lat},${endCoords.lng}`,
      destination_location: endLocation,
      start_time: new Date().toISOString(),
    };

    try {
      // Simulate API call with a delay (remove this when connecting to a real backend)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful response (replace with actual API call later)
      const mockBookingId = Math.floor(Math.random() * 900000 + 100000);
      setBookingResult({
        success: true,
        bookingId: mockBookingId
      });
      
      /* Uncomment when ready to connect to real backend
      // 1) Send booking data to backend
      const sendResponse = await fetch("http://127.0.0.1:8000/send_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!sendResponse.ok) {
        throw new Error("Failed to send booking request.");
      }

      const sendResult = await sendResponse.json();
      console.log("Response from /send_request:", sendResult);
      const bookingId = sendResult.booking_id;

      // 2) Once booking is successful, fetch route segments
      const getSegmentsResponse = await fetch(
        `http://127.0.0.1:8000/get_segments/${bookingId}`
      );

      if (!getSegmentsResponse.ok) {
        throw new Error("Failed to fetch segment data.");
      }

      const segmentData = await getSegmentsResponse.json();
      console.log("Segment data from /get_segments:", segmentData);
      
      */
      
    } catch (error) {
      console.error("Booking error:", error);
      
      setBookingResult({
        success: false,
        message: error.message || "Booking failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="booking_main">
        <div className="booking_settings">
          <div className="booking_heading">Booking</div>
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
                        placeholder="Search or click on map"
                        value={startLocation}
                        onChange={handleStartLocationChange}
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
                        placeholder="Search or click on map"
                        value={endLocation}
                        onChange={handleEndLocationChange}
                      />
                    </Autocomplete>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={clearAllLocations} className="clear-btn">
                    Clear All
                  </button>
                </div>

                {/* Selection mode indicator */}
                <div className="selection-mode">
                  Currently selecting: <strong>{selectionMode === "start" ? "Start" : "End"}</strong> location
                  {startCoords && endCoords && " (Click on map again to restart selection)"}
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
              zoom={6}
              onLoad={(map) => (mapRef.current = map)}
              onClick={handleMapClick}
              onPoiClick={handlePoiClick} // For POI clicks (city names)
              onZoomChanged={() => {
                if (mapRef.current) {
                  setCurrentZoom(mapRef.current.getZoom());
                }
              }}
              options={{
                clickableIcons: true, // Allow clicking on POIs
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {/* Use RouteSegments component instead of the original DirectionsRenderer */}
              <RouteSegments
                directions={directions}
                routeNotPossible={routeNotPossible}
                startCoords={startCoords}
                endCoords={endCoords}
                showLegend={true}
              />

              {/* Display markers only if no driving Directions are displayed */}
              {!directions && !routeNotPossible && (
                <>
                  {startCoords && <Marker position={startCoords} label="A" />}
                  {endCoords && <Marker position={endCoords} label="B" />}
                </>
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
      {isDialogOpen && (
        <div className="booking-dialog-overlay">
          <div className="booking-dialog">
            <div className="dialog-header">
              <h2>{isLoading ? 'Processing' : bookingResult?.success ? 'Booking Successful' : 'Booking Failed'}</h2>
              {!isLoading && (
                <button className="close-btn" onClick={handleCloseDialog}>×</button>
              )}
            </div>
            
            <div className="dialog-content">
              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Processing your booking request...</p>
                </div>
              ) : (
                <>
                  {bookingResult?.success ? (
                    <>
                      <div className="status-badge success">Successfully Booked</div>
                      <div className="booking-details">
                        <p><strong>Booking ID:</strong> {bookingResult.bookingId}</p>
                        <p>Your journey has been successfully booked. Please keep your booking ID.</p>
                        
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="status-badge failed">Booking Failed</div>
                      <p>{bookingResult?.message || "An error occurred during the booking process. Please try again."}</p>
                    </>
                  )}
                </>
              )}
            </div>
            
            {!isLoading && (
              <div className="dialog-footer">
                <button className="primary-btn" onClick={handleCloseDialog}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}