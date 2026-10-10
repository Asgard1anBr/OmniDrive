# Changelog — OmniDrive S.M.A.R.T. Companion

## v1.6 — 2026-10-09
- Novo `instalar-companion.bat`: instalador de um clique para máquinas novas. Instala Python e smartmontools
  via winget se faltarem, baixa o companion do próprio site do OmniDrive para %LOCALAPPDATA%OmniDrivempanion
  e cria o atalho "OmniDrive Companion" na Área de Trabalho. Rodar de novo atualiza o companion.
- O site publica o companion em ./companion/ (o deploy copia os arquivos; a fonte continua sendo a pasta companion/).

## v1.5.1 — 2026-10-09
- Volume que não abre (ex.: BitLocker trancado, ou companion sem admin) passa a ser tratado como bloqueado,
  em vez de devolver leitura vazia que poderia zerar o conteúdo de um drive catalogado.

## v1.5 — 2026-10-09
- Novo `/volumes`: letra, rótulo, serial do volume e do disco, barramento, tipo de mídia, espaço usado
  e status do **BitLocker** (bloqueado/desbloqueado) dos drives conectados. Disco do sistema é omitido.
  Só reconsulta o Windows quando algo muda (drive plugado/desbloqueado); a 1ª leitura leva ~8 s.
- Novo `/scan?letter=D`: lê pastas e arquivos (3 níveis) direto do drive, sem o seletor do navegador.
  Recusa volume bloqueado (423) e o disco do sistema.
- Segurança: CORS deixa de ser `*` — só o OmniDrive (github.io de produção e localhost) lê as respostas,
  pois `/scan` expõe nomes de arquivos. Servidor agora é multithread (scan longo não trava o `/ping`).
- Variável `OMNIDRIVE_PORT` permite trocar a porta (testes).

## v1.4 — 2026-07-13
- Corrigido "abre e fecha rápido" com Python da Microsoft Store: o `.bat`
  agora localiza o caminho REAL do python.exe (busca em %LOCALAPPDATA%\Python),
  que funciona mesmo no contexto elevado de administrador, onde os atalhos
  py/python da Store somem do PATH.
- Script Python força stdout/stderr em UTF-8 (evita crash de emoji em console cp1252).

## v1.3 — 2026-07-13
- `iniciar-smart.bat`: detecta o atalho falso do Python (stub da Microsoft Store)
  e dá instruções claras de instalação, em vez de falhar com "Falha ao executar".
- Usa o Python Launcher `py -3` quando disponível (mais confiável que `python`).

## v1.2 — 2026-07-13
- Mapeamento de letras de unidade (C:, D:...) por disco físico, via `Get-Partition` (Windows).
- Endpoint `/smart` agora inclui `letters` em cada drive, permitindo identificar qual é o externo.

## v1.1 — 2026-07-13
- `iniciar-smart.bat`: elevação automática de administrador (UAC) via PowerShell.
- Checagem de Python e smartctl antes de iniciar, com instruções de instalação se faltar.

## v1.0
- Servidor HTTP local (porta 7777) com CORS.
- `/smart`: lê todos os drives via `smartctl --scan` + `smartctl -a -j`, calcula score de saúde (0-100).
- `/ping`: healthcheck simples.
- Fallback de parsing em texto quando smartctl não retorna JSON válido.
