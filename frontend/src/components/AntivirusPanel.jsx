import React, { useState } from 'react';
import '../styles/Panel.css';

function AntivirusPanel({ stats }) {
  const [scanning, setScanning] = useState(false);
  const [scanPath, setScanPath] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleScan = async () => {
    if (!scanPath) return;

    setScanning(true);
    try {
      const response = await fetch(`${API_URL}/api/scan/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: scanPath }),
      });
      const data = await response.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({ error: err.message });
    }
    setScanning(false);
  };

  return (
    <div className="panel">
      <h2>Antivirus Scanner</h2>

      <div className="scan-section">
        <h3>Quick Scan</h3>
        <div className="input-group">
          <input
            type="text"
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            placeholder="Enter file or directory path"
            disabled={scanning}
          />
          <button onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {scanResult && (
          <div className={`result ${scanResult.status}`}>
            <strong>Status:</strong> {scanResult.status}
            {scanResult.threat && <p><strong>Threat:</strong> {scanResult.threat}</p>}
            {scanResult.message && <p><strong>Message:</strong> {scanResult.message}</p>}
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3>Scan Statistics</h3>
        <ul>
          <li><strong>Total Scans:</strong> {stats.total_scans || 0}</li>
          <li><strong>Infected Files:</strong> {stats.infected_files || 0}</li>
          <li><strong>Clean Files:</strong> {stats.clean_files || 0}</li>
          <li><strong>Scan Errors:</strong> {stats.scan_errors || 0}</li>
          <li><strong>Quarantine Size:</strong> {formatBytes(stats.quarantine_size || 0)}</li>
        </ul>
      </div>
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

export default AntivirusPanel;
