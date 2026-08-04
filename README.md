# McAfee at Home - Advanced Home Network Security

A comprehensive, self-hosted security solution combining DNS-level threat blocking with endpoint antivirus scanning for your entire home network. Based on research of McAfee, Malwarebytes, and other industry leaders.

## Features

### 🛡️ DNS Shield - Network-Wide Protection
- **Ad Blocking**: Blocks ads at the DNS level before they load
- **Malware Filtering**: Intercepts requests to known malicious domains
- **Phishing Protection**: Stops phishing attempts network-wide
- **Tracker Blocking**: Prevents data collection and tracking domains
- **Whitelist/Blacklist**: Fully customizable allow/block lists
- **DNS Caching**: Fast, efficient query caching
- **No Per-Device Setup**: Protects all devices automatically

### 🔍 Antivirus Engine - Endpoint Protection
- **ClamAV Integration**: Industry-standard malware detection
- **Real-Time Scanning**: On-access file scanning
- **Scheduled Scans**: Automated full-system scans
- **Quarantine System**: Isolated threat storage
- **File Stream Scanning**: Scan data streams and uploads
- **Threat Reporting**: Detailed scan logs and history
- **Signature Updates**: Automatic malware definition updates

### 📊 Web Dashboard
- **Real-Time Statistics**: Live protection metrics
- **Threat Monitoring**: View blocked threats and detections
- **Quick Scanning**: Scan files/directories on-demand
- **Quarantine Management**: Restore or delete quarantined files
- **System Health**: Monitor all protection components
- **Configuration**: Manage blocklists and whitelist

## Architecture

```
┌──────────────────────────────────────────────────────┐
│           Home Network Devices                       │
│    (PCs, Phones, IoT, Smart TVs, etc.)              │
└────────────────┬─────────────────────────────────────┘
                 │ All DNS queries
                 ↓
┌──────────────────────────────────────────────────────┐
│      DNS Shield (Port 53)                            │
│  • Blocks ads, malware, phishing, trackers          │
│  • Configurable blocklists and whitelist            │
│  • Fast DNS caching                                  │
└────────────────┬─────────────────────────────────────┘
                 │ Allowed requests forward to upstream
                 ↓
┌──────────────────────────────────────────────────────┐
│          Antivirus Engine (Port 3310)                │
│  • ClamAV-based malware detection                   │
│  • File/stream scanning API                          │
│  • Quarantine management                             │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│       API Server (Port 8000)                         │
│  • Coordinates all components                       │
│  • Serves dashboard backend                         │
│  • Handles configuration                            │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│    Web Dashboard (Port 8080)                         │
│  • Real-time statistics                             │
│  • Threat management                                │
│  • On-demand scanning                               │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 2GB+ RAM
- 5GB+ disk space

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kgarner310/McAfee-at-Home.git
cd McAfee-at-Home
```

2. **Start the services**
```bash
docker-compose up -d
```

3. **Access the dashboard**
```
http://localhost:8080
```

The system will initialize on first start - this may take 2-3 minutes for ClamAV database updates.

### Configuration

Edit these files to customize protection:

- **`config/blocklists.json`** - Manage DNS blocklists
- **`config/whitelist.txt`** - Domains never to block
- **`.env`** (create if needed) - Override container settings

## Deployment Options

### Option 1: Docker Compose (Recommended for Most Users)
```bash
docker-compose up -d
```
Best for: Home users, small networks, Raspberry Pi, NAS devices

### Option 2: Kubernetes
```bash
kubectl apply -f k8s/
```
Best for: Advanced users, large deployments, high availability

### Option 3: Bare Metal
Install each component separately:
1. DNS Shield (requires Go)
2. ClamAV (via package manager)
3. Flask API (requires Python 3.9+)
4. Dashboard (requires Node.js)

## API Reference

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Scan File
```bash
curl -X POST http://localhost:8000/api/scan/file \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/path/to/file"}'
```

### Scan Directory
```bash
curl -X POST http://localhost:8000/api/scan/directory \
  -H "Content-Type: application/json" \
  -d '{"dir_path": "/path/to/directory"}'
```

