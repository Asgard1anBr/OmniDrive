# OmniDrive — Catálogo de Drives Físicos (PWA)

Contexto permanente do projeto. Lido automaticamente toda sessão. Fica na raiz da pasta OmniDrive.

## Regras de trabalho
1. **Responda em português**, direto: quando tiver info pra agir, aja; recomende uma opção em vez de listar todas.
2. **Todo material do projeto fica dentro desta pasta** (`OmniDrive/`). Não espalhe nada fora.
3. **Não comece do zero.** Fases 1–3 já estão em produção local. Leia `docs/OmniDrive.md` (documento-mestre) antes de mexer.
4. **Sem dependências externas / CDN.** App é PWA vanilla (HTML/CSS/JS puro, sem build, sem framework). Filosofia: durar anos, não depender de terceiro que cobre ou pause.
5. **Ao concluir algo relevante, atualize** `docs/OmniDrive.md` (visão, decisões, "Registro de build", histórico de versões).
6. Sempre prever **breakpoints** (celular ≤600 / tablet 601–1024 / PC ≥1025) e **texto digitado branco**.
7. **Incremente a versão a cada modificação**, mesmo pequena (SemVer): correção/pequeno ajuste → +patch (1.0.1),
   funcionalidade nova → +minor (1.1). Bater em: `app/index.html` (`#appVer`), e em `app/js/app.js` a constante
   `VERSAO` (alimenta o Sobre), `SEED.appVersion` e **uma entrada nova no `CHANGELOG`** (alimenta a tela
   "Histórico de Versões", em linguagem de usuário, pt-BR). Em qualquer mudança de arquivo cacheado, **bump
   também o `CACHE` do `app/sw.js`** (senão o usuário fica com a versão velha presa no cache).

## O que é
Catálogo pessoal dos drives físicos do Davi (dezenas de HD/SSD/NVMe/pen drive), cada um com etiqueta.
Cadastra o que tem dentro e busca por qualquer pedaço de palavra ou por tipo de arquivo — diz em qual
drive está e o que mais tem nele, sem plugar um por um. Criado por Davi Torres.

## Arquitetura
- **PWA** único: roda em PC, celular e tablet; responsivo à janela; instalável.
- **Dados na nuvem, no Google Drive do próprio usuário** (arquivo JSON único), via Drive API escopo `drive.file`.
- **Login Google** (a mesma conta autentica e guarda os dados).
- **QR = código opaco** (`OMNI-XXXXX`), gerado pelo sistema; só o app interpreta.
- Backup: escrita segura + backups rotativos + revisões nativas do Drive (Apps Script adiado).

## Estrutura da pasta
- `app/` — o PWA: `index.html`, `css/styles.css`, `js/app.js` (telas + CRUD), `js/qr.js` (gerador de QR próprio),
  `manifest.webmanifest`, `icons/`, `backgrounds/` (bg-pc.png / bg-mobile.png).
- `docs/OmniDrive.md` — **documento-mestre** (visão, campos, esquema JSON §4.1, design, decisões, build log).
- `assets/logo/` — logo (bússola ciano). `dev-server.js` — servidor estático local.

## Como rodar (dev)
- Node instalado, mas fora do PATH do bash: usar `"/c/Program Files/nodejs/node" dev-server.js`.
- Sobe em **http://localhost:5050** (e `http://127.0.0.1:5050`). Sem cache (`no-store`).
- Abrir no Brave: usar `http://127.0.0.1:5050` (senão o Brave vira `localhost.com`).

## Produção
- **URL:** https://asgard1anbr.github.io/OmniDrive/
- **Repo:** https://github.com/Asgard1anBr/OmniDrive (público, branch `main`)
- **Deploy:** automático via GitHub Actions (`.github/workflows/deploy.yml`) a cada push em `main`, publica o
  conteúdo de `app/`. Configurado em Settings → Pages → Source = GitHub Actions.
- **OAuth Google:** origens autorizadas incluem `http://localhost:5050`, `http://127.0.0.1:5050` (dev) e
  `https://asgard1anbr.github.io` (produção). Client ID em `app/js/config.js`.

## Status (2026-07-11) — app v1.0
- ✅ **Fase 1** — Busca (filtro por tipo, destaque, sem acento) + Detalhe (anel de capacidade) + Sobre.
- ✅ **Fase 2** — Cadastro tela cheia (novo + editar tudo, inclusive tamanho usado), ID auto, capacidade com
  eco/%, "+ Novo Local" em modal, remoção com confirmação, salvar (localStorage por enquanto).
- ✅ **Fase 3** — QR próprio (`qr.js`): ver código, Copiar, exportar PNG/SVG. Validado (round-trip) e escaneado no celular.
- ✅ **Fase 4** — Google Drive (login, catálogo JSON, backups rotativos) + Service Worker (PWA instalável) +
  deploy em produção no GitHub Pages. Testado e funcionando (login, cadastro, sincronização).
- ⏳ **Pendente** — instalar/testar PWA no celular real (tela inicial), conferir sincronização PC ↔ celular.

## Armadilhas do ambiente
- **Screenshot do navegador embutido trava** (culpa do `backdrop-filter`/blur). Verificar via `get_page_text` /
  `read_page` / `javascript_tool`, não por screenshot.
- Cliques automatizados às vezes erram o alvo; disparar via `.click()` no `javascript_tool` funciona.
- Paleta: fundo `#081019`/`#0b1a26`, ciano `#2ee6e0`, azul `#3a7bd5`. Detalhes no §7 do documento-mestre.
