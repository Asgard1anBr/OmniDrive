#!/usr/bin/env python3
"""
OmniDrive S.M.A.R.T. Companion — v1.0
Servidor local que lê dados S.M.A.R.T. dos drives conectados via smartctl.
O OmniDrive (browser) faz fetch em http://localhost:7777/smart para exibir saúde.

Requisitos:
  - Python 3.7+
  - smartmontools instalado (smartctl no PATH)
    Windows: https://www.smartmontools.org/wiki/Download#InstalltheWindowspackage
    Linux:   sudo apt install smartmontools
    Mac:     brew install smartmontools

Uso:
  python omnidrive-smart.py
  (manter rodando enquanto usa o OmniDrive)
"""

import http.server
import json
import subprocess
import re
import sys
import os

PORT = 7777

def find_smartctl():
    paths = [
        'smartctl',
        r'C:\Program Files\smartmontools\bin\smartctl.exe',
        r'C:\Program Files (x86)\smartmontools\bin\smartctl.exe',
        '/usr/sbin/smartctl',
        '/usr/local/bin/smartctl',
    ]
    for p in paths:
        try:
            subprocess.run([p, '--version'], capture_output=True, timeout=5)
            return p
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return None

SMARTCTL = find_smartctl()

def get_drive_letters():
    """Maps physical drive index to list of drive letters (Windows only)."""
    if os.name != 'nt':
        return {}
    mapping = {}
    try:
        r = subprocess.run(
            ['powershell', '-NoProfile', '-Command',
             'Get-Partition | Where-Object DriveLetter | Select-Object DiskNumber, DriveLetter | ConvertTo-Json'],
            capture_output=True, text=True, timeout=10
        )
        data = json.loads(r.stdout)
        if isinstance(data, dict):
            data = [data]
        for item in data:
            disk = item.get('DiskNumber')
            letter = item.get('DriveLetter')
            if disk is not None and letter:
                mapping.setdefault(disk, []).append(letter)
    except Exception:
        pass
    return mapping

def list_drives():
    if not SMARTCTL:
        return []
    try:
        r = subprocess.run([SMARTCTL, '--scan', '-j'], capture_output=True, text=True, timeout=10)
        data = json.loads(r.stdout)
        return [d['name'] for d in data.get('devices', [])]
    except Exception:
        try:
            r = subprocess.run([SMARTCTL, '--scan'], capture_output=True, text=True, timeout=10)
            return [line.split()[0] for line in r.stdout.strip().split('\n') if line.strip()]
        except Exception:
            return []

