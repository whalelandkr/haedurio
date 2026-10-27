// Page bodies. Each function returns { title, description, main, ... } for the layout.
import { esc, attr, icon } from './lib.mjs';

const chatLinks = (c, extraClass = '') => {
  const k = c.site.contact;
  return `<a class="ulink${extraClass}" href="https://wa.me/${k.whatsapp}" rel="noopener" target="_blank">WhatsApp</a>
<a class="ulink${extraClass}" href="${attr(k.lineUrl)}" rel="noopener" target="_blank">LINE</a>
<a class="ulink${extraClass}" href="${c.href('help', '#talk')}">WeChat</a>
<a class="ulink${extraClass}" href="${attr(k.kakaoUrl)}" rel="noopener" target="_blank">KakaoTalk</a>`;
};

const priceSlot = (c, kind, n) => c.t(kind === 'hour' ? c.s.common.money.hour : c.s.common.money.from, { price: `<b>${esc(c.won(n))}</b>` });

// Reviews are read from and posted to Supabase by assets/site.js, on the home page and /reviews/.
const STAR = '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92z" fill="currentColor"/></svg>';
const RV_TEXT = ['summaryOne', 'summaryMany', 'ratingOf', 'loading', 'empty', 'loadError', 'errRating', 'errBody', 'errLinks', 'errName', 'errConsent', 'submit', 'sending', 'errSend', 'errDuplicate', 'errBusy', 'thanksTitle'];
function reviewsHead(c) {
  const cfg = {
    url: c.site.supabase.url,
    key: c.site.supabase.anonKey,
    lang: c.code,
    locale: c.lang.htmlLang,
    services: Object.fromEntries(c.site.categories.map((g) => [g, c.s.services.cats[g].short])),
    t: Object.fromEntries(RV_TEXT.map((k) => [k, c.s.reviews[k]])),
  };
  return `<script type="application/json" id="rv-config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
<link rel="preconnect" href="${c.site.supabase.url}" crossorigin>
`;
}

/* ------------------------------------------------------------------ Home */
export function home(c) {
  const h = c.s.home;
  const sv = c.s.services;
  const b = c.site.business;
  const states = [['done', icon.done], ['progress', icon.progress], ['quote', icon.pending]];
  const examples = h.examples.map((e, i) => `<li class="task">${states[i][1]}<span class="task__body"><span class="task__top"><span class="task__title">${c.t(e.title)}</span><span class="pill pill--${states[i][0]}">${c.t(e.status)}</span></span><span class="task__note">${c.t(e.note)}</span></span></li>`).join('\n');
  const trust = h.trust.map((x) => `<li><span class="trust__t">${c.t(x.title)}</span><span class="trust__d">${c.t(x.text, { brn: esc(b.brn) })}</span></li>`).join('\n');
  const rows = c.site.homeRows.map((r) => `<li><a class="row" href="${c.href('services', '#cat-' + r.cat)}"><span class="row__text"><span class="row__title">${c.t(sv.cats[r.cat].name)}</span><span class="row__desc">${c.t(sv.cats[r.cat].home)}</span></span><span class="row__price">${priceSlot(c, r.kind, r.won)}</span><span class="row__chev">${icon.chevRight(20)}</span></a></li>`).join('\n');
  const steps = h.steps.map((s, i) => `<li class="step"><span class="step__rail" aria-hidden="true"><span class="step__n">${i + 1}</span>${i < h.steps.length - 1 ? '<span class="step__line"></span>' : ''}</span><span class="step__body"><span class="step__title">${c.t(s.title)}</span><span class="step__text">${c.t(s.text)}</span></span></li>`).join('\n');
  const ko = (w) => `<span lang="ko" class="ko">${w}</span>`;
  const tm = h.team;
  const people = tm.people.map((p) => `<span class="team__person"><span class="team__name">${c.t(p.name)}</span><span class="team__role">${c.t(p.role)}</span><span class="team__role">${c.t(p.area)}</span></span>`).join('\n');
  const hr = h.reviews;

  const main = `<main id="main">
<section class="hero">
<div class="wrap hero__grid">
<div class="hero__copy">
<h1 class="display">${c.t(h.h1a)}<br>${c.t(h.h1b)}<sup class="fnref"><a href="#name" aria-label="${attr(h.footnoteLabel)}">1</a></sup></h1>
<p class="hero__lead">${c.t(h.lead)}</p>
<div class="hero__ctas"><a class="btn btn--primary btn--lg" href="${c.href('request')}">${esc(c.s.common.cta)}</a><a class="btn btn--soft btn--lg" href="${c.href('services')}">${c.t(h.ctaSecondary)}</a></div>
<div class="channels"><span>${c.t(c.s.common.orMessage)}</span>
${chatLinks(c)}</div>
<p class="fnote" id="name"><span class="fnote__n">1</span>${c.t(h.footnote, { name: ko('해드리오'), phrase: ko('해드립니다') })}</p>
</div>
<div class="hero__visual">
<div class="board">
<div class="board__card">
<div class="board__head"><span class="board__title">${c.t(h.exampleTitle)}</span><span class="board__tag">${c.t(h.exampleTag)}</span></div>
<ul class="tasks">
${examples}
</ul>
</div>
<img class="stamp" src="/assets/stamp.svg" width="132" height="132" alt="">
</div>
</div>
</div>
</section>

<section class="section-pad" aria-label="${attr(h.trustLabel)}">
<div class="wrap"><ul class="trust__list">
${trust}
</ul></div>
</section>

<section class="what section-pad" aria-labelledby="what">
<div class="wrap split">
<div class="split__aside">
<h2 class="h2" id="what">${c.t(h.whatTitle)}</h2>
<p class="sublead">${c.t(h.whatLead)}</p>
<a class="btn btn--outline" href="${c.href('services')}">${c.t(h.whatAll)}</a>
</div>
<ul class="rows split__main">
${rows}
<li class="rows__more">${c.t(h.otherLine, { ask: `<a href="${c.href('request', '?service=genie')}">${esc(h.otherAsk)}</a>` })}</li>
</ul>
</div>
</section>

<section class="how" aria-labelledby="how">
<div class="wrap split">
<div class="split__aside">
<h2 class="h2" id="how">${c.t(h.howTitle)}</h2>
<p class="sublead">${c.t(h.howLead)}</p>
<a class="textlink" href="${c.href('prices')}">${c.t(h.howLink)}</a>
</div>
<ol class="steps split__main">
${steps}
</ol>
</div>
</section>

<section class="team" aria-labelledby="team">
<div class="wrap split">
<div class="split__aside">
<h2 class="h2" id="team">${c.t(tm.title)}</h2>
<p class="sublead">${c.t(tm.lead)}</p>
<a class="textlink" href="${attr(b.aboutUrl)}" rel="noopener" target="_blank">${c.t(tm.link)}</a>
</div>
<figure class="team__fig split__main">
<img class="team__photo" src="/assets/founders-1600.jpg" srcset="/assets/founders-800.jpg 800w, /assets/founders-1600.jpg 1600w" sizes="(max-width: 1000px) calc(100vw - 40px), 700px" width="1600" height="1067" alt="${attr(c.tp(tm.alt))}" loading="lazy" decoding="async">
<figcaption class="team__names">
${people}
</figcaption>
</figure>
</div>
</section>

<section class="hrv" aria-labelledby="hrv" data-rv-home hidden>
<div class="wrap">
<div class="hrv__head">
<h2 class="h2" id="hrv">${c.t(hr.title)}</h2>
<p class="rvsum" data-rv-summary hidden></p>
</div>
<ol class="rvlist rvlist--grid" data-rv-list></ol>
<div class="hrv__links"><a class="btn btn--outline" href="${c.href('reviews')}">${c.t(hr.all)}</a><a class="textlink" href="${c.href('reviews', '#write')}">${c.t(hr.write)}</a></div>
</div>
</section>

<section class="start" aria-labelledby="start">
<div class="wrap">
<h2 class="h2 h2--xl" id="start">${c.t(h.startTitle)}</h2>
<form class="ask" action="${c.href('request')}" method="get" role="search">
<label class="sr-only" for="ask">${c.t(h.startLabel)}</label>
<input class="ask__input" id="ask" name="d" type="text" maxlength="300" autocomplete="off" placeholder="${attr(c.tp(h.startPlaceholder))}">
<button class="btn btn--primary btn--lg" type="submit">${esc(c.s.common.cta)}</button>
</form>
<p class="start__hours">${c.t(h.hours)}</p>
</div>
</section>
</main>`;
  return { title: h.title, description: h.description, main, head: reviewsHead(c) };
}

