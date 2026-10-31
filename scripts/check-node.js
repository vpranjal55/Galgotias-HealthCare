'use strict';
// Runs BEFORE dependencies exist: plain CommonJS, zero dependencies, old-syntax safe.
// Mirrors the "engines" range in package.json (react-native 0.86 / Expo SDK 57).
var v = process.versions.node.split('.').map(Number);
var MIN = { 20: [19, 4], 22: [13, 0], 24: [3, 0] }; // major -> [minor, patch]

function supported() {
  if (v[0] >= 25) return true;
  var m = MIN[v[0]];
  if (!m) return false;
  return v[1] > m[0] || (v[1] === m[0] && v[2] >= m[1]);
}

console.log('Node.js ' + process.versions.node + ' (' + process.platform + ' ' + process.arch + ')');
if (!supported()) {
  console.error('[ERROR] Node.js ' + process.versions.node + ' is not supported by Expo SDK 57 / React Native 0.86.');
  console.error('        Required: ^20.19.4, ^22.13.0, ^24.3.0 or >=25.');
  console.error('        Install the current LTS from https://nodejs.org/ , then close this window and run again.');
  process.exit(1);
}
