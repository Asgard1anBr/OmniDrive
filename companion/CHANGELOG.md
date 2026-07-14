# Changelog — OmniDrive S.M.A.R.T. Companion

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