/* --------------------------------------------------------------- Reviews */
export function reviews(c) {
  const r = c.s.reviews;
  const err = (id, text) => `<p class="err" id="${id}" hidden>${icon.alert}<span>${esc(text)}</span></p>`;
  const stars = r.stars.map((label, i) => `<input type="radio" id="rv-r${i + 1}" name="rating" value="${i + 1}"><label for="rv-r${i + 1}">${STAR}<span class="sr-only">${esc(label)}</span></label>`).join('');
  const svcOpts = c.site.categories.map((g) => `<option value="${g}">${esc(c.s.services.cats[g].short)}</option>`).join('');

  const main = `<main id="main" class="reviews">
<div class="wrap">
<h1 class="h1">${c.t(r.h1)}</h1>
<p class="lead">${c.t(r.lead)}</p>
<div class="rv__top"><p class="rvsum" data-rv-summary hidden></p><a class="btn btn--primary btn--md" href="#write">${esc(r.writeCta)}</a></div>
<div class="rv__grid">
<section class="rv__main" aria-labelledby="rv-list-h">
<h2 class="sr-only" id="rv-list-h">${c.t(r.listLabel)}</h2>
<p class="rv__status" data-rv-status role="status">${esc(r.loading)}</p>
<ol class="rvlist" data-rv-list></ol>
<button type="button" class="btn btn--soft btn--md rv__more" data-rv-more hidden>${esc(r.more)}</button>
</section>
<section class="rv__write" id="write" aria-labelledby="write-h">
<div data-rv-form>
<h2 class="card__h" id="write-h">${c.t(r.formTitle)}</h2>
<p class="card__sub">${c.t(r.formLead)}</p>
<form class="form" id="rvform" novalidate aria-labelledby="write-h">
<fieldset class="rate" aria-describedby="err-rating"><legend>${c.t(r.ratingLabel)}</legend>
<div class="rate__stars" data-rate>${stars}</div>
${err('err-rating', r.errRating)}
</fieldset>
<div class="field"><label for="rv-body">${c.t(r.bodyLabel)}</label><textarea class="input" id="rv-body" name="body" rows="5" maxlength="1500" placeholder="${attr(c.tp(r.bodyPlaceholder))}" aria-describedby="err-body"></textarea>${err('err-body', r.errBody)}</div>
<div class="field"><label for="rv-name">${c.t(r.nameLabel)}</label><input class="input" id="rv-name" name="name" type="text" maxlength="40" autocomplete="given-name" placeholder="${attr(c.tp(r.namePlaceholder))}" aria-describedby="err-name">${err('err-name', r.errName)}</div>
<div class="field"><label for="rv-country">${c.t(r.countryLabel)}</label><input class="input" id="rv-country" name="country" type="text" maxlength="40" autocomplete="country-name" placeholder="${attr(c.tp(r.countryPlaceholder))}"></div>
<div class="field"><label for="rv-service">${c.t(r.serviceLabel)}</label><select class="input" id="rv-service" name="service"><option value="">${esc(r.serviceNone)}</option>${svcOpts}</select></div>
<div class="field"><label for="rv-order">${c.t(r.orderLabel)}</label><input class="input" id="rv-order" name="order" type="text" maxlength="40" autocomplete="off" aria-describedby="rv-order-note"><p class="field__note" id="rv-order-note">${c.t(r.orderNote)}</p></div>
<div class="hp" aria-hidden="true"><label for="rv-website">Website</label><input id="rv-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="form__foot">
<label class="consent"><input type="checkbox" id="rv-consent" name="consent" aria-describedby="err-consent"><span>${c.t(r.consent, { privacy: `<a href="${c.href('privacy')}" target="_blank">${esc(r.consentLink)}</a>` })}</span></label>
${err('err-consent', r.errConsent)}
<div class="sendfail" id="rv-fail" role="alert" hidden><span data-msg></span></div>
<div class="form__send"><button class="btn btn--primary btn--lg" type="submit" id="rv-submit">${esc(r.submit)}</button></div>
</div>
</form>
</div>
<div class="rv__thanks" data-rv-thanks hidden>
<h2 class="card__h" tabindex="-1">${c.t(r.thanksTitle)}</h2>
<p class="card__sub">${c.t(r.thanksText)}</p>
</div>
</section>
</div>
</div>
</main>`;
  return { title: r.title, description: r.description, main, head: reviewsHead(c) };
}

