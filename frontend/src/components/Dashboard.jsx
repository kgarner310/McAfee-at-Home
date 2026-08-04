import React, { useState } from 'react';
import StatCard from './StatCard';
import AntivirusPanel from './AntivirusPanel';
import DNSShieldPanel from './DNSShieldPanel';
import QuarantinePanel from './QuarantinePanel';
import '../styles/Dashboard.css';

function Dashboard({ stats, loading, error }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return <div className="dashboard loading">Loading...</div>;
  }

  if (error) {
    return <div className="dashboard error">Error: {error}</div>;
  }

  const avStats = stats?.antivirus || {};
  const systemStats = stats?.system || {};

  return (
    <div className="dashboard">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'antivirus' ? 'active' : ''}`}
          onClick={() => setActiveTab('antivirus')}
        >
          Antivirus
        </button>
        <button
          className={`tab ${activeTab === 'dns' ? 'active' : ''}`}
          onClick={() => setActiveTab('dns')}
        >
          DNS Shield
        </button>
        <button
          className={`tab ${activeTab === 'quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('quarantine')}
        >
          Quarantine
        </button>
      </div>

      <div className="content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <StatCard
                title="Scans Performed"
                value={avStats.total_scans || 0}
                icon="📊"
              />
              <StatCard
                title="Threats Detected"
                value={avStats.infected_files || 0}
                icon="⚠️"
                highlight={avStats.infected_files > 0}
              />
              <StatCard
                title="Clean Files"
                value={avStats.clean_files || 0}
                icon="✅"
              />
              <StatCard
                title="System Health"
                value={avStats.clamd_connected ? 'Good' : 'Warning'}
                icon={avStats.clamd_connected ? '💚' : '⚠️'}
              />
            </div>
            <div className="system-info">
              <h3>System Information</h3>
              <p><strong>Hostname:</strong> {systemStats.hostname}</p>
              <p><strong>Last Update:</strong> {new Date(stats.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {activeTab === 'antivirus' && <AntivirusPanel stats={avStats} />}
        {activeTab === 'dns' && <DNSShieldPanel />}
        {activeTab === 'quarantine' && <QuarantinePanel />}
      </div>
    </div>
  );
}

export default Dashboard;
