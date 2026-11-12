# OmniDrive — Catálogo de Drives Físicos (PWA)

Contexto permanente do projeto. Lido automaticamente toda sessão. Fica na raiz da pasta OmniDrive.
**Atualize no MESMO commit de cada mudança** (seção "Contexto atual" e, se for o caso, decisões/armadilhas).

## Regras de trabalho
1. **Responda em português**, direto: quando tiver info pra agir, aja; recomende uma opção em vez de listar todas.
2. **Todo material do projeto fica dentro desta pasta** (`OmniDrive/`). Relatórios de segurança e notas internas vão
   para o repositório **privado** `OmniDrive-interno` (pasta irmã) — **nunca** para este repositório, que é público.
3. **Não comece do zero.** Leia `docs/OmniDrive.md` (documento-mestre) antes de mexer.
4. **Sem dependências externas / CDN** no app (única exceção: script do login Google). PWA vanilla, sem build.
5. **Ao concluir algo relevante, atualize** `docs/OmniDrive.md` (decisões, registro de build, histórico de versões).
6. Sempre prever **breakpoints** (celular ≤600 / tablet 601–1024 / PC ≥1025) e **texto digitado branco**.
7. **Versão a cada modificação** (SemVer: correção → patch, funcionalidade → minor). Pontos que andam juntos:
   `VERSAO`, `SEED.appVersion` e entrada nova no `CHANGELOG` (em `app/js/app.js`, linguagem de usuário, pt-BR);
   `#appVer` e todos os `?v=` em `app/index.html`; `CACHE` em `app/sw.js`. O companion tem versão própria:
   `COMPANION_VERSION` em `companion/omnidrive-smart.py` + `companion/CHANGELOG.md`.
8. **Antes de cada commit: `python tools/verificar.py`** (sintaxe, CSP, regressão de XSS, Host do companion,
   instalador, pontos de versão, CRLF). O mesmo script é barreira no CI: se falhar, o deploy não acontece.
9. **Verifique antes de afirmar.** Teste de verdade (servidor local + navegador, companion real) e diga o que foi
   simulado. Se a causa pode ser operacional (companion parado/antigo, cache), cheque isso primeiro.
10. **Toda saída de dado em HTML passa por `esc()`** — nomes, rótulos, pastas e arquivos podem vir de drives de
    terceiros. Nada de `on*=` nem `<script>` inline (a CSP bloqueia).

## O que é
Catálogo pessoal dos drives físicos do Davi (dezenas de HD/SSD/NVMe/pen drive), cada um com etiqueta/QR.
Cadastra o que tem dentro e busca por qualquer pedaço de palavra ou tipo de arquivo, dizendo em qual drive está.
Tem saúde S.M.A.R.T., "Ler drive" (identifica o drive plugado) e relatório em PDF. Criado por Davi Torres.

## Arquitetura
- **PWA** (`app/`): `index.html`, `css/styles.css`, `js/app.js` (telas + CRUD + Ler drive + relatório),
  `js/cloud.js` (login Google + Drive API, escopo `drive.file`), `js/qr.js` (QR próprio), `js/sw-register.js`,
  `sw.js` (rede primeiro, cache versionado), `manifest.webmanifest`, `icons/`, `backgrounds/`.
- **Dados:** arquivo JSON no Google Drive do usuário (+ backups rotativos). Modo local (sem login) usa localStorage.
- **Companion** (`companion/`): servidor Python local em `127.0.0.1:7777`, roda **como administrador**, lê
  S.M.A.R.T. (smartctl), volumes/BitLocker (PowerShell) e pastas. Endpoints `/ping`, `/smart`, `/volumes`, `/scan`.
  Instalação por `instalar-companion.bat` (hospedado no próprio site) em `%ProgramFiles%\OmniDrive\companion`.
- **Segurança:** modelo de ameaça em `SECURITY.md`.

## Produção
- **URL:** https://asgard1anbr.github.io/OmniDrive/ — repo público `Asgard1anBr/OmniDrive`, branch `main`.
- **Deploy:** GitHub Actions (`.github/workflows/deploy.yml`) a cada push: job `verificar` → copia o companion para
  o site, gera `SHA256SUMS` → publica `app/`. Actions fixadas por SHA.
- **OAuth Google:** origens autorizadas `http://localhost:5050`, `http://127.0.0.1:5050` (dev) e
  `https://asgard1anbr.github.io` (produção). Client ID (público) em `app/js/config.js`.

## Como rodar (dev)
- `node dev-server.js` → http://127.0.0.1:5050 (só local, sem cache). No Brave use `127.0.0.1`, não `localhost`.
- Teste do companion em outra porta: variável `OMNIDRIVE_PORT`. Teste do instalador: `OMNI_TEST=1`,
  `OMNI_BASE_URL`, `OMNI_INSTALL_DIR` (não pede admin, não instala nada, não cria atalho).

## Decisões
- D-001 PWA vanilla sem build — durar anos sem depender de terceiros.
- D-002 Dados no Drive do usuário, escopo `drive.file` — o app só vê o que ele mesmo cria.
- D-003 Companion local para hardware — o navegador não enxerga S.M.A.R.T./volumes. Só loopback, CORS restrito às
  origens do app, `Host` validado (DNS rebinding).
- D-004 Identificação de drive por sinais combinados + vínculo manual — serial de caixa USB é falso, rótulo muda.
- D-005 CSP por `<meta>` — o GitHub Pages não envia cabeçalhos HTTP.
- D-006 Companion em `%ProgramFiles%` com Python de máquina — roda elevado; pasta gravável pelo usuário seria
  caminho para ganhar administrador.
- D-007 `SHA256SUMS` conferido pelo instalador; assinatura de código adiada (custo) — o hash não cobre o site
  comprometido.

## Armadilhas do ambiente
- **Screenshot do navegador embutido trava** (`backdrop-filter`/blur): verificar por `read_page`/`javascript_tool`.
- O navegador de testes **não registra Service Worker** (em nenhuma versão) — limpar SW/cache antes de testar.
- Cliques automatizados às vezes erram o alvo; disparar via `.click()` no `javascript_tool`.
- **`.bat` precisa de CRLF** (`.gitattributes`); com LF puro o cmd erra `goto`/`call :rotina`.
- **Python da Microsoft Store** some do PATH quando o .bat eleva para admin; `where python` casa com o stub falso.
- **Companion novo só vale depois de fechar e reabrir** a janela dele — o navegador não força isso.
- PowerShell: cada cmdlet de inventário uma vez, fora do laço (dentro levava ~20 s).
- Editar `.bat`/caminhos com `sed` ou strings Python não-raw corrompe barras invertidas — conferir depois.
- Paleta: fundo `#081019`/`#0b1a26`, ciano `#2ee6e0`, azul `#3a7bd5`. Detalhes no §7 do documento-mestre.

## Contexto atual (2026-11-12)
- **App v2.12.2 · companion v1.8.** Revisão de segurança feita (relatório no `OmniDrive-interno`); lotes 1–3
  concluídos: XSS do Painel corrigido, CSP, Host validado, companion em ProgramFiles com SHA256SUMS, `.bat` em CRLF,
  actions por SHA, `tools/verificar.py` + barreira no CI, este arquivo e `SECURITY.md`.
- **Pendências (não verificadas):** login completo no Brave com a CSP; winget `--scope machine` numa máquina limpa;
  teste automatizado de XSS no navegador (hoje é checagem estática + teste manual); Semgrep/Gitleaks (não
  instalados); acessibilidade (teclado/axe); 390 px das telas novas; detecção automática ao plugar drive.
