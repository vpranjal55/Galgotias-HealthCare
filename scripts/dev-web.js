'use strict';
/*
 * Starts the Expo web dev server for AGON.
 *
 *  - Runs `expo start --web --localhost --port <free port>` with BROWSER=none, so Expo
 *    serves the WEB target (not Expo Go / dev-client) and does NOT open its own browser;
 *    this script opens it once, after a real HTTP check succeeds.
 *  - Never assumes a port: scans from the preferred port (env PORT, default 8081) upward.
 *    A port counts as busy if ANYTHING listens on it over IPv4 or IPv6 (Windows resolves
 *    "localhost" to ::1 and Metro may listen there), or if the OS refuses the bind.
 *  - Reuses an AGON server already running for THIS folder instead of starting a duplicate.
 *  - Readiness = Metro /status says "packager-status:running" AND GET / returns HTTP 200,
 *    tried on localhost, 127.0.0.1 and ::1. Project-root header is NOT required for readiness
 *    (path casing / short names / junctions differ on Windows).
 *  - A slow start never kills the server: after the warning timeout it keeps waiting.
 *  - Expo logs stay visible (stdio inherited). Server runs until Ctrl+C / window closed.
 *
 * Env: PORT, AGON_NO_BROWSER=1, AGON_READY_TIMEOUT (seconds before the "still waiting" warning, default 180)
 */
const fs = require('fs');
const net = require('net');
const path = require('path');
const http = require('http');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const HOSTS = ['localhost', '127.0.0.1', '::1'];
const PREFERRED = parseInt(process.env.PORT, 10) || 8081;
const SCAN_COUNT = 40;
const WARN_AFTER_MS = (parseInt(process.env.AGON_READY_TIMEOUT, 10) || 180) * 1000;

function fail(msg, code) {
  console.error('\n[AGON] ERROR: ' + msg);
  process.exit(code || 1);
}

function norm(p) {
  let n;
  try { n = fs.realpathSync.native(p); } catch (e) { n = path.resolve(p); }
  n = n.replace(/\\/g, '/').replace(/\/+$/, '');
  if (process.platform === 'win32' || process.platform === 'darwin') n = n.toLowerCase();
  return n;
}

function request(host, port, urlPath) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: urlPath, timeout: 3000, headers: { Accept: 'text/html,*/*' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { if (body.length < 400) body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, host }));
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

// What answers on this port? null = nothing HTTP. Tries IPv6 and IPv4.
async function probe(port) {
  for (const host of HOSTS) {
    const r = await request(host, port, '/status');
    if (r) {
      return {
        host,
        running: r.body.indexOf('packager-status:running') !== -1,
        root: r.headers['x-react-native-project-root'] || null,
      };
    }
  }
  return null;
}

// Server is ready only on a real successful HTTP response for the page itself.
async function httpReady(port) {
  const info = await probe(port);
  if (!info || !info.running) return null;
  const page = await request(info.host, port, '/');
  if (page && page.status >= 200 && page.status < 400) return info;
  return null;
}

// Port is free only if we can bind it on all IPv4 + IPv6 addresses (or that family is unavailable).
function bindable(port, host) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', (e) => resolve(e.code === 'EADDRNOTAVAIL' || e.code === 'EAFNOSUPPORT'));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen({ port, host, exclusive: true });
  });
}
async function canBind(port) {
  for (const h of ['127.0.0.1', '0.0.0.0', '::1', '::']) {
    if (!(await bindable(port, h))) return false;
  }
  return true;
}

function openBrowser(url) {
  if (process.env.AGON_NO_BROWSER === '1') {
    console.log('[AGON] AGON_NO_BROWSER=1 set, not opening a browser. URL: ' + url);
    return;
  }
  let cmd, args;
  if (process.platform === 'win32') { cmd = 'rundll32'; args = ['url.dll,FileProtocolHandler', url]; }
  else if (process.platform === 'darwin') { cmd = 'open'; args = [url]; }
  else { cmd = 'xdg-open'; args = [url]; }
  const manual = () => console.log('[AGON] Could not open a browser automatically. Open this URL manually: ' + url);
  try {
    const c = cp.spawn(cmd, args, { stdio: 'ignore', detached: true });
    c.on('error', manual);
    c.unref();
  } catch (e) { manual(); }
}