/* -------------------------------------------------------------- Services */
export function services(c) {
  const sv = c.s.services;
  const cat = c.s.catalog;
  const all = c.site.services;
  const k = c.site.contact;
  const listPrice = (s) => (s.lead === 'quote' ? esc(c.s.common.money.quote) : esc(c.won(s.won)));
  const chips = [`<button type="button" class="chip" data-cat="all" aria-pressed="true">${esc(sv.all)}<span class="chip__n">${all.length}</span></button>`]
    .concat(c.site.categories.map((g) => `<button type="button" class="chip" data-cat="${g}" aria-pressed="false">${esc(sv.cats[g].short)}<span class="chip__n">${all.filter((s) => s.cat === g).length}</span></button>`)).join('');
  const groups = c.site.categories.map((g) => {
    const items = all.filter((s) => s.cat === g).map((s) => `<li><a class="svcrow" href="#${s.id}" data-id="${s.id}"><span class="svcrow__name">${c.t(cat[s.id].name)}</span><span class="svcrow__price">${listPrice(s)}</span>${icon.chevRight(18)}</a></li>`).join('');
    return `<div class="group" data-cat="${g}"><h2 class="group__title" id="cat-${g}">${c.t(sv.cats[g].name)}</h2><ul class="group__items">${items}</ul></div>`;
  }).join('\n');

  const detail = all.map((s) => {
    const d = cat[s.id];
    const name = c.tp(d.name);
    const price = esc(c.won(s.won));
    const usd = s.won2 ? c.t(c.s.common.money.usd2, { a: String(c.usd(s.won)), b: String(c.usd(s.won2)) }) : c.t(c.s.common.money.usd, { usd: String(c.usd(s.won)) });
    const ask = `https://wa.me/${k.whatsapp}?text=${encodeURIComponent(c.tp(sv.askMessage, { service: name }))}`;
    const li = (arr, ic) => arr.map((x) => `<li>${ic}<span>${c.t(x)}</span></li>`).join('');
    const addons = d.addons.length ? `<div class="addons"><h3 class="svc__h">${esc(sv.addons)}</h3><ul class="addons__list">${d.addons.map((a) => `<li><span>${c.t(a.label)}</span><span class="addons__price">${c.t(a.price)}</span></li>`).join('')}</ul></div>` : '';
    const notes = d.notes.length ? `<div class="note">${icon.info}<div><h3 class="note__h">${esc(sv.goodToKnow)}</h3><ul class="note__list">${d.notes.map((x) => `<li>${c.t(x)}</li>`).join('')}</ul></div></div>` : '';
    return `<article class="svc" id="${s.id}" data-cat="${s.cat}" aria-labelledby="${s.id}-t">
<a class="svc__back" href="#list">${icon.arrowLeft}${esc(sv.backToList)}</a>
<div><p class="svc__cat">${c.t(sv.cats[s.cat].name)}</p><h2 class="svc__name" id="${s.id}-t" tabindex="-1">${c.t(d.name)}</h2><p class="svc__blurb">${c.t(d.blurb)}</p></div>
<div class="pricebox"><div class="pricebox__main"><p class="pricebox__lead">${esc(sv.leads[s.lead])}</p><p class="pricebox__line"><span class="pricebox__price">${price}</span><span class="pricebox__unit">${c.t(d.unit)}</span></p><p class="pricebox__usd">${usd}</p></div>
<div class="pricebox__ctas"><a class="btn btn--primary btn--md" href="${c.href('request', '?service=' + s.id)}">${esc(sv.request)}</a><a class="btn btn--white btn--md" href="${attr(ask)}" rel="noopener" target="_blank">${esc(sv.ask)}</a></div></div>
<div class="svc__cols"><div><h3 class="svc__h">${esc(sv.included)}</h3><ul class="ticks">${li(d.included, icon.tick)}</ul></div><div><h3 class="svc__h">${esc(sv.need)}</h3><ul class="dots">${li(d.need, icon.dot)}</ul></div></div>
${addons}${notes}
<div class="refundnote">${icon.shield}<div><h3 class="note__h">${esc(sv.ifNot)}</h3><p>${c.t(sv.refunds[s.refund])} ${c.t(sv.refundTail)}</p><a class="textlink" href="${c.href('prices', '#refunds')}">${esc(sv.refundLink)}</a></div></div>
</article>`;
  }).join('\n');

  const main = `<main id="main">
<section class="pagehead">
<div class="wrap">
<h1 class="h1">${c.t(sv.h1)}</h1>
<p class="lead">${c.t(sv.lead)}</p>
<div class="chips" role="group" aria-label="${attr(sv.filterLabel)}">${chips}</div>
</div>
</section>
<section class="catalog" aria-label="${attr(sv.listLabel)}">
<div class="wrap catalog__grid" data-catalog>
<div class="catalog__list" id="list">
${groups}
</div>
<div class="catalog__detail" id="detail">
${detail}
</div>
</div>
</section>
</main>`;
  return { title: sv.title, description: sv.description, main };
}

