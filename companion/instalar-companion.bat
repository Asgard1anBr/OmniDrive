@echo off
setlocal enabledelayedexpansion
title Instalador - OmniDrive Companion
cd /d "%~dp0"

:: ---------------------------------------------------------------------------
:: Instalador do OmniDrive Companion (Windows).
:: Instala o que faltar (Python e smartmontools) via winget, baixa o companion
:: do proprio site do OmniDrive e cria um atalho na Area de Trabalho.
:: Pode ser rodado de novo a qualquer momento para ATUALIZAR o companion.
::
:: Variaveis opcionais (usadas em testes):
::   OMNI_BASE_URL    de onde baixar (padrao: o site do OmniDrive)
::   OMNI_INSTALL_DIR onde instalar  (padrao: %LOCALAPPDATA%\OmniDrive\companion)
::   OMNI_TEST=1      nao pede admin, nao instala nada, nao cria atalho
:: ---------------------------------------------------------------------------

set "BASE=%OMNI_BASE_URL%"
if not defined BASE set "BASE=https://asgard1anbr.github.io/OmniDrive/companion"
set "DEST=%OMNI_INSTALL_DIR%"
if not defined DEST set "DEST=%LOCALAPPDATA%\OmniDrive\companion"

if not defined OMNI_TEST call :elevate
if "%NEEDS_EXIT%"=="1" exit /b

echo.
echo ===========================================================
echo   OmniDrive Companion - Instalador
echo ===========================================================
echo.
echo O companion e um programa pequeno que roda so neste
echo computador e deixa o OmniDrive ler a saude dos HDs e
echo identificar drives plugados. Nada vai para a internet.
echo.

:: ---------- 1. Python ----------
echo [1/4] Verificando Python...
call :findpy
if not defined PYEXE call :winget_install Python.Python.3.12 Python
if not defined PYEXE call :findpy
if not defined PYEXE goto :nopython
echo [OK] Python: !PYEXE!

:: ---------- 2. smartmontools ----------
echo.
echo [2/4] Verificando smartmontools...
call :hassmart
if not defined HAVE_SMART call :winget_install smartmontools.smartmontools smartmontools
call :hassmart
if defined HAVE_SMART goto :smartok
echo [AVISO] smartmontools nao foi instalado. O companion abre, mas nao
echo         consegue ler a saude dos discos. Instale em:
echo         https://www.smartmontools.org/wiki/Download
goto :download
:smartok
echo [OK] smartmontools encontrado.

:: ---------- 3. Download ----------
:download
echo.
echo [3/4] Baixando o companion para: %DEST%
if not exist "%DEST%" mkdir "%DEST%"
set "FAIL="
for %%F in (omnidrive-smart.py iniciar-smart.bat LEIAME.txt) do call :baixar %%F
if defined FAIL goto :falhadownload
echo [OK] Arquivos baixados.

:: ---------- 4. Atalho ----------
echo.
echo [4/4] Criando atalho na Area de Trabalho...
if defined OMNI_TEST goto :fim
powershell -NoProfile -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut($d+'\OmniDrive Companion.lnk'); $s.TargetPath='%DEST%\iniciar-smart.bat'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='shell32.dll,12'; $s.Description='Inicia o companion do OmniDrive'; $s.Save()"
if errorlevel 1 (echo [AVISO] Nao consegui criar o atalho. Use: %DEST%\iniciar-smart.bat) else echo [OK] Atalho "OmniDrive Companion" criado.

:fim
echo.
echo ===========================================================
echo   Instalacao concluida.
echo ===========================================================
echo.
echo COMO USAR: sempre que for usar o OmniDrive com seus drives,
echo abra o atalho "OmniDrive Companion" da Area de Trabalho e
echo deixe a janela preta ABERTA. Depois, no OmniDrive, use o
echo botao "Ler drive".
echo.
echo Para ATUALIZAR no futuro, rode este instalador de novo.
echo.
if defined OMNI_TEST exit /b 0
choice /c SN /n /m "Iniciar o companion agora? (S/N) "
if errorlevel 2 exit /b
start "" "%DEST%\iniciar-smart.bat"
exit /b

:nopython
echo.
echo [ERRO] Nao consegui instalar o Python automaticamente.
echo Instale manualmente em https://www.python.org/downloads/windows/
echo marcando "Add python.exe to PATH", e rode este instalador de novo.
echo.
pause
exit /b 1

:falhadownload
echo.
echo [ERRO] Nao consegui baixar o companion. Confira a internet e tente de novo.
echo Origem: %BASE%
echo.
pause
exit /b 1

:: ===================== sub-rotinas =====================
:elevate
net session >nul 2>&1
if not errorlevel 1 goto :eof
echo Solicitando permissao de administrador...
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
set "NEEDS_EXIT=1"
goto :eof

:findpy
set "PYEXE="
for /f "delims=" %%p in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE for /f "delims=" %%p in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE if exist "%LOCALAPPDATA%\Python" for /f "delims=" %%p in ('dir /b /s "%LOCALAPPDATA%\Python\pythoncore-*\python.exe" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python" for /f "delims=" %%p in ('dir /b /s "%LOCALAPPDATA%\Programs\Python\python.exe" 2^>nul') do set "PYEXE=%%p"
if not defined PYEXE if exist "%ProgramFiles%\Python314\python.exe" set "PYEXE=%ProgramFiles%\Python314\python.exe"
if not defined PYEXE if exist "%ProgramFiles%\Python313\python.exe" set "PYEXE=%ProgramFiles%\Python313\python.exe"
if not defined PYEXE if exist "%ProgramFiles%\Python312\python.exe" set "PYEXE=%ProgramFiles%\Python312\python.exe"
if not defined PYEXE if exist "%ProgramFiles%\Python311\python.exe" set "PYEXE=%ProgramFiles%\Python311\python.exe"
goto :eof

:hassmart
set "HAVE_SMART="
where smartctl >nul 2>&1
if not errorlevel 1 set "HAVE_SMART=1"
if exist "%ProgramFiles%\smartmontools\bin\smartctl.exe" set "HAVE_SMART=1"
if exist "C:\Program Files (x86)\smartmontools\bin\smartctl.exe" set "HAVE_SMART=1"
goto :eof

:winget_install
if defined OMNI_TEST (
    echo [TESTE] instalaria %~2 via winget.
    goto :eof
)
where winget >nul 2>&1
if errorlevel 1 (
    echo [AVISO] winget nao encontrado - instale %~2 manualmente.
    goto :eof
)
echo Instalando %~2 com o winget, aguarde ^(pode demorar^)...
winget install -e --id %~1 --accept-package-agreements --accept-source-agreements --silent
goto :eof

:baixar
powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%BASE%/%~1' -OutFile '%DEST%\%~1' -ErrorAction Stop } catch { exit 1 }"
if errorlevel 1 (
    echo [ERRO] Falha ao baixar %~1
    set "FAIL=1"
    goto :eof
)
echo        baixado: %~1
goto :eof
