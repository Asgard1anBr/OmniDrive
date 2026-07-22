# Changelog — OmniDrive S.M.A.R.T. Companion

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
