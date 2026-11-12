// Fail a rebuild before it can publish a runtime below the reviewed security baseline.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const resolve = createRequire(path.join(root, 'package.json')).resolve;
const parts = value => String(value).replace(/^v/, '').split('.').map(Number);
const atLeast = (value, minimum) => { const a = parts(value), b = parts(minimum); for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; } return true; };
function reject(message) { console.error('[security-runtime] ' + message); process.exit(1); }
const nodeMinimum = { 22: '22.23.5', 24: '24.22.3', 26: '26.13.1' }[parts(process.version)[0]];
if (!nodeMinimum || !atLeast(process.version, nodeMinimum)) reject('Node ' + process.version + ' is below the reviewed baseline');
function version(name) {
  let dir;
  try { dir = path.dirname(resolve(name)); } catch { reject('Declared package is not installed: ' + name); }
  for (;;) {
    const file = path.join(dir, 'package.json');
    if (fs.existsSync(file)) { const p = JSON.parse(fs.readFileSync(file, 'utf8')); if (p.name === name) return p.version; }
    const parent = path.dirname(dir); if (parent === dir) reject('Cannot resolve package metadata: ' + name); dir = parent;
  }
}
const declared = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies };
const checked = { node: process.version };
if (declared.next) {
  const v = version('next'), minimum = { 15: '15.5.29', 16: '16.4.5' }[parts(v)[0]];
  if (!minimum || !atLeast(v, minimum)) reject('Next ' + v + ' is below the reviewed baseline'); checked.next = v;
}
if (declared.sharp) { const v = version('sharp'); if (!atLeast(v, '0.35.5')) reject('sharp ' + v + ' is below the reviewed baseline'); checked.sharp = v; }
for (const name of ['react-server-dom-webpack', 'react-server-dom-turbopack', 'react-server-dom-parcel']) {
  if (!declared[name]) continue;
  const v = version(name), [major, minor] = parts(v), minimum = { 0: '19.0.9', 1: '19.1.10', 2: '19.2.9', 3: '19.3.1' }[minor];
  if (major !== 19 || !minimum || !atLeast(v, minimum)) reject(name + ' ' + v + ' is outside the reviewed baseline'); checked[name] = v;
}
console.log('[security-runtime] ' + JSON.stringify(checked));
