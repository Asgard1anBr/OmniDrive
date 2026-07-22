/* ===== OmniDrive — app (vanilla, fase 1) =====
   Fase 1: Busca + Detalhe rodando com dados de exemplo (localStorage).
   Cadastro, QR e Google Drive entram nas próximas fases. */
(function () {
  'use strict';

  // ---------- rótulos dos enums ----------
  const LABELS = {
    tipo: { HD: 'HD', SSD: 'SSD', NVMe: 'NVMe', PenDrive: 'Pen drive' },
    tamanho: { '2.5': '2,5"', '3.5': '3,5"', outro: 'Outro' },
    acondicionamento: { solto: 'Solto', case: 'Em case' },
    criptografia: { nao: 'Não', sim: 'Sim', hibrido: 'Híbrido' },
    estado: { em_uso: 'Em uso', disponivel: 'Disponível', cheio: 'Cheio', aposentado: 'Aposentado', defeito: 'Com defeito' },
    tiposArquivo: { video: 'Vídeo', foto: 'Foto', documento: 'Documento', audio: 'Áudio', compactado: 'Compactado', outros: 'Outros' }
  };
  const TIPOS_ARQUIVO = Object.keys(LABELS.tiposArquivo);

  // ---------- versão e histórico ----------
  const VERSAO = '2.7.0';
  const CHANGELOG = [
    { v: '2.7.0', data: '2026-07-13', itens: [
      'Novo: Relatório em PDF — botão no Painel gera um relatório imprimível dos drives.',
      'Escolha os drives (todos ou selecionados) e as seções (dados, saúde S.M.A.R.T., pastas, local/tags/observações, etc.).',
      'Dois formatos combináveis: tabela resumo + fichas detalhadas com árvore de conteúdo.',
      'Gera via impressão nativa do navegador — use "Salvar como PDF".'
    ]},
    { v: '2.6.1', data: '2026-07-13', itens: [
      'Corrigido: scan (Brave) falhava em silêncio quando 0 arquivos eram lidos ou dava erro — agora sempre mostra uma mensagem.',
      'Erros durante a leitura de arquivos no fallback (Brave) agora aparecem no status e no console.'
    ]},
    { v: '2.6.0', data: '2026-07-13', itens: [
      'Escanear pastas agora também lista arquivos soltos (não só subpastas), inclusive na raiz.',
      'Reescanear detecta arquivos novos adicionados diretamente numa pasta já catalogada.'
    ]},
    { v: '2.5.2', data: '2026-07-13', itens: [
      'Companion S.M.A.R.T. agora tem versão própria (v1.2) e CHANGELOG.',
      'Adicionado LEIAME.txt no companion com instruções completas.'
    ]},
    { v: '2.5.1', data: '2026-07-13', itens: [
      'Timeout do S.M.A.R.T. aumentado (consulta de partições pode demorar).'
    ]},
    { v: '2.5.0', data: '2026-07-13', itens: [
      'S.M.A.R.T.: drives agora mostram letras de unidade (C:, D:) para fácil identificação.',
      'Calendário de aquisição com tema escuro (color-scheme global).'
    ]},
    { v: '2.4.2', data: '2026-07-13', itens: [
      'Seleção manual de drives S.M.A.R.T. agora funciona (preenche campos e mostra saúde).',
      'Badge "🔧 —" nos cards quando S.M.A.R.T. não foi escaneado.'
    ]},
    { v: '2.4.1', data: '2026-07-13', itens: [
      'S.M.A.R.T. movido para o topo do formulário.',
      'Campo de mês sem tracinhos (abre calendário ao clicar).'
    ]},
    { v: '2.4.0', data: '2026-07-13', itens: [
      'S.M.A.R.T.: seleção manual de drive quando não há correspondência automática.',
      'Auto-preenchimento de Nº de série e Marca/Modelo a partir do S.M.A.R.T.',
      'Botão renomeado para "Escanear saúde e informações do dispositivo".'
    ]},
    { v: '2.3.3', data: '2026-07-13', itens: [
      'Corrigido empilhamento de mensagens ao clicar S.M.A.R.T. várias vezes.',
      'Corrigido placeholder do campo de mês (não exibe mais texto selecionável).'
    ]},
    { v: '2.3.2', data: '2026-07-13', itens: [
      'Botão S.M.A.R.T. movido para tela de edição/novo drive.',
      'Data da última verificação salva e exibida em detalhe e tooltip do badge.',
      'Tela de detalhe mostra resumo S.M.A.R.T. salvo (sem botão — editar para re-verificar).'
    ]},
    { v: '2.3', data: '2026-07-13', itens: [
      'S.M.A.R.T. — verificação de saúde do drive via companion local.',
      'Score de saúde com gauge visual, temperatura, horas ligado, setores ruins.',
      'Correspondência automática por nº de série ou modelo.',
      'Companion Python incluso (companion/omnidrive-smart.py).'
    ]},
    { v: '2.2.1', data: '2026-07-13', itens: [
      'Árvore colapsável também na tela de detalhe do drive.',
      'Botões Editar e Gerar QR movidos para o topo da página.'
    ]},
    { v: '2.2', data: '2026-07-13', itens: [
      'Árvore colapsável de pastas — clique para expandir/recolher sub-níveis.',
      'Dados completos ficam guardados para busca, mas a exibição é compacta.',
      'Botão "Editar texto" alterna entre árvore visual e textarea raw.'
    ]},
    { v: '2.1.5', data: '2026-07-13', itens: [
      'Ícone do calendário agora em ciano (cor do app).',
      'Campo de aquisição limpo — placeholder quando vazio, sem tracinhos.',
      'Botão "Escanear pastas" redesenhado — maior, centralizado, borda tracejada.',
      'Quadrado no canto da barra de rolagem removido.'
    ]},
    { v: '2.1.3', data: '2026-07-13', itens: [
      'Escanear drive agora funciona no Brave e outros browsers (fallback via seletor de pasta).',
      'Ícone do calendário de aquisição corrigido (agora branco).'
    ]},
    { v: '2.1.2', data: '2026-07-13', itens: [
      'Escanear drive: formato hierárquico com › mostrando quem está dentro de quem.',
      'Pastas raiz sem prefixo, subpastas com ›, sub-sub com ›› — uma por linha, buscável.'
    ]},
    { v: '2.1.1', data: '2026-07-13', itens: [
      'Se já existe conteúdo, pergunta se quer juntar ou substituir antes de aplicar.',
      'Texto guia pede pra selecionar o drive externo (não o disco local).'
    ]},
    { v: '2.1', data: '2026-07-13', itens: [
      'Novo: Escanear drive — botão 📂 no cadastro lê as pastas do drive plugado e preenche o campo de conteúdo.',
      'Até 3 níveis de profundidade. Conteúdo editável livremente após o scan.'
    ]},
    { v: '2.0', data: '2026-07-13', itens: [
      'Novo: Painel (Dashboard) com estatísticas, distribuição por tipo e local, drives mais cheios.',
      'Novo: Dicas de reorganização — sugestões para consolidar ou reorganizar drives.',
      'Novo: Modo Galeria — cards visuais com ícone do tipo de drive.',
      'Novo: Agrupamento por local na busca.',
      'Novo: Sugestão automática de tags ao digitar conteúdo no cadastro.',
      'Ícone visual do tipo nos cards de busca e localização com 📍.'
    ]},
    { v: '1.4', data: '2026-07-12', itens: [
      'Novo campo: Tamanho físico (2,5", 3,5", Outro).',
      'Novo campo: Marca e Modelo.',
      'Novo campo: Número de série (S/N).',
      'Busca agora inclui marca, modelo e número de série.'
    ]},
    { v: '1.3.3', data: '2026-07-12', itens: [
      'Spinner de número e select com tema escuro (não mais cinza).'
    ]},
    { v: '1.3.2', data: '2026-07-12', itens: [
      'Ícone do calendário branco (color-scheme dark + filtro reforçado).'
    ]},
    { v: '1.3.1', data: '2026-07-12', itens: [
      'Service Worker agora busca sempre a versão mais nova (corrige cache preso).',
      'Ícone do calendário agora aparece branco.'
    ]},
    { v: '1.3', data: '2026-07-12', itens: [
      'Scrollbars estilizadas (finas, ciano) em todo o app.',
      'Logo no topo agora é clicável — leva à página inicial.',
      'Botão "Remover drive" reduzido e posicionado no canto inferior direito.',
      'Remoção de drive agora exige confirmação por código de 4 caracteres aleatório.'
    ]},
    { v: '1.2', data: '2026-07-12', itens: [
      'Leitor de QR: vídeo movido para fora da tela com dimensão real (320×240) — Android descartava o elemento de 2px como "não visível", impedindo o play.',
      'Play da câmera com retry automático e diagnóstico visual após 2 segundos.'
    ]},
    { v: '1.1', data: '2026-07-12', itens: [
      'Leitor de QR: conserto definitivo da tela preta — os frames da câmera agora são desenhados num canvas (o elemento de vídeo renderizava preto em várias GPUs Android).',
      'Nova tela "Histórico de Versões", acessível pelo Sobre.'
    ]},
    { v: '1.0.3', data: '2026-07-12', itens: [
      'Leitor de QR: fundo do modal sem desfoque (blur causava vídeo preto em alguns aparelhos).',
      'Diagnóstico na tela quando a câmera abre mas não entrega imagem.'
    ]},
    { v: '1.0.2', data: '2026-07-12', itens: [
      'Leitor de QR: se a câmera traseira falhar, tenta qualquer câmera disponível.',
      'Mensagem de erro da câmera passou a dizer o motivo real (permissão negada, câmera ocupada etc.).'
    ]},
    { v: '1.0.1', data: '2026-07-12', itens: [
      'Leitor de QR: câmera é liberada por completo ao fechar (a 2ª abertura vinha preta).',
      'Scanner continua lendo após um código desconhecido (antes travava).',
      'Atualizações do app passam a chegar na hora (correção do cache do Service Worker).'
    ]},
    { v: '1.0', data: '2026-07-11', itens: [
      'Lançamento: busca por palavra e tipo de arquivo, cadastro completo, detalhe com anel de capacidade, geração de QR com exportação PNG/SVG, leitura de QR pela câmera, login Google com catálogo no seu Drive, backups automáticos, PWA instalável e publicação em produção.'
    ]}
  ];

  // ---------- dados de exemplo (semente) ----------
  const SEED = {
    schemaVersion: 1, appVersion: '2.7.0', app: 'OmniDrive',
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
  const state = { view: 'entrar', query: '', filtro: null, driveId: null, editId: null, authed: false, galeria: false, agrupar: false };
  const DRIVE_ICON = { HD: '💿', SSD: '⚡', NVMe: '🔥', PenDrive: '🔌' };

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
      ${canScan ? `<div class="scan-wrap">
          <video id="scan-video" autoplay playsinline muted style="position:fixed;left:-9999px;top:0;width:320px;height:240px;opacity:.01;pointer-events:none"></video>
          <canvas id="scan-canvas"></canvas>
        </div>
        <div class="muted" id="scan-status" style="font-size:13px;margin-top:8px;text-align:center">Aponte a câmera para o QR code…</div>`
        : `<p class="muted" style="font-size:14px">Este navegador não lê QR pela câmera. Digite o código impresso na etiqueta:</p>`}
      <input class="field" id="scan-manual" placeholder="OMNI-XXXXX" style="margin-top:12px;text-transform:uppercase" autocomplete="off">
      <div class="form-actions" style="margin-top:14px">
        <button type="button" class="btn ghost" id="scan-cancel">Cancelar</button>
        <button type="button" class="btn" id="scan-ir">Ir para o drive</button>
      </div>`);
    // o backdrop-filter (blur) do modal faz o vídeo renderizar preto em várias GPUs Android;
    // marca este modal pra desligar o blur (CSS trata pela classe .scan).
    m.classList.add('scan');

    const video = canScan ? m.querySelector('#scan-video') : null;
    let stream = null, raf = null, stopped = false, ultimoAviso = 0;
    function stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      // solta a câmera por completo: para as trilhas E desliga do elemento de vídeo
      // (sem limpar o srcObject, alguns navegadores no celular seguram a câmera e a
      //  próxima abertura vem preta).
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (video) { try { video.pause(); } catch (e) {} video.srcObject = null; }
    }
    const origRemove = m.remove.bind(m);
    m.remove = () => { stop(); origRemove(); };

    // resolve o código; retorna true se achou o drive (e fechou), false se não achou
    function irPara(codigoBruto) {
      const codigo = (codigoBruto || '').trim().toUpperCase();
      if (!codigo) return false;
      const cat = store.load();
      const d = cat.drives.find(x => x.id === codigo);
      if (!d) {
        // evita spam de toast quando a câmera relê o mesmo código inválido a cada frame
        if (Date.now() - ultimoAviso > 2500) { toast('Nenhum drive com o código ' + codigo); ultimoAviso = Date.now(); }
        return false;
      }
      m.remove();
      state.driveId = d.id; go('detalhe');
      return true;
    }

    m.querySelector('#scan-cancel').addEventListener('click', () => m.remove());
    m.querySelector('#scan-ir').addEventListener('click', () => irPara(m.querySelector('#scan-manual').value));
    m.querySelector('#scan-manual').addEventListener('keydown', e => { if (e.key === 'Enter') irPara(e.target.value); });

    if (canScan) {
      const status = m.querySelector('#scan-status');
      // tenta a câmera traseira; se o aparelho recusar, cai pra qualquer câmera disponível
      const abrirCamera = async () => {
        try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }); }
        catch (e1) {
          try { return await navigator.mediaDevices.getUserMedia({ video: true }); }
          catch (e2) { throw (e2 && e2.name ? e2 : e1); }
        }
      };
      abrirCamera().then(async s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s; video.srcObject = s;
        const playVideo = async () => {
          try { await video.play(); } catch (_) {
            await new Promise(r => setTimeout(r, 500));
            try { await video.play(); } catch (_2) {}
          }
        };
        await playVideo();
        const canvas = m.querySelector('#scan-canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        setTimeout(() => {
          if (stopped || !video) return;
          if (!video.videoWidth) status.textContent = 'Câmera aberta mas sem imagem (0×0). Feche outros apps que usam a câmera e reabra.';
          else {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const px = ctx.getImageData(0, 0, 1, 1).data;
            if (px[0] === 0 && px[1] === 0 && px[2] === 0) status.textContent = 'Câmera ativa (' + video.videoWidth + '×' + video.videoHeight + ') — se a imagem estiver preta, feche e reabra.';
          }
        }, 2000);
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        let detectando = false;
        const tick = () => {
          if (stopped) return;
          if (video.videoWidth) {
            if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
            ctx.drawImage(video, 0, 0);
            if (!detectando) {
              detectando = true;
              detector.detect(canvas).then(codes => {
                detectando = false;
                if (!stopped && codes.length) irPara(codes[0].rawValue);
              }).catch(() => { detectando = false; });
            }
          }
          if (!stopped) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }).catch((e) => {
        const motivo = {
          NotAllowedError: 'permissão negada',
          NotReadableError: 'câmera ocupada por outro app',
          NotFoundError: 'nenhuma câmera encontrada',
          OverconstrainedError: 'câmera incompatível',
          SecurityError: 'bloqueada (precisa de HTTPS)'
        }[e && e.name] || (e && e.name) || 'erro desconhecido';
        status.textContent = 'Câmera indisponível (' + motivo + ') — digite o código abaixo.';
        m.querySelector('#scan-manual').focus();
      });
    } else {
      m.querySelector('#scan-manual').focus();
    }
  }

  function confirmarRemover(d) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const m = modal(`<h3 style=”color:var(--danger)”>Remover drive?</h3>
      <p class=”muted” style=”font-size:14px”>Você tem certeza que quer apagar <b style=”color:#fff”>”${esc(d.nome)}”</b> (${d.id})? Não terá como recuperar.</p>
      <p style=”font-size:13px;color:var(--txt-mid);margin-top:12px”>Para confirmar, digite o código abaixo:</p>
      <div style=”text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:var(--danger);margin:10px 0”>${code}</div>
      <input class=”field” id=”m-code” placeholder=”Digite o código acima” autocomplete=”off” style=”text-align:center;text-transform:uppercase;letter-spacing:3px”>
      <div class=”form-actions” style=”margin-top:14px”>
        <button type=”button” class=”btn ghost” id=”m-cancel”>Cancelar</button>
        <button type=”button” class=”btn danger” id=”m-del”>Apagar</button>
      </div>`);
    m.querySelector('#m-cancel').onclick = () => m.remove();
    m.querySelector('#m-del').onclick = () => {
      const typed = (m.querySelector('#m-code').value || '').trim().toUpperCase();
      if (typed !== code) { toast('Código incorreto.'); m.querySelector('#m-code').focus(); return; }
      const cat = store.load(); cat.drives = cat.drives.filter(x => x.id !== d.id); store.save(cat);
      m.remove(); state.editId = null; toast('Drive removido'); go('busca');
    };
    m.querySelector('#m-code').addEventListener('keydown', e => { if (e.key === 'Enter') m.querySelector('#m-del').click(); });
  }

  // ================= DASHBOARD =================
  function renderDashboard(cat) {
    const drives = cat.drives;
    const total = drives.length;
    const capTotal = drives.reduce((s, d) => s + (d.capacidadeGB || 0), 0);
    const usadoTotal = drives.reduce((s, d) => s + (d.usadoGB || 0), 0);
    const avgPct = capTotal ? Math.round((usadoTotal / capTotal) * 100) : 0;

    // distribuição por tipo
    const porTipo = {};
    Object.keys(LABELS.tipo).forEach(t => porTipo[t] = 0);
    drives.forEach(d => { if (d.tipo && porTipo[d.tipo] !== undefined) porTipo[d.tipo]++; });
    const maxTipo = Math.max(1, ...Object.values(porTipo));
    const tiposBars = Object.entries(porTipo).map(([t, n]) =>
      `<div class="dash-bar-row">
        <span class="dash-bar-label">${DRIVE_ICON[t] || ''} ${LABELS.tipo[t]}</span>
        <span class="dash-bar"><i style="width:${(n / maxTipo * 100).toFixed(0)}%;background:var(--cyan)"></i></span>
        <span class="dash-bar-count">${n}</span>
      </div>`).join('');

    // top 5 mais cheios
    const comUso = drives.filter(d => usoPct(d) != null).sort((a, b) => usoPct(b) - usoPct(a)).slice(0, 5);
    const topHtml = comUso.map(d => {
      const pct = usoPct(d);
      return `<div class="dash-top-item" data-id="${d.id}">
        <span style="font-size:18px">${DRIVE_ICON[d.tipo] || '💾'}</span>
        <span class="dash-top-name">${esc(d.nome)}</span>
        ${smartBadge(d)}
        <span class="dash-top-bar"><i style="width:${pct}%;background:${pctColor(pct)}"></i></span>
        <span class="dash-top-pct" style="color:${pctColor(pct)}">${pct}%</span>
      </div>`;
    }).join('') || '<div class="muted" style="font-size:13px">Nenhum drive com dados de uso.</div>';

    // dicas de reorganização
    const tips = [];
    const subutilizados = drives.filter(d => usoPct(d) != null && usoPct(d) < 20);
    if (subutilizados.length >= 2) {
      const nomes = subutilizados.slice(0, 3).map(d => d.nome).join(', ');
      const capLivre = subutilizados.reduce((s, d) => s + (d.capacidadeGB || 0) - (d.usadoGB || 0), 0);
      tips.push(`<b>💡 Consolidação possível:</b> ${subutilizados.length} drives com menos de 20% de uso (${nomes}). Juntos liberam ${fmtGB(capLivre)}.`);
    }
    const cheios = drives.filter(d => usoPct(d) != null && usoPct(d) >= 90);
    if (cheios.length) {
      tips.push(`<b>⚠️ ${cheios.length} drive(s) acima de 90%:</b> ${cheios.map(d => d.nome).join(', ')}. Considere fazer backup ou migrar dados.`);
    }
    const semLocal = drives.filter(d => !d.local);
    if (semLocal.length) {
      tips.push(`<b>📍 ${semLocal.length} drive(s) sem local definido.</b> Saber onde cada drive está guardado facilita encontrá-los.`);
    }
    const tipsHtml = tips.map(t => `<div class="dash-tip">${t}</div>`).join('');

    // drives por local
    const porLocal = {};
    drives.forEach(d => { const loc = d.local || 'Sem local'; if (!porLocal[loc]) porLocal[loc] = 0; porLocal[loc]++; });
    const locaisHtml = Object.entries(porLocal).sort((a, b) => b[1] - a[1]).map(([loc, n]) =>
      `<div class="dash-bar-row">
        <span class="dash-bar-label">${esc(loc)}</span>
        <span class="dash-bar"><i style="width:${(n / total * 100).toFixed(0)}%;background:var(--blue)"></i></span>
        <span class="dash-bar-count">${n}</span>
      </div>`).join('');

    el.innerHTML = `
      <div class="screen-label">Painel</div>
      <div class="dash-stats">
        <div class="stat-card"><div class="stat-val">${total}</div><div class="stat-label">Drives</div></div>
        <div class="stat-card"><div class="stat-val">${fmtGB(capTotal)}</div><div class="stat-label">Capacidade</div></div>
        <div class="stat-card"><div class="stat-val">${fmtGB(usadoTotal)}</div><div class="stat-label">Usado</div></div>
        <div class="stat-card"><div class="stat-val" style="color:${pctColor(avgPct)}">${avgPct}%</div><div class="stat-label">Média de uso</div></div>
      </div>
      ${tipsHtml ? `<div class="dash-section">${tipsHtml}</div>` : ''}
      <div class="dash-section">
        <div class="hint">Distribuição por tipo</div>
        ${tiposBars}
      </div>
      <div class="dash-section">
        <div class="hint">Por local</div>
        ${locaisHtml}
      </div>
      <div class="dash-section">
        <div class="hint">Mais cheios</div>
        <div class="dash-top">${topHtml}</div>
      </div>
      <button class="btn ghost" id="dash-relatorio" style="width:100%;margin-top:6px">📄 Gerar relatório (PDF)</button>`;

    el.querySelectorAll('.dash-top-item').forEach(item => item.addEventListener('click', () => {
      state.driveId = item.dataset.id; go('detalhe');
    }));
    el.querySelector('#dash-relatorio').addEventListener('click', () => go('relatorio'));
  }

  // ================= BUSCA =================
  function buscar(cat) {
    const q = norm(state.query);
    return cat.drives.filter(d => {
      if (state.filtro && !(d.tiposArquivo || []).includes(state.filtro)) return false;
      if (!q) return true;
      const alvo = norm([d.nome, d.id, d.conteudo, d.marca, d.modelo, d.serial, (d.tags || []).join(' ')].join(' '));
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

  function smartBadge(d) {
    if (!d.smart || d.smart.score == null) return '<span class="smart-badge smart-none" title="S.M.A.R.T. não escaneado">sem dados de saúde</span>';
    const s = d.smart.score, c = smartScoreColor(s);
    const dt = d.smart.checkedAt ? ' (' + new Date(d.smart.checkedAt).toLocaleDateString('pt-BR') + ')' : '';
    return `<span class="smart-badge" style="color:${c}" title="S.M.A.R.T. ${s}% — ${smartScoreLabel(s)}${dt}">🔧${s}%</span>`;
  }

  function cardHtml(d, gallery) {
    const pct = usoPct(d);
    if (gallery) {
      const bar = pct == null ? '' :
        `<div class="meta"><span class="bar"><i style="width:${pct}%;background:${pctColor(pct)}"></i></span><span style="color:${pctColor(pct)}">${pct}%</span></div>`;
      return `<div class="card gallery-card" data-id="${d.id}">
        <span class="drive-icon">${DRIVE_ICON[d.tipo] || '💾'}</span>
        <div class="dname">${esc(d.nome)}</div>
        <div class="id-chip" style="margin:4px auto 0">${d.id}</div>
        ${bar}
        ${d.local ? `<div class="card-location" style="font-size:10px;color:var(--txt-soft);margin-top:4px">📍 ${esc(d.local)}</div>` : ''}
        ${smartBadge(d)}
      </div>`;
    }
    const bar = pct == null ? '' :
      `<span class="bar"><i style="width:${pct}%;background:${pctColor(pct)}"></i></span><span style="color:${pctColor(pct)}">${pct}%</span>`;
    return `<div class="card" data-id="${d.id}">
      <div class="card-head"><div class="dname">${DRIVE_ICON[d.tipo] || '💾'} ${esc(d.nome)}</div><div class="id-chip">${d.id}</div></div>
      <div class="match">${snippet(d)}</div>
      <div class="meta"><span>${LABELS.tipo[d.tipo] || d.tipo}${d.local ? ' · 📍 ' + esc(d.local) : ''}</span>${smartBadge(d)}${bar}</div>
    </div>`;
  }

  function renderBusca(cat) {
    const res = buscar(cat);
    const pills = TIPOS_ARQUIVO.map(t =>
      `<button class="fpill ${state.filtro === t ? 'on' : ''}" data-filtro="${t}">${LABELS.tiposArquivo[t]}</button>`
    ).join('');

    let resultsHtml;
    if (state.agrupar) {
      const grupos = {};
      res.forEach(d => { const loc = d.local || 'Sem local'; if (!grupos[loc]) grupos[loc] = []; grupos[loc].push(d); });
      const sorted = Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0]));
      resultsHtml = sorted.map(([loc, drives]) =>
        `<div class="group-header">📍 ${esc(loc)} <span class="group-count">(${drives.length})</span></div>
         <div class="results${state.galeria ? ' gallery' : ''}">${drives.map(d => cardHtml(d, state.galeria)).join('')}</div>`
      ).join('');
    } else {
      const cards = res.map(d => cardHtml(d, state.galeria)).join('');
      resultsHtml = `<div class="results${state.galeria ? ' gallery' : ''}">${cards || `<div class="empty">Nada encontrado.<br>Tente outra palavra ou tipo.</div>`}</div>`;
    }

    el.innerHTML = `
      <div class="searchbar"><span class="mag">⌕</span>
        <input id="q" placeholder="Buscar em todos os drives…" value="${esc(state.query)}" autocomplete="off"></div>
      <div class="filter-row">${pills}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <div class="hint" style="margin:0">${res.length} drive(s) encontrado(s)</div>
        <div class="busca-toggles" style="margin:0">
          <button class="toggle-btn${state.galeria ? ' on' : ''}" id="tgl-galeria">▦ Galeria</button>
          <button class="toggle-btn${state.agrupar ? ' on' : ''}" id="tgl-agrupar">📍 Por local</button>
        </div>
      </div>
      ${resultsHtml}`;

    const q = document.getElementById('q');
    q.addEventListener('input', () => { state.query = q.value; const pos = q.selectionStart; renderBusca(store.load()); const nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(pos, pos); });
    el.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.filtro; state.filtro = state.filtro === t ? null : t; renderBusca(store.load());
    }));
    el.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => { state.driveId = c.dataset.id; go('detalhe'); }));
    document.getElementById('tgl-galeria').addEventListener('click', () => { state.galeria = !state.galeria; renderBusca(store.load()); });
    document.getElementById('tgl-agrupar').addEventListener('click', () => { state.agrupar = !state.agrupar; renderBusca(store.load()); });
  }

  // ================= ÁRVORE DE PASTAS (readonly) =================
  function parseTree(texto) {
    const linhas = texto.split('\n').filter(l => l.trim());
    const tree = [];
    const stack = [{ children: tree, level: -1 }];
    for (const l of linhas) {
      const match = l.match(/^(›*)\s*(.*)/);
      const level = match ? match[1].length : 0;
      const nome = match ? match[2] : l;
      const node = { nome, level, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return tree;
  }
  function buildTreeHtml(nodes, hidden) {
    let h = '<ul class="tree-list"' + (hidden ? ' style="display:none"' : '') + '>';
    for (const n of nodes) {
      const isFile = n.nome.startsWith('•');
      const nomeExibido = isFile ? n.nome.slice(1) : n.nome;
      const has = !isFile && n.children.length > 0;
      h += '<li class="tree-item"><div class="tree-row' + (has ? ' tree-parent' : '') + '">';
      if (has) h += '<span class="tree-arrow">▸</span>';
      else h += '<span class="tree-dot">·</span>';
      h += '<span class="tree-name">' + (isFile ? '📄 ' : '📁 ') + esc(nomeExibido) + '</span>';
      if (has) h += '<span class="tree-count">' + n.children.length + '</span>';
      h += '</div>';
      if (has) h += buildTreeHtml(n.children, true);
      h += '</li>';
    }
    return h + '</ul>';
  }
  function bindTreeClicks(container) {
    container.querySelectorAll('.tree-parent').forEach(row => {
      row.addEventListener('click', () => {
        const ul = row.parentElement.querySelector(':scope > ul');
        const arrow = row.querySelector('.tree-arrow');
        if (ul) { const open = ul.style.display !== 'none'; ul.style.display = open ? 'none' : ''; arrow.textContent = open ? '▸' : '▾'; }
      });
    });
  }
  function renderTreeReadonly(container, texto) {
    if (!texto || !texto.includes('›')) return;
    const tree = parseTree(texto);
    container.innerHTML = buildTreeHtml(tree, false);
    bindTreeClicks(container);
  }

  // ================= S.M.A.R.T. =================
  const SMART_URL = 'http://localhost:7777';

  function smartScoreColor(score) {
    if (score >= 80) return '#2ee6e0';
    if (score >= 50) return '#f5b544';
    return '#e5484d';
  }

  function smartScoreLabel(score) {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Atenção';
    if (score >= 30) return 'Crítico';
    return 'Falha iminente';
  }

  function renderSmartResult(container, driveData, smartDrives) {
    const serial = (driveData.serial || '').toLowerCase().trim();
    const modelo = (driveData.modelo || '').toLowerCase().trim();
    let match = null;
    if (serial) match = smartDrives.find(s => (s.serial || '').toLowerCase().trim() === serial);
    if (!match && modelo) match = smartDrives.find(s => (s.model || '').toLowerCase().includes(modelo));
    if (!match && smartDrives.length === 1) match = smartDrives[0];

    if (!match) {
      container.innerHTML = `
        <div class="smart-info muted" style="font-size:13px">
          Nenhum drive conectado corresponde a este cadastro.<br>
          <span style="font-size:11px">Dica: preencha Marca/Modelo ou Nº de série para correspondência automática.</span>
        </div>
        <div class="smart-all"><b style="font-size:12px;color:var(--txt-mid)">Drives detectados:</b>
          ${smartDrives.map(s => `<div class="smart-detected">• ${esc(s.model || s.device)} ${s.serial ? '(S/N: ' + esc(s.serial) + ')' : ''} — Score: ${s.score ?? '?'}</div>`).join('')}
        </div>`;
      return;
    }

    const score = match.score ?? 0;
    const color = smartScoreColor(score);
    const label = smartScoreLabel(score);
    const R = 50, C = 2 * Math.PI * R;
    container.innerHTML = `
      <div class="smart-card">
        <div class="smart-gauge">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="#16303f" stroke-width="10"/>
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - score / 100)).toFixed(1)}"
              transform="rotate(-90 60 60)" style="filter:drop-shadow(0 0 6px ${color})"/>
          </svg>
          <div class="smart-score" style="color:${color}">${score}<span>%</span></div>
        </div>
        <div class="smart-details">
          <div class="smart-label" style="color:${color}">${label}</div>
          <div class="smart-model">${esc(match.model || match.device)}</div>
          ${match.serial ? `<div class="smart-serial">S/N: ${esc(match.serial)}</div>` : ''}
          <div class="smart-attrs">
            ${match.temperature != null ? `<span>🌡️ ${match.temperature}°C</span>` : ''}
            ${match.powerOnHours != null ? `<span>⏱️ ${match.powerOnHours.toLocaleString()}h</span>` : ''}
            ${match.health ? `<span>${match.health === 'PASSED' ? '✅' : '❌'} ${match.health}</span>` : ''}
          </div>
          <div class="smart-attrs">
            ${match.reallocated ? `<span style="color:var(--warn)">⚠️ ${match.reallocated} setores realocados</span>` : ''}
            ${match.pending ? `<span style="color:var(--warn)">⚠️ ${match.pending} setores pendentes</span>` : ''}
            ${match.uncorrectable ? `<span style="color:var(--danger)">❌ ${match.uncorrectable} incorrigíveis</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function saveSmart(driveData, smartDrives) {
    const serial = (driveData.serial || '').toLowerCase().trim();
    const modelo = (driveData.modelo || '').toLowerCase().trim();
    let match = null;
    if (serial) match = smartDrives.find(s => (s.serial || '').toLowerCase().trim() === serial);
    if (!match && modelo) match = smartDrives.find(s => (s.model || '').toLowerCase().includes(modelo));
    if (!match && smartDrives.length === 1) match = smartDrives[0];
    if (!match) return;
    const cat = store.load();
    const d = cat.drives.find(x => x.id === driveData.id);
    if (!d) return;
    d.smart = {
      score: match.score ?? null,
      health: match.health || null,
      temperature: match.temperature ?? null,
      powerOnHours: match.powerOnHours ?? null,
      reallocated: match.reallocated ?? 0,
      pending: match.pending ?? 0,
      uncorrectable: match.uncorrectable ?? 0,
      model: match.model || null,
      checkedAt: new Date().toISOString()
    };
    store.save(cat);
  }

  async function fetchSmart(driveData, container) {
    container.innerHTML = '<div class="smart-loading">🔄 Consultando companion…</div>';
    try {
      const r = await fetch(SMART_URL + '/smart', { signal: AbortSignal.timeout(15000) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'Resposta inválida');
      if (!data.drives || !data.drives.length) {
        container.innerHTML = '<div class="smart-info muted">Companion conectado, mas nenhum drive S.M.A.R.T. detectado.</div>';
        return;
      }
      renderSmartResult(container, driveData, data.drives);
      saveSmart(driveData, data.drives);
    } catch (e) {
      if (e.name === 'TimeoutError' || e.message.includes('fetch')) {
        container.innerHTML = `
          <div class="smart-offline">
            <div style="font-size:15px;margin-bottom:10px">⚠️ Companion não detectado</div>
            <div class="muted" style="font-size:13px;margin-bottom:14px">
              Para ver a saúde S.M.A.R.T., é preciso rodar um pequeno programa neste computador.<br>
              Só precisa fazer isso uma vez por máquina.
            </div>
            <div class="smart-steps">
              <div><b style="color:var(--cyan-lt)">Passo 1</b> — Instale o <a href="https://www.python.org/downloads/" target="_blank" style="color:var(--cyan)">Python</a> (marque "Add to PATH")</div>
              <div><b style="color:var(--cyan-lt)">Passo 2</b> — Instale o <a href="https://www.smartmontools.org/wiki/Download" target="_blank" style="color:var(--cyan)">smartmontools</a> (lê dados S.M.A.R.T. dos discos)</div>
              <div><b style="color:var(--cyan-lt)">Passo 3</b> — Baixe a pasta <a href="https://github.com/Asgard1anBr/OmniDrive/tree/main/companion" target="_blank" style="color:var(--cyan)">companion</a> do repositório</div>
              <div><b style="color:var(--cyan-lt)">Passo 4</b> — Dê duplo clique em <code style="color:var(--cyan-lt)">iniciar-smart.bat</code> (pede admin automaticamente)</div>
              <div><b style="color:var(--cyan-lt)">Passo 5</b> — Volte aqui e clique "Verificar saúde" novamente</div>
            </div>
          </div>`;
      } else {
        container.innerHTML = `<div class="smart-info" style="color:var(--warn)">Erro: ${esc(e.message)}</div>`;
      }
    }
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
      chip('Tamanho', LABELS.tamanho && LABELS.tamanho[d.tamanho]),
      chip('Marca', d.marca),
      chip('Modelo', d.modelo),
      chip('S/N', d.serial),
      chip('Conexão', d.conexao),
      chip('Cripto', LABELS.criptografia[d.criptografia]),
      d.particoes ? chip('Partições', String(d.particoes)) : '',
      chip('Estado', LABELS.estado[d.estado]),
      chip('Local', d.local)
    ].join('');

    const tags = TIPOS_ARQUIVO.map(t =>
      `<span class="tag ${(d.tiposArquivo || []).includes(t) ? 'on' : ''}">${LABELS.tiposArquivo[t]}</span>`).join('');

    const temArvore = d.conteudo && d.conteudo.includes('›');
    const linhas = temArvore ? '' : (splitConteudo(d.conteudo).map(i => `<div class="line">${esc(i)}</div>`).join('')
      || `<div class="line muted">Sem conteúdo cadastrado.</div>`);

    el.innerHTML = `
      <button class="back" id="back">‹ Voltar</button>
      <div class="detail-top">
        <div class="screen-label" style="margin:0">${esc(d.nome)}</div>
        <div class="muted" style="font-size:12px">${d.id}${d.aquisicao ? ' · ' + esc(d.aquisicao) : ''}</div>
      </div>
      <div class="form-actions" style="margin-top:12px">
        <button class="btn ghost" id="editar">✎ Editar</button>
        <button class="btn" id="qr">⌗ Gerar QR</button>
      </div>
      ${gauge}
      <div class="chips">${chips}</div>
      <div class="hint">Tipos de arquivo</div><div class="tags">${tags}</div>
      <div class="hint">Conteúdo</div>
      ${temArvore ? '<div id="detail-tree"></div>' : `<div class="content-list">${linhas}</div>`}
      ${d.observacoes ? `<div class="hint">Observações</div><div class="muted" style="font-size:13px">${esc(d.observacoes)}</div>` : ''}
      ${d.smart && d.smart.score != null ? `<div class="hint">S.M.A.R.T.</div><div class="smart-section"><div class="smart-saved"><span style="color:${smartScoreColor(d.smart.score)};font-weight:700;font-size:16px">🔧 ${d.smart.score}% — ${smartScoreLabel(d.smart.score)}</span>${d.smart.temperature != null ? ` · 🌡️ ${d.smart.temperature}°C` : ''}${d.smart.powerOnHours != null ? ` · ⏱️ ${d.smart.powerOnHours.toLocaleString()}h` : ''}${d.smart.health ? ` · ${d.smart.health === 'PASSED' ? '✅' : '❌'} ${d.smart.health}` : ''}${d.smart.reallocated ? `<div style="color:var(--warn);font-size:12px;margin-top:4px">⚠️ ${d.smart.reallocated} setores realocados</div>` : ''}${d.smart.checkedAt ? `<div class="muted" style="font-size:11px;margin-top:4px">Última verificação: ${new Date(d.smart.checkedAt).toLocaleString('pt-BR')}</div>` : ''}</div></div>` : ''}
      <button class="btn-remove-small" id="remover">Remover drive</button>`;

    if (temArvore) renderTreeReadonly(el.querySelector('#detail-tree'), d.conteudo);
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

      <label class="flabel">S.M.A.R.T.</label>
      <div id="smart-form-section">
        <button type="button" class="btn-scan" id="smart-check-form">🔧 Escanear saúde e informações do dispositivo</button>
        ${d.smart && d.smart.score != null ? `<div class="smart-saved" style="margin-top:8px"><span style="color:${smartScoreColor(d.smart.score)};font-weight:700">🔧 ${d.smart.score}% — ${smartScoreLabel(d.smart.score)}</span>${d.smart.temperature != null ? ` · 🌡️ ${d.smart.temperature}°C` : ''}${d.smart.powerOnHours != null ? ` · ⏱️ ${d.smart.powerOnHours.toLocaleString()}h` : ''}${d.smart.checkedAt ? `<div class="muted" style="font-size:11px;margin-top:4px">Última verificação: ${new Date(d.smart.checkedAt).toLocaleString('pt-BR')}</div>` : ''}</div>` : ''}
      </div>

      <label class="flabel">Tipo</label>
      ${segHtml('f-tipo', LABELS.tipo, d.tipo)}

      <label class="flabel">Tamanho <em>opcional</em></label>
      ${segHtml('f-tamanho', LABELS.tamanho, d.tamanho)}

      <div class="row">
        <div class="col">
          <label class="flabel">Marca <em>opcional</em></label>
          <input class="field" id="f-marca" value="${esc(d.marca || '')}" placeholder="Samsung, WD…" autocomplete="off">
        </div>
        <div class="col">
          <label class="flabel">Modelo <em>opcional</em></label>
          <input class="field" id="f-modelo" value="${esc(d.modelo || '')}" placeholder="T7 Shield…" autocomplete="off">
        </div>
      </div>

      <label class="flabel">Nº de série <em>opcional</em></label>
      <input class="field" id="f-serial" value="${esc(d.serial || '')}" placeholder="S/N do dispositivo" autocomplete="off">

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
      <input class="field" id="f-aquisicao" type="${d.aquisicao ? 'month' : 'text'}" value="${esc(d.aquisicao || '')}" placeholder=" " readonly onfocus="this.type='month';this.removeAttribute('readonly');this.showPicker?.()" onchange="this.classList.toggle('month-filled',!!this.value)">

      <label class="flabel">Tipos de arquivo</label>
      ${pillHtml('f-tipos', LABELS.tiposArquivo, d.tiposArquivo || [])}

      <label class="flabel">Conteúdo <em>lista, vírgulas, do seu jeito</em></label>
      <button type="button" class="btn-scan" id="scan-dir">📂 Escanear pastas do drive</button>
      <input type="file" id="scan-fallback" webkitdirectory multiple hidden>
      <div id="tree-view"></div>
      <textarea class="field" id="f-conteudo" placeholder="Casamento fotos RAW 2019, Fotos viagem Chile…" style="${d.conteudo && d.conteudo.includes('›') ? 'display:none' : ''}">${esc(d.conteudo || '')}</textarea>
      <div class="muted" id="scan-status" style="font-size:11px;min-height:14px;margin-top:4px"></div>

      <label class="flabel">Tags <em>separadas por vírgula</em></label>
      <input class="field" id="f-tags" value="${esc((d.tags || []).join(', '))}" placeholder="Fotos família, Cliente X" autocomplete="off">
      <div class="tag-suggestions" id="tag-sug"></div>

      <label class="flabel">Observações <em>opcional</em></label>
      <textarea class="field" id="f-obs" placeholder="Notas…">${esc(d.observacoes || '')}</textarea>

      <div class="form-actions">
        <button type="button" class="btn ghost" id="cancelar">Cancelar</button>
        <button type="button" class="btn" id="salvar">${editing ? 'Salvar alterações' : 'Salvar drive'}</button>
      </div>
      ${editing ? `<button type="button" class="btn-remove-small" id="remover">Remover drive</button>` : ''}
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
    function smartApply(picked) {
      d.smart = { score: picked.score, health: picked.health, temperature: picked.temperature, powerOnHours: picked.powerOnHours, reallocated: picked.reallocated || 0, pending: picked.pending || 0, uncorrectable: picked.uncorrectable || 0, model: picked.model, serial: picked.serial, checkedAt: new Date().toISOString() };
      const fi = el.querySelector('#f-serial'), fm = el.querySelector('#f-modelo');
      if (picked.serial && fi) { fi.value = picked.serial; d.serial = picked.serial; }
      if (picked.model && fm) { fm.value = picked.model; d.modelo = picked.model; }
      const c = smartScoreColor(picked.score);
      smartRender(`<div class="smart-saved" style="margin-top:8px"><span style="color:${c};font-weight:700">🔧 ${picked.score}% — ${smartScoreLabel(picked.score)}</span>${picked.temperature != null ? ' · 🌡️ ' + picked.temperature + '°C' : ''}${picked.powerOnHours != null ? ' · ⏱️ ' + picked.powerOnHours.toLocaleString() + 'h' : ''}<div class="muted" style="font-size:11px;margin-top:4px">Verificado agora — ${new Date().toLocaleString('pt-BR')}</div></div>`);
    }
    function smartRender(html) {
      const section = el.querySelector('#smart-form-section');
      section.innerHTML = '<button type="button" class="btn-scan" id="smart-check-form">🔧 Escanear saúde e informações do dispositivo</button>' + html;
      el.querySelector('#smart-check-form').addEventListener('click', smartFormCheck);
    }
    function smartFormCheck() {
      const btn = el.querySelector('#smart-check-form');
      btn.disabled = true; btn.textContent = '🔄 Consultando…';
      fetch(SMART_URL + '/smart', { signal: AbortSignal.timeout(15000) })
        .then(r => r.json())
        .then(data => {
          if (!data.ok || !data.drives || !data.drives.length) {
            smartRender('<div class="muted" style="font-size:12px;margin-top:6px">Companion conectado, mas nenhum drive S.M.A.R.T. detectado.</div>');
            return;
          }
          const serial = (el.querySelector('#f-serial')?.value || d.serial || '').toLowerCase().trim();
          const modelo = (el.querySelector('#f-modelo')?.value || d.modelo || '').toLowerCase().trim();
          let match = null;
          if (serial) match = data.drives.find(s => (s.serial || '').toLowerCase().trim() === serial);
          if (!match && modelo) match = data.drives.find(s => (s.model || '').toLowerCase().includes(modelo));
          if (!match && data.drives.length === 1) match = data.drives[0];
          if (match) {
            smartApply(match);
          } else {
            const pickHtml = data.drives.map((s, i) => {
              const letters = s.letters && s.letters.length ? ' (' + s.letters.map(l => l + ':').join(', ') + ')' : '';
              return `<button type="button" class="btn-scan smart-pick" data-idx="${i}" style="font-size:12px;padding:8px">${esc(s.model || s.device)}${letters}${s.serial ? ' — ' + esc(s.serial) : ''}</button>`;
            }).join('');
            smartRender(`<div class="muted" style="font-size:12px;margin-top:6px">Selecione o drive:</div><div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">${pickHtml}</div>`);
            el.querySelector('#smart-form-section').querySelectorAll('.smart-pick').forEach(b => b.addEventListener('click', () => smartApply(data.drives[+b.dataset.idx])));
          }
        })
        .catch(() => {
          smartRender('<div style="font-size:12px;color:var(--warn);margin-top:6px">Companion não detectado. Rode iniciar-smart.bat primeiro.</div>');
        });
    }
    el.querySelector('#smart-check-form').addEventListener('click', smartFormCheck);

    // --- árvore colapsável de pastas (formulário) ---
    function renderTreeForm(container, texto) {
      if (!texto || !texto.includes('›')) { container.innerHTML = ''; return; }
      const tree = parseTree(texto);
      container.innerHTML = '<div class="tree-header"><span>📂 Pastas escaneadas</span><button type="button" class="tree-toggle" id="tree-edit">✏️ Editar texto</button></div>' + buildTreeHtml(tree, false);
      bindTreeClicks(container);
      container.querySelector('#tree-edit').addEventListener('click', () => {
        const ta = el.querySelector('#f-conteudo');
        const showing = ta.style.display !== 'none';
        ta.style.display = showing ? 'none' : '';
        container.querySelector('#tree-edit').textContent = showing ? '✏️ Editar texto' : '🌳 Ver árvore';
      });
    }
    const treeView = el.querySelector('#tree-view');
    renderTreeForm(treeView, el.querySelector('#f-conteudo').value);
    el.querySelector('#f-conteudo').addEventListener('input', () => {
      renderTreeForm(treeView, el.querySelector('#f-conteudo').value);
    });

    // escanear árvore de diretórios do drive plugado
    const scanBtn = el.querySelector('#scan-dir');
    const scanFallback = el.querySelector('#scan-fallback');

    function aplicarScan(lista, totalPastas, nomeRaiz) {
      const scanSt = el.querySelector('#scan-status');
      const conteudoEl = el.querySelector('#f-conteudo');
      const atual = conteudoEl.value.trim();

      if (atual) {
        const m2 = modal(`<h3>Conteúdo já preenchido</h3>
          <p class="muted" style="font-size:13px">O campo de conteúdo já tem texto. O que deseja fazer com as <b style="color:#fff">${totalPastas} pastas</b> encontradas em "${esc(nomeRaiz)}"?</p>
          <div style="max-height:160px;overflow-y:auto;background:rgba(0,0,0,.2);border-radius:8px;padding:10px;margin:12px 0;font-size:12px;color:var(--txt-mid);line-height:1.6;white-space:pre-line">${esc(lista)}</div>
          <div class="form-actions">
            <button type="button" class="btn ghost" id="m-cancel">Cancelar</button>
            <button type="button" class="btn ghost" id="m-juntar">Juntar ao existente</button>
            <button type="button" class="btn" id="m-subst">Substituir tudo</button>
          </div>`);
        m2.querySelector('#m-cancel').onclick = () => { m2.remove(); scanSt.textContent = ''; };
        m2.querySelector('#m-juntar').onclick = () => {
          conteudoEl.value = atual + '\n' + lista;
          conteudoEl.style.display = 'none';
          conteudoEl.dispatchEvent(new Event('input'));
          m2.remove();
          scanSt.textContent = '✓ ' + totalPastas + ' pastas adicionadas ao conteúdo existente.';
          scanSt.style.color = 'var(--cyan)';
        };
        m2.querySelector('#m-subst').onclick = () => {
          conteudoEl.value = lista;
          conteudoEl.style.display = 'none';
          conteudoEl.dispatchEvent(new Event('input'));
          m2.remove();
          scanSt.textContent = '✓ Conteúdo substituído com ' + totalPastas + ' pastas.';
          scanSt.style.color = 'var(--cyan)';
        };
      } else {
        conteudoEl.value = lista;
        conteudoEl.style.display = 'none';
        conteudoEl.dispatchEvent(new Event('input'));
        scanSt.textContent = '✓ ' + totalPastas + ' pastas de "' + nomeRaiz + '" adicionadas.';
        scanSt.style.color = 'var(--cyan)';
      }
    }

    // fallback via <input webkitdirectory> (Brave e browsers sem showDirectoryPicker)
    scanFallback.addEventListener('change', () => {
      const scanSt = el.querySelector('#scan-status');
      const files = scanFallback.files;
      if (!files.length) {
        scanSt.textContent = 'Nenhum arquivo lido — seleção cancelada ou pasta vazia.';
        scanSt.style.color = 'var(--warn)';
        return;
      }
      scanSt.textContent = 'Lendo ' + files.length + ' arquivo(s)…';
      scanSt.style.color = 'var(--txt-mid)';
      try {
      let nomeRaiz = '';
      const arvore = { __files: [] };
      for (const f of files) {
        const partes = f.webkitRelativePath.split('/');
        if (!nomeRaiz) nomeRaiz = partes[0];
        const arquivo = partes[partes.length - 1];
        if (arquivo.startsWith('.') || arquivo.startsWith('$') || arquivo === 'Thumbs.db' || arquivo === 'desktop.ini') continue;
        let node = arvore;
        let cortado = false;
        for (let i = 1; i < partes.length - 1; i++) {
          const nome = partes[i];
          if (nome.startsWith('.') || nome.startsWith('$') || nome === 'System Volume Information') { cortado = true; break; }
          if (!node[nome]) node[nome] = { __files: [] };
          node = node[nome];
        }
        if (!cortado) node.__files.push(arquivo);
      }
      function serializarArvore(obj, prof) {
        const linhas = [];
        const nomes = Object.keys(obj).filter(k => k !== '__files').sort((a, b) => a.localeCompare(b));
        for (const nome of nomes) {
          linhas.push('›'.repeat(prof) + ' ' + nome);
          if (prof < 3) linhas.push(...serializarArvore(obj[nome], prof + 1));
        }
        for (const arquivo of (obj.__files || []).sort((a, b) => a.localeCompare(b))) {
          linhas.push('›'.repeat(prof) + ' •' + arquivo);
        }
        return linhas;
      }
      const linhas = [nomeRaiz, ...serializarArvore(arvore, 1)];
      if (!linhas.length) {
        scanSt.textContent = 'Nenhuma pasta encontrada.';
        scanSt.style.color = 'var(--warn)';
        scanFallback.value = '';
        return;
      }
      aplicarScan(linhas.join('\n'), linhas.length, nomeRaiz);
      } catch (e) {
        console.error('OmniDrive scan error:', e);
        scanSt.textContent = 'Erro ao ler arquivos: ' + (e.message || 'desconhecido') + ' — veja o console (F12).';
        scanSt.style.color = 'var(--warn)';
      }
      scanFallback.value = '';
    });

    scanBtn.addEventListener('click', async () => {
      const scanSt = el.querySelector('#scan-status');
      if (!('showDirectoryPicker' in window)) {
        scanSt.textContent = 'Selecione a pasta raiz do drive externo…';
        scanSt.style.color = 'var(--txt-mid)';
        scanFallback.click();
        return;
      }
      try {
        scanSt.textContent = 'Selecione a pasta raiz do drive externo (pen drive, HD externo etc.)…';
        scanSt.style.color = 'var(--txt-mid)';
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        scanSt.textContent = 'Lendo pastas de "' + handle.name + '"…';
        scanBtn.disabled = true;

        async function listarPastas(dirHandle, prof, max) {
          const linhas = [];
          const pastas = [];
          const arquivos = [];
          for await (const [nome, entry] of dirHandle.entries()) {
            if (nome.startsWith('.') || nome.startsWith('$') || nome === 'System Volume Information' || nome === 'Thumbs.db' || nome === 'desktop.ini') continue;
            if (entry.kind === 'directory') pastas.push({ nome, entry });
            else arquivos.push(nome);
          }
          pastas.sort((a, b) => a.nome.localeCompare(b.nome));
          arquivos.sort((a, b) => a.localeCompare(b));
          for (const { nome, entry } of pastas) {
            linhas.push('›'.repeat(prof) + (prof > 0 ? ' ' : '') + nome);
            if (prof < max) {
              const sub = await listarPastas(entry, prof + 1, max);
              linhas.push(...sub);
            }
          }
          for (const nome of arquivos) {
            linhas.push('›'.repeat(prof) + (prof > 0 ? ' ' : '') + '•' + nome);
          }
          return linhas;
        }

        const sub = await listarPastas(handle, 1, 3);
        const linhas = [handle.name, ...sub];
        if (!linhas.length) {
          scanSt.textContent = 'Nenhuma pasta encontrada em "' + handle.name + '".';
          scanSt.style.color = 'var(--warn)';
          scanBtn.disabled = false;
          return;
        }

        aplicarScan(linhas.join('\n'), linhas.length, handle.name);
        scanBtn.disabled = false;
      } catch (e) {
        if (e.name === 'AbortError') { scanSt.textContent = ''; }
        else { scanSt.textContent = 'Erro: ' + (e.message || 'não foi possível ler'); scanSt.style.color = 'var(--warn)'; }
        scanBtn.disabled = false;
      }
    });

    // auto-tag: sugere tags com base no conteúdo digitado
    const TAG_RULES = [
      [/foto|raw|jpg|jpeg|png|imagem/i, 'Fotos'], [/v[ií]deo|mp4|mkv|avi|4k/i, 'Vídeos'],
      [/m[uú]sic|mp3|flac|audio|podcast/i, 'Música'], [/document|pdf|doc|planilh|excel/i, 'Documentos'],
      [/backup|bkp|c[oó]pia/i, 'Backup'], [/cliente|empresa|trabalho|projeto/i, 'Trabalho'],
      [/fam[ií]lia|pessoal|casa/i, 'Pessoal'], [/jogo|game|steam/i, 'Jogos'],
      [/sistema|windows|linux|iso|boot/i, 'Sistema'], [/viagem|f[eé]rias/i, 'Viagem']
    ];
    const conteudoEl = el.querySelector('#f-conteudo'), tagsEl = el.querySelector('#f-tags'), sugEl = el.querySelector('#tag-sug');
    const atualizarSugestoes = () => {
      const texto = (conteudoEl.value + ' ' + el.querySelector('#f-nome').value).toLowerCase();
      const jaTemTags = tagsEl.value.toLowerCase().split(',').map(s => s.trim());
      const sugestoes = TAG_RULES.filter(([re]) => re.test(texto)).map(([, tag]) => tag).filter(t => !jaTemTags.includes(t.toLowerCase()));
      sugEl.innerHTML = sugestoes.length
        ? '<span style="font-size:10px;color:var(--txt-soft);margin-right:4px">Sugestões:</span>' + sugestoes.map(t => `<button type="button" class="tag-sug">${t}</button>`).join('')
        : '';
      sugEl.querySelectorAll('.tag-sug').forEach(b => b.addEventListener('click', () => {
        const cur = tagsEl.value.trim();
        tagsEl.value = cur ? cur + ', ' + b.textContent : b.textContent;
        atualizarSugestoes();
      }));
    };
    conteudoEl.addEventListener('input', atualizarSugestoes);
    el.querySelector('#f-nome').addEventListener('input', atualizarSugestoes);
    tagsEl.addEventListener('input', atualizarSugestoes);
    atualizarSugestoes();

    el.querySelector('#salvar').addEventListener('click', () => {
      const nome = el.querySelector('#f-nome').value.trim();
      if (!nome) { toast('Informe o nome (etiqueta).'); el.querySelector('#f-nome').focus(); return; }
      const cat2 = store.load();
      const alvo = editing ? cat2.drives.find(x => x.id === id) : { id, criadoEm: new Date().toISOString() };
      alvo.id = id; alvo.nome = nome;
      alvo.tipo = segVal('f-tipo') || null;
      alvo.tamanho = segVal('f-tamanho') || null;
      alvo.marca = el.querySelector('#f-marca').value.trim() || null;
      alvo.modelo = el.querySelector('#f-modelo').value.trim() || null;
      alvo.serial = el.querySelector('#f-serial').value.trim() || null;
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
        go('dashboard');
      } catch (e) {
        console.error('OmniDrive login error:', e);
        st.textContent = 'Erro: ' + (e.message || 'falha desconhecida') + ' — confira o console (F12) para detalhes.';
      }
    });
    document.getElementById('e-local').addEventListener('click', () => { mode = 'local'; state.authed = true; go('dashboard'); });
  }

  // ================= RELATÓRIO =================
  const REPORT_SECS = [
    { id: 'basicos', label: 'Dados básicos e capacidade', on: true },
    { id: 'smart', label: 'Saúde S.M.A.R.T.', on: true },
    { id: 'conteudo', label: 'Pastas e arquivos', on: true },
    { id: 'localtags', label: 'Local, tags e observações', on: true },
    { id: 'ident', label: 'Marca, modelo e nº série', on: false },
    { id: 'datas', label: 'Datas (aquisição, cadastro)', on: false }
  ];

  function buildTreeStatic(nodes) {
    let h = '<ul class="rep-tree">';
    for (const n of nodes) {
      const isFile = n.nome.startsWith('•');
      const nome = isFile ? n.nome.slice(1) : n.nome;
      h += '<li class="' + (isFile ? 'rep-file' : 'rep-folder') + '">' + (isFile ? '📄 ' : '📁 ') + esc(nome);
      if (!isFile && n.children.length) h += buildTreeStatic(n.children);
      h += '</li>';
    }
    return h + '</ul>';
  }

  function repTabela(list, secs) {
    const cols = ['Drive', 'ID', 'Tipo'];
    if (secs.has('basicos')) cols.push('Capacidade', 'Uso');
    if (secs.has('smart')) cols.push('Saúde');
    if (secs.has('localtags')) cols.push('Local');
    const head = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
    const body = list.map(d => {
      const cells = [`<b>${esc(d.nome)}</b>`, d.id, LABELS.tipo[d.tipo] || d.tipo || '—'];
      if (secs.has('basicos')) {
        cells.push(d.capacidadeGB != null ? fmtGB(d.capacidadeGB) : '—');
        const p = usoPct(d); cells.push(p != null ? p + '%' : '—');
      }
      if (secs.has('smart')) cells.push(d.smart && d.smart.score != null ? d.smart.score + '%' : '—');
      if (secs.has('localtags')) cells.push(d.local ? esc(d.local) : '—');
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    }).join('');
    return `<table class="rep-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function repFicha(d, secs) {
    let rows = '';
    const add = (k, v) => { if (v != null && v !== '') rows += `<tr><th>${k}</th><td>${v}</td></tr>`; };
    if (secs.has('basicos')) {
      add('Tipo', LABELS.tipo[d.tipo] || d.tipo || '—');
      add('Tamanho físico', d.tamanho ? (LABELS.tamanho[d.tamanho] || d.tamanho) : null);
      add('Capacidade', d.capacidadeGB != null ? fmtGB(d.capacidadeGB) : null);
      const pct = usoPct(d);
      add('Espaço usado', d.usadoGB != null ? `${fmtGB(d.usadoGB)}${pct != null ? ` (${pct}%)` : ''}` : null);
      add('Estado', d.estado ? (LABELS.estado[d.estado] || d.estado) : null);
      add('Conexão', d.conexao ? esc(d.conexao) : null);
      add('Partições', d.particoes);
      add('Criptografia', d.criptografia ? (LABELS.criptografia[d.criptografia] || d.criptografia) : null);
      add('Acondicionamento', d.acondicionamento ? (LABELS.acondicionamento[d.acondicionamento] || d.acondicionamento) : null);
      const ta = (d.tiposArquivo || []).map(t => LABELS.tiposArquivo[t] || t);
      if (ta.length) add('Tipos de arquivo', ta.join(', '));
    }
    if (secs.has('ident')) {
      add('Marca', d.marca ? esc(d.marca) : null);
      add('Modelo', d.modelo ? esc(d.modelo) : null);
      add('Nº de série', d.serial ? esc(d.serial) : null);
    }
    if (secs.has('smart')) {
      if (d.smart && d.smart.score != null) {
        add('Saúde S.M.A.R.T.', `${d.smart.score}% — ${smartScoreLabel(d.smart.score)}`);
        add('Temperatura', d.smart.temperature != null ? d.smart.temperature + ' °C' : null);
        add('Horas ligado', d.smart.powerOnHours != null ? d.smart.powerOnHours.toLocaleString('pt-BR') + ' h' : null);
        add('Verificado em', d.smart.checkedAt ? new Date(d.smart.checkedAt).toLocaleString('pt-BR') : null);
      } else {
        add('Saúde S.M.A.R.T.', '<i>não escaneado</i>');
      }
    }
    if (secs.has('localtags')) {
      add('Local', d.local ? esc(d.local) : null);
      if ((d.tags || []).length) add('Tags', d.tags.map(esc).join(', '));
      if (d.observacoes) add('Observações', esc(d.observacoes));
    }
    if (secs.has('datas')) {
      add('Aquisição', d.aquisicao ? d.aquisicao.split('-').reverse().join('/') : null);
      add('Cadastrado', d.criadoEm ? new Date(d.criadoEm).toLocaleDateString('pt-BR') : null);
      add('Atualizado', d.atualizadoEm ? new Date(d.atualizadoEm).toLocaleDateString('pt-BR') : null);
    }
    let tree = '';
    if (secs.has('conteudo') && d.conteudo) {
      if (d.conteudo.includes('›')) tree = buildTreeStatic(parseTree(d.conteudo));
      else { const its = splitConteudo(d.conteudo); if (its.length) tree = '<ul class="rep-tree">' + its.map(i => '<li class="rep-file">' + esc(i) + '</li>').join('') + '</ul>'; }
    }
    return `<div class="rep-ficha">
      <div class="rep-ficha-head"><span class="rep-ficha-icon">${DRIVE_ICON[d.tipo] || '💾'}</span>
        <span class="rep-ficha-name">${esc(d.nome)}</span><span class="rep-ficha-id">${d.id}</span></div>
      ${rows ? `<table class="rep-kv">${rows}</table>` : ''}
      ${tree ? `<div class="rep-tree-wrap"><div class="rep-tree-title">📂 Conteúdo escaneado</div>${tree}</div>` : ''}
    </div>`;
  }

  function gerarRelatorio(cat, cfg) {
    const list = cfg.ids ? cat.drives.filter(d => cfg.ids.includes(d.id)) : cat.drives;
    if (!list.length) { toast('Nenhum drive para o relatório.'); return; }
    const now = new Date().toLocaleString('pt-BR');
    let inner = `<div class="rep-doc">
      <div class="rep-doc-head">
        <div class="rep-brand">OMNI<b>DRIVE</b></div>
        <div class="rep-title">Relatório de Drives</div>
        <div class="rep-sub">${list.length} drive(s) · Gerado em ${now}</div>
      </div>`;
    if (cfg.fmt === 'ambos' || cfg.fmt === 'tabela') inner += `<h2 class="rep-h2">Resumo</h2>${repTabela(list, cfg.secs)}`;
    if (cfg.fmt === 'ambos' || cfg.fmt === 'fichas') inner += `<h2 class="rep-h2">Fichas detalhadas</h2>${list.map(d => repFicha(d, cfg.secs)).join('')}`;
    inner += `<div class="rep-foot">Gerado pelo OmniDrive ${VERSAO}</div></div>`;

    const ov = document.createElement('div'); ov.id = 'rep-overlay';
    ov.innerHTML = `<div class="rep-toolbar">
        <button class="btn ghost" id="rep-fechar">‹ Fechar</button>
        <span class="rep-toolbar-title">Prévia — use Imprimir → Salvar como PDF</span>
        <button class="btn" id="rep-print">🖨️ Imprimir / PDF</button>
      </div><div class="rep-scroll">${inner}</div>`;
    document.body.appendChild(ov);
    document.getElementById('rep-fechar').addEventListener('click', () => ov.remove());
    document.getElementById('rep-print').addEventListener('click', () => window.print());
  }

  function renderRelatorio(cat) {
    const drives = cat.drives;
    const driveCbs = drives.map(d =>
      `<label class="rep-cb"><input type="checkbox" class="rep-drive-cb" value="${d.id}" checked> ${DRIVE_ICON[d.tipo] || '💾'} ${esc(d.nome)} <span class="rep-cb-id">${d.id}</span></label>`
    ).join('');
    const secPills = REPORT_SECS.map(s =>
      `<button type="button" class="fpill ${s.on ? 'on' : ''}" data-sec="${s.id}">${s.label}</button>`
    ).join('');

    el.innerHTML = `
      <button class="back" id="back">‹ Voltar</button>
      <div class="screen-label">Relatório</div>

      <div class="rep-group">
        <div class="hint">Drives incluídos</div>
        <div class="rep-scope">
          <button type="button" class="fpill on" data-scope="todos">Todos (${drives.length})</button>
          <button type="button" class="fpill" data-scope="escolher">Escolher…</button>
        </div>
        <div id="rep-drive-list" style="display:none">
          <div class="rep-cb-actions"><button type="button" id="rep-all">Marcar todos</button><button type="button" id="rep-none">Desmarcar todos</button></div>
          ${driveCbs}
        </div>
      </div>

      <div class="rep-group">
        <div class="hint">Formato</div>
        <div class="rep-fmt">
          <button type="button" class="fpill on" data-fmt="ambos">Tabela + Fichas</button>
          <button type="button" class="fpill" data-fmt="tabela">Só tabela</button>
          <button type="button" class="fpill" data-fmt="fichas">Só fichas</button>
        </div>
      </div>

      <div class="rep-group">
        <div class="hint">Informações incluídas</div>
        <div class="rep-secs">${secPills}</div>
      </div>

      <button class="btn" id="rep-gerar" style="width:100%;margin-top:6px">📄 Gerar relatório</button>
      <div class="muted" style="font-size:12px;margin-top:8px;text-align:center">Abre uma prévia. No diálogo de impressão, escolha <b>"Salvar como PDF"</b> como destino.</div>`;

    el.querySelector('#back').addEventListener('click', () => go('dashboard'));

    const listBox = el.querySelector('#rep-drive-list');
    el.querySelectorAll('.rep-scope button').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('.rep-scope button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      listBox.style.display = b.dataset.scope === 'escolher' ? '' : 'none';
    }));
    el.querySelector('#rep-all').addEventListener('click', () => el.querySelectorAll('.rep-drive-cb').forEach(c => c.checked = true));
    el.querySelector('#rep-none').addEventListener('click', () => el.querySelectorAll('.rep-drive-cb').forEach(c => c.checked = false));
    el.querySelectorAll('.rep-fmt button').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('.rep-fmt button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    }));
    el.querySelectorAll('.rep-secs button').forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));

    el.querySelector('#rep-gerar').addEventListener('click', () => {
      const scope = el.querySelector('.rep-scope button.on').dataset.scope;
      let ids = null;
      if (scope === 'escolher') {
        ids = [...el.querySelectorAll('.rep-drive-cb:checked')].map(c => c.value);
        if (!ids.length) { toast('Marque ao menos um drive.'); return; }
      }
      const fmt = el.querySelector('.rep-fmt button.on').dataset.fmt;
      const secs = new Set([...el.querySelectorAll('.rep-secs button.on')].map(b => b.dataset.sec));
      if (!secs.size) { toast('Escolha ao menos uma seção de informação.'); return; }
      gerarRelatorio(cat, { ids, fmt, secs });
    });
  }

  // ================= SOBRE =================
  function renderSobre() {
    const acctLine = state.authed
      ? `<div class="muted" style="margin-top:18px;font-size:13px">Conectado: ${esc(mode === 'cloud' ? (OmniCloud.getUserEmail() || 'Conta Google') : 'Modo local (sem login)')}</div>
         <button class="btn ghost" id="sair" style="margin-top:10px">Sair</button>` : '';
    el.innerHTML = `<div class="sobre">
      <img src="icons/omnidrive-icon.png" alt="OmniDrive">
      <h1>OmniDrive <span class="muted" style="font-size:14px">${VERSAO}</span></h1>
      <p>Catálogo pessoal de drives físicos (HDs, SSDs, NVMe, pen drives). Guarda o que existe dentro
      de cada drive e permite buscar por qualquer palavra ou por tipo de arquivo, dizendo em qual drive
      o dado está — sem precisar plugar um por um.</p>
      <div class="by">Criado por <b>Davi Torres</b></div>
      ${acctLine}
      <button class="btn ghost" id="ver-versoes" style="margin-top:14px">Histórico de Versões</button>
    </div>`;
    document.getElementById('ver-versoes').addEventListener('click', () => go('versoes'));
    const sair = document.getElementById('sair');
    if (sair) sair.addEventListener('click', () => {
      if (mode === 'cloud') OmniCloud.signOut();
      mode = null; cloudCat = null; state.authed = false; state.driveId = null; state.editId = null; state.query = ''; state.filtro = null;
      go('entrar');
    });
  }

  // ================= HISTÓRICO DE VERSÕES =================
  function renderVersoes() {
    const blocos = CHANGELOG.map(c => `
      <div class="ver-bloco">
        <div class="ver-head"><b>v${c.v}</b><span class="muted">${c.data.split('-').reverse().join('/')}</span></div>
        <ul class="ver-lista">${c.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>`).join('');
    el.innerHTML = `
      <button class="back" id="back">‹ Voltar</button>
      <div class="screen-label">Histórico de Versões</div>
      ${blocos}`;
    document.getElementById('back').addEventListener('click', () => go('sobre'));
  }

  // ---------- navegação ----------
  function go(view) { state.view = view; render(); }
  function render() {
    document.querySelectorAll('.navbtn').forEach(t =>
      t.classList.toggle('active', t.dataset.view === state.view || (state.view === 'detalhe' && t.dataset.view === 'busca') || ((state.view === 'versoes' || state.view === 'relatorio') && t.dataset.view === 'dashboard')));
    if (state.view === 'sobre') return renderSobre();
    if (state.view === 'versoes') return renderVersoes();
    if (!state.authed || state.view === 'entrar') return renderEntrar();
    const cat = store.load();
    if (state.view === 'dashboard') renderDashboard(cat);
    else if (state.view === 'relatorio') renderRelatorio(cat);
    else if (state.view === 'busca') renderBusca(cat);
    else if (state.view === 'detalhe') renderDetalhe(cat);
    else if (state.view === 'cadastro') renderCadastro(cat, state.editId ? cat.drives.find(d => d.id === state.editId) : null);
  }

  document.querySelectorAll('.navbtn[data-view]').forEach(t => t.addEventListener('click', () => {
    if (!state.authed) return go('entrar');
    if (t.dataset.view === 'cadastro') state.editId = null;
    go(t.dataset.view);
  }));
  document.querySelector('.brand').addEventListener('click', () => { if (state.authed) go('dashboard'); });
  document.getElementById('btnSobre').addEventListener('click', () => go('sobre'));
  document.getElementById('btnScan').addEventListener('click', () => {
    if (!state.authed) return go('entrar');
    abrirScanner();
  });

  state.view = 'entrar';
  render();
})();
