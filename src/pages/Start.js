import React, { useState } from "react";
import { Link } from "react-router-dom";
//import "./HomePage.css"; // Import the CSS file for styling
//import Footer from "../components/Footer.js";    <Footer />

function StartPage() {
  return (
    <div>
      <div className="centered-content">
        <img src="logo512.png" alt="Logo" className="logo2" />

        <h1 className="titlehome">
          Launch, trade and stake <br />
        </h1>
        <h4 className="subtitlehome">A new ecosystem powered by Vortex</h4>

        <div>
          <Link to="/factory">
            <button className="home-button">Launch</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StartPage;
