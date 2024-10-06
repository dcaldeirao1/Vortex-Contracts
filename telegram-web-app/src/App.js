// telegram-web-app/src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import LaunchTokens from "./components/LaunchTokens";
import Stake from "./components/Stake";
import Trade from "./components/Trade";
import Header from "./components/Header";
import "./App.css";

function App() {
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const telegram = window.Telegram.WebApp;
      telegram.ready(); // Notify Telegram that the Web App is ready

      // Access user data
      const user = telegram.initDataUnsafe.user;
      if (user) {
        setAddress(user.id); // Or use another identifier
      }

      // Customize Web App appearance (optional)
      telegram.MainButton.text = "Submit";
      telegram.MainButton.show();
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Header />
        <p>Connected Address: {address}</p>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-token" element={<LaunchTokens />} />
          <Route path="/stake" element={<Stake />} />
          <Route path="/trade" element={<Trade />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