def parse_smart(device):
    if not SMARTCTL:
        return {'error': 'smartctl não encontrado. Instale smartmontools.'}
    try:
        r = subprocess.run(
            [SMARTCTL, '-a', '-j', device],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(r.stdout)

        info = data.get('model_name', '') or data.get('model_family', '')
        serial = data.get('serial_number', '')
        health = data.get('smart_status', {}).get('passed', None)
        temp = data.get('temperature', {}).get('current', None)
        power_on = data.get('power_on_time', {}).get('hours', None)

        attrs = {}
        for attr in data.get('ata_smart_attributes', {}).get('table', []):
            attrs[attr['id']] = {
                'name': attr.get('name', ''),
                'value': attr.get('value', 0),
                'worst': attr.get('worst', 0),
                'thresh': attr.get('thresh', 0),
                'raw': attr.get('raw', {}).get('value', 0),
                'flags': attr.get('flags', {})
            }

        reallocated = attrs.get(5, {}).get('raw', 0)
        pending = attrs.get(197, {}).get('raw', 0)
        uncorrectable = attrs.get(198, {}).get('raw', 0)
        wear_level = attrs.get(177, {}).get('value', None) or attrs.get(231, {}).get('value', None)

        score = 100
        if reallocated:
            score -= min(reallocated * 5, 40)
        if pending:
            score -= min(pending * 10, 30)
        if uncorrectable:
            score -= min(uncorrectable * 10, 30)
        if temp and temp > 55:
            score -= (temp - 55) * 2
        if wear_level is not None and wear_level < 100:
            score = min(score, wear_level)
        if health is False:
            score = min(score, 10)
        score = max(0, min(100, score))

        return {
            'device': device,
            'model': info,
            'serial': serial,
            'health': 'PASSED' if health else ('FAILED' if health is False else 'UNKNOWN'),
            'temperature': temp,
            'powerOnHours': power_on,
            'score': score,
            'reallocated': reallocated,
            'pending': pending,
            'uncorrectable': uncorrectable,
            'wearLevel': wear_level,
        }
    except json.JSONDecodeError:
        return parse_smart_text(device)
    except Exception as e:
        return {'device': device, 'error': str(e)}

def parse_smart_text(device):
    try:
        r = subprocess.run(
            [SMARTCTL, '-a', device],
            capture_output=True, text=True, timeout=30
        )
        out = r.stdout
        result = {'device': device}

        m = re.search(r'Device Model:\s*(.+)', out)
        result['model'] = m.group(1).strip() if m else ''

        m = re.search(r'Serial Number:\s*(.+)', out)
        result['serial'] = m.group(1).strip() if m else ''

        if 'PASSED' in out:
            result['health'] = 'PASSED'
        elif 'FAILED' in out:
            result['health'] = 'FAILED'
        else:
            result['health'] = 'UNKNOWN'

        m = re.search(r'Temperature_Celsius.*?(\d+)(?:\s|$)', out)
        result['temperature'] = int(m.group(1)) if m else None

        m = re.search(r'Power_On_Hours.*?(\d+)(?:\s|$)', out)
        result['powerOnHours'] = int(m.group(1)) if m else None

        result['score'] = 85 if result['health'] == 'PASSED' else 20
        result['reallocated'] = 0
        result['pending'] = 0
        result['uncorrectable'] = 0
        result['wearLevel'] = None

        return result
    except Exception as e:
        return {'device': device, 'error': str(e)}


class SmartHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        if self.path == '/smart' or self.path.startswith('/smart?'):
            drives = list_drives()
            results = [parse_smart(d) for d in drives]
            letter_map = get_drive_letters()
            for r in results:
                dev = r.get('device', '')
                m = re.search(r'/dev/sd([a-z])', dev) or re.search(r'pd(\d+)', dev)
                if m:
                    idx = ord(m.group(1)) - ord('a') if m.group(1).isalpha() else int(m.group(1))
                    r['letters'] = letter_map.get(idx, [])
            self.wfile.write(json.dumps({
                'ok': True,
                'smartctl': SMARTCTL or None,
                'drives': results
            }, ensure_ascii=False).encode())
        elif self.path == '/ping':
            self.wfile.write(json.dumps({'ok': True, 'version': '1.0'}).encode())
        else:
            self.wfile.write(json.dumps({'ok': False, 'error': 'Rota desconhecida'}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, fmt, *args):
        print(f'[OmniDrive SMART] {args[0]}')


def main():
    if not SMARTCTL:
        print('⚠️  smartctl não encontrado!')
        print('   Instale smartmontools:')
        print('   Windows: https://www.smartmontools.org/wiki/Download')
        print('   Linux:   sudo apt install smartmontools')
        print('   Mac:     brew install smartmontools')
        print()
        print('   O servidor vai iniciar, mas retornará erro ao consultar drives.')
        print()

    if os.name == 'nt':
        import ctypes
        try:
            is_admin = ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            is_admin = False
        if not is_admin:
            print('⚠️  Recomendado rodar como Administrador para ler S.M.A.R.T.')
            print()

    server = http.server.HTTPServer(('127.0.0.1', PORT), SmartHandler)
    print(f'🔧 OmniDrive S.M.A.R.T. Companion v1.0')
    print(f'   smartctl: {SMARTCTL or "NÃO ENCONTRADO"}')
    print(f'   Servidor: http://localhost:{PORT}')
    print(f'   Abra o OmniDrive no browser para ver a saúde dos drives.')
    print(f'   Ctrl+C para parar.')
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Companion encerrado.')
        server.server_close()

if __name__ == '__main__':
    main()
