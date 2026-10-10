#!/usr/bin/env python3
"""
OmniDrive S.M.A.R.T. Companion
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

Ver CHANGELOG.md nesta pasta para histórico de versões.
"""

import http.server
import json
import subprocess
import re
import sys
import os
import ctypes

# Evita crash de UnicodeEncodeError ao imprimir emoji em consoles Windows (cp1252)
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = int(os.environ.get('OMNIDRIVE_PORT', 7777))
COMPANION_VERSION = '1.5.1'

import threading
import shutil
from urllib.parse import urlparse, parse_qs

# Só o OmniDrive (produção + dev local) pode ler as respostas. /scan expõe nomes de
# pastas/arquivos, então não pode ficar aberto para qualquer site (CORS '*').
ALLOWED_ORIGIN_RE = re.compile(r'^(https://asgard1anbr\.github\.io|http://(localhost|127\.0\.0\.1)(:\d+)?)$')

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


# ---------- volumes (letra, rótulo, serial do disco, BitLocker) ----------
_VOL_PS = r'''
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$res=@()
# cada cmdlet UMA vez (dentro do laço levava ~20s)
$disks=@{}; foreach($d in (Get-Disk)){ $disks[[int]$d.Number]=$d }
$pds=@{}; foreach($d in (Get-PhysicalDisk)){ $pds["$($d.DeviceId)"]=$d }
$vols=@{}; foreach($d in (Get-Volume | Where-Object {$_.DriveLetter})){ $vols["$($d.DriveLetter)"]=$d }
$bls=@{}; foreach($d in (Get-BitLockerVolume)){ $bls["$($d.MountPoint)".TrimEnd(':')]=$d }
$lds=@{}; foreach($d in (Get-CimInstance Win32_LogicalDisk)){ $lds["$($d.DeviceID)".TrimEnd(':')]=$d }
foreach($p in (Get-Partition | Where-Object {$_.DriveLetter})){
  $dk=$disks[[int]$p.DiskNumber]
  if(-not $dk -or $dk.IsBoot -or $dk.IsSystem){continue}
  $l=[string]$p.DriveLetter
  $v=$vols[$l]; $bl=$bls[$l]; $pd=$pds["$($p.DiskNumber)"]; $ld=$lds[$l]
  $res+=[pscustomobject]@{
    letter=$l; disk=[int]$p.DiskNumber; label="$($v.FileSystemLabel)"; fs="$($v.FileSystem)";
    partSize=[int64]$p.Size; volSerial="$($ld.VolumeSerialNumber)";
    friendly="$($dk.FriendlyName)"; diskSerial=("$($dk.SerialNumber)").Trim(); bus="$($dk.BusType)";
    media="$($pd.MediaType)"; diskSize=[int64]$dk.Size; driveType="$($v.DriveType)";
    bitlocker=[bool]($bl -and "$($bl.VolumeStatus)" -ne 'FullyDecrypted');
    locked=[bool]($bl -and "$($bl.LockStatus)" -eq 'Locked')
  }
}
ConvertTo-Json -InputObject @($res) -Compress
'''

_vol_lock = threading.Lock()
_vol_cache = {'sig': None, 'volumes': []}

def drive_signature():
    """Assinatura barata (letras fixas/removíveis + se estão acessíveis) para só rodar o
    PowerShell quando algo mudou — ex.: drive plugado ou desbloqueado no BitLocker."""
    if os.name != 'nt':
        return ()
    k = ctypes.windll.kernel32
    mask = k.GetLogicalDrives()
    sig = []
    for i in range(26):
        if mask >> i & 1:
            root = chr(65 + i) + ':\\'
            if k.GetDriveTypeW(root) not in (2, 3):  # só removível/fixo
                continue
            try:
                with os.scandir(root) as it:
                    next(it, None)
                ok = 1
            except OSError:
                ok = 0
            sig.append((root[0], ok))
    return tuple(sig)

