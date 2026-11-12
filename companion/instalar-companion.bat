@echo off
setlocal enabledelayedexpansion
title Instalador - OmniDrive Companion
cd /d "%~dp0"

:: ---------------------------------------------------------------------------
:: Instalador do OmniDrive Companion (Windows).
:: Instala o que faltar (Python e smartmontools) via winget, baixa o companion
:: do proprio site do OmniDrive, confere os arquivos e cria um atalho na Area
:: de Trabalho. Pode ser rodado de novo a qualquer momento para ATUALIZAR.
::
:: Seguranca: o companion roda como ADMINISTRADOR. Por isso ele e instalado em
:: %ProgramFiles% (so administrador grava) e usa Python instalado para todos os
:: usuarios: arquivo numa pasta gravavel pelo usuario poderia ser trocado por
:: outro programa e ganhar administrador. Os arquivos baixados sao conferidos
:: contra o SHA256SUMS publicado junto (pega download corrompido ou versoes
:: misturadas; nao protege contra o proprio site ser comprometido).
::
:: Variaveis opcionais (usadas em testes):
::   OMNI_BASE_URL    de onde baixar (padrao: o site do OmniDrive)
::   OMNI_INSTALL_DIR onde instalar  (padrao: %ProgramFiles%\OmniDrive\companion)
::   OMNI_TEST=1      nao pede admin, nao instala nada, nao cria atalho
:: ---------------------------------------------------------------------------

set "BASE=%OMNI_BASE_URL%"
if not defined BASE set "BASE=https://asgard1anbr.github.io/OmniDrive/companion"
set "DEST=%OMNI_INSTALL_DIR%"
if not defined DEST set "DEST=%ProgramFiles%\OmniDrive\companion"
set "STAGE=%TEMP%\omnidrive-companion-%RANDOM%%RANDOM%"

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
echo [1/4] Verificando Python (instalado para todos os usuarios)...
call :findpy
if not defined PYEXE call :winget_install Python.Python.3.12 Python machine
if not defined PYEXE call :findpy
if not defined PYEXE if defined OMNI_TEST (
    echo [TESTE] sem Python para todos os usuarios - seguindo para testar o resto.
    set "PYEXE=(teste)"
)
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

:: ---------- 3. Download + conferencia ----------
:download
echo.
echo [3/4] Baixando e conferindo o companion...
mkdir "%STAGE%" >nul 2>&1
set "FAIL="
for %%F in (SHA256SUMS omnidrive-smart.py iniciar-smart.bat LEIAME.txt) do call :baixar %%F
if defined FAIL goto :falhadownload
call :conferir
if defined FAIL goto :falhahash
echo [OK] Arquivos conferidos (SHA-256).
if not exist "%DEST%" mkdir "%DEST%"
set "FAIL="
for %%F in (omnidrive-smart.py iniciar-smart.bat LEIAME.txt) do (
    copy /y "%STAGE%\%%F" "%DEST%\%%F" >nul
    if errorlevel 1 set "FAIL=1"
)
rmdir /s /q "%STAGE%" >nul 2>&1
if defined FAIL goto :falhacopia
echo [OK] Instalado em: %DEST%

:: ---------- 4. Atalho ----------
echo.
echo [4/4] Criando atalho na Area de Trabalho...
if defined OMNI_TEST goto :fim
powershell -NoProfile -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut($d+'\OmniDrive Companion.lnk'); $s.TargetPath='%DEST%\iniciar-smart.bat'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='shell32.dll,12'; $s.Description='Inicia o companion do OmniDrive'; $s.Save()"
if errorlevel 1 (echo [AVISO] Nao consegui criar o atalho. Use: %DEST%\iniciar-smart.bat) else echo [OK] Atalho "OmniDrive Companion" criado.
if exist "%LOCALAPPDATA%\OmniDrive\companion\omnidrive-smart.py" (
    echo.
    echo [INFO] Havia uma instalacao antiga em %LOCALAPPDATA%\OmniDrive\companion.
    echo        Ela nao e mais usada; o atalho agora aponta para %DEST%.
    echo        Pode apagar aquela pasta quando quiser.
)

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
echo [ERRO] Nao consegui instalar o Python para todos os usuarios.
echo Instale manualmente em https://www.python.org/downloads/windows/
echo marcando "Install for all users" e "Add python.exe to PATH",
echo e rode este instalador de novo.
echo.
pause
exit /b 1

:falhadownload
rmdir /s /q "%STAGE%" >nul 2>&1
echo.
echo [ERRO] Nao consegui baixar o companion. Confira a internet e tente de novo.
echo Origem: %BASE%
echo.
pause
exit /b 1

:falhahash
rmdir /s /q "%STAGE%" >nul 2>&1
echo.
echo [ERRO] Os arquivos baixados NAO conferem com o SHA256SUMS publicado.
echo Nada foi instalado. Tente de novo em alguns minutos (pode ser uma
echo publicacao em andamento). Se persistir, nao use estes arquivos.
echo.
pause
exit /b 1

:falhacopia
echo.
echo [ERRO] Nao consegui copiar para %DEST% (precisa de administrador).
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
:: So aceita Python instalado para TODOS os usuarios (pasta protegida).
set "PYEXE="
for /d %%d in ("%ProgramFiles%\Python3*") do if exist "%%d\python.exe" set "PYEXE=%%d\python.exe"
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
set "SCOPE="
if /i "%~3"=="machine" set "SCOPE=--scope machine"
echo Instalando %~2 com o winget, aguarde ^(pode demorar^)...
winget install -e --id %~1 %SCOPE% --accept-package-agreements --accept-source-agreements --silent
goto :eof

:baixar
powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%BASE%/%~1' -OutFile '%STAGE%\%~1' -ErrorAction Stop } catch { exit 1 }"
if errorlevel 1 (
    echo [ERRO] Falha ao baixar %~1
    set "FAIL=1"
    goto :eof
)
echo        baixado: %~1
goto :eof

:conferir
:: Cada arquivo instalado precisa ter hash publicado e o hash precisa bater.
set "FAIL="
powershell -NoProfile -Command "$s='%STAGE%'; $sums=@{}; foreach($l in Get-Content -LiteralPath (Join-Path $s 'SHA256SUMS')){ if($l -match '^([0-9a-fA-F]{64})\s+\*?(\S+)\s*$'){ $sums[$matches[2]]=$matches[1].ToUpper() } }; $ok=$true; foreach($n in 'omnidrive-smart.py','iniciar-smart.bat','LEIAME.txt'){ $f=Join-Path $s $n; if(-not $sums.ContainsKey($n)){ Write-Host ('[ERRO] sem hash publicado: '+$n); $ok=$false; continue }; $h=(Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash; if($h -ne $sums[$n]){ Write-Host ('[ERRO] hash diferente: '+$n); $ok=$false } }; if(-not $ok){ exit 1 }"
if errorlevel 1 set "FAIL=1"
goto :eof
