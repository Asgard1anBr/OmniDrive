#!/usr/bin/env python3
"""Verificação local do OmniDrive — rodar antes de cada commit (e roda no CI antes do deploy).

    python tools/verificar.py

Sem dependências externas. Usa Node (para `node --check`) se estiver disponível.
Cada checagem imprime OK/FALHA; sai com código 1 se alguma falhar.
"""
import os, re, shutil, socket, subprocess, sys, time, urllib.request, urllib.error, hashlib, tempfile, threading, http.server, functools

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(RAIZ, 'app')
COMP = os.path.join(RAIZ, 'companion')
falhas = []

def ok(nome): print(f'  OK     {nome}')
def falha(nome, motivo): print(f'  FALHA  {nome}: {motivo}'); falhas.append(nome)
def ler(p): return open(p, encoding='utf-8').read()

def node_exe():
    for c in (shutil.which('node'), r'C:\Program Files\nodejs\node.exe'):
        if c and os.path.exists(c): return c
    return None

# 1) Sintaxe dos scripts do app
def t_sintaxe():
    node = node_exe()
    if not node: return falha('sintaxe JS', 'node não encontrado')
    for f in sorted(os.listdir(os.path.join(APP, 'js'))):
        if f.endswith('.js'):
            r = subprocess.run([node, '--check', os.path.join(APP, 'js', f)], capture_output=True, text=True)
            (ok if r.returncode == 0 else lambda n: falha(n, r.stderr.strip()[:200]))(f'sintaxe {f}')
    for p in (os.path.join(APP, 'sw.js'),):
        r = subprocess.run([node, '--check', p], capture_output=True, text=True)
        (ok if r.returncode == 0 else lambda n: falha(n, r.stderr.strip()[:200]))('sintaxe sw.js')

# 2) Compatível com a CSP: nada de <script> inline nem handlers on*= no HTML gerado
def t_csp():
    html = ler(os.path.join(APP, 'index.html'))
    if 'Content-Security-Policy' not in html: falha('CSP presente', 'meta CSP sumiu do index.html')
    else: ok('CSP presente')
    inl = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>', html)
    falha('sem <script> inline', inl) if inl else ok('sem <script> inline')
    handlers = []
    for f in os.listdir(os.path.join(APP, 'js')):
        handlers += [f'{f}: {m}' for m in re.findall(r'\bon(?:click|change|focus|blur|input|load|error|submit|key\w+)="', ler(os.path.join(APP, 'js', f)))]
    handlers += re.findall(r'\bon\w+="', html)
    falha('sem handlers inline (on*=)', handlers[:5]) if handlers else ok('sem handlers inline (on*=)')

# 3) Regressão do XSS do Painel: nomes de drive sempre passam por esc()
def t_xss_painel():
    js = ler(os.path.join(APP, 'js', 'app.js'))
    crus = re.findall(r'\.map\(\s*d\s*=>\s*d\.nome\s*\)', js)
    falha('XSS Painel (nomes sem esc)', f'{len(crus)} ocorrência(s) de .map(d => d.nome)') if crus else ok('XSS Painel: nomes escapados')
    m = re.search(r"function esc\(s\) \{(.+?)\}\n", js)
    if not m or "String(s ?? '')" not in m.group(1) or "&#39;" not in m.group(1): falha('esc() robusto', 'precisa String(s ?? \'\') e escapar \'')
    else: ok('esc() robusto')

# 3b) Nomes vindos de drives/usuário nunca viram chave de objeto comum ('__proto__', 'constructor'…)
def t_prototipo():
    js = ler(os.path.join(APP, 'js', 'app.js'))
    ruins = []
    if re.search(r"node\[nome\]\s*=", js): ruins.append('árvore de pastas indexada por objeto')
    for v in ('porLocal', 'grupos'):
        if re.search(rf"const {v} = \{{\}};", js): ruins.append(v + ' = {}')
    falha('nomes como chave de objeto', ruins) if ruins else ok('nomes de pasta/local não poluem o protótipo')

# 4) Companion recusa Host estranho (DNS rebinding) e aceita o local
def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def get(url, host):
    req = urllib.request.Request(url, headers={'Host': host})
    try: return urllib.request.urlopen(req, timeout=10).status
    except urllib.error.HTTPError as e: return e.code

