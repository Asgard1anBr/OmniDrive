/* ===== OmniDrive — app (vanilla, fase 1) =====
   Fase 1: Busca + Detalhe rodando com dados de exemplo (localStorage).
   Cadastro, QR e Google Drive entram nas próximas fases. */
(function () {
  'use strict';

  // ---------- rótulos dos enums ----------
  const LABELS = {
    tipo: { HD: 'HD', SSD: 'SSD', NVMe: 'NVMe', PenDrive: 'Pen drive' },
    acondicionamento: { solto: 'Solto', case: 'Em case' },
    criptografia: { nao: 'Não', sim: 'Sim', hibrido: 'Híbrido' },
    estado: { em_uso: 'Em uso', disponivel: 'Disponível', cheio: 'Cheio', aposentado: 'Aposentado', defeito: 'Com defeito' },
    tiposArquivo: { video: 'Vídeo', foto: 'Foto', documento: 'Documento', audio: 'Áudio', compactado: 'Compactado', outros: 'Outros' }
  };
  const TIPOS_ARQUIVO = Object.keys(LABELS.tiposArquivo);

  // ---------- dados de exemplo (semente) ----------
  const SEED = {
    schemaVersion: 1, appVersion: '1.0', app: 'OmniDrive',
    atualizadoEm: new Date().toISOString(),
    locais: ['Gaveta 2', 'Estante 1', 'Chaveiro'],
    drives: [
      { id: 'OMNI-7K4P2', nome: 'BKP-2021 07', tipo: 'HD', acondicionamento: 'case', conexao: 'USB 3.0',
        capacidadeGB: 2000, usadoGB: 1440, particoes: 3, criptografia: 'hibrido', estado: 'em_uso',
        local: 'Gaveta 2', aquisicao: '2021-05', tiposArquivo: ['video', 'foto', 'documento'],
        conteudo: 'Casamento fotos RAW 2019, Fotos viagem Chile, Projetos cliente iTech, Vídeos institucionais 4K, Documentos escaneados',
        tags: ['Fotos família', 'Cliente X'], observacoes: '' },
      { id: 'OMNI-P29QX', nome: 'SSD-CasaA 03', tipo: 'SSD', acondicionamento: 'solto', conexao: 'SATA',
        capacidadeGB: 1000, usadoGB: 400, particoes: 1, criptografia: 'nao', estado: 'disponivel',
        local: 'Estante 1', aquisicao: '2023-02', tiposArquivo: ['foto', 'documento', 'audio'],
        conteudo: 'Fotos família 2023, Documentos escaneados, Músicas MP3, Podcasts',
        tags: ['Pessoal'], observacoes: '' },
      { id: 'OMNI-4M8TB', nome: 'PEN-Vermelho 11', tipo: 'PenDrive', acondicionamento: 'solto', conexao: 'USB-C',
        capacidadeGB: 64, usadoGB: 61, particoes: 1, criptografia: 'sim', estado: 'cheio',
        local: 'Chaveiro', aquisicao: '2022-09', tiposArquivo: ['foto', 'documento'],
        conteudo: 'Backup fotos celular, Documentos pessoais, Comprovantes',
        tags: [], observacoes: 'Quase sem espaço' }
    ]
  };

  // ---------- store local (modo teste, sem login) ----------
  const KEY = 'omnidrive:catalogo';
  let mem = null; // fallback em memória (quando localStorage não está disponível, ex.: file://)
  const localStore = {
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
      if (mem) return mem;
      const seed = JSON.parse(JSON.stringify(SEED));
      try { localStorage.setItem(KEY, JSON.stringify(seed)); } catch (e) { mem = seed; }
      return seed;
    },
    save(cat) {
      cat.atualizadoEm = new Date().toISOString();
      try { localStorage.setItem(KEY, JSON.stringify(cat)); } catch (e) { mem = cat; }
    }
  };

  // ---------- store ativo: 'local' (teste, sem login) ou 'cloud' (Google Drive) ----------
  let mode = null;      // null até o usuário escolher na tela "Entrar"
  let cloudCat = null;
  const store = {
    load() { return mode === 'cloud' ? cloudCat : localStore.load(); },
    save(cat) {
      if (mode === 'cloud') {
        cloudCat = cat;
        cat.atualizadoEm = new Date().toISOString();
        OmniCloud.saveCatalog(cat).catch(e => { console.error(e); toast('Falha ao salvar na nuvem — tente novamente'); });
      } else {
        localStore.save(cat);
      }
    }
  };

  // ---------- helpers ----------
  const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const el = document.getElementById('app');

  // parser de capacidade: "2tb" | "2000" | "2000mb" | "1.5tb" -> GB (número)
  function parseCapacity(input) {
    if (input == null) return null;
    const s = input.toString().trim().toLowerCase().replace(',', '.');
    const m = s.match(/^([\d.]+)\s*(tb|gb|mb)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]); if (isNaN(n)) return null;
    const unit = m[2] || 'gb';
    if (unit === 'tb') return n * 1000;
    if (unit === 'mb') return n / 1000;
    return n;
  }
  function fmtGB(gb) {
    if (gb == null) return '—';
    if (gb >= 1000) { const tb = gb / 1000; return (Math.round(tb * 100) / 100).toString().replace('.', ',') + ' TB'; }
    if (gb >= 1) return (Math.round(gb * 10) / 10).toString().replace('.', ',') + ' GB';
    return Math.round(gb * 1000) + ' MB';
  }
  function usoPct(d) {
    if (!d.capacidadeGB || d.usadoGB == null) return null;
    return Math.max(0, Math.min(100, Math.round((d.usadoGB / d.capacidadeGB) * 100)));
  }
  function pctColor(pct) { return pct >= 90 ? 'var(--danger)' : pct >= 75 ? 'var(--warn)' : 'var(--cyan)'; }
  function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // divide o conteúdo (texto livre) em itens por vírgula / quebra de linha
  function splitConteudo(txt) {
    return (txt || '').split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
  }

  // ---------- estado ----------
  const state = { view: 'entrar', query: '', filtro: null, driveId: null, editId: null, authed: false };

  // ---------- geração de ID + helpers de UI ----------
  function gerarId(cat) {
    const alf = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem 0,1,O,I
    let id;
    do { id = 'OMNI-' + Array.from({ length: 5 }, () => alf[Math.floor(Math.random() * alf.length)]).join(''); }
    while (cat.drives.some(d => d.id === id));
    return id;
  }
  function segHtml(cid, opts, cur) {
    return `<div class="seg" id="${cid}">` + Object.entries(opts).map(([v, l]) =>
      `<button type="button" data-val="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('') + `</div>`;
  }
  function pillHtml(cid, opts, arr) {
    return `<div class="pill-select" id="${cid}">` + Object.entries(opts).map(([v, l]) =>
      `<button type="button" data-val="${v}" class="${arr.includes(v) ? 'on' : ''}">${l}</button>`).join('') + `</div>`;
  }
  function segVal(cid) { const c = document.getElementById(cid); const on = c && c.querySelector('button.on'); return on ? on.dataset.val : ''; }
  function echoParse(v, node) {
    if (!v.trim()) { node.textContent = ''; node.className = 'echo'; return null; }
    const gb = parseCapacity(v);
    if (gb == null) { node.textContent = '✗ não entendi (ex.: 2tb, 500gb)'; node.className = 'echo err'; return null; }
    node.textContent = '✓ ' + fmtGB(gb); node.className = 'echo ok'; return gb;
  }
  function modal(html) {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    return back;
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }
  function abrirNovoLocal(selectEl) {
    const m = modal(`<h3>Novo local</h3>
      <input class="field" id="m-local" placeholder="Ex.: Gaveta 3" autocomplete="off">
      <div class="form-actions">
        <button type="button" class="btn ghost" id="m-cancel">Cancelar</button>
        <button type="button" class="btn" id="m-ok">Adicionar</button>
      </div>`);
    const input = m.querySelector('#m-local'); input.focus();
    const ok = () => {
      const nome = input.value.trim(); if (!nome) { input.focus(); return; }
      const cat = store.load();
      if (!cat.locais.includes(nome)) { cat.locais.push(nome); cat.locais.sort((a, b) => a.localeCompare(b)); store.save(cat); }
      if (![...selectEl.options].some(o => o.value === nome)) {
        const opt = document.createElement('option'); opt.textContent = nome; opt.value = nome; selectEl.appendChild(opt);
      }
      selectEl.value = nome; m.remove();
    };
    m.querySelector('#m-cancel').onclick = () => m.remove();
    m.querySelector('#m-ok').onclick = ok;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  }
  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function abrirQR(d) {
    const m = OmniQR.matrix(d.id);
    const svg = OmniQR.toSVG(m, 6, 4);
    const mo = modal(`<h3>Código do drive</h3>
      <div class="qr-code">${svg}</div>
      <div class="qr-id"><span>${d.id}</span><button type="button" class="btn" id="q-copy" style="flex:0 0 auto;padding:9px 18px">Copiar</button></div>
      <div class="form-actions">
        <button type="button" class="btn ghost" id="q-svg">Exportar SVG</button>
        <button type="button" class="btn ghost" id="q-png">Exportar PNG</button>
      </div>
      <div class="form-actions" style="margin-top:10px"><button type="button" class="btn" id="q-close">Fechar</button></div>`);
    mo.querySelector('#q-close').onclick = () => mo.remove();
    mo.querySelector('#q-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(d.id); toast('Código copiado'); }
      catch (e) { toast('Copie manualmente: ' + d.id); }
    };
    mo.querySelector('#q-svg').onclick = () => baixar(new Blob([svg], { type: 'image/svg+xml' }), d.id + '.svg');
    mo.querySelector('#q-png').onclick = () => OmniQR.toCanvas(m, 12, 4).toBlob(b => baixar(b, d.id + '.png'), 'image/png');
  }
  function abrirScanner() {
    const canScan = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const m = modal(`<h3>Ler código do drive</h3>
      ${canScan ? `<div class="scan-wrap"><video id="scan-video" autoplay playsinline muted></video></div>
        <div class="muted" id="scan-status" style="font-size:13px;margin-top:8px;text-align:center">Aponte a câmera para o QR code…</div>`
        : `<p class="muted" style="font-size:14px">Este navegador não lê QR pela câmera. Digite o código impresso na etiqueta:</p>`}
      <input class="field" id="scan-manual" placeholder="OMNI-XXXXX" style="margin-top:12px;text-transform:uppercase" autocomplete="off">
      <div class="form-actions" style="margin-top:14px">
        <button type="button" class="btn ghost" id="scan-cancel">Cancelar</button>
        <button type="button" class="btn" id="scan-ir">Ir para o drive</button>
      </div>`);

    let stream = null, raf = null, stopped = false;
    function stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
    const origRemove = m.remove.bind(m);
    m.remove = () => { stop(); origRemove(); };

    function irPara(codigoBruto) {
      const codigo = (codigoBruto || '').trim().toUpperCase();
      if (!codigo) return;
      const cat = store.load();
      const d = cat.drives.find(x => x.id === codigo);
      if (!d) { toast('Nenhum drive com o código ' + codigo); return; }
      m.remove();
      state.driveId = d.id; go('detalhe');
    }

    m.querySelector('#scan-cancel').addEventListener('click', () => m.remove());
    m.querySelector('#scan-ir').addEventListener('click', () => irPara(m.querySelector('#scan-manual').value));
    m.querySelector('#scan-manual').addEventListener('keydown', e => { if (e.key === 'Enter') irPara(e.target.value); });

    if (canScan) {
      const video = m.querySelector('#scan-video'), status = m.querySelector('#scan-status');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s; video.srcObject = s;
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) { status.textContent = 'Código encontrado!'; irPara(codes[0].rawValue); return; }
          } catch (e) {}
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }).catch(() => { status.textContent = 'Não foi possível acessar a câmera — digite o código abaixo.'; m.querySelector('#scan-manual').focus(); });
    } else {
      m.querySelector('#scan-manual').focus();
    }
  }

  function confirmarRemover(d) {
    const m = modal(`<h3>Remover drive?</h3>
      <p class="muted" style="font-size:14px">“${esc(d.nome)}” (${d.id}) será apagado do catálogo.</p>
      <div class="form-actions">
        <button type="button" class="btn ghost" id="m-cancel">Cancelar</button>
        <button type="button" class="btn danger" id="m-del">Remover</button>
      </div>`);
    m.querySelector('#m-cancel').onclick = () => m.remove();
    m.querySelector('#m-del').onclick = () => {
      const cat = store.load(); cat.drives = cat.drives.filter(x => x.id !== d.id); store.save(cat);
      m.remove(); state.editId = null; toast('Drive removido'); go('busca');
    };
  }

  // ================= BUSCA =================
  function buscar(cat) {
    const q = norm(state.query);
    return cat.drives.filter(d => {
      if (state.filtro && !(d.tiposArquivo || []).includes(state.filtro)) return false;
      if (!q) return true;
      const alvo = norm([d.nome, d.id, d.conteudo, (d.tags || []).join(' ')].join(' '));
      return alvo.includes(q);
    });
  }

  function snippet(d) {
    const itens = splitConteudo(d.conteudo);
    const q = norm(state.query);
    let escolhidos = itens;
    if (q) escolhidos = itens.filter(i => norm(i).includes(q));
    if (!escolhidos.length) escolhidos = itens.slice(0, 2);
    let html = esc(escolhidos.slice(0, 3).join(' · '));
    if (q) {
      const re = new RegExp('(' + state.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      html = html.replace(re, '<mark>$1</mark>');
    }
    return html;
  }

  function renderBusca(cat) {
    const res = buscar(cat);
    const pills = TIPOS_ARQUIVO.map(t =>
      `<button class="fpill ${state.filtro === t ? 'on' : ''}" data-filtro="${t}">${LABELS.tiposArquivo[t]}</button>`
    ).join('');

    const cards = res.map(d => {
      const pct = usoPct(d);
      const bar = pct == null ? '' :
        `<span class="bar"><i style="width:${pct}%;background:${pctColor(pct)}"></i></span><span style="color:${pctColor(pct)}">${pct}%</span>`;
      return `<div class="card" data-id="${d.id}">
        <div class="card-head"><div class="dname">${esc(d.nome)}</div><div class="id-chip">${d.id}</div></div>
        <div class="match">${snippet(d)}</div>
        <div class="meta"><span>${LABELS.tipo[d.tipo] || d.tipo}${d.local ? ' · ' + esc(d.local) : ''}</span>${bar}</div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="busca-hero"><img src="icons/omnidrive-icon.png" alt="OmniDrive"></div>
      <div class="searchbar"><span class="mag">⌕</span>
        <input id="q" placeholder="Buscar em todos os drives…" value="${esc(state.query)}" autocomplete="off"></div>
      <div class="filter-row">${pills}</div>
      <div class="hint">${res.length} drive(s) encontrado(s)</div>
      <div class="results">${cards || `<div class="empty">Nada encontrado.<br>Tente outra palavra ou tipo.</div>`}</div>`;

    const q = document.getElementById('q');
    q.addEventListener('input', () => { state.query = q.value; const pos = q.selectionStart; renderBusca(store.load()); const nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(pos, pos); });
    el.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.filtro; state.filtro = state.filtro === t ? null : t; renderBusca(store.load());
    }));
    el.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => { state.driveId = c.dataset.id; go('detalhe'); }));
  }

  // ================= DETALHE =================
  function renderDetalhe(cat) {
    const d = cat.drives.find(x => x.id === state.driveId);
    if (!d) return go('busca');
    const pct = usoPct(d);
    const R = 88, C = 2 * Math.PI * R;
    const gauge = pct == null ? '' : `
      <div class="gauge-wrap">
        <svg viewBox="0 0 210 210" width="210" height="210" aria-hidden="true">
          <defs><filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <circle cx="105" cy="105" r="${R}" fill="none" stroke="#16303f" stroke-width="14"/>
          <circle cx="105" cy="105" r="${R}" fill="none" stroke="${pctColor(pct)}" stroke-width="14"
            stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}"
            transform="rotate(-90 105 105)" filter="url(#glow)"/>
        </svg>
        <div class="gauge-center">
          <div class="gauge-pct">${pct}<span>%</span></div>
          <div class="gauge-cap">${fmtGB(d.usadoGB)} usados</div>
          <div class="gauge-sub">de ${fmtGB(d.capacidadeGB)}</div>
        </div>
      </div>`;

    const chip = (rot, val) => val ? `<span class="chip"><i>${rot}</i>${esc(val)}</span>` : '';
    const chips = [
      chip('Tipo', LABELS.tipo[d.tipo]),
      chip('Conexão', d.conexao),
      chip('Cripto', LABELS.criptografia[d.criptografia]),
      d.particoes ? chip('Partições', String(d.particoes)) : '',
      chip('Estado', LABELS.estado[d.estado]),
      chip('Local', d.local)
    ].join('');

    const tags = TIPOS_ARQUIVO.map(t =>
      `<span class="tag ${(d.tiposArquivo || []).includes(t) ? 'on' : ''}">${LABELS.tiposArquivo[t]}</span>`).join('');

    const linhas = splitConteudo(d.conteudo).map(i => `<div class="line">${esc(i)}</div>`).join('')
      || `<div class="line muted">Sem conteúdo cadastrado.</div>`;

    el.innerHTML = `
      <button class="back" id="back">‹ Voltar</button>
      <div class="detail-top">
        <div class="screen-label" style="margin:0">${esc(d.nome)}</div>
        <div class="muted" style="font-size:12px">${d.id}${d.aquisicao ? ' · ' + esc(d.aquisicao) : ''}</div>
      </div>
      ${gauge}
      <div class="chips">${chips}</div>
      <div class="hint">Tipos de arquivo</div><div class="tags">${tags}</div>
      <div class="hint">Conteúdo</div><div class="content-list">${linhas}</div>
      ${d.observacoes ? `<div class="hint">Observações</div><div class="muted" style="font-size:13px">${esc(d.observacoes)}</div>` : ''}
      <div class="form-actions">
        <button class="btn ghost" id="editar">✎ Editar</button>
        <button class="btn" id="qr">⌗ Gerar QR</button>
      </div>
      <button class="btn danger" id="remover" style="width:100%;margin-top:10px">Remover drive</button>`;

    document.getElementById('back').addEventListener('click', () => go('busca'));
    document.getElementById('editar').addEventListener('click', () => { state.editId = d.id; go('cadastro'); });
    document.getElementById('qr').addEventListener('click', () => abrirQR(d));
    document.getElementById('remover').addEventListener('click', () => confirmarRemover(d));
  }

  // ================= CADASTRO =================
  function renderCadastro(cat, drive) {
    const editing = !!drive;
    const d = drive || {};
    const id = d.id || gerarId(cat);

    const estadoOpts = ['<option value="">—</option>'].concat(
      Object.entries(LABELS.estado).map(([v, l]) => `<option value="${v}" ${d.estado === v ? 'selected' : ''}>${l}</option>`)).join('');
    const localOpts = ['<option value="">—</option>'].concat(
      cat.locais.map(l => `<option ${d.local === l ? 'selected' : ''}>${esc(l)}</option>`)).join('');

    el.innerHTML = `<div class="form">
      <div class="screen-label">${editing ? 'Editar drive' : 'Novo drive'}</div>

      <label class="flabel">Nome / etiqueta <span class="req">• obrigatório</span></label>
      <input class="field" id="f-nome" value="${esc(d.nome || '')}" placeholder="Ex.: BKP-2021 07" autocomplete="off">

      <div class="idrow"><small>ID gerado · vira o QR</small><b>${id}</b></div>

      <label class="flabel">Tipo</label>
      ${segHtml('f-tipo', LABELS.tipo, d.tipo)}

      <div class="row">
        <div class="col">
          <label class="flabel">Acondicionamento</label>
          ${segHtml('f-acond', LABELS.acondicionamento, d.acondicionamento)}
        </div>
        <div class="col">
          <label class="flabel">Partições</label>
          <input class="field" id="f-part" type="number" min="1" value="${d.particoes || ''}" placeholder="—">
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label class="flabel">Capacidade</label>
          <input class="field" id="f-cap" value="${d.capacidadeGB != null ? fmtGB(d.capacidadeGB) : ''}" placeholder="2tb, 500gb…" autocomplete="off">
          <div class="echo" id="echo-cap"></div>
        </div>
        <div class="col">
          <label class="flabel">Espaço usado</label>
          <input class="field" id="f-uso" value="${d.usadoGB != null ? fmtGB(d.usadoGB) : ''}" placeholder="1.4tb…" autocomplete="off">
          <div class="echo" id="echo-uso"></div>
        </div>
      </div>

      <label class="flabel">Conexão <em>opcional</em></label>
      <input class="field" id="f-conexao" list="conexoes" value="${esc(d.conexao || '')}" placeholder="USB 3.0, SATA…" autocomplete="off">
      <datalist id="conexoes"><option>USB 2.0</option><option>USB 3.0</option><option>USB-C</option><option>SATA</option><option>Thunderbolt</option></datalist>

      <div class="row">
        <div class="col">
          <label class="flabel">Criptografia</label>
          ${segHtml('f-cripto', LABELS.criptografia, d.criptografia)}
        </div>
        <div class="col">
          <label class="flabel">Estado</label>
          <select class="field" id="f-estado">${estadoOpts}</select>
        </div>
      </div>

      <label class="flabel">Local</label>
      <div class="local-row">
        <select class="field" id="f-local">${localOpts}</select>
        <button type="button" class="btn-add" id="add-local">＋ Novo</button>
      </div>

      <label class="flabel">Aquisição <em>opcional</em></label>
      <input class="field" id="f-aquisicao" type="month" value="${esc(d.aquisicao || '')}">

      <label class="flabel">Tipos de arquivo</label>
      ${pillHtml('f-tipos', LABELS.tiposArquivo, d.tiposArquivo || [])}

      <label class="flabel">Conteúdo <em>lista, vírgulas, do seu jeito</em></label>
      <textarea class="field" id="f-conteudo" placeholder="Casamento fotos RAW 2019, Fotos viagem Chile…">${esc(d.conteudo || '')}</textarea>

      <label class="flabel">Tags <em>separadas por vírgula</em></label>
      <input class="field" id="f-tags" value="${esc((d.tags || []).join(', '))}" placeholder="Fotos família, Cliente X" autocomplete="off">

      <label class="flabel">Observações <em>opcional</em></label>
      <textarea class="field" id="f-obs" placeholder="Notas…">${esc(d.observacoes || '')}</textarea>

      <div class="form-actions">
        <button type="button" class="btn ghost" id="cancelar">Cancelar</button>
        <button type="button" class="btn" id="salvar">${editing ? 'Salvar alterações' : 'Salvar drive'}</button>
      </div>
      ${editing ? `<button type="button" class="btn danger" id="remover" style="width:100%;margin-top:10px">Remover drive</button>` : ''}
    </div>`;

    // segmentos (clique alterna; clicar de novo desmarca)
    el.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => {
        const was = b.classList.contains('on');
        seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        if (!was) b.classList.add('on');
      })));
    // pílulas (múltipla escolha)
    el.querySelectorAll('#f-tipos button').forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));

    // eco de capacidade / uso
    const capEl = el.querySelector('#f-cap'), usoEl = el.querySelector('#f-uso');
    const eCap = el.querySelector('#echo-cap'), eUso = el.querySelector('#echo-uso');
    const updUso = () => {
      if (!usoEl.value.trim()) { eUso.textContent = ''; eUso.className = 'echo'; return; }
      const gb = parseCapacity(usoEl.value);
      if (gb == null) { eUso.textContent = '✗ não entendi'; eUso.className = 'echo err'; return; }
      const cap = parseCapacity(capEl.value);
      eUso.textContent = '✓ ' + fmtGB(gb) + (cap ? ' · ' + Math.round(gb / cap * 100) + '%' : '');
      eUso.className = 'echo ok';
    };
    capEl.addEventListener('input', () => { echoParse(capEl.value, eCap); updUso(); });
    usoEl.addEventListener('input', updUso);
    echoParse(capEl.value, eCap); updUso(); // eco inicial (modo edição)

    el.querySelector('#add-local').addEventListener('click', () => abrirNovoLocal(el.querySelector('#f-local')));
    el.querySelector('#cancelar').addEventListener('click', () => { state.editId = null; go('busca'); });
    const rem = el.querySelector('#remover'); if (rem) rem.addEventListener('click', () => confirmarRemover(d));

    el.querySelector('#salvar').addEventListener('click', () => {
      const nome = el.querySelector('#f-nome').value.trim();
      if (!nome) { toast('Informe o nome (etiqueta).'); el.querySelector('#f-nome').focus(); return; }
      const cat2 = store.load();
      const alvo = editing ? cat2.drives.find(x => x.id === id) : { id, criadoEm: new Date().toISOString() };
      alvo.id = id; alvo.nome = nome;
      alvo.tipo = segVal('f-tipo') || null;
      alvo.acondicionamento = segVal('f-acond') || null;
      alvo.conexao = el.querySelector('#f-conexao').value.trim() || null;
      alvo.capacidadeGB = parseCapacity(el.querySelector('#f-cap').value);
      alvo.usadoGB = parseCapacity(el.querySelector('#f-uso').value);
      const p = parseInt(el.querySelector('#f-part').value, 10); alvo.particoes = isNaN(p) ? null : p;
      alvo.criptografia = segVal('f-cripto') || null;
      alvo.estado = el.querySelector('#f-estado').value || null;
      alvo.local = el.querySelector('#f-local').value || null;
      alvo.aquisicao = el.querySelector('#f-aquisicao').value || null;
      alvo.tiposArquivo = [...el.querySelectorAll('#f-tipos button.on')].map(b => b.dataset.val);
      alvo.conteudo = el.querySelector('#f-conteudo').value.trim();
      alvo.tags = el.querySelector('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean);
      alvo.observacoes = el.querySelector('#f-obs').value.trim();
      alvo.atualizadoEm = new Date().toISOString();
      if (!editing) cat2.drives.unshift(alvo);
      store.save(cat2);
      state.editId = null; state.driveId = id;
      toast(editing ? 'Alterações salvas' : 'Drive salvo');
      go('detalhe');
    });
  }

  // ================= ENTRAR (login) =================
  function renderEntrar() {
    el.innerHTML = `<div class="sobre">
      <img src="icons/omnidrive-icon.png" alt="OmniDrive">
      <h1>OmniDrive</h1>
      <p>Seu catálogo fica salvo no seu Google Drive — acesse com sua conta Google para ver e editar
      seus drives de qualquer aparelho.</p>
      <div class="form-actions" style="margin-top:18px"><button class="btn" id="e-google">Entrar com Google</button></div>
      <div style="margin-top:10px"><button class="btn ghost" id="e-local" style="width:100%">Continuar sem login (teste local)</button></div>
      <div class="muted" id="e-status" style="margin-top:14px;font-size:12px;min-height:16px"></div>
    </div>`;
    document.getElementById('e-google').addEventListener('click', async () => {
      const st = document.getElementById('e-status');
      st.textContent = 'Conectando ao Google…';
      try {
        await OmniCloud.signIn();
        st.textContent = 'Carregando catálogo do Drive…';
        cloudCat = await OmniCloud.loadCatalog();
        mode = 'cloud'; state.authed = true;
        go('busca');
      } catch (e) {
        console.error('OmniDrive login error:', e);
        st.textContent = 'Erro: ' + (e.message || 'falha desconhecida') + ' — confira o console (F12) para detalhes.';
      }
    });
    document.getElementById('e-local').addEventListener('click', () => { mode = 'local'; state.authed = true; go('busca'); });
  }

  // ================= SOBRE =================
  function renderSobre() {
    const acctLine = state.authed
      ? `<div class="muted" style="margin-top:18px;font-size:13px">Conectado: ${esc(mode === 'cloud' ? (OmniCloud.getUserEmail() || 'Conta Google') : 'Modo local (sem login)')}</div>
         <button class="btn ghost" id="sair" style="margin-top:10px">Sair</button>` : '';
    el.innerHTML = `<div class="sobre">
      <img src="icons/omnidrive-icon.png" alt="OmniDrive">
      <h1>OmniDrive <span class="muted" style="font-size:14px">1.0</span></h1>
      <p>Catálogo pessoal de drives físicos (HDs, SSDs, NVMe, pen drives). Guarda o que existe dentro
      de cada drive e permite buscar por qualquer palavra ou por tipo de arquivo, dizendo em qual drive
      o dado está — sem precisar plugar um por um.</p>
      <div class="by">Criado por <b>Davi Torres</b></div>
      ${acctLine}
    </div>`;
    const sair = document.getElementById('sair');
    if (sair) sair.addEventListener('click', () => {
      if (mode === 'cloud') OmniCloud.signOut();
      mode = null; cloudCat = null; state.authed = false; state.driveId = null; state.editId = null; state.query = ''; state.filtro = null;
      go('entrar');
    });
  }

  // ---------- navegação ----------
  function go(view) { state.view = view; render(); }
  function render() {
    document.querySelectorAll('.navbtn').forEach(t =>
      t.classList.toggle('active', t.dataset.view === state.view || (state.view === 'detalhe' && t.dataset.view === 'busca')));
    if (state.view === 'sobre') return renderSobre();
    if (!state.authed || state.view === 'entrar') return renderEntrar();
    const cat = store.load();
    if (state.view === 'busca') renderBusca(cat);
    else if (state.view === 'detalhe') renderDetalhe(cat);
    else if (state.view === 'cadastro') renderCadastro(cat, state.editId ? cat.drives.find(d => d.id === state.editId) : null);
  }

  document.querySelectorAll('.navbtn[data-view]').forEach(t => t.addEventListener('click', () => {
    if (!state.authed) return go('entrar');
    if (t.dataset.view === 'cadastro') state.editId = null;
    go(t.dataset.view);
  }));
  document.getElementById('btnSobre').addEventListener('click', () => go('sobre'));
  document.getElementById('btnScan').addEventListener('click', () => {
    if (!state.authed) return go('entrar');
    abrirScanner();
  });

  state.view = 'entrar';
  render();
})();
