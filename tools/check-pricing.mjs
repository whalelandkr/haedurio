// Checks that the price calculator in __admin__/documents.html uses the same prices as the public site:
// service prices in src/site.json, add-ons in the catalog of src/i18n/en.json, and the timing, distance
// and size extras on the prices page (tools/pages.mjs).
// Usage: node tools/check-pricing.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, readJSON } from './lib.mjs';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const page = read('__admin__/documents.html');
const pages = read('tools/pages.mjs');
const site = readJSON('src/site.json');
const en = readJSON('src/i18n/en.json');
const cat = en.catalog;

// The PR and SV tables are plain object literals in the page script.
function table(name) {
  const m = new RegExp(`\\n  var ${name} = (\\{[\\s\\S]*?\\n  \\});`).exec(page);
  if (!m) throw new Error(`var ${name} not found in __admin__/documents.html`);
  return vm.runInNewContext('(' + m[1] + ')');
}
function list(name) {
  const m = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`).exec(pages);
  if (!m) throw new Error(`const ${name} not found in tools/pages.mjs`);
  return vm.runInNewContext(m[1]);
}
const PR = table('PR');
const SV = table('SV');
const won = (s) => { const m = /\{won:(\d+)\}/.exec(s || ''); return m ? +m[1] : null; };
const addon = (svc, re) => {
  const a = ((cat[svc] && cat[svc].addons) || []).find((x) => re.test(x.label));
  return a ? won(a.price) : null;
};
const byEn = (arr, label) => arr.find((x) => x.en === label);

const errors = [];
let checked = 0;
const same = (what, calc, siteValue) => {
  checked++;
  if (calc !== siteValue) errors.push(`${what}: calculator ${calc}, site ${siteValue}`);
};

// Service prices
const ids = site.services.map((s) => s.id);
ids.forEach((id) => { if (!SV[id]) errors.push(`${id}: on the site, missing from the calculator (SV)`); });
Object.keys(SV).forEach((id) => { if (ids.indexOf(id) < 0) errors.push(`${id}: in the calculator (SV), not on the site`); });
site.services.forEach((s) => {
  const S = SV[s.id];
  if (!S) return;
  if (s.id === 'genie') {
    same('genie remote, per hour', byId(S.variants, 'remote').krw, s.won);
    same('genie on site, per hour', byId(S.variants, 'onsite').krw, s.won2);
  } else if (S.variants) same(`${s.id} (${S.variants[0].id})`, S.variants[0].krw, s.won);
  else same(s.id, S.krw, s.won);
});
function byId(arr, id) { return arr.find((x) => x.id === id) || {}; }

// Add-ons and included amounts in the catalog
const ra = (id) => byId(SV.reservation.addons, id).krw;
same('reservation: compare first', ra('compare'), addon('reservation', /compare/i));
same('reservation: change or cancel', ra('change'), addon('reservation', /change or cancel/i));
same('reservation: repeated follow-ups', ra('follow'), addon('reservation', /follow-ups/i));
same('info: one hour of research', SV.info.research, addon('info', /research/i));
same('instore: each extra hour', SV.instore.extra, addon('instore', /extra hour/i));
same('openrun: each extra hour', SV.openrun.extra, addon('openrun', /extra hour/i));
same('errand: each extra hour', SV.errand.extra, addon('errand', /extra hour/i));
same('companion: each extra hour', SV.companion.extra, addon('companion', /extra hour/i));
['instore', 'online', 'openrun'].forEach((k) => same(`${k}: ship it abroad`, PR.ship, addon(k, /ship/i)));
same('errand: hotel lobby', byId(SV.errand.addons, 'lobby').krw, addon('errand', /lobby/i));
same('errand: outside central Seoul (from)', byId(PR.distance, 'seoul').krw, addon('errand', /outside/i));
same('pickup: outside central Seoul (from)', byId(PR.distance, 'seoul').krw, addon('pickup', /outside/i));
same('errand: bulky or heavy (from)', byId(PR.size, 'bulky').krw, addon('errand', /bulky/i));
same('remote: one hour', 2 * SV.remote.krw, addon('remote', /one hour/i));
same('companion: two hours', SV.companion.krw + SV.companion.extra, addon('companion', /two hours/i));
same('pro: two hours', 2 * SV.pro.krw, addon('pro', /two hours/i));
same('parcel: storage after 7 days, a day', SV.parcel.storage, addon('parcel', /storage/i));
same('pickup: lost item pickup', byId(SV.pickup.variants, 'lost').krw, won(cat.pickup.included.find((x) => /lost item/i.test(x))));
same('pickup: same-day urgent delivery', byId(SV.pickup.variants, 'urgent').krw, won(cat.pickup.included.find((x) => /urgent/i.test(x))));
same('genie: on site, per hour (catalog)', byId(SV.genie.variants, 'onsite').krw, won(cat.genie.unit));
['instore', 'online'].forEach((k) => same(`${k}: item handling minimum included`, SV[k].itemMin, won(cat[k].included.find((x) => /handling/i.test(x)))));
const hm = /(\d+(?:\.\d+)?)% handling/.exec(en.services.lead);
same('handling fee %', PR.handling, hm ? +hm[1] : null);

// Timing, distance and size on the prices page: labels from en.json, amounts from pages.mjs
const timing = list('timing').map((t) => parseFloat(String(t).replace(/[+%]/g, '')));
en.prices.timing.forEach((label, i) => {
  const o = label === PR.night.en ? PR.night : label === PR.fixed.en ? PR.fixed : byEn(PR.lead, label);
  if (!o) { errors.push(`timing "${label}": not in the calculator (PR)`); return; }
  same(`timing: ${label} (%)`, o.pct, timing[i]);
});
const dist = list('dist');
en.prices.distance.forEach((label, i) => {
  const o = byEn(PR.distance, label) || byEn(PR.size, label);
  if (!o) { errors.push(`distance or size "${label}": not in the calculator (PR)`); return; }
  same(`distance or size: ${label}`, o.krw, dist[i] === null ? 0 : dist[i]);
});

if (errors.length) {
  console.error(`The calculator in __admin__/documents.html differs from the site's price list (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`pricing: ${checked} prices in the calculator match the site`);
