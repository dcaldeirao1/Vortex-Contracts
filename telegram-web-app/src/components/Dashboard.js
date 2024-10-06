// telegram-web-app/src/components/Dashboard.js
import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2>Welcome to Vortex</h2>
      <div className="options">
        <Link to="/create-token">
          <button>Create Token & Borrow Liquidity</button>
        </Link>
        <Link to="/stake">
          <button>Stake</button>
        </Link>
        <Link to="/trade">
          <button>Trade</button>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
