@echo off
setlocal EnableExtensions
title AGON - First Time Setup

rem Optional first argument "nopause" = called from another BAT, do not wait for a key.
set "AGON_NOPAUSE="
if /i "%~1"=="nopause" set "AGON_NOPAUSE=1"

pushd "%~dp0"
if errorlevel 1 goto :no_folder

echo.
echo  ==========================================
echo            AGON - FIRST TIME SETUP
echo  ==========================================
echo  Project folder:
cd
echo.

if not exist "package.json" goto :no_package

echo [1/4] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 goto :no_node
where npm >nul 2>nul
if errorlevel 1 goto :no_npm
node scripts\check-node.js
if errorlevel 1 goto :fail
set "NPMV="
for /f "delims=" %%V in ('npm --version 2^>nul') do set "NPMV=%%V"
if not defined NPMV goto :no_npm
echo npm %NPMV%
echo.

set "TRIES=0"

:install
set /a TRIES+=1
echo [2/4] Installing project dependencies, attempt %TRIES% of 2. This can take several minutes...
call npm install --no-audit --no-fund
if not errorlevel 1 goto :installed
if %TRIES% GEQ 2 goto :install_failed
echo.
echo [WARN] npm install failed. Removing the partial node_modules folder and retrying once...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "node_modules" goto :locked
goto :install

:installed
echo.
echo [3/4] Validating the installation (Expo CLI, SDK versions, TypeScript)...
node scripts\verify-setup.js
if errorlevel 1 goto :validate_failed

echo.
echo [4/4] Done.
echo.
echo  ==========================================
echo   SETUP COMPLETE - all checks passed.
echo   Next: double-click "START PROTOTYPE.bat"
echo  ==========================================
echo.
popd
if not defined AGON_NOPAUSE pause
endlocal & exit /b 0

:no_folder
echo [ERROR] Could not open the project folder.
echo         If you opened this from inside a ZIP file, extract the ZIP first.
goto :fail_nopopd

:no_package
echo [ERROR] package.json was not found next to SETUP.bat.
echo         If you opened this from inside a ZIP file, extract the whole ZIP first.
goto :fail

:no_node
echo [ERROR] Node.js is not installed or is not on PATH.
echo         Install the LTS version from https://nodejs.org/
echo         Then CLOSE this window, and run SETUP.bat again.
goto :fail

:no_npm
echo [ERROR] npm was not found. It ships with Node.js - reinstall Node.js LTS from https://nodejs.org/
goto :fail

:locked
echo [ERROR] Could not delete node_modules - a file is in use.
echo         Close any running AGON server window, editors and antivirus scans, then run SETUP.bat again.
goto :fail

:install_failed
echo.
echo [ERROR] Dependency installation failed twice. Check the npm messages above.
echo         Common causes: no internet or proxy, a very long folder path, antivirus locking files.
echo         Tip: move the project to a short path such as C:\AGON and try again.
goto :fail

:validate_failed
echo.
echo [ERROR] Installation finished but validation failed. See the messages above.
goto :fail

:fail
echo.
echo  ==========================================
echo   SETUP FAILED - see the messages above.
echo  ==========================================
echo.
popd
:fail_nopopd
if not defined AGON_NOPAUSE pause
endlocal & exit /b 1
