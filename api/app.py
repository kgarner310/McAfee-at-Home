from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
import socket
from datetime import datetime, timedelta
from scanner import AntivirusScanner

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('McAfee-API')

scanner = AntivirusScanner(
    clamd_host=os.getenv('ANTIVIRUS_HOST', 'antivirus'),
    clamd_port=int(os.getenv('ANTIVIRUS_PORT', 3310))
)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {
            'antivirus': 'connected' if scanner.is_connected() else 'disconnected'
        }
    })

@app.route('/api/dns/stats', methods=['GET'])
def dns_stats():
    try:
        dns_host = os.getenv('DNS_SHIELD_HOST', 'dns-shield')
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(2)
            try:
                sock.connect((dns_host, 53))
                dns_status = 'running'
            except:
                dns_status = 'disconnected'
    except:
        dns_status = 'error'

    return jsonify({
        'status': dns_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/scan/file', methods=['POST'])
def scan_file():
    data = request.get_json()
    if not data or 'file_path' not in data:
        return jsonify({'error': 'file_path required'}), 400

    file_path = data.get('file_path')
    result = scanner.scan_file(file_path)

    logger.info(f"File scan: {file_path} - Status: {result.get('status')}")
    return jsonify(result)

@app.route('/api/scan/directory', methods=['POST'])
def scan_directory():
    data = request.get_json()
    if not data or 'dir_path' not in data:
        return jsonify({'error': 'dir_path required'}), 400

    dir_path = data.get('dir_path')
    results = scanner.scan_directory(dir_path)

    summary = {
        'total': len(results),
        'infected': sum(1 for r in results if r.get('status') == 'infected'),
        'clean': sum(1 for r in results if r.get('status') == 'clean'),
        'errors': sum(1 for r in results if r.get('status') == 'error'),
        'results': results
    }

    logger.info(f"Directory scan: {dir_path} - Found {summary['infected']} infected files")
    return jsonify(summary)

@app.route('/api/scan/stream', methods=['POST'])
def scan_stream():
    if not request.data:
        return jsonify({'error': 'No data provided'}), 400

    result = scanner.scan_stream(request.data)
    logger.info(f"Stream scan - Status: {result.get('status')}")
    return jsonify(result)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    antivirus_stats = scanner.get_stats()

    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'antivirus': antivirus_stats,
        'system': {
            'uptime': 'N/A',
            'hostname': socket.gethostname()
        }
    })

@app.route('/api/quarantine', methods=['GET'])
def get_quarantine():
    items = scanner.get_quarantine_list()
    return jsonify({
        'items': items,
        'total_files': len(items),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/quarantine/restore', methods=['POST'])
def restore_quarantine():
    data = request.get_json()
    if not data or 'file_name' not in data:
        return jsonify({'error': 'file_name required'}), 400

    file_name = data.get('file_name')
    quarantine_dir = os.path.join('/app', 'quarantine')
    quarantine_path = os.path.join(quarantine_dir, file_name)

    if not os.path.exists(quarantine_path):
        return jsonify({'error': 'File not found in quarantine'}), 404

    try:
        original_path = os.path.expanduser('~/restored_' + os.path.basename(quarantine_path))
        os.rename(quarantine_path, original_path)
        logger.info(f"Restored quarantined file: {file_name} -> {original_path}")

        return jsonify({
            'success': True,
            'message': f'File restored to {original_path}',
            'original_path': original_path
        })
    except Exception as e:
        logger.error(f"Failed to restore {file_name}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        'dns_shield_host': os.getenv('DNS_SHIELD_HOST', 'dns-shield'),
        'antivirus_host': os.getenv('ANTIVIRUS_HOST', 'antivirus'),
        'antivirus_port': int(os.getenv('ANTIVIRUS_PORT', 3310)),
        'log_level': os.getenv('LOG_LEVEL', 'INFO')
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("Starting McAfee API Server")
    app.run(host='0.0.0.0', port=8000, debug=False)
