import React from 'react';
import '../styles/StatCard.css';

function StatCard({ title, value, icon, highlight }) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="icon">{icon}</div>
      <div className="content">
        <p className="title">{title}</p>
        <p className="value">{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
