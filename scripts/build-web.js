'use strict';
/*
 * Production web build used by BOTH `npm run build:web` (Vercel) and DEPLOY TO VERCEL.bat.
 *
 * - Output directory is read from vercel.json ("outputDirectory"), never assumed.
 * - Runs `expo export --platform web`.
 * - Vercel drops any directory named "node_modules" from uploaded output, which would
 *   404 the Ionicons font and React Navigation icons that Metro emits under
 *   <out>/assets/node_modules/. We move that folder to a safe name and rewrite every
 *   reference to it, then verify every asset the bundle references exists on disk.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const SAFE_DIR = 'vendor-modules';

function fail(msg) {
  console.error('\n[build-web] ERROR: ' + msg);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail('Cannot read ' + file + ': ' + e.message);
  }
}

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const vercel = readJson('vercel.json');
const outName = vercel.outputDirectory;
if (!outName || typeof outName !== 'string') fail('vercel.json has no "outputDirectory".');
const outDir = path.resolve(root, outName);
if (outDir === root || !outDir.startsWith(root + path.sep)) {
  fail('outputDirectory must be a sub-folder of the project (got "' + outName + '").');
}

let expoCli;
try {
  expoCli = require.resolve('expo/bin/cli', { paths: [root] });
} catch (e) {
  fail('Expo is not installed. Run SETUP.bat (or `npm install`) first.');
}

console.log('[build-web] output directory (from vercel.json): ' + outName);
fs.rmSync(outDir, { recursive: true, force: true });

const r = cp.spawnSync(
  process.execPath,
  [expoCli, 'export', '--platform', 'web', '--output-dir', outName],
  { stdio: 'inherit', cwd: root, env: process.env }
);
if (r.error) fail('Could not run expo export: ' + r.error.message);
if (r.status !== 0) fail('expo export failed with exit code ' + r.status + '.');

if (!fs.existsSync(path.join(outDir, 'index.html'))) {
  fail('expo export finished but "' + outName + '/index.html" is missing.');
}

// --- relocate assets/node_modules -> assets/<SAFE_DIR> ---
const assetsDir = path.join(outDir, 'assets');
const nm = path.join(assetsDir, 'node_modules');
if (fs.existsSync(nm)) {
  const dest = path.join(assetsDir, SAFE_DIR);
  if (fs.existsSync(dest)) fail('"' + dest + '" already exists; pick another SAFE_DIR in scripts/build-web.js.');
  fs.renameSync(nm, dest);
  let rewritten = 0;
  for (const f of walk(outDir)) {
    if (!/\.(js|html|json|css|map)$/i.test(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes('assets/node_modules/')) continue;
    fs.writeFileSync(f, src.split('assets/node_modules/').join('assets/' + SAFE_DIR + '/'));
    rewritten++;
  }
  console.log('[build-web] moved assets/node_modules -> assets/' + SAFE_DIR + ' (' + rewritten + ' file(s) rewritten)');
}

// --- verification ---
const problems = [];
for (const f of walk(outDir)) {
  if (f.split(path.sep).includes('node_modules')) problems.push('node_modules folder in output: ' + f);
}
const checked = new Set();
function checkRef(ref, from) {
  const clean = decodeURIComponent(ref.split('?')[0].split('#')[0]);
  if (checked.has(clean)) return;
  checked.add(clean);
  if (!fs.existsSync(path.join(outDir, clean))) problems.push('missing in output: ' + clean + ' (referenced from ' + from + ')');
}
const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) checkRef(m[1], 'index.html');
const assetRe = /\/assets\/[^"'`\s\\)]+?\.(?:ttf|otf|woff2?|png|jpe?g|gif|webp|svg|mp3|mp4)/gi;
let jsCount = 0;
for (const f of walk(outDir)) {
  if (!f.endsWith('.js')) continue;
  jsCount++;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(assetRe)) checkRef(m[0], path.relative(outDir, f));
}
if (jsCount === 0) problems.push('no JavaScript bundle found in output');
if (problems.length) {
  console.error('\n[build-web] Output verification FAILED:');
  problems.slice(0, 25).forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('[build-web] verified ' + checked.size + ' referenced file(s) exist in ' + outName + '/');
console.log('[build-web] BUILD OK -> ' + outDir);