async function main() {
  process.chdir(root);
  let expoCli;
  try {
    expoCli = require.resolve('expo/bin/cli', { paths: [root] });
  } catch (e) {
    fail('Expo is not installed. Run SETUP.bat first.');
  }

  // 1) Existing AGON server for this folder? Otherwise first genuinely free port.
  let port = null;
  for (let p = PREFERRED; p < PREFERRED + SCAN_COUNT; p++) {
    const info = await probe(p);
    if (info) {
      if (info.running && info.root && norm(info.root) === norm(root) && (await httpReady(p))) {
        const url = 'http://localhost:' + p;
        console.log('[AGON] AGON is already running on port ' + p + ' - not starting a second server.');
        console.log('[AGON] Opening ' + url);
        openBrowser(url);
        return 0;
      }
      console.log('[AGON] Port ' + p + ' is used by another application, skipping.');
      continue;
    }
    if (await canBind(p)) { port = p; break; }
    console.log('[AGON] Port ' + p + ' is not available, skipping.');
  }
  if (port === null) fail('No free port found in ' + PREFERRED + '-' + (PREFERRED + SCAN_COUNT - 1) + '. Free a port or set PORT.');
  if (port !== PREFERRED) console.log('[AGON] Preferred port ' + PREFERRED + ' is busy, using ' + port + '.');

  console.log('[AGON] Starting Expo WEB server on port ' + port + ' ...');
  console.log('[AGON] Keep this window open while using AGON. Press Ctrl+C to stop.\n');

  // 2) Expo in web mode, browser opening left to us.
  const env = Object.assign({}, process.env, { BROWSER: 'none' });
  const child = cp.spawn(
    process.execPath,
    [expoCli, 'start', '--web', '--localhost', '--port', String(port)],
    { stdio: 'inherit', cwd: root, env }
  );
  let exited = false;
  let exitCode = 0;
  const done = new Promise((resolve) => {
    child.on('exit', (code, sig) => { exited = true; exitCode = code === null ? (sig ? 1 : 0) : code; resolve(); });
    child.on('error', (e) => { exited = true; exitCode = 1; console.error('[AGON] Could not start Expo: ' + e.message); resolve(); });
  });
  const stop = () => { if (!exited) child.kill('SIGINT'); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // 3) Wait for a real HTTP response. Never kill the server because it is slow.
  //    If Expo had to move to another port, find it by project root.
  const start = Date.now();
  let warned = false;
  let readyPort = null;
  while (!exited && readyPort === null) {
    for (let p = port; p < port + 10 && readyPort === null; p++) {
      const info = await httpReady(p);
      if (info && (p === port || (info.root && norm(info.root) === norm(root)))) readyPort = p;
    }
    if (readyPort !== null) break;
    if (!warned && Date.now() - start > WARN_AFTER_MS) {
      warned = true;
      console.log('\n[AGON] Still waiting for the server to answer on port ' + port + ' (' + WARN_AFTER_MS / 1000 + 's). It is still running - leaving it alone.');
      console.log('[AGON] Check the Expo log above. The browser opens as soon as the server responds.\n');
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (readyPort !== null) {
    const url = 'http://localhost:' + readyPort;
    console.log('\n[AGON] Server is ready (HTTP OK) at ' + url + ' - opening browser.');
    console.log('[AGON] First page load compiles the web bundle and can take up to a minute.\n');
    openBrowser(url);
  }

  await done;
  if (readyPort === null) {
    console.error('\n[AGON] ERROR: Expo exited before the server answered (exit code ' + exitCode + ').');
    return exitCode || 1;
  }
  console.log('\n[AGON] Server stopped.');
  return exitCode;
}

module.exports = { probe, httpReady, canBind, norm };
if (require.main === module) {
  main().then((c) => process.exit(c), (e) => fail(e && e.stack ? e.stack : String(e)));
}