### Get Statistics
```bash
curl http://localhost:8000/api/stats
```

### Quarantine Management
```bash
curl http://localhost:8000/api/quarantine
curl -X POST http://localhost:8000/api/quarantine/restore \
  -H "Content-Type: application/json" \
  -d '{"file_name": "threat_name_filename"}'
```

## Performance & Resources

| Component | Memory | CPU | Network |
|-----------|--------|-----|---------|
| DNS Shield | 50-100MB | Low | All DNS queries |
| Antivirus | 200-500MB | Moderate | On-demand only |
| API Server | 100-200MB | Low | API requests |
| Dashboard | 50MB | Low | Web traffic |
| **Total** | **~500MB-1GB** | **Low** | **Efficient** |

## Network Setup

### Router Configuration (Recommended)
For maximum network-wide protection, point your router's DNS to this system:

1. Access router settings (typically 192.168.1.1)
2. Set DNS servers to your server's IP
   - Primary DNS: Your server IP
   - Secondary DNS: 8.8.8.8 or 1.1.1.1

### Individual Device Configuration
If router DNS isn't available, configure DNS per device:

**Windows:** Settings → Network → DNS settings  
**macOS:** System Preferences → Network → DNS  
**Linux:** Edit `/etc/resolv.conf`  
**iOS/Android:** Settings → WiFi → DNS

## Threat Detection

### Blocklists Included
- Ad Serving Domains (DoubleClick, AdSense, etc.)
- Malware Domains (Active threats)
- Tracking Domains (Analytics, social)
- Phishing Sites (Credential theft)

### Custom Blocklists
Add additional blocklists by editing `config/blocklists.json`:
```json
{
  "name": "Custom List",
  "url": "https://example.com/blocklist.txt",
  "enabled": true,
  "domains": ["example.com"]
}
```

## Comparison with Commercial Solutions

| Feature | McAfee at Home | McAfee | Malwarebytes |
|---------|---|---|---|
| Network-wide DNS protection | ✅ | ❌ | ❌ |
| DNS filtering built-in | ✅ | Partial | Partial |
| Ad blocking | ✅ | Partial | ✅ |
| Antivirus engine | ✅ | ✅ | Antimalware |
| Phishing protection | ✅ | ✅ | ✅ |
| Self-hosted | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ |
| No monthly fees | ✅ | ❌ | ❌ |
| Full privacy control | ✅ | ❌ | ❌ |

## Troubleshooting

### DNS Shield not blocking
1. Check if DNS is properly configured: `nslookup ads.google.com`
2. Verify router DNS settings point to this system
3. Check blocklist configuration in dashboard

### Antivirus not detecting
1. Ensure ClamAV is running: `docker ps | grep antivirus`
2. Update signatures: `docker exec mcafee-antivirus freshclam`
3. Check API connectivity: `curl http://localhost:8000/api/health`

### Dashboard not loading
1. Check API server: `curl http://localhost:8000/api/health`
2. Verify ports: `docker ps` should show all services
3. Check browser console for errors

### High memory usage
- Reduce DNS cache size in environment variables
- Limit concurrent scans
- Check for malware samples in quarantine

## Development

### Build from source
```bash
docker-compose build
```

### Run tests
```bash
docker-compose exec api-server pytest tests/
```

### View logs
```bash
docker-compose logs -f
```

## Security Considerations

- **Firewall**: Restrict access to port 8080 to trusted networks
- **Updates**: Regularly update ClamAV signatures
- **Backups**: Keep configuration backed up
- **Privacy**: No telemetry is sent externally
- **Credentials**: Change default credentials if exposed

## Contributing

Contributions welcome! Areas of focus:
- Additional blocklist sources
- Performance optimizations
- UI/UX improvements
- Documentation
- Bug fixes

## License

GNU General Public License v3.0 - See LICENSE file

## Support & Documentation

- [Installation Guide](./docs/INSTALL.md)
- [Configuration Guide](./docs/CONFIG.md)
- [API Documentation](./docs/API.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## Disclaimer

This software is provided as-is without warranty. While it provides significant protection against known threats, no security solution is 100% effective. Always maintain good security practices and keep software updated.
