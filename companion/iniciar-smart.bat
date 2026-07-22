@echo off
setlocal enabledelayedexpansion
:: OmniDrive S.M.A.R.T. Companion — Iniciar como Administrador
:: Pede elevacao UAC automaticamente

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

:: --- Detecta Python REAL (ignora o atalho falso da Microsoft Store) ---
set "PYCMD="

:: 1) Tenta o Python Launcher (py) — nao e interceptado pelo stub da Store
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYCMD=py -3"

:: 2) Senao, tenta "python" de verdade (roda --version; o stub falha aqui)
if not defined PYCMD (
    python --version >nul 2>&1
    if not errorlevel 1 set "PYCMD=python"
)

if not defined PYCMD (
    echo [ERRO] Python nao encontrado.
    echo.
    echo Se aparece uma tela da "Microsoft Store" ao rodar python, e um
    echo atalho falso do Windows, nao o Python de verdade.
    echo.
    echo COMO RESOLVER:
    echo   1. Baixe o Python em: https://www.python.org/downloads/
    echo   2. No instalador, MARQUE a caixa "Add python.exe to PATH".
    echo   3. Conclua a instalacao e rode este arquivo de novo.
    echo.
    echo   (Opcional) Para desativar o atalho falso da Store:
    echo   Configuracoes ^> Aplicativos ^> Configuracoes avancadas de aplicativos
    echo   ^> Aliases de execucao de aplicativos ^> desligue "python.exe".
    echo.
    pause
    exit /b 1
)

echo [OK] Python encontrado: !PYCMD!

:: --- Verifica smartctl ---
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
!PYCMD! "%~dp0omnidrive-smart.py"
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao executar o companion.
    echo.
    pause
)