/* ---------------------------------------------------------------- Prices */
export function prices(c) {
  const p = c.s.prices;
  const eq = p.eq.map((e, i) => {
    const op = i < 3 ? `<span class="op" aria-hidden="true">${i < 2 ? '+' : '='}</span>` : '';
    return `<div class="eq${i === 3 ? ' eq--total' : ''}"><p class="eq__t">${c.t(e.title)}</p><p class="eq__d">${c.t(e.text)}</p></div>${op}`;
  }).join('');
  const amounts = [95000, 8000, 14000, 630];
  const total = amounts.reduce((a, b) => a + b, 0);
  const lines = p.lines.map((l, i) => `<li><span>${c.t(l)}</span><span class="receipt__dots" aria-hidden="true"></span><b>${esc(c.won(amounts[i]))}</b></li>`).join('');
  const timing = ['+30%', '+10%', '+20%', '+35%', '+60%', '+20%'];
  const dist = [null, 16000, 31000, 54000, 16000, 39000];
  const kvT = p.timing.map((l, i) => `<li><span>${c.t(l)}</span><b>${timing[i]}</b></li>`).join('');
  const kvD = p.distance.map((l, i) => `<li><span>${c.t(l)}</span><b>${dist[i] === null ? esc(p.included) : '+' + esc(c.won(dist[i]))}</b></li>`).join('');
  const widths = [100, 65, 50];
  const refunds = p.refunds.map((r, i) => `<li><div class="refunds__copy"><p class="refunds__t">${c.t(r.title)}</p><p class="refunds__d">${c.t(r.text)}</p></div><div class="refunds__meter"><span class="bar" aria-hidden="true"><span style="width:${widths[i]}%"></span></span><span class="refunds__label">${c.t(r.bar)}</span></div></li>`).join('');

  const main = `<main id="main">
<section class="prices-top">
<div class="wrap">
<h1 class="h1">${c.t(p.h1)}</h1>
<p class="lead">${c.t(p.lead)}</p>
<div class="equation" role="group" aria-label="${attr(p.equationLabel)}">${eq}</div>
</div>
</section>

<section class="example" aria-labelledby="example">
<div class="wrap example__grid">
<div class="example__copy">
<h2 class="h2 h2--sm" id="example">${c.t(p.exampleTitle)}</h2>
<p class="sublead">${c.t(p.exampleLead)}</p>
<p class="example__note">${c.t(p.exampleNote)}</p>
</div>
<div class="receipt">
<div class="receipt__head"><span class="receipt__title">${c.t(p.quoteTitle)}</span><span class="receipt__tag">${c.t(p.quoteTag)}</span></div>
<ul class="receipt__lines">${lines}</ul>
<div class="receipt__total"><span>${c.t(p.total)}</span><span class="receipt__sum"><span class="receipt__usd">${c.t(c.s.common.money.usd, { usd: String(c.usd(total)) })}</span><span class="receipt__amount">${esc(c.won(total))}</span></span></div>
<p class="receipt__foot">${c.t(p.paidNote)}</p>
</div>
</div>
</section>

<section class="extras" aria-labelledby="extras">
<div class="wrap">
<h2 class="h2 h2--sm" id="extras">${c.t(p.extrasTitle)}</h2>
<p class="extras__lead">${c.t(p.extrasLead)}</p>
<div class="extras__grid">
<div><h3 class="table-h">${c.t(p.timingTitle)}</h3><ul class="kv">${kvT}</ul></div>
<div><h3 class="table-h">${c.t(p.distanceTitle)}</h3><ul class="kv">${kvD}</ul><p class="kv__note">${c.t(p.outside)}</p></div>
</div>
</div>
</section>

<section class="refunds" aria-labelledby="refunds">
<div class="wrap">
<h2 class="h2 h2--sm" id="refunds">${c.t(p.refundsTitle)}</h2>
<p class="extras__lead">${c.t(p.refundsLead)}</p>
<ul class="refunds__list">${refunds}</ul>
<p class="refunds__note">${c.t(p.refundsNote)}</p>
</div>
</section>

<section class="paying" aria-labelledby="paying">
<div class="wrap">
<div class="paying__box">
<div class="paying__copy"><h2 class="paying__h" id="paying">${c.t(p.payTitle)}</h2><p>${c.t(p.payText)}</p></div>
<a class="btn btn--primary btn--lg" href="${c.href('request')}">${c.t(p.payCta)}</a>
</div>
</div>
</section>
</main>`;
  return { title: p.title, description: p.description, main };
}

