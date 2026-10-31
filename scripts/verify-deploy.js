'use strict';
/*
 * node scripts/verify-deploy.js <https-url>
 * Checks a live deployment: "/" is HTML, a client-route path rewrites to the app (refresh works),
 * every script/asset referenced by index.html loads, and a missing asset is a real 404.
 * Exit 0 = verified, 1 = verification failed, 2 = could not verify (deployment protection / network).
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const base = process.argv[2];
if (!base || !/^https?:\/\//i.test(base)) { console.error('usage: verify-deploy.js <url>'); process.exit(1); }

function get(u) {
  return new Promise((resolve) => {
    const lib = u.startsWith('https') ? https : http;
    const req = lib.get(u, { timeout: 30000, headers: { 'user-agent': 'agon-verify' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, type: String(res.headers['content-type'] || ''), body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, type: '', body: Buffer.alloc(0), error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, type: '', body: Buffer.alloc(0), error: e.message }));
  });
}

(async () => {
  const origin = new URL(base).origin;
  const problems = [];
  const root = await get(origin + '/');
  if (root.status === 0) { console.error('  cannot reach ' + origin + ' (' + root.error + ')'); process.exit(2); }
  if (root.status === 401 || root.status === 403) {
    console.error('  HTTP ' + root.status + ' - Vercel Deployment Protection is blocking anonymous checks.');
    process.exit(2);
  }
  if (root.status !== 200 || !/text\/html/.test(root.type)) problems.push('"/" returned ' + root.status + ' ' + root.type);
  const html = root.body.toString('utf8');
  if (!/id="root"/.test(html)) problems.push('"/" does not look like the Expo web app (no #root)');

  const deep = await get(origin + '/agon-refresh-test/route');
  if (deep.status !== 200 || !/id="root"/.test(deep.body.toString('utf8'))) problems.push('deep path did not rewrite to the app (status ' + deep.status + ') - refresh would 404');

  const refs = [];
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) refs.push(m[1]);
  for (const r of refs) {
    const x = await get(origin + r);
    if (x.status !== 200) problems.push(r + ' -> ' + x.status);
    else if (/\.js$/.test(r)) {
      // check assets the bundle points at (fonts/images)
      const js = x.body.toString('utf8');
      const assets = new Set();
      for (const m of js.matchAll(/\/assets\/[^"'`\s\\)]+?\.(?:ttf|otf|woff2?|png|jpe?g|gif|webp|svg)/gi)) assets.add(m[0]);
      for (const a of assets) {
        const y = await get(origin + a);
        if (y.status !== 200) problems.push(a + ' -> ' + y.status);
      }
      console.log('  checked ' + assets.size + ' bundled asset file(s)');
    }
  }
  const miss = await get(origin + '/_expo/static/js/web/agon-missing.js');
  if (miss.status !== 404) problems.push('missing script returned ' + miss.status + ' instead of 404');

  if (problems.length) { console.error('  FAILED:'); problems.forEach((p) => console.error('   - ' + p)); process.exit(1); }
  console.log('  OK: "/", client-route refresh, scripts and assets all load');
})();
