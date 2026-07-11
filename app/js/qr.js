/* ===== OmniDrive — gerador de QR próprio (sem dependências) =====
   Escopo: os códigos OMNI-XXXXX são curtos (~10-11 chars), então fixamos
   QR versão 1 (21x21), nível de correção M (16 data + 10 EC codewords),
   modo byte. Reed-Solomon é calculado em runtime (sem tabelas mágicas).
   Expõe window.OmniQR = { matrix, toSVG, toCanvas }. */
(function () {
  'use strict';

  // ---- GF(256) ----
  const EXP = new Array(512), LOG = new Array(256);
  (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  function genPoly(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const m = [1, EXP[i]], res = new Array(g.length + 1).fill(0);
      for (let a = 0; a < g.length; a++) for (let b = 0; b < m.length; b++) res[a + b] ^= gmul(g[a], m[b]);
      g = res;
    }
    return g; // length n+1
  }
  function rsEncode(data, n) {
    const g = genPoly(n), ec = new Array(n).fill(0);
    for (const d of data) {
      const factor = d ^ ec[0];
      ec.shift(); ec.push(0);
      if (factor !== 0) for (let j = 0; j < n; j++) ec[j] ^= gmul(g[j + 1], factor);
    }
    return ec;
  }

  // ---- codewords (byte mode, v1, 16 data) ----
  function makeDataCodewords(text) {
    const bytes = new TextEncoder().encode(text), bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    push(0b0100, 4);          // modo byte
    push(bytes.length, 8);    // contagem (v1 byte = 8 bits)
    for (const b of bytes) push(b, 8);
    const cap = 16 * 8;
    push(0, Math.min(4, cap - bits.length)); // terminador
    while (bits.length % 8 !== 0) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; cw.push(v); }
    const pad = [0xEC, 0x11]; let p = 0;
    while (cw.length < 16) cw.push(pad[p++ % 2]);
    return cw;
  }

  // ---- máscaras / format info ----
  function maskFn(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }
  function formatBits(ec, mask) {
    const data = (ec << 3) | mask; // 5 bits (ec: M=0b00)
    let d = data << 10;
    for (let i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= 0x537 << (i - 10);
    return ((data << 10) | d) ^ 0x5412;
  }

  // ---- monta a matriz para uma máscara ----
  function render(all, mask) {
    const size = 21;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, v) => { m[y][x] = v; };
    const fnset = (x, y) => { fn[y][x] = true; };

    function finder(cx, cy) {
      for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
        const x = cx + j, y = cy + i; if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const border = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6));
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        set(x, y, border || inner); fnset(x, y);
      }
    }
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
    for (let i = 8; i < size - 8; i++) { const b = i % 2 === 0; set(6, i, b); fnset(6, i); set(i, 6, b); fnset(i, 6); }
    // reserva das áreas de format info + módulo escuro
    for (let i = 0; i < 9; i++) { fnset(8, i); fnset(i, 8); }
    for (let i = 0; i < 8; i++) { fnset(8, size - 1 - i); fnset(size - 1 - i, 8); }
    fnset(8, size - 8);

    // dados (zigzag), com máscara aplicada
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? size - 1 - vert : vert;
          if (fn[y][x]) continue;
          let dark = (bi >> 3) < all.length ? ((all[bi >> 3] >> (7 - (bi & 7))) & 1) === 1 : false;
          bi++;
          if (maskFn(mask, y, x)) dark = !dark;
          set(x, y, dark);
        }
      }
    }

    // format info (nível M = 0b00)
    const fmt = formatBits(0b00, mask), gb = i => ((fmt >> i) & 1) === 1;
    for (let k = 0; k <= 5; k++) set(8, k, gb(k));
    set(8, 7, gb(6)); set(8, 8, gb(7)); set(7, 8, gb(8));
    for (let k = 9; k < 15; k++) set(14 - k, 8, gb(k));
    for (let k = 0; k < 8; k++) set(size - 1 - k, 8, gb(k));
    for (let k = 8; k < 15; k++) set(8, size - 15 + k, gb(k));
    set(8, size - 8, true);
    return m;
  }

  function penalty(m) {
    const n = m.length; let p = 0;
    for (let y = 0; y < n; y++) { let run = 1; for (let x = 1; x < n; x++) { if (m[y][x] === m[y][x - 1]) run++; else { if (run >= 5) p += 3 + (run - 5); run = 1; } } if (run >= 5) p += 3 + (run - 5); }
    for (let x = 0; x < n; x++) { let run = 1; for (let y = 1; y < n; y++) { if (m[y][x] === m[y - 1][x]) run++; else { if (run >= 5) p += 3 + (run - 5); run = 1; } } if (run >= 5) p += 3 + (run - 5); }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const v = m[y][x]; if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) p += 3; }
    let dark = 0; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
    p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return p;
  }

  function matrix(text) {
    const all = makeDataCodewords(text).concat(rsEncode(makeDataCodewords(text), 10));
    let best = null, bestP = Infinity;
    for (let mask = 0; mask < 8; mask++) { const m = render(all, mask); const p = penalty(m); if (p < bestP) { bestP = p; best = m; } }
    return best;
  }

  function toSVG(m, moduleSize, quiet) {
    moduleSize = moduleSize || 8; quiet = quiet == null ? 4 : quiet;
    const n = m.length, dim = (n + quiet * 2) * moduleSize; let r = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x])
      r += `<rect x="${(x + quiet) * moduleSize}" y="${(y + quiet) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#000000">${r}</g></svg>`;
  }
  function toCanvas(m, scale, quiet) {
    scale = scale || 10; quiet = quiet == null ? 4 : quiet;
    const n = m.length, dim = (n + quiet * 2) * scale;
    const cv = document.createElement('canvas'); cv.width = cv.height = dim;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dim, dim); ctx.fillStyle = '#000';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    return cv;
  }

  window.OmniQR = { matrix, toSVG, toCanvas };
})();
