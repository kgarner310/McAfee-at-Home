import os
import logging
import pyclamd
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('McAfee-AV')

class AntivirusScanner:
    def __init__(self, clamd_host='localhost', clamd_port=3310):
        self.clamd_host = clamd_host
        self.clamd_port = clamd_port
        self.clam = None
        self.quarantine_dir = Path('/app/quarantine')
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)
        self.scan_history = []
        self.connect()

    def connect(self):
        try:
            self.clam = pyclamd.ClamdNetworkSocket(self.clamd_host, self.clamd_port)
            if not self.clam.ping():
                raise Exception("ClamAV not responding")
            logger.info(f"Connected to ClamAV at {self.clamd_host}:{self.clamd_port}")
        except Exception as e:
            logger.error(f"Failed to connect to ClamAV: {e}")
            self.clam = None

    def is_connected(self) -> bool:
        if not self.clam:
            return False
        try:
            return self.clam.ping()
        except:
            return False

    def scan_file(self, file_path: str) -> Dict:
        if not self.is_connected():
            return {
                'status': 'error',
                'message': 'ClamAV not available',
                'file': file_path,
                'timestamp': datetime.now().isoformat()
            }

        if not os.path.exists(file_path):
            return {
                'status': 'error',
                'message': 'File not found',
                'file': file_path,
                'timestamp': datetime.now().isoformat()
            }

        try:
            result = self.clam.scan_file(file_path)

            if result is None:
                scan_result = {
                    'status': 'clean',
                    'file': file_path,
                    'threat': None,
                    'timestamp': datetime.now().isoformat(),
                    'action': 'none'
                }
            else:
                threat_info = result.get(file_path, ('UNKNOWN', 'Unknown'))
                threat_name = threat_info[0] if isinstance(threat_info, tuple) else str(threat_info)

                scan_result = {
                    'status': 'infected',
                    'file': file_path,
                    'threat': threat_name,
                    'timestamp': datetime.now().isoformat(),
                    'action': 'quarantined'
                }

                self._quarantine_file(file_path, threat_name)
                logger.warning(f"THREAT DETECTED: {file_path} - {threat_name}")

            self.scan_history.append(scan_result)
            return scan_result

        except Exception as e:
            logger.error(f"Scan error for {file_path}: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'file': file_path,
                'timestamp': datetime.now().isoformat()
            }

    def scan_directory(self, dir_path: str) -> List[Dict]:
        results = []
        if not os.path.isdir(dir_path):
            return results

        for root, dirs, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                result = self.scan_file(file_path)
                results.append(result)

        return results

    def scan_stream(self, data: bytes) -> Dict:
        if not self.is_connected():
            return {
                'status': 'error',
                'message': 'ClamAV not available',
                'timestamp': datetime.now().isoformat()
            }

        try:
            result = self.clam.scan_stream(data)

            if result is None:
                scan_result = {
                    'status': 'clean',
                    'threat': None,
                    'timestamp': datetime.now().isoformat(),
                    'size': len(data)
                }
            else:
                threat_name = result[0] if isinstance(result, tuple) else str(result)
                scan_result = {
                    'status': 'infected',
                    'threat': threat_name,
                    'timestamp': datetime.now().isoformat(),
                    'size': len(data),
                    'action': 'blocked'
                }
                logger.warning(f"THREAT IN STREAM: {threat_name}")

            return scan_result

        except Exception as e:
            logger.error(f"Stream scan error: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _quarantine_file(self, file_path: str, threat_name: str):
        try:
            file_name = os.path.basename(file_path)
            threat_safe = threat_name.replace('/', '_').replace('\\', '_')
            quarantine_name = f"{threat_safe}_{file_name}"
            quarantine_path = self.quarantine_dir / quarantine_name

            if os.path.exists(file_path):
                os.rename(file_path, quarantine_path)
                logger.info(f"Quarantined: {file_path} -> {quarantine_path}")
        except Exception as e:
            logger.error(f"Failed to quarantine {file_path}: {e}")

    def get_stats(self) -> Dict:
        infected = sum(1 for s in self.scan_history if s.get('status') == 'infected')
        clean = sum(1 for s in self.scan_history if s.get('status') == 'clean')
        errors = sum(1 for s in self.scan_history if s.get('status') == 'error')

        return {
            'total_scans': len(self.scan_history),
            'infected_files': infected,
            'clean_files': clean,
            'scan_errors': errors,
            'clamd_connected': self.is_connected(),
            'quarantine_size': sum(
                os.path.getsize(f) for f in self.quarantine_dir.iterdir()
                if f.is_file()
            ) if self.quarantine_dir.exists() else 0
        }

    def get_quarantine_list(self) -> List[Dict]:
        if not self.quarantine_dir.exists():
            return []

        items = []
        for file_path in self.quarantine_dir.iterdir():
            if file_path.is_file():
                items.append({
                    'name': file_path.name,
                    'size': file_path.stat().st_size,
                    'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })

        return items
