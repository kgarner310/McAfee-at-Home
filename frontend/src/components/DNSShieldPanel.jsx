import React, { useState, useEffect } from 'react';
import '../styles/Panel.css';

function DNSShieldPanel() {
  const [dnsStats, setDnsStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchDNSStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dns/stats`);
        const data = await response.json();
        setDnsStats(data);
      } catch (err) {
        setDnsStats({ error: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDNSStats();
    const interval = setInterval(fetchDNSStats, 10000);
    return () => clearInterval(interval);
  }, [API_URL]);

  if (loading) return <div className="panel loading">Loading DNS Shield stats...</div>;

  return (
    <div className="panel">
      <h2>DNS Shield Protection</h2>

      <div className="status-section">
        <div className={`status-badge ${dnsStats?.status || 'disconnected'}`}>
          {dnsStats?.status === 'running' ? '🟢 Active' : '🔴 Inactive'}
        </div>
        <p>Last updated: {new Date(dnsStats?.timestamp).toLocaleTimeString()}</p>
      </div>

      <div className="info-section">
        <h3>Features</h3>
        <ul>
          <li>✅ Network-wide ad blocking at DNS level</li>
          <li>✅ Malware domain filtering</li>
          <li>✅ Phishing protection</li>
          <li>✅ Tracker blocking</li>
          <li>✅ Configurable blocklists</li>
          <li>✅ Whitelist management</li>
        </ul>
      </div>

      <div className="info-section">
        <h3>How it Works</h3>
        <p>
          DNS Shield intercepts all DNS queries from your network devices and blocks
          requests to known malicious and advertising domains before they can load.
          This protects all devices on your network automatically without per-device configuration.
        </p>
      </div>

      <div className="info-section">
        <h3>Configuration</h3>
        <p><strong>Listen Address:</strong> 0.0.0.0:53</p>
        <p><strong>Upstream DNS:</strong> 8.8.8.8, 1.1.1.1</p>
        <p><strong>Cache Size:</strong> 10000 entries</p>
      </div>
    </div>
  );
}

export default DNSShieldPanel;