def _query_volumes():
    try:
        r = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', _VOL_PS],
                           capture_output=True, timeout=30)
        txt = r.stdout.decode('utf-8', errors='replace').strip()
        data = json.loads(txt) if txt else []
        return [data] if isinstance(data, dict) else data
    except Exception as e:
        print(f'[OmniDrive] falha ao listar volumes: {e}')
        return []

def get_volumes():
    if os.name != 'nt':
        return []
    sig = drive_signature()
    with _vol_lock:
        if sig != _vol_cache['sig']:
            _vol_cache['volumes'] = _query_volumes()
            _vol_cache['sig'] = sig
        vols = [dict(v) for v in _vol_cache['volumes']]
    legivel = dict(sig)
    for v in vols:  # uso muda a cada gravação: sempre fresco, nunca do cache
        v['usedBytes'] = v['totalBytes'] = None
        # Sem admin o Windows não informa o BitLocker; volume que não abre = tratado como bloqueado.
        # Evita "atualizar" um drive com conteúdo vazio por ter lido um volume trancado.
        if legivel.get(v['letter'].upper()) == 0:
            v['locked'] = True
        if not v.get('locked'):
            try:
                u = shutil.disk_usage(v['letter'] + ':\\')
                v['usedBytes'], v['totalBytes'] = u.used, u.total
            except OSError:
                pass
    return vols

# ---------- scan de pastas/arquivos (mesmo formato do app: › por nível, • = arquivo) ----------
_SKIP = {'system volume information', 'thumbs.db', 'desktop.ini', 'recycler'}

def scan_tree(root, root_label, max_depth=3):
    lines = [root_label]
    counts = {'pastas': 0, 'arquivos': 0}
    def walk(path, prof):
        pastas, arquivos = [], []
        try:
            with os.scandir(path) as it:
                for e in it:
                    n = e.name
                    if n.startswith('.') or n.startswith('$') or n.lower() in _SKIP:
                        continue
                    try:
                        (pastas if e.is_dir(follow_symlinks=False) else arquivos).append(n)
                    except OSError:
                        continue
        except OSError:
            return
        pastas.sort(key=str.lower); arquivos.sort(key=str.lower)
        for n in pastas:
            lines.append('›' * prof + ' ' + n); counts['pastas'] += 1
            if prof < max_depth:
                walk(os.path.join(path, n), prof + 1)
        for n in arquivos:
            lines.append('›' * prof + ' •' + n); counts['arquivos'] += 1
    walk(root, 1)
    return lines, counts


class SmartHandler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin') or ''
        if origin and ALLOWED_ORIGIN_RE.match(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors()
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        try:
            if u.path == '/volumes':
                return self._json({'ok': True, 'volumes': get_volumes()})
            if u.path == '/scan':
                letter = (q.get('letter', [''])[0] or '').upper()[:1]
                depth = max(1, min(3, int((q.get('depth', ['3'])[0]) or 3)))
                vol = next((v for v in get_volumes() if v['letter'].upper() == letter), None)
                if not vol:
                    return self._json({'ok': False, 'error': 'Volume não encontrado (ou é o disco do sistema).'}, 404)
                if vol.get('locked'):
                    return self._json({'ok': False, 'error': 'Volume bloqueado pelo BitLocker.', 'locked': True}, 423)
                lines, counts = scan_tree(letter + ':\\', vol.get('label') or (letter + ':'), depth)
                return self._json({'ok': True, 'tree': '\n'.join(lines), 'counts': counts,
                                   'usedBytes': vol.get('usedBytes'), 'totalBytes': vol.get('totalBytes')})
        except Exception as e:
            return self._json({'ok': False, 'error': str(e)}, 500)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors()
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
            self.wfile.write(json.dumps({'ok': True, 'version': COMPANION_VERSION}).encode())
        else:
            self.wfile.write(json.dumps({'ok': False, 'error': 'Rota desconhecida'}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
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

    # Threading: um /scan demorado em HD lento não pode travar /ping e /volumes
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), SmartHandler)
    print(f'🔧 OmniDrive S.M.A.R.T. Companion v{COMPANION_VERSION}')
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
