@echo off
:: OmniDrive S.M.A.R.T. Companion — Iniciar como Administrador
:: Pede elevação UAC automaticamente

>nul 2>&1 net session
if %errorlevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo.
echo =======================================
echo   OmniDrive S.M.A.R.T. Companion
echo =======================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo.
    echo Instale o Python:
    echo   https://www.python.org/downloads/
    echo.
    echo Marque "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b 1
)

where smartctl >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\smartmontools\bin\smartctl.exe" (
        echo [OK] smartctl encontrado em Program Files.
    ) else (
        echo [AVISO] smartctl nao encontrado!
        echo.
        echo Instale o smartmontools:
        echo   https://www.smartmontools.org/wiki/Download
        echo.
        echo O companion vai iniciar, mas nao conseguira ler os drives.
        echo.
    )
)

echo Iniciando companion...
echo.
python "%~dp0omnidrive-smart.py"
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao executar o companion.
    echo.
    pause
)