/* --------------------------------------------------------------- Request */
const DEFAULT_CHANNEL = { en: 'whatsapp', ja: 'line', 'zh-cn': 'wechat', 'zh-tw': 'line', vi: 'whatsapp', th: 'line' };
const CHANNEL_INPUT = {
  whatsapp: { type: 'tel', ac: 'tel', im: 'tel' },
  line: { type: 'text', ac: 'off', im: 'text' },
  wechat: { type: 'text', ac: 'off', im: 'text' },
  kakao: { type: 'text', ac: 'off', im: 'text' },
  email: { type: 'email', ac: 'email', im: 'email' },
};

export function request(c, en, langs) {
  const r = c.s.request;
  const site = c.site;
  const ch0 = DEFAULT_CHANNEL[c.code] || 'whatsapp';
  const chipFrom = (ch) => (ch.won === null ? c.tp(c.s.common.money.quoted) : c.won(ch.won));
  const chips = site.chips.map((ch) => `<label class="opt"><input type="radio" name="service" value="${ch.id}"><span>${esc(r.chips[ch.id])}</span></label>`).join('');
  const chans = site.channels.map((id) => `<label class="opt"><input type="radio" name="channel" value="${id}"${id === ch0 ? ' checked' : ''}><span>${esc(r.channels[id].name)}</span></label>`).join('');
  const c0 = r.channels[ch0];
  const in0 = CHANNEL_INPUT[ch0];
  const langOpts = langs.map((l) => `<option value="${l.code}"${l.code === c.code ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
  const err = (id, text = '') => `<p class="err" id="${id}" hidden>${icon.alert}<span>${text}</span></p>`;

  const cfg = {
    endpoint: `${site.supabase.url}/functions/v1/${site.supabase.function}`,
    key: site.supabase.anonKey,
    sitekey: site.turnstileSitekey,
    tsLang: c.lang.turnstile,
    page: c.href('request'),
    wa: site.contact.whatsapp,
    lang: c.code,
    langEn: Object.fromEntries(langs.map((l) => [l.code, { en: 'English', ja: 'Japanese', 'zh-cn': 'Chinese (Simplified)', 'zh-tw': 'Chinese (Traditional)', vi: 'Vietnamese', th: 'Thai' }[l.code]])),
    channels: Object.fromEntries(site.channels.map((id) => [id, { name: r.channels[id].name, label: r.channels[id].label, placeholder: r.channels[id].placeholder, ...CHANNEL_INPUT[id], en: en.request.channels[id].name }])),
    chips: Object.fromEntries(site.chips.map((ch) => [ch.id, { name: r.chips[ch.id], en: en.request.chips[ch.id], from: chipFrom(ch) }])),
    services: Object.fromEntries(site.services.map((s) => [s.id, { name: c.tp(c.s.catalog[s.id].name), en: en.catalog[s.id].name, chip: s.chip, from: s.lead === 'quote' ? c.tp(c.s.common.money.quoted) : c.won(s.won) }])),
    t: { errContact: r.errContact, errPhone: r.errPhone, errEmail: r.errEmail, errVerify: r.errVerify, errSend: r.errSend, sending: r.sending, submit: r.submit, sentText: r.sentText, notChosen: r.notChosen, sentTitle: r.sentTitle },
  };

  const main = `<main id="main" class="req">
<div class="wrap req__grid">
<div class="req__main">
<div data-req-form>
<h1 class="req__h1">${c.t(r.h1)}</h1>
<p class="req__lead">${c.t(r.lead)}</p>
<form class="form" id="reqform" novalidate aria-label="${attr(r.formLabel)}">
<fieldset class="fset"><legend><span class="fset__n" aria-hidden="true">1</span>${c.t(r.step1)}</legend>
<div class="opts" data-group="service">${chips}</div>
${err('err-service', esc(r.errService))}
</fieldset>
<fieldset class="fset"><legend><span class="fset__n" aria-hidden="true">2</span>${c.t(r.step2)}</legend>
<div class="fields">
<div class="field"><label for="details">${c.t(r.detailsLabel)}</label><textarea class="input" id="details" name="details" rows="4" maxlength="1500" placeholder="${attr(c.tp(r.detailsPlaceholder))}" aria-describedby="err-details"></textarea>${err('err-details', esc(r.errDetails))}</div>
<div class="fgrid">
<div class="field"><label for="when">${c.t(r.whenLabel)}</label><input class="input" id="when" name="when" type="text" maxlength="120" placeholder="${attr(c.tp(r.whenPlaceholder))}"></div>
<div class="field"><label for="where">${c.t(r.whereLabel)}</label><input class="input" id="where" name="where" type="text" maxlength="160" placeholder="${attr(c.tp(r.wherePlaceholder))}"></div>
</div>
</div>
</fieldset>
<fieldset class="fset"><legend><span class="fset__n" aria-hidden="true">3</span>${c.t(r.step3)}</legend>
<div class="opts" data-group="channel" role="radiogroup" aria-label="${attr(r.channelLabel)}">${chans}</div>
<div class="fields">
<div class="fgrid">
<div class="field"><label for="name">${c.t(r.nameLabel)}</label><input class="input" id="name" name="name" type="text" maxlength="60" autocomplete="name" placeholder="${attr(c.tp(r.namePlaceholder))}" aria-describedby="err-name">${err('err-name', esc(r.errName))}</div>
<div class="field"><label for="contact" id="contact-label">${esc(c0.label)}</label><input class="input" id="contact" name="contact" type="${in0.type}" inputmode="${in0.im}" autocomplete="${in0.ac}" maxlength="120" placeholder="${attr(c0.placeholder)}" aria-describedby="err-contact">${err('err-contact')}</div>
</div>
<div class="fgrid fgrid--fill"><div class="field"><label for="replylang">${c.t(r.replyIn)}</label><select class="input" id="replylang" name="replylang">${langOpts}</select></div></div>
</div>
</fieldset>
<div class="form__foot">
<label class="consent"><input type="checkbox" id="consent" name="consent" aria-describedby="err-consent"><span>${c.t(r.consent, { privacy: `<a href="${c.href('privacy')}" target="_blank">${esc(r.consentLink)}</a>` })}</span></label>
${err('err-consent', esc(r.errConsent))}
<div class="ts" id="ts"></div>
<div class="sendfail" id="sendfail" role="alert" hidden><span data-msg></span><br><a href="https://wa.me/${site.contact.whatsapp}" data-wa rel="noopener" target="_blank">${esc(r.sendWhatsApp)}</a></div>
<div class="form__send"><button class="btn btn--primary btn--lg" type="submit" id="submit">${esc(r.submit)}</button><span>${c.t(r.note)}</span></div>
</div>
</form>
</div>
<div class="sent" data-req-sent hidden>
<img class="stamp" src="/assets/stamp.svg" width="120" height="120" alt="">
<h1 class="req__h1" tabindex="-1">${c.t(r.sentTitle)}</h1>
<p data-sent-text></p>
<div class="sent__ctas"><a class="btn btn--dark btn--md" href="${c.href('home')}">${esc(r.backHome)}</a><a class="btn btn--soft btn--md" href="${c.href('services')}">${esc(r.browse)}</a></div>
</div>
</div>
<aside class="req__aside" aria-label="${attr(r.summaryTitle)}">
<div class="summary">
<h2 class="summary__h">${c.t(r.summaryTitle)}</h2>
<dl>
<div><dt>${c.t(r.summaryService)}</dt><dd data-sum="service">${esc(r.notChosen)}</dd></div>
<div><dt>${c.t(r.summaryFrom)}</dt><dd data-sum="from">—</dd></div>
<div><dt>${c.t(r.summaryReply)}</dt><dd data-sum="channel">${esc(c0.name)}</dd></div>
</dl>
<p class="summary__note">${c.t(r.summaryNote)}</p>
</div>
<div class="chat">
<h2 class="chat__h">${c.t(r.chatTitle)}</h2>
<p>${c.t(r.chatText)}</p>
<div class="channels">${chatLinks(c)}</div>
</div>
</aside>
</div>
</main>`;
  const head = `<script type="application/json" id="req-config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
<link rel="preconnect" href="https://challenges.cloudflare.com">
<link rel="preconnect" href="${site.supabase.url}" crossorigin>
`;
  return { title: r.title, description: r.description, main, head };
}

/* ------------------------------------------------------------------ Help */
export function help(c) {
  const h = c.s.help;
  const k = c.site.contact;
  const links = { 5: c.href('prices', '#refunds'), 6: c.href('privacy') };
  const faq = h.faq.map((q, i) => `<details class="qa" name="faq"${i === 0 ? ' open' : ''}><summary><span>${c.t(q.q)}</span>${icon.chevDown}</summary><div class="qa__a"><p>${c.t(q.a)}</p>${q.link ? `<a class="textlink" href="${links[i]}">${esc(q.link)}</a>` : ''}</div></details>`).join('\n');
  const tk = h.talk;
  const main = `<main id="main" class="helppage">
<div class="wrap">
<h1 class="h1">${c.t(h.h1)}</h1>
<p class="lead">${c.t(h.lead)}</p>
<div class="help__grid">
<section class="faq" aria-labelledby="faq-h">
<h2 class="eyebrow" id="faq-h">${c.t(h.faqTitle)}</h2>
<div class="faq__list">
${faq}
</div>
</section>
<div class="help__aside">
<section class="card-mist" id="talk" aria-labelledby="talk-h">
<h2 class="card__h" id="talk-h">${c.t(h.talkTitle)}</h2>
<p class="card__sub">${c.t(h.talkHours)}</p>
<dl class="talk">
<div><dt>${esc(tk.whatsapp)}</dt><dd><a class="nowrap" href="https://wa.me/${k.whatsapp}" rel="noopener" target="_blank">${esc(k.whatsappDisplay)}</a></dd></div>
<div><dt>${esc(tk.line)}</dt><dd><a href="${attr(k.lineUrl)}" rel="noopener" target="_blank">${esc(k.lineId)}</a></dd></div>
<div><dt>${esc(tk.kakao)}</dt><dd><a href="${attr(k.kakaoUrl)}" rel="noopener" target="_blank">${esc(tk.kakaoValue)}</a></dd></div>
<div><dt>${esc(tk.email)}</dt><dd><a href="mailto:${attr(k.email)}">${esc(k.email)}</a></dd></div>
<div><dt>${esc(tk.phone)}</dt><dd><a class="nowrap" href="tel:${attr(k.phone)}">${esc(k.phoneDisplay)}</a></dd></div>
<div class="talk__wechat"><dt>${esc(tk.wechat)}</dt><dd><a href="${attr(k.wechatUrl)}" rel="noopener" target="_blank"><img src="/assets/wechat-qr.png" width="112" height="112" alt="${attr(tk.wechatAlt)}" loading="lazy"></a><span>${esc(tk.wechatNote)}</span></dd></div>
</dl>
</section>
<section class="card-line" id="dont" aria-labelledby="dont-h">
<h2 class="card__h" id="dont-h">${c.t(h.dontTitle)}</h2>
<p class="card__sub">${c.t(h.dontLead)}</p>
<ul class="xlist">${h.dont.map((x) => `<li>${icon.x}<span>${c.t(x)}</span></li>`).join('')}</ul>
</section>
<div class="policylinks" role="group" aria-label="${attr(h.policiesLabel)}"><a class="ulink" href="${c.href('terms')}">${esc(h.terms)}</a><a class="ulink" href="${c.href('privacy')}">${esc(h.privacy)}</a><a class="ulink" href="${c.href('prices', '#refunds')}">${esc(h.refunds)}</a></div>
</div>
</div>
</div>
</main>`;
  return { title: h.title, description: h.description, main };
}

/* ----------------------------------------------------------------- Legal */
export function legal(c, which) {
  const d = c.s[which];
  const L = c.s.legal;
  const b = c.site.business;
  const k = c.site.contact;
  const vars = {
    company: esc(b.company), address: esc(b.address), brn: esc(b.brn), ecl: esc(b.ecl), officer: esc(b.privacyOfficer),
    email: `<a href="mailto:${attr(k.email)}">${esc(k.email)}</a>`, phone: `<a class="nowrap" href="tel:${attr(k.phone)}">${esc(k.phoneDisplay)}</a>`,
    privacy: `<a href="${c.href('privacy')}">${esc(c.s.common.footer.privacy)}</a>`,
  };
  const sec = d.sections.map((s) => {
    const ps = (arr) => (arr || []).map((p) => `<p>${c.t(p, vars)}</p>`).join('');
    const list = s.list ? `<ul>${s.list.map((x) => `<li>${c.t(x, vars)}</li>`).join('')}</ul>` : '';
    const table = s.table ? `<div class="doc__table"><table><thead><tr>${s.table.head.map((x) => `<th scope="col">${c.t(x)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((x) => `<td>${c.t(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    return `<section class="doc__sec"><h2>${c.t(s.h)}</h2>${ps(s.p)}${list}${table}${ps(s.after)}</section>`;
  }).join('\n');
  const main = `<main id="main" class="doc">
<div class="wrap"><div class="doc__wrap">
<p class="doc__meta">${c.t(L.updated, { date: esc(L.date) })}</p>
<h1 class="h1">${c.t(d.h1)}</h1>
<p class="lead">${c.t(d.intro, vars)}</p>
${c.code !== 'en' ? `<p class="doc__note">${c.t(L.translationNote)}</p>` : ''}
<div class="doc__body">
${sec}
</div>
</div></div>
</main>`;
  return { title: d.title, description: d.description, main };
}

/* ------------------------------------------------------------ Payment */
// Customers arrive from a link we send them (/pay/?o=CODE). The order and its
// amount come from the server; nothing on this page sets the price.
const PAY_CHAT = { en: 'whatsapp', vi: 'whatsapp', ja: 'line', 'zh-tw': 'line', th: 'line', 'zh-cn': 'wechat' };

export function pay(c) {
  const p = c.s.pay;
  const site = c.site;
  const k = site.contact;
  const chat = PAY_CHAT[c.code] || 'whatsapp';
  const chatUrl = { whatsapp: `https://wa.me/${k.whatsapp}`, line: k.lineUrl, wechat: k.wechatUrl }[chat];
  const err = (id, text) => `<p class="err" id="${id}" hidden>${icon.alert}<span>${esc(text)}</span></p>`;
  const cfg = {
    endpoint: `${site.supabase.url}/functions/v1/${site.payment.function}`,
    key: site.supabase.anonKey,
    storeId: site.payment.storeId,
    channels: site.payment.channels,
    lang: c.code,
    t: Object.fromEntries(['loading', 'payButton', 'opening', 'checking', 'paidText', 'failTitle', 'failText', 'errName', 'errEmail', 'errPhone', 'errConsent', 'invalidTitle', 'invalidText', 'expiredTitle', 'expiredText', 'cancelledTitle', 'cancelledText', 'loadError'].map((key) => [key, p[key]])),
  };
  const chatBtn = `<a class="btn btn--soft btn--md" href="${attr(chatUrl)}" rel="noopener" target="_blank">${esc(p.contactUs)}</a>`;
  const homeBtn = `<a class="btn btn--dark btn--md" href="${c.href('home')}">${esc(p.backHome)}</a>`;

  const main = `<main id="main" class="req pay">
<div class="wrap pay__wrap">
<div data-pay="loading"><p class="pay__loading" role="status" data-loading-text>${esc(p.loading)}</p></div>
<div data-pay="form" hidden>
<h1 class="req__h1">${c.t(p.h1)}</h1>
<p class="req__lead">${c.t(p.lead)}</p>
<p class="pay__test" data-pay-test hidden>${esc(p.testNote)}</p>
<div class="summary pay__summary">
<h2 class="summary__h">${c.t(p.summaryTitle)}</h2>
<dl>
<div><dt>${c.t(p.item)}</dt><dd data-o="title"></dd></div>
<div><dt>${c.t(p.ref)}</dt><dd data-o="code"></dd></div>
<div class="pay__total"><dt>${c.t(p.amount)}</dt><dd data-o="amount"></dd></div>
</dl>
</div>
<form class="form" id="payform" novalidate aria-label="${attr(p.h1)}">
<fieldset class="fset"><legend>${c.t(p.detailsTitle)}</legend>
<p class="pay__note">${c.t(p.detailsNote)}</p>
<div class="fields">
<div class="field"><label for="pname">${c.t(p.nameLabel)}</label><input class="input" id="pname" name="name" type="text" maxlength="60" autocomplete="name" aria-describedby="err-pname">${err('err-pname', p.errName)}</div>
<div class="fgrid">
<div class="field"><label for="pemail">${c.t(p.emailLabel)}</label><input class="input" id="pemail" name="email" type="email" maxlength="120" autocomplete="email" inputmode="email" aria-describedby="err-pemail">${err('err-pemail', p.errEmail)}</div>
<div class="field"><label for="pphone">${c.t(p.phoneLabel)}</label><input class="input" id="pphone" name="phone" type="tel" maxlength="30" autocomplete="tel" inputmode="tel" placeholder="${attr(p.phonePlaceholder)}" aria-describedby="err-pphone">${err('err-pphone', p.errPhone)}</div>
</div>
</div>
</fieldset>
<div class="form__foot">
<label class="consent"><input type="checkbox" id="pconsent" name="consent" aria-describedby="err-pconsent"><span>${c.t(p.consent, { terms: `<a href="${c.href('terms')}" target="_blank">${esc(p.termsLink)}</a>`, refunds: `<a href="${c.href('prices', '#refunds')}" target="_blank">${esc(p.refundsLink)}</a>` })}</span></label>
${err('err-pconsent', p.errConsent)}
<div class="sendfail" id="payfail" role="alert" hidden><strong data-fail-title></strong><br><span data-fail-text></span><br><a href="${attr(chatUrl)}" rel="noopener" target="_blank">${esc(p.contactUs)}</a></div>
<div class="form__send"><button class="btn btn--primary btn--lg" type="submit" id="paybtn">${esc(p.h1)}</button></div>
<p class="pay__secure">${icon.shield}<span>${c.t(p.secure)}</span></p>
</div>
</form>
</div>
<div class="sent" data-pay="paid" hidden>
<img class="stamp" src="/assets/stamp.svg" width="120" height="120" alt="">
<h1 class="req__h1" tabindex="-1">${c.t(p.paidTitle)}</h1>
<p data-paid-text></p>
<div class="sent__ctas">${homeBtn}</div>
</div>
<div class="sent" data-pay="closed" hidden>
<h1 class="req__h1" tabindex="-1" data-closed-title></h1>
<p data-closed-text></p>
<div class="sent__ctas">${chatBtn}${homeBtn}</div>
</div>
</div>
</main>`;
  const head = `<script type="application/json" id="pay-config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
<link rel="preconnect" href="${site.supabase.url}" crossorigin>
<link rel="preconnect" href="https://cdn.portone.io">
`;
  return { title: p.title, description: p.description, main, head };
}

/* -------------------------------------------------------------- 404 page */
export function notFound(c, langs) {
  const n = c.s.notFound;
  const main = `<main id="main" class="nf">
<div class="wrap">
<h1 class="h1">${c.t(n.h1)}</h1>
<p class="lead">${c.t(n.lead)}</p>
<div class="nf__ctas"><a class="btn btn--primary btn--lg" href="/">${esc(n.home)}</a><a class="btn btn--soft btn--lg" href="/services/">${esc(n.services)}</a></div>
<nav class="nf__langs" aria-label="Languages">${langs.map((l) => `<a class="ulink" href="/${l.path ? l.path + '/' : ''}" lang="${l.htmlLang}">${esc(l.name)}</a>`).join('')}</nav>
</div>
</main>`;
  return { title: n.title, description: n.lead, main };
}