def t_companion():
    porta = porta_livre()
    env = {k: v for k, v in os.environ.items() if k.upper() in ('PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC')}
    env['OMNIDRIVE_PORT'] = str(porta); env['PYTHONDONTWRITEBYTECODE'] = '1'
    p = subprocess.Popen([sys.executable, os.path.join(COMP, 'omnidrive-smart.py')], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try: socket.create_connection(('127.0.0.1', porta), 0.2).close(); break
            except OSError: time.sleep(0.1)
        base = f'http://127.0.0.1:{porta}/ping'
        casos = {f'127.0.0.1:{porta}': 200, f'localhost:{porta}': 200, f'ataque.exemplo:{porta}': 403, f'localhost.ataque.exemplo:{porta}': 403}
        ruins = {h: (get(base, h), esperado) for h, esperado in casos.items() if get(base, h) != esperado}
        falha('companion valida Host', ruins) if ruins else ok('companion valida Host (403 estranho / 200 local)')
    finally:
        p.terminate(); p.wait(5)

# 5) Instalador: instala com hashes certos e recusa arquivo adulterado (só Windows)
def t_instalador():
    if os.name != 'nt': return print('  PULADO instalador (só Windows)')
    arqs = ['omnidrive-smart.py', 'iniciar-smart.bat', 'instalar-companion.bat', 'LEIAME.txt']
    with tempfile.TemporaryDirectory() as tmp:
        for caso in ('ok', 'adulterado'):
            d = os.path.join(tmp, caso, 'companion'); os.makedirs(d)
            for a in arqs: shutil.copy(os.path.join(COMP, a), d)
            with open(os.path.join(d, 'SHA256SUMS'), 'w') as f:
                for a in arqs: f.write(hashlib.sha256(open(os.path.join(d, a), 'rb').read()).hexdigest() + '  ' + a + '\n')
        open(os.path.join(tmp, 'adulterado', 'companion', 'omnidrive-smart.py'), 'a').write('# adulterado\n')
        class Quieto(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quieto, directory=tmp))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            for caso, esperado in (('ok', 0), ('adulterado', 1)):
                dest = os.path.join(tmp, 'inst-' + caso)
                env = dict(os.environ, OMNI_TEST='1', OMNI_BASE_URL=f'http://127.0.0.1:{srv.server_port}/{caso}/companion', OMNI_INSTALL_DIR=dest)
                r = subprocess.run(['cmd', '/d', '/c', 'call', os.path.join(COMP, 'instalar-companion.bat')], env=env, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=180)
                instalou = os.path.exists(os.path.join(dest, 'omnidrive-smart.py'))
                certo = (r.returncode == esperado) and (instalou == (esperado == 0))
                (ok if certo else lambda n: falha(n, f'exit={r.returncode} instalou={instalou}'))(f'instalador caso {caso}')
        finally:
            srv.shutdown()

# 6) Versão: os pontos batem
def t_versao():
    js = ler(os.path.join(APP, 'js', 'app.js')); html = ler(os.path.join(APP, 'index.html'))
    v = re.search(r"const VERSAO = '([^']+)'", js).group(1)
    erros = []
    if f"appVersion: '{v}'" not in js: erros.append('appVersion')
    if f"{{ v: '{v}'," not in js: erros.append('CHANGELOG')
    if f'id="appVer">v{v}<' not in html: erros.append('#appVer')
    if any(q != v for q in re.findall(r'\?v=([\d.]+)', html)): erros.append('?v= do index')
    falha(f'pontos de versão ({v})', erros) if erros else ok(f'pontos de versão batem ({v})')

# 7) .bat com CRLF (LF puro faz o cmd errar saltos de rótulo)
def t_crlf():
    for a in ('iniciar-smart.bat', 'instalar-companion.bat'):
        b = open(os.path.join(COMP, a), 'rb').read()
        lf = b.count(b'\n') - b.count(b'\r\n')
        # no CI (checkout com .gitattributes eol=crlf) e no Windows o arquivo deve estar em CRLF
        (ok if lf == 0 else lambda n: falha(n, f'{lf} linha(s) com LF puro'))(f'CRLF {a}')

if __name__ == '__main__':
    for nome, fn in [('Sintaxe', t_sintaxe), ('CSP', t_csp), ('XSS', t_xss_painel), ('Protótipo', t_prototipo), ('Companion', t_companion),
                     ('Instalador', t_instalador), ('Versão', t_versao), ('CRLF', t_crlf)]:
        print(f'[{nome}]')
        try: fn()
        except Exception as e: falha(nome, repr(e))
    print()
    print('TUDO OK' if not falhas else f'{len(falhas)} FALHA(S): {falhas}')
    sys.exit(1 if falhas else 0)
