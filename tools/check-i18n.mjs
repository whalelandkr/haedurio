// Check one translation file against English.
// Usage: node tools/check-i18n.mjs ja
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJSON, compareStrings } from './lib.mjs';

const code = process.argv[2];
if (!code) { console.error('Usage: node tools/check-i18n.mjs <code>'); process.exit(2); }
const en = readJSON('src/i18n/en.json');
let tr;
try { tr = JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/${code}.json`), 'utf8')); }
catch (e) { console.error(`Cannot read src/i18n/${code}.json: ${e.message}`); process.exit(1); }
const errors = compareStrings(en, tr, code, []);
// Strings left identical to English are listed for review (brand names are expected).
const same = [];
(function walk(a, b, where) {
  if (Array.isArray(a)) a.forEach((x, i) => walk(x, b && b[i], `${where}[${i}]`));
  else if (a && typeof a === 'object') Object.keys(a).forEach((k) => walk(a[k], b && b[k], `${where}.${k}`));
  else if (typeof a === 'string' && a === b && /[A-Za-z]{3,}/.test(a)) same.push(`${where}: ${a}`);
})(en, tr, code);
if (same.length) console.log(`Same as English (check these are names, not missed text):\n  ${same.join('\n  ')}`);
if (errors.length) { console.error(`\n${errors.length} problem(s):\n  ${errors.join('\n  ')}`); process.exit(1); }
console.log(`\n${code}: structure and placeholders OK`);
