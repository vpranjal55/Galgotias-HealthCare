@echo off
setlocal EnableExtensions
title AGON - Deploy to Vercel

rem Optional env vars (never stored in this file):
rem   VERCEL_TOKEN        non-interactive auth instead of browser login
rem   VERCEL_ORG_ID + VERCEL_PROJECT_ID   non-interactive project link
rem   AGON_VERCEL_SPEC    Vercel CLI package spec (default vercel@65)
if not defined AGON_VERCEL_SPEC set "AGON_VERCEL_SPEC=vercel@65"
set "VTOKEN="
set "LINKFLAGS="
if defined VERCEL_TOKEN set "VTOKEN=--token %VERCEL_TOKEN%"
if defined VERCEL_TOKEN set "LINKFLAGS=--yes"

pushd "%~dp0"
if errorlevel 1 goto :no_folder

echo.
echo  ==========================================
echo              AGON - VERCEL DEPLOY
echo  ==========================================
echo.

echo [1/6] Checking Node.js and dependencies...
where node >nul 2>nul
if errorlevel 1 goto :run_setup
node scripts\check-node.js
if errorlevel 1 goto :fail
node scripts\verify-setup.js --quick >nul 2>nul
if errorlevel 1 goto :run_setup
goto :build

:run_setup
echo Node.js or dependencies are missing - running setup first...
call "%~dp0SETUP.bat" nopause
if errorlevel 1 goto :fail

:build
echo.
echo [2/6] Building the production web app...
call npm run build:web
if errorlevel 1 goto :build_failed
set "OUTDIR="
for /f "usebackq delims=" %%D in (`node -p "require('./vercel.json').outputDirectory"`) do set "OUTDIR=%%D"
if not defined OUTDIR goto :no_outdir
if not exist "%OUTDIR%\index.html" goto :no_index
echo Build verified: "%OUTDIR%\index.html" exists.

echo.
echo [3/6] Checking Vercel login...
set "VUSER="
for /f "delims=" %%U in ('npx --yes %AGON_VERCEL_SPEC% whoami %VTOKEN% 2^>nul') do set "VUSER=%%U"
if defined VUSER goto :logged_in
if defined VERCEL_TOKEN goto :bad_token
echo Not logged in to Vercel. Starting login - follow the instructions below...
call npx --yes %AGON_VERCEL_SPEC% login
if errorlevel 1 goto :login_failed
for /f "delims=" %%U in ('npx --yes %AGON_VERCEL_SPEC% whoami 2^>nul') do set "VUSER=%%U"
if not defined VUSER goto :login_failed
:logged_in
echo Logged in as: %VUSER%

echo.
echo [4/6] Checking Vercel project link...
if exist ".vercel\project.json" goto :linked
if defined VERCEL_PROJECT_ID if defined VERCEL_ORG_ID goto :linked
echo This folder is not linked to a Vercel project yet. Answer the prompts to link or create one.
call npx --yes %AGON_VERCEL_SPEC% link %LINKFLAGS% %VTOKEN%
if errorlevel 1 goto :link_failed
if not exist ".vercel\project.json" goto :link_failed
:linked
echo Project link OK.

echo.
echo [5/6] Deploying to production. Vercel builds with the command in vercel.json...
set "URLFILE=%TEMP%\agon-vercel-url-%RANDOM%%RANDOM%.txt"
call npx --yes %AGON_VERCEL_SPEC% deploy --prod --yes %VTOKEN% > "%URLFILE%"
set "RC=%ERRORLEVEL%"
set "DEPLOY_URL="
if exist "%URLFILE%" for /f "usebackq delims=" %%U in ("%URLFILE%") do set "DEPLOY_URL=%%U"
if exist "%URLFILE%" del "%URLFILE%" >nul 2>nul
if not "%RC%"=="0" goto :deploy_failed
echo %DEPLOY_URL%| findstr /b /i "https://" >nul
if errorlevel 1 goto :no_url

echo.
echo [6/6] Verifying the live deployment: %DEPLOY_URL%
node scripts\verify-deploy.js "%DEPLOY_URL%"
if errorlevel 2 goto :verify_skipped
if errorlevel 1 goto :verify_failed

echo.
echo  ==========================================
echo   DEPLOY SUCCEEDED AND VERIFIED
echo   %DEPLOY_URL%
echo  ==========================================
echo.
popd
pause
endlocal & exit /b 0

:verify_skipped
echo.
echo  ==========================================
echo   DEPLOYED, BUT NOT AUTOMATICALLY VERIFIED
echo   %DEPLOY_URL%
echo   Vercel Deployment Protection or the network blocked the check.
echo   Open your production domain shown in the Vercel output above and test it.
echo  ==========================================
echo.
popd
pause
endlocal & exit /b 0

:no_folder
echo [ERROR] Could not open the project folder.
pause
endlocal & exit /b 1

:build_failed
echo.
echo [ERROR] Web build failed. Nothing was deployed. See the errors above.
goto :fail

:no_outdir
echo [ERROR] vercel.json has no outputDirectory.
goto :fail

:no_index
echo [ERROR] Build finished but "%OUTDIR%\index.html" is missing. Nothing was deployed.
goto :fail

:bad_token
echo [ERROR] VERCEL_TOKEN is set but Vercel rejected it. Fix or remove the VERCEL_TOKEN environment variable.
goto :fail

:login_failed
echo [ERROR] Vercel login did not complete. Run this file again and finish the login.
goto :fail

:link_failed
echo [ERROR] Vercel project link did not complete. Run this file again and choose or create a project.
goto :fail

:deploy_failed
echo.
echo [ERROR] Vercel deployment failed (exit code %RC%). See the Vercel output above.
goto :fail

:no_url
echo.
echo [ERROR] Vercel finished but no deployment URL was returned. Check the Vercel output and your dashboard before assuming it worked.
goto :fail

:verify_failed
echo.
echo [ERROR] Deployment exists, but verification FAILED - the live site is not working correctly. See the messages above.
echo         URL: %DEPLOY_URL%
goto :fail

:fail
echo.
echo  ==========================================
echo   DEPLOY FAILED - see the messages above.
echo  ==========================================
echo.
popd
pause
endlocal & exit /b 1
