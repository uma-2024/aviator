import React from "react";
import astronautImage from "../../Assets/robote.png"; // Path to your astronaut image
import "./Loader.css"; // Import the CSS for loader styling

const Loader = () => {
  return (
    <div className="loader-container">
      {/* Astronaut Image at the top */}
      <img src={astronautImage} alt="Astronaut" className="loader-astronaut" />
      {/* Glowing Circle with rotating animation */}
      <div className="loader-circle"></div>
    </div>
  );
};

export default Loader;
