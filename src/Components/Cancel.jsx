import React from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import './Cancel.css';

const center = {
  lat: 53.3498053, // Replace with your desired latitude
  lng: -6.2603097 // Replace with your desired longitude
};

export default function Cancel() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBo-mXQolZZnHe2jxg1FDm8m-ViYP9_AaY" // ⬅️ Replace this with your API key
  });

  return (
    <>
      <div className="cancel_main">
        <div className="cancel_settings">
               <div className="cancel_heading">Cancel</div>
               <div className="cancel_form">
                <div className="enteremail"><span id="email">email</span><span id="email_field"><input type="text" placeholder="Enter the email id used while booking"/></span></div>
                <div className="secretkey"><span id="cancelsecret">Secret key</span><span id="cancelsecret_field"><input type="text" placeholder="Enter secret key used while booking"/></span></div>
                <div className="cancelbtn"><button id="cancel_btns">Cancel</button></div>
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
