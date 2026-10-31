'use strict';
/*
 * node scripts/verify-setup.js --quick   fast: every dependency in package.json is present in node_modules
 * node scripts/verify-setup.js           full: quick + Expo CLI runs + SDK version check + TypeScript typecheck
 * Exit code 0 only when every hard check passes.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
process.chdir(root);
const quick = process.argv.includes('--quick');

function err(m) { console.error('[ERROR] ' + m); }

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
const missing = Object.keys(deps).filter((n) => !fs.existsSync(path.join('node_modules', n, 'package.json')));
if (!fs.existsSync('node_modules')) { err('node_modules folder not found.'); process.exit(1); }
if (missing.length) {
  err('Missing installed packages: ' + missing.join(', '));
  process.exit(1);
}
if (quick) process.exit(0);

console.log('  OK  all ' + Object.keys(deps).length + ' packages from package.json are installed');

function run(label, script, args, hard) {
  const r = cp.spawnSync(process.execPath, [script].concat(args), { cwd: root, encoding: 'utf8', env: process.env });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status === 0) { console.log('  OK  ' + label); return { ok: true, out }; }
  (hard ? err : console.warn.bind(console, '[WARN] '))(label + ' failed (exit ' + r.status + ')');
  if (out) console.error(out.split('\n').slice(-25).join('\n'));
  if (hard) process.exit(1);
  return { ok: false, out };
}

let expoCli, tscCli;
try { expoCli = require.resolve('expo/bin/cli', { paths: [root] }); } catch (e) { err('expo package is broken or missing.'); process.exit(1); }
try { tscCli = require.resolve('typescript/bin/tsc', { paths: [root] }); } catch (e) { err('typescript package is broken or missing.'); process.exit(1); }

const expoVer = JSON.parse(fs.readFileSync('node_modules/expo/package.json', 'utf8')).version;
console.log('  OK  expo ' + expoVer + ' installed');
const declared = String(pkg.dependencies.expo || '').replace(/^[~^]/, '').split('.')[0];
if (declared && declared !== expoVer.split('.')[0]) { err('Installed expo major ' + expoVer.split('.')[0] + ' differs from package.json (' + declared + ').'); process.exit(1); }

run('Expo CLI runs', expoCli, ['--version'], true);
const chk = run('Expo SDK compatibility of installed packages', expoCli, ['install', '--check'], false);
if (!chk.ok) console.warn('       Fix with:  npx expo install --fix');
run('TypeScript typecheck (tsc --noEmit)', tscCli, ['--noEmit'], true);
