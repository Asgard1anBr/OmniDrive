@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: --- Elevacao de administrador (UAC) ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo =======================================
echo   OmniDrive S.M.A.R.T. Companion
echo =======================================
echo.

:: --- Localiza o python.exe REAL (funciona mesmo elevado / Python da Store) ---
call :findpy
if not defined PYEXE (
    echo [ERRO] Python nao encontrado.
    echo.
    echo Instale o Python em:
    echo   https://www.python.org/downloads/windows/
    echo e MARQUE "Add python.exe to PATH" na instalacao.
    echo.
    echo Se instalou pela Microsoft Store, feche e abra este arquivo
    echo de novo. Persistindo, reinstale pelo link acima.
    echo.
    pause
    exit /b 1
)
echo [OK] Python: !PYEXE!

:: --- smartctl ---
where smartctl >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\smartmontools\bin\smartctl.exe" (
        echo [OK] smartctl encontrado em Program Files.
    ) else (
        echo [AVISO] smartctl nao encontrado. Instale em:
        echo   https://www.smartmontools.org/wiki/Download
        echo O companion inicia, mas nao le os drives sem ele.
    )
)

echo.
echo Iniciando companion... NAO feche esta janela enquanto usar o OmniDrive.
echo.
"!PYEXE!" "%~dp0omnidrive-smart.py"
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao executar o companion.
    echo.
    pause
)
exit /b

:: ===== sub-rotina: encontra o caminho completo do python.exe =====
:findpy
set "PYEXE="
:: 1) Python Launcher (retorna o executavel real, nao o atalho da Store)
for /f "delims=" %%p in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PYEXE=%%p"
:: 2) python no PATH (idem)
if not defined PYEXE for /f "delims=" %%p in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PYEXE=%%p"
:: 3) Busca direta (funciona mesmo elevado, quando o PATH do usuario nao vem junto)
if not defined PYEXE if exist "%LOCALAPPDATA%\Python" for /f "delims=" %%p in ('dir /b /s "%LOCALAPPDATA%\Python\pythoncore-*\python.exe" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python" for /f "delims=" %%p in ('dir /b /s "%LOCALAPPDATA%\Programs\Python\python.exe" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE if exist "%ProgramFiles%\Python313\python.exe" set "PYEXE=%ProgramFiles%\Python313\python.exe"
if not defined PYEXE if exist "%ProgramFiles%\Python312\python.exe" set "PYEXE=%ProgramFiles%\Python312\python.exe"
goto :eof
