// Builds the static site from src/site.json and src/i18n/*.json.
// Usage: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJSON, makeCtx, hashFile, SLUG, compareStrings } from './lib.mjs';
import { document, header, taskHeader, footerFull, footerCompact } from './layout.mjs';
import * as P from './pages.mjs';

const site = readJSON('src/site.json');
const langs = site.langs;
const allowMissing = process.argv.includes('--allow-missing');
const strings = Object.fromEntries(langs.map((l) => {
  const file = path.join(ROOT, `src/i18n/${l.code}.json`);
  if (!fs.existsSync(file) && allowMissing && l.code !== 'en') {
    console.warn(`! ${l.code}: no translation yet, using English text (dev only)`);
    return [l.code, readJSON('src/i18n/en.json')];
  }
  return [l.code, readJSON(`src/i18n/${l.code}.json`)];
}));
const en = strings.en;

/* ---------- Check every translation against English ---------- */
const problems = [];
for (const l of langs.slice(1)) compareStrings(en, strings[l.code], l.code, problems);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

/* ---------- Shared bits ---------- */
const v = { css: hashFile('assets/site.css'), js: hashFile('assets/site.js') };
const written = [];
function write(rel, html) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(rel);
}
const outPath = (lang, page) => path.join(lang.path, SLUG[page], 'index.html');

function business(c, extra = {}) {
  const k = site.contact;
  const b = site.business;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${site.origin}/#business`,
    name: 'Haedurio',
    alternateName: '해드리오',
    url: `${site.origin}/`,
    logo: `${site.origin}/assets/icon-512.png`,
    image: `${site.origin}/assets/og/og-en.png`,
    description: en.home.description,
    telephone: ['+82-70-8028-3008', '+82-10-4982-4357'],
    email: k.email,
    priceRange: '₩9,000–₩342,000',
    currenciesAccepted: 'KRW',
    address: { '@type': 'PostalAddress', streetAddress: 'Eonju-ro 425', addressLocality: 'Gangnam-gu', addressRegion: 'Seoul', addressCountry: 'KR' },
    geo: { '@type': 'GeoCoordinates', latitude: 37.5172, longitude: 127.0473 },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '11:00', closes: '02:00' }],
    areaServed: { '@type': 'City', name: 'Seoul' },
    availableLanguage: ['en', 'ja', 'zh-Hans', 'zh-Hant', 'vi', 'th', 'ko'],
    founder: { '@type': 'Person', name: b.ceo },
    parentOrganization: { '@type': 'Organization', name: b.company },
    sameAs: [k.instagram, k.facebook, k.x, k.threads],
    ...extra,
  };
}

function offerCatalog(c) {
  return {
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: c.s.services.h1,
      itemListElement: site.services.filter((s) => s.lead !== 'quote').map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: c.tp(c.s.catalog[s.id].name), description: c.tp(c.s.catalog[s.id].blurb) },
        priceSpecification: s.lead === 'from'
          ? { '@type': 'PriceSpecification', minPrice: s.won, priceCurrency: 'KRW' }
          : { '@type': 'PriceSpecification', price: s.won, priceCurrency: 'KRW' },
      })),
    },
  };
}

function suggestFor(page) {
  return langs.slice(1).map((l) => ({
    code: l.code,
    url: '/' + l.path + '/' + SLUG[page],
    text: strings[l.code].meta.suggest,
    cta: strings[l.code].meta.suggestCta,
    close: strings[l.code].meta.close,
  }));
}

/* ---------- Pages ---------- */
const PAGES = ['home', 'services', 'prices', 'request', 'help', 'reviews', 'terms', 'privacy'];
for (const lang of langs) {
  const c = makeCtx(site, lang, strings[lang.code]);
  for (const page of PAGES) {
    let body;
    if (page === 'home') body = P.home(c);
    else if (page === 'services') body = P.services(c);
    else if (page === 'prices') body = P.prices(c);
    else if (page === 'request') body = P.request(c, en, langs);
    else if (page === 'help') body = P.help(c);
    else if (page === 'reviews') body = P.reviews(c);
    else body = P.legal(c, page);

    let jsonld = [];
    if (page === 'home') {
      jsonld = [business(c), { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${site.origin}/#website`, name: 'Haedurio', url: `${site.origin}/`, inLanguage: langs.map((l) => l.hreflang), publisher: { '@id': `${site.origin}/#business` } }];
    } else if (page === 'services') {
      jsonld = [business(c, offerCatalog(c))];
    }

    const html = document(c, {
      page,
      langs,
      v,
      title: body.title,
      description: c.tp(body.description),
      head: body.head,
      header: page === 'request' ? taskHeader(c) : header(c, page, langs),
      main: body.main,
      footer: page === 'home' ? footerFull(c) : footerCompact(c),
      jsonld,
      suggest: suggestFor(page),
    });
    write(outPath(lang, page), html);
  }
}

/* ---------- Payment pages (reached only from links we send; not indexed) ---------- */
{
  const payJs = hashFile('assets/pay.js');
  for (const lang of langs) {
    const c = makeCtx(site, lang, strings[lang.code]);
    const body = P.pay(c);
    write(outPath(lang, 'pay'), document(c, {
      page: 'pay', langs, v, title: body.title, description: body.description, noindex: true, noAlternates: true,
      head: body.head + `<script src="/assets/pay.js?v=${payJs}" defer></script>\n`,
      header: taskHeader(c), main: body.main, footer: footerCompact(c),
    }));
  }
}

/* ---------- 404 ---------- */
{
  const c = makeCtx(site, langs[0], en);
  const body = P.notFound(c, langs);
  write('404.html', document(c, {
    page: 'home', langs, v, title: body.title, description: body.description, noindex: true, noAlternates: true,
    header: header(c, 'none', langs), main: body.main, footer: footerCompact(c),
  }));
}

/* ---------- Sitemap ---------- */
{
  const abs = (l, page) => site.origin + '/' + (l.path ? l.path + '/' : '') + SLUG[page];
  const urls = [];
  for (const page of PAGES) {
    for (const l of langs) {
      const alts = langs.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${abs(x, page)}"/>`).join('\n');
      urls.push(`  <url>\n    <loc>${abs(l, page)}</loc>\n    <lastmod>${site.updated}</lastmod>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(langs[0], page)}"/>\n  </url>`);
    }
  }
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
}

console.log(`Built ${written.length} files (css ${v.css}, js ${v.js}).`);
