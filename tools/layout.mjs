// Document shell, header and footer.
import { esc, attr, icon, SLUG } from './lib.mjs';

export function langMenu(c, page, langs) {
  const cur = c.lang;
  const opts = langs.map((l) => {
    const on = l.code === cur.code;
    return `<a class="lang__opt" href="${attr(c.abs(l, page).replace(c.site.origin, ''))}" hreflang="${l.hreflang}" lang="${l.htmlLang}" data-lang="${l.code}"${on ? ' aria-current="true"' : ''}><span>${esc(l.name)}</span>${on ? icon.check : ''}</a>`;
  }).join('');
  return `<details class="lang" data-lang-menu>
<summary aria-label="${attr(c.tp(c.s.common.languageButton, { lang: cur.name }))}">${icon.globe}<span class="lang__name">${esc(cur.name)}</span></summary>
<div class="lang__menu" role="group" aria-label="${attr(c.s.common.languageMenu)}">${opts}</div>
</details>`;
}

function brand(c, size = 36) {
  return `<a class="brand" href="${c.href('home')}" aria-label="${attr(c.s.common.homeLabel)}"><img class="brand__seal" src="/assets/seal.svg" width="${size}" height="${size}" alt=""><span class="brand__word">haedurio</span></a>`;
}

export function header(c, page, langs) {
  const n = c.s.common.nav;
  const link = (p, label) => `<a class="hdr__link" href="${c.href(p)}"${p === page ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  const mlink = (p, label) => `<a href="${c.href(p)}"${p === page ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  return `<header class="hdr" data-hdr>
<div class="wrap hdr__bar">
${brand(c)}
<nav class="hdr__nav" aria-label="${attr(c.s.common.menu)}">${link('services', n.services)}${link('prices', n.prices)}${link('help', n.help)}</nav>
<div class="hdr__tools">
${langMenu(c, page in SLUG ? page : 'home', langs)}
<a class="btn btn--primary btn--sm hdr__cta" href="${c.href('request')}">${esc(c.s.common.cta)}</a>
<button type="button" class="iconbtn hdr__menu" aria-expanded="false" aria-controls="sitemenu" aria-label="${attr(c.s.common.menu)}">${icon.menu}${icon.menuClose}</button>
</div>
</div>
<div class="wrap sitemenu" id="sitemenu" hidden>${mlink('services', n.services)}${mlink('prices', n.prices)}${mlink('help', n.help)}<a href="${c.href('request')}">${esc(c.s.common.cta)}</a></div>
</header>`;
}

export function taskHeader(c) {
  return `<header class="hdr hdr--task">
<div class="wrap hdr__bar">
${brand(c)}
<a class="hdr__close" href="${c.href('home')}" data-close>${icon.close}${esc(c.s.request.close)}</a>
</div>
</header>`;
}

function legalLine(c) {
  const b = c.site.business;
  const f = c.s.common.footer;
  return `${c.t(f.legal, { company: esc(b.company), address: esc(b.address), ceo: esc(b.ceo), brn: esc(b.brn), ecl: esc(b.ecl), host: esc(b.host) })} <a href="${attr(b.verifyUrl)}" rel="noopener" target="_blank">${esc(f.verify)}</a><br>${c.t(f.copyright, { year: String(c.site.year), company: esc(b.company) })}`;
}

export function footerFull(c) {
  const f = c.s.common.footer;
  const k = c.site.contact;
  return `<footer class="ftr">
<div class="wrap ftr__inner">
<div class="ftr__top">
<div class="ftr__brand">${brand(c, 34)}<p class="ftr__tagline">${esc(f.tagline)}</p></div>
<nav class="ftr__col" aria-labelledby="ftr-site"><h2 class="ftr__h" id="ftr-site">${esc(f.site)}</h2>
<a href="${c.href('services')}">${esc(f.services)}</a><a href="${c.href('prices')}">${esc(f.pricesRefunds)}</a><a href="${c.href('help')}">${esc(f.help)}</a><a href="${c.href('request')}">${esc(f.request)}</a></nav>
<nav class="ftr__col" aria-labelledby="ftr-pol"><h2 class="ftr__h" id="ftr-pol">${esc(f.policies)}</h2>
<a href="${c.href('terms')}">${esc(f.terms)}</a><a href="${c.href('privacy')}">${esc(f.privacy)}</a><a href="${c.href('help', '#dont')}">${esc(f.dont)}</a></nav>
<div class="ftr__col ftr__col--wide"><h2 class="ftr__h">${esc(f.contact)}</h2>
<a href="mailto:${attr(k.email)}">${esc(k.email)}</a><a class="nowrap" href="tel:${attr(k.phone)}">${esc(k.phoneDisplay)}</a><span>${esc(f.hours)}</span><a href="${attr(k.instagram)}" rel="noopener" target="_blank">Instagram</a></div>
</div>
<p class="ftr__legal">${legalLine(c)}</p>
</div>
</footer>`;
}

export function footerCompact(c) {
  const f = c.s.common.footer;
  return `<footer class="ftr ftr--compact">
<div class="wrap ftr__inner">
<div class="ftr__row">
<a class="ftr__mark" href="${c.href('home')}" aria-label="${attr(c.s.common.homeLabel)}"><img src="/assets/seal.svg" width="26" height="26" alt=""><span>haedurio</span></a>
<nav class="ftr__links" aria-label="${attr(f.policies)}"><a href="${c.href('terms')}">${esc(f.terms)}</a><a href="${c.href('privacy')}">${esc(f.privacy)}</a><a href="${c.href('help')}">${esc(f.help)}</a><a href="mailto:${attr(c.site.contact.email)}">${esc(c.site.contact.email)}</a></nav>
</div>
<p class="ftr__legal">${legalLine(c)}</p>
</div>
</footer>`;
}

export function document(c, o) {
  const { site, lang } = c;
  const langs = o.langs;
  const canonical = c.abs(lang, o.page);
  const alternates = o.noAlternates ? '' : langs.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${c.abs(l, o.page)}">`).join('\n')
    + `\n<link rel="alternate" hreflang="x-default" href="${c.abs(langs[0], o.page)}">`;
  const ogLocales = langs.filter((l) => l.code !== lang.code).map((l) => `<meta property="og:locale:alternate" content="${l.ogLocale}">`).join('\n');
  const og = `${site.origin}/assets/og/og-${lang.code}.png`;
  const suggest = lang.code === 'en' && o.suggest ? `<script type="application/json" id="hd-suggest">${JSON.stringify(o.suggest).replace(/</g, '\\u003c')}</script>` : '';
  const jsonld = (o.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="${lang.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${attr(o.description)}">
${o.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Haedurio">
<meta property="og:title" content="${attr(o.ogTitle || o.title)}">
<meta property="og:description" content="${attr(o.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang.ogLocale}">
${ogLocales}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${o.v.css}">
<script>document.documentElement.classList.add('js')</script>
<script src="/assets/site.js?v=${o.v.js}" defer></script>
${o.head || ''}${suggest}
${jsonld}
</head>
<body${o.bodyClass ? ` class="${o.bodyClass}"` : ''}>
<a class="skip" href="#main">${esc(c.s.common.skip)}</a>
${o.header}
${o.main}
${o.footer}
</body>
</html>
`;
}
