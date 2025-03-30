import React, { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Autocomplete,
  DirectionsRenderer,
  Marker,
  Polyline
} from "@react-google-maps/api";
import "./Booking.css";

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
  
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBo-mXQolZZnHe2jxg1FDm8m-ViYP9_AaY",
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
    
    // If input field is cleared, also clear the coordinates and directions
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
    
    // If input field is cleared, also clear the coordinates and directions
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
          fields: ['name', 'geometry', 'formatted_address', 'types', 'address_components']
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            // Process the place information
            let locationName = place.name;
            
            // Add country information if available
            if (place.address_components) {
              const countryComponent = place.address_components.find(component => 
                component.types.includes("country")
              );
              
              if (countryComponent && !locationName.includes(countryComponent.short_name)) {
                locationName += ", " + countryComponent.short_name;
              }
            }
            
            const coords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            // MODIFIED: Check if both start and end locations are already set
            // If yes, clear both and set the clicked location as the new start
            if (startCoords && endCoords) {
              setEndCoords(null);
              setEndLocation("");
              setDirections(null);
              setRouteNotPossible(false);
              
              setStartCoords(coords);
              setStartLocation(locationName);
              setSelectionMode("end");
            } else {
              // Update location based on selection mode
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
    
    // Get address for the clicked location
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: coords });
      
      if (response.results && response.results.length > 0) {
        // Extract location information based on zoom level
        let locationName = "";
        let selectedCoords = coords;
        
        // When zoomed out (zoom level < 8), prefer city-level information
        if (currentZoom < 8) {
          // Look for locality (city) or administrative_area_level_2 (county/district) or administrative_area_level_1 (state/province)
          const cityComponent = findAddressComponent(response.results[0].address_components, "locality");
          const districtComponent = findAddressComponent(response.results[0].address_components, "administrative_area_level_2");
          const adminComponent = findAddressComponent(response.results[0].address_components, "administrative_area_level_1");
          
          // Try to get city name first, then district, then state/country
          if (cityComponent) {
            locationName = cityComponent.long_name;
            
            // Add country for context
            const countryComponent = findAddressComponent(response.results[0].address_components, "country");
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }
            
            // Try to get more precise coordinates for the city center
            const cityResult = response.results.find(result => 
              result.types.includes("locality")
            );
            if (cityResult) {
              selectedCoords = {
                lat: cityResult.geometry.location.lat(),
                lng: cityResult.geometry.location.lng()
              };
            }
          } else if (districtComponent) {
            locationName = districtComponent.long_name;
            const countryComponent = findAddressComponent(response.results[0].address_components, "country");
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }
          } else if (adminComponent) {
            locationName = adminComponent.long_name;
            const countryComponent = findAddressComponent(response.results[0].address_components, "country");
            if (countryComponent && countryComponent.short_name !== adminComponent.long_name) {
              locationName += ", " + countryComponent.short_name;
            }
          } else {
            // Fallback to formatted address
            locationName = response.results[0].formatted_address;
          }
        } else {
          // When zoomed in, use the full address
          locationName = response.results[0].formatted_address;
        }
        
        // MODIFIED: Check if both start and end locations are already set
        // If yes, clear both and set the clicked location as the new start
        if (startCoords && endCoords) {
          // Clear the end location and directions
          setEndCoords(null);
          setEndLocation("");
          setDirections(null);
          setRouteNotPossible(false);
          
          // Set the clicked location as the new start
          setStartCoords(selectedCoords);
          setStartLocation(locationName);
          setSelectionMode("end");
        } else {
          // Original behavior for incomplete selections
          if (selectionMode === "start") {
            setStartCoords(selectedCoords);
            setStartLocation(locationName);
            setSelectionMode("end"); // Switch to selecting end point
          } else {
            setEndCoords(selectedCoords);
            setEndLocation(locationName);
            setSelectionMode("start"); // Reset to selecting start for next time
          }
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };
  
  // Helper function to find a specific type of address component
  const findAddressComponent = (components, type) => {
    return components.find(component => 
      component.types.includes(type)
    );
  };

  // Toggle selection mode
  const toggleSelectionMode = (mode) => {
    setSelectionMode(mode);
  };

  // Clear all locations
  const clearAllLocations = () => {
    setStartLocation("");
    setStartCoords(null);
    setEndLocation("");
    setEndCoords(null);
    setDirections(null);
    setRouteNotPossible(false);
    setSelectionMode("start"); // Reset to start selection mode
  };

  // Calculate route or fallback to direct line when both start and end points are selected
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
            // Successfully got driving directions
            setDirections(result);
            setRouteNotPossible(false);
            
            // Log route segments for demonstration
            const route = result.routes[0];
            console.log("Route segments:", route.legs[0].steps.map(step => ({
              instructions: step.instructions,
              distance: step.distance.text,
              duration: step.duration.text,
            })));
          } else {
            // If driving directions failed (common for long distances or overseas routes),
            // Set directions to null to clear any previous route
            setDirections(null);
            setRouteNotPossible(true);
            
            console.log("Could not calculate driving directions. Status:", status);
            
            // The custom polyline will be rendered in the component
          }
        }
      );
    } else {
      setRouteNotPossible(false);
    }
  }, [startCoords, endCoords]);

  // Handle booking submission
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

    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations on the map.");
      return;
    }

    // In a real implementation, this would call the backend API
    // to check segment availability and book the journey
    
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    alert(`Your journey has been booked!\nYour secret OTP is: ${otp}`);
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
                
                <div style={{ 
                  marginTop: "15px", 
                  marginBottom: "5px", 
                  display: "flex", 
                  justifyContent: "flex-end", 
                  paddingRight: "20px", 
                  paddingLeft: "20px" 
                }}>
                  <button 
                    onClick={clearAllLocations}
                    style={{
                      backgroundColor: "#f44336",
                      color: "white",
                      padding: "5px 10px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      height: "fit-content",
                      alignSelf: "center"
                    }}
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Selection mode indicator */}
                <div style={{ 
                  marginTop: "5px", 
                  fontSize: "14px", 
                  color: "#666",
                  textAlign: "center" 
                }}>
                  Currently selecting: <strong>{selectionMode === "start" ? "Start" : "End"}</strong> location
                  {startCoords && endCoords && 
                    " (Click on map again to restart selection)"
                  }
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
              zoom={6} // Zoomed out a bit to see more of Europe
              onLoad={(map) => (mapRef.current = map)}
              onClick={handleMapClick}
              onPoiClick={handlePoiClick} // Add handler for POI clicks (city names)
              onZoomChanged={() => {
                if (mapRef.current) {
                  setCurrentZoom(mapRef.current.getZoom());
                }
              }}
              options={{
                clickableIcons: true, // Allow clicking on POIs like city names
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {/* Only using the DirectionsRenderer for standard driving routes */}
              {directions && (
                <DirectionsRenderer 
                  directions={directions}
                  options={{
                    suppressMarkers: false, // Use default markers
                    polylineOptions: {
                      strokeColor: "#4285F4", // Google Maps blue
                      strokeWeight: 5
                    }
                  }}
                />
              )}
              
              {/* For long distance/impossible routes, show a custom straight line */}
              {routeNotPossible && startCoords && endCoords && (
                <>
                  {/* Line connecting the points */}
                  <Polyline
                    path={[startCoords, endCoords]}
                    options={{
                      strokeColor: "#4285F4", // Match Google Maps blue
                      strokeWeight: 3,
                      strokeOpacity: 0.7,
                      geodesic: true, // Makes the line follow the curve of the Earth
                      icons: [{
                        icon: {
                          path: "M 0,-1 0,1",
                          strokeOpacity: 1,
                          scale: 3
                        },
                        offset: "0",
                        repeat: "20px"
                      }]
                    }}
                  />
                  
                  {/* Start marker */}
                  <Marker
                    position={startCoords}
                    label="A"
                  />
                  
                  {/* End marker */}
                  <Marker
                    position={endCoords}
                    label="B"
                  />
                </>
              )}
              
              {/* Show markers for incomplete selections (no directions yet) */}
              {!directions && !routeNotPossible && (
                <>
                  {startCoords && (
                    <Marker
                      position={startCoords}
                      label="A"
                    />
                  )}
                  
                  {endCoords && (
                    <Marker
                      position={endCoords}
                      label="B"
                    />
                  )}
                </>
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
    </>
  );
}