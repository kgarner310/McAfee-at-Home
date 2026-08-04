import React, { useState, useEffect } from 'react';
import '../styles/Panel.css';

function QuarantinePanel() {
  const [quarantine, setQuarantine] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchQuarantine();
    const interval = setInterval(fetchQuarantine, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuarantine = async () => {
    try {
      const response = await fetch(`${API_URL}/api/quarantine`);
      const data = await response.json();
      setQuarantine(data.items || []);
    } catch (err) {
      console.error('Failed to fetch quarantine:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (fileName) => {
    if (!window.confirm(`Restore ${fileName}?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/quarantine/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: fileName }),
      });
      const data = await response.json();

      if (data.success) {
        alert(`File restored to ${data.original_path}`);
        fetchQuarantine();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(`Failed to restore: ${err.message}`);
    }
  };

  if (loading) return <div className="panel loading">Loading quarantine...</div>;

  return (
    <div className="panel">
      <h2>Quarantine Vault</h2>
      {quarantine.length === 0 ? (
        <p className="empty-message">✅ No quarantined files - Your system is clean!</p>
      ) : (
        <table className="quarantine-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {quarantine.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{formatBytes(item.size)}</td>
                <td>{new Date(item.modified).toLocaleDateString()}</td>
                <td>
                  <button
                    className="restore-btn"
                    onClick={() => handleRestore(item.name)}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default QuarantinePanel;
