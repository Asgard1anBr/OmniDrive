/* ===== OmniDrive — nuvem (Google Drive) =====
   Login via Google Identity Services (script oficial do Google — única
   dependência externa do projeto; necessária pra falar com o login do Google).
   Dados: 1 arquivo JSON no Drive do usuário, escopo "drive.file" (o app só
   enxerga o que ele mesmo cria — não bisbilhota o resto do Drive).
   Backup: cópia datada em subpasta antes de cada gravação + histórico nativo
   do próprio Drive (automático, sem código nosso). */
(function () {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
  const FILE_NAME = 'omnidrive-catalogo.json';
  const BACKUP_FOLDER = 'OmniDrive Backups';
  const MAX_BACKUPS = 20;

  let tokenClient = null, accessToken = null, tokenExpiresAt = 0;
  let fileId = null, backupFolderId = null, userEmail = null;

  function ensureGis() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      let tries = 0;
      const t = setInterval(() => {
        if (window.google && google.accounts && google.accounts.oauth2) { clearInterval(t); resolve(); }
        else if (++tries > 100) { clearInterval(t); reject(new Error('Google Identity Services não carregou (verifique a internet).')); }
      }, 100);
    });
  }

  function signIn() {
    return ensureGis().then(() => new Promise((resolve, reject) => {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: window.OMNI_CONFIG.googleClientId,
          scope: SCOPE,
          callback: () => {}
        });
      }
      tokenClient.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + (resp.expires_in * 1000);
        fetchUserInfo().finally(resolve);
      };
      tokenClient.error_callback = (err) => reject(new Error((err && err.type) || 'Login cancelado'));
      tokenClient.requestAccessToken({ prompt: '' });
    }));
  }

  async function fetchUserInfo() {
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (r.ok) { const d = await r.json(); userEmail = d.email || null; }
    } catch (e) { /* não crítico */ }
  }

  function signOut() {
    if (accessToken && window.google) { try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {} }
    accessToken = null; tokenExpiresAt = 0; fileId = null; backupFolderId = null; userEmail = null;
  }
  function isSignedIn() { return !!accessToken && Date.now() < tokenExpiresAt; }
  function getUserEmail() { return userEmail; }

  function api(path, opts) {
    if (!isSignedIn()) return Promise.reject(new Error('Sessão expirada — entre novamente.'));
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + accessToken }, opts.headers || {});
    return fetch('https://www.googleapis.com/drive/v3/' + path, opts).then(async r => {
      if (!r.ok) throw new Error('Drive API ' + r.status + ': ' + (await r.text()).slice(0, 200));
      return r.status === 204 ? null : r.json();
    });
  }

  async function findFile(name, extraQuery) {
    const q = `name='${name.replace(/'/g, "\\'")}' and trashed=false${extraQuery || ''}`;
    const res = await api('files?q=' + encodeURIComponent(q) + '&spaces=drive&fields=files(id,name,createdTime)');
    return (res.files && res.files[0]) || null;
  }

  async function uploadContent(id, obj) {
    const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
    if (!r.ok) throw new Error('Falha ao salvar no Drive: ' + r.status);
  }

  async function ensureCatalogFile() {
    if (fileId) return fileId;
    const found = await findFile(FILE_NAME, '');
    if (found) { fileId = found.id; return fileId; }
    const seed = { schemaVersion: 1, appVersion: '1.0', app: 'OmniDrive', atualizadoEm: new Date().toISOString(), locais: [], drives: [] };
    const created = await api('files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' })
    });
    fileId = created.id;
    await uploadContent(fileId, seed);
    return fileId;
  }

  async function loadCatalog() {
    await ensureCatalogFile();
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!r.ok) throw new Error('Falha ao ler o catálogo do Drive: ' + r.status);
    const cat = await r.json();
    if (!Array.isArray(cat.locais)) cat.locais = [];
    if (!Array.isArray(cat.drives)) cat.drives = [];
    return cat;
  }

  async function ensureBackupFolder() {
    if (backupFolderId) return backupFolderId;
    const found = await findFile(BACKUP_FOLDER, " and mimeType='application/vnd.google-apps.folder'");
    if (found) { backupFolderId = found.id; return backupFolderId; }
    const created = await api('files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: BACKUP_FOLDER, mimeType: 'application/vnd.google-apps.folder' })
    });
    backupFolderId = created.id;
    return backupFolderId;
  }

  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  async function rotateBackup() {
    try {
      const folderId = await ensureBackupFolder();
      await api(`files/${fileId}/copy?fields=id`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `omnidrive-${stamp()}.json`, parents: [folderId] })
      });
      const list = await api(`files?q=${encodeURIComponent("'" + folderId + "' in parents and trashed=false")}&orderBy=createdTime desc&fields=files(id,createdTime)&pageSize=100`);
      const old = (list.files || []).slice(MAX_BACKUPS);
      for (const f of old) await api(`files/${f.id}`, { method: 'DELETE' });
    } catch (e) { console.warn('Backup rotativo falhou (não bloqueia o salvar):', e); }
  }

  async function saveCatalog(cat) {
    await ensureCatalogFile();
    await rotateBackup(); // guarda o estado ANTERIOR antes de sobrescrever
    cat.atualizadoEm = new Date().toISOString();
    await uploadContent(fileId, cat);
  }

  window.OmniCloud = { signIn, signOut, isSignedIn, getUserEmail, loadCatalog, saveCatalog };
})();
