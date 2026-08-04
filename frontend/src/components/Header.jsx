import React from 'react';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-section">
          <h1 className="logo">🛡️ McAfee at Home</h1>
          <p className="tagline">Advanced Home Network Protection</p>
        </div>
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span className="status-text">Protected</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
