// Shared helpers for the static site build. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const attr = esc;

export const group = (n, sep) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

// Korean won, formatted for the page language. Vietnamese uses dots for thousands
// and puts the symbol after the number.
export function money(n, code) {
  if (code === 'vi') return group(n, '.') + ' ₩';
  return '₩' + group(n, ',');
}

export function hashFile(p) {
  return crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, p))).digest('hex').slice(0, 10);
}

// Page slugs, shared by every language.
export const SLUG = { home: '', services: 'services/', prices: 'prices/', request: 'request/', help: 'help/', terms: 'terms/', privacy: 'privacy/' };

export function makeCtx(site, lang, strings) {
  const code = lang.code;
  const base = '/' + (lang.path ? lang.path + '/' : '');
  const href = (page, extra = '') => base + SLUG[page] + extra;
  const abs = (l, page) => site.origin + '/' + (l.path ? l.path + '/' : '') + SLUG[page];
  const won = (n) => money(n, code);
  const usd = (n) => Math.round(n / site.usdRate);

  // Translate: escape the string, expand {won:N}, then fill {name} slots with
  // trusted HTML. Any slot left unfilled is a build error.
  const t = (str, vars = {}) => {
    if (str === undefined || str === null) throw new Error(`[${code}] missing string`);
    let out = esc(str).replace(/\{won:(\d+)\}/g, (_, n) => esc(won(+n)));
    out = out.replace(/\{(\w+)\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`[${code}] unfilled slot {${k}} in: ${str}`);
      return vars[k];
    });
    return out;
  };
  // Plain-text variant for attributes and JSON (no HTML in slots).
  const tp = (str, vars = {}) => {
    if (str === undefined || str === null) throw new Error(`[${code}] missing string`);
    let out = String(str).replace(/\{won:(\d+)\}/g, (_, n) => won(+n));
    return out.replace(/\{(\w+)\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`[${code}] unfilled slot {${k}} in: ${str}`);
      return vars[k];
    });
  };
  return { site, lang, code, s: strings, href, abs, won, usd, t, tp };
}

// Icons (inline SVG, decorative).
const svg = (w, body, extra = '') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
export const icon = {
  globe: svg(18, '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></g>'),
  menu: svg(20, '<path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', ' class="i-menu"'),
  menuClose: svg(20, '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', ' class="i-close"'),
  close: svg(18, '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  chevRight: (w = 20) => svg(w, '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevDown: svg(22, '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  arrowLeft: svg(18, '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  check: svg(16, '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  tick: svg(20, '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  dot: svg(20, '<circle cx="12" cy="12" r="3.5" fill="#121826"/>'),
  info: svg(22, '<g fill="none" stroke="#121826" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/></g>'),
  shield: svg(22, '<path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.1-7.5 9.5-4.4-1.4-7.5-5.1-7.5-9.5V6L12 3z" fill="none" stroke="#121826" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  x: svg(18, '<path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  alert: svg(18, '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.1"/></g>'),
  done: svg(24, '<circle cx="12" cy="12" r="11" fill="#0B7A50"/><path d="M7.4 12.3l3.1 3 6.1-6.5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  progress: svg(24, '<circle cx="12" cy="12" r="10" fill="none" stroke="#D3DDF9" stroke-width="2.5"/><path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="#1F4FE0" stroke-width="2.5" stroke-linecap="round"/>'),
  pending: svg(24, '<circle cx="12" cy="12" r="10" fill="none" stroke="#8A93A3" stroke-width="2" stroke-dasharray="2.6 3.2"/>'),
};

// Compare a translation with the English source: same keys, same list lengths,
// non-empty text and the same {placeholders} in every string.
const slotsOf = (s) => (String(s).match(/\{[\w:]+\}/g) || []).sort().join(' ');
export function compareStrings(a, b, where, errors) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return errors.push(`${where}: expected a list`);
    if (a.length !== b.length) errors.push(`${where}: expected ${a.length} items, got ${b.length}`);
    a.forEach((x, i) => b[i] !== undefined && compareStrings(x, b[i], `${where}[${i}]`, errors));
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return errors.push(`${where}: expected an object`);
    for (const k of Object.keys(a)) {
      if (!(k in b)) errors.push(`${where}.${k}: missing`);
      else compareStrings(a[k], b[k], `${where}.${k}`, errors);
    }
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${where}.${k}: not in English`);
  } else if (typeof a === 'string') {
    if (typeof b !== 'string' || (a.trim() && !b.trim())) errors.push(`${where}: empty or not text`);
    else if (slotsOf(a) !== slotsOf(b)) errors.push(`${where}: placeholders differ (${slotsOf(a)} vs ${slotsOf(b)})`);
  }
  return errors;
}
