@echo off
setlocal EnableExtensions
title AGON - Prototype Server

pushd "%~dp0"
if errorlevel 1 goto :no_folder

echo.
echo  ==========================================
echo              AGON - PROTOTYPE
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :run_setup
node scripts\verify-setup.js --quick >nul 2>nul
if errorlevel 1 goto :run_setup
goto :start_server

:run_setup
echo Node.js or the project dependencies are missing - running first-time setup...
echo.
call "%~dp0SETUP.bat" nopause
if errorlevel 1 goto :setup_failed
echo.

:start_server
echo Starting AGON. The browser opens automatically when the server is ready.
echo Server logs stay in this window. Keep it open while you use AGON.
echo Close this window or press Ctrl+C to stop the server.
echo.
node scripts\dev-web.js
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto :server_failed
popd
endlocal & exit /b 0

:no_folder
echo [ERROR] Could not open the project folder.
pause
endlocal & exit /b 1

:setup_failed
echo.
echo [ERROR] Setup did not complete, so AGON cannot start. See the messages above.
goto :fail

:server_failed
echo.
echo [ERROR] The AGON server stopped with an error (exit code %RC%). See the log above.
goto :fail

:fail
echo.
popd
pause
endlocal & exit /b 1
