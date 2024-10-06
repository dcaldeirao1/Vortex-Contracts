// telegram-web-app/src/components/Header.js
import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header>
      <nav>
        <Link to="/">Dashboard</Link> |{" "}
        <Link to="/create-token">Create Token</Link> |{" "}
        <Link to="/stake">Stake</Link> | <Link to="/trade">Trade</Link>
      </nav>
      <hr />
    </header>
  );
};

export default Header;
