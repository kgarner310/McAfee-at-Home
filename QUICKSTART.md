# Quick Start Guide - McAfee at Home

Get up and running in 5 minutes.

## Prerequisites
- Docker & Docker Compose installed
- Internet connection
- Administrator/root access (for DNS configuration)

## 1. Start the System

```bash
# Clone and enter directory
git clone https://github.com/kgarner310/McAfee-at-Home.git
cd McAfee-at-Home

# Start all services
docker-compose up -d

# Wait for initialization (2-3 minutes)
docker-compose logs -f
```

## 2. Access the Dashboard

Open your browser and go to:
```
http://localhost:8080
```

You should see the McAfee at Home dashboard with:
- Protection status
- Scan statistics
- Threat monitoring
- System health

## 3. Configure Your Network

### Option A: Router DNS (Recommended)
This protects ALL devices on your network automatically.

1. Open your router settings (usually 192.168.1.1)
2. Find DNS settings (often under Network or Internet)
3. Set DNS servers to:
   - Primary: Your server IP (e.g., 192.168.1.100)
   - Secondary: 8.8.8.8 (Google DNS)
4. Save and restart router

### Option B: Individual Device DNS
If router access isn't available, configure each device.

**Windows 10/11:**
- Settings → Network → WiFi → Manage Known Networks
- Choose your network → Properties
- DNS settings → Edit
- Set to Manual → IPv4: your-server-ip

**macOS:**
- System Preferences → Network → WiFi
- Advanced → DNS → Click + → Add your server IP

**Linux:**
```bash
sudo nano /etc/resolv.conf
# Add: nameserver YOUR_SERVER_IP
```

**iPhone/iPad:**
- Settings → WiFi → Your Network → Configure DNS
- Set to Manual → Add your server IP

**Android:**
- Settings → WiFi → Long press network → Modify
- Set DNS to your server IP

## 4. Test Protection

### Test Ad Blocking
```bash
nslookup ads.google.com
# Should return: NXDOMAIN or localhost address
```

### Test Malware Protection
Try scanning a file:

```bash
curl -X POST http://localhost:8000/api/scan/file \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/etc/hosts"}'
```

### Test Dashboard
Visit dashboard at http://localhost:8080
- Check "Overview" tab for statistics
- Click "DNS Shield" tab to verify status
- Click "Antivirus" tab for scan options

## 5. Customize Protection

### Add Custom Blocklist
Edit `config/blocklists.json`:
```json
{
  "name": "My Custom Blocklist",
  "enabled": true,
  "domains": [
    "malicious-domain.com",
    "ads.example.com"
  ]
}
```

### Whitelist Trusted Sites
Edit `config/whitelist.txt`:
```
# Add domains you want to allow
trusted-site.com
work-vpn.company.com
```

After editing, restart services:
```bash
docker-compose restart dns-shield
```

## 6. Monitor Protection

### View Dashboard Stats
- **Overview**: Quick protection summary
- **Antivirus**: Scan history and statistics
- **DNS Shield**: Blocked threats and status
- **Quarantine**: Isolated infected files

### Check Logs
```bash
# DNS Shield logs
docker-compose logs dns-shield

# Antivirus logs
docker-compose logs antivirus

# API Server logs
docker-compose logs api-server
```

## Common Tasks

### Scan Your System
1. Open dashboard → Antivirus tab
2. Enter a directory path (e.g., `/home` or `C:\Users`)
3. Click "Scan"
4. Wait for results

### Restore a Quarantined File
1. Dashboard → Quarantine tab
2. Find the infected file
3. Click "Restore" (file moved to ~/restored_*)
4. Review file before using

### Update Antivirus Signatures
```bash
docker-compose exec antivirus freshclam
```

### Check System Status
```bash
docker-compose ps
```

All services should show "Up".

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

### DNS not working
```bash
# Test DNS resolution
nslookup google.com  # Should work
nslookup ads.google.com  # Should be blocked

# Verify service is running
docker-compose ps | grep dns-shield
```

### Dashboard not loading
```bash
# Verify API is running
curl http://localhost:8000/api/health

# Check if port 8080 is in use
lsof -i :8080

# Restart dashboard
docker-compose restart dashboard
```

## Next Steps

- Read [Configuration Guide](./docs/CONFIG.md) for advanced options
- Review [API Documentation](./docs/API.md) for integration
- Check [Troubleshooting](./docs/TROUBLESHOOTING.md) if issues occur

## Support

Having issues? Check the main [README.md](./README.md) for more information.

---

**You're now protected!** 🛡️

Your network is blocking ads, malware, and tracking - on ALL devices automatically.
