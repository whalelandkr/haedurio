/* Haedurio site script: header, language picker, services browser and the request form. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduced = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = function (kind) {
    return {
      get: function (k) { try { return w[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { w[kind].setItem(k, v); } catch (e) { /* storage blocked */ } },
      del: function (k) { try { w[kind].removeItem(k); } catch (e) { /* storage blocked */ } }
    };
  };
  var local = store('localStorage');
  var session = store('sessionStorage');

  /* Links from the old single-page site */
  if (location.pathname === '/' && location.hash) {
    var old = { '#services': '/services/', '#faq': '/help/', '#contact': '/help/#talk', '#reviews': '/' };
    if (old[location.hash]) { location.replace(old[location.hash]); return; }
  }

  /* Anonymous visit statistics: page views and taps on contact links.
     No cookies. A random code in sessionStorage groups the views of one browser tab,
     and the first source of that tab (utm_source or the referring site) is kept with each event. */
  var stats = (function () {
    var off = function () {};
    var cfg = null;
    try { cfg = JSON.parse($('#hd-stats').textContent); } catch (e) { return off; }
    if (!cfg || !w.fetch || local.get('hd-no-stats') === '1') return off;
    var ua = navigator.userAgent || '';
    if (/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(ua)) return off;
    var sid = session.get('hd-sid');
    if (!sid) {
      sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
      session.set('hd-sid', sid);
    }
    var src = null;
    try { src = JSON.parse(session.get('hd-src') || 'null'); } catch (e) { src = null; }
    if (!src) {
      var q = {};
      location.search.replace(/^\?/, '').split('&').forEach(function (p) {
        var i = p.indexOf('=');
        if (i > 0) { try { q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { /* bad escape */ } }
      });
      var host = '';
      try { host = d.referrer ? new URL(d.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) { host = ''; }
      if (host === location.hostname.replace(/^www\./, '')) host = '';
      src = { s: q.utm_source || host, m: q.utm_medium || '', c: q.utm_campaign || '' };
      session.set('hd-src', JSON.stringify(src));
    }
    var device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile' : 'desktop';
    var cut = function (v, n) { return v ? String(v).slice(0, n) : null; };
    return function (type, target) {
      try {
        w.fetch(cfg.url + '/rest/v1/' + cfg.table, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, Prefer: 'return=minimal' },
          body: JSON.stringify({
            type: type, path: cut(location.pathname, 200) || '/', lang: cfg.lang,
            source: cut(src.s, 100), medium: cut(src.m, 60), campaign: cut(src.c, 80),
            target: cut(target, 40), device: device, sid: sid
          })
        }).catch(function () { /* statistics are best-effort */ });
      } catch (e) { /* ignore */ }
    };
  })();
  stats('view');
  var TAP = [
    [/wa\.me|whatsapp\.com/, 'whatsapp'], [/line\.me/, 'line'], [/kakao\.com/, 'kakao'], [/wechat\.com|weixin/, 'wechat'],
    [/^mailto:/, 'email'], [/^tel:/, 'phone'], [/instagram\.com/, 'instagram'], [/facebook\.com/, 'facebook'],
    [/\/\/(www\.)?(x|twitter)\.com/, 'x'], [/threads\.(com|net)/, 'threads'], [/\/request\/(\?|$)/, 'request']
  ];
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    for (var i = 0; i < TAP.length; i++) { if (TAP[i][0].test(h)) { stats('click', TAP[i][1]); return; } }
  }, true);

  /* Header shadow once the page scrolls */
  var hdr = $('[data-hdr]');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-scrolled', w.scrollY > 4); };
    w.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Phone menu */
  var mbtn = $('.hdr__menu');
  var menu = $('#sitemenu');
  if (mbtn && menu) {
    var setMenu = function (open) { mbtn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; };
    mbtn.addEventListener('click', function () { setMenu(mbtn.getAttribute('aria-expanded') !== 'true'); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); mbtn.focus(); }
    });
    var wide = w.matchMedia('(min-width: 761px)');
    var onWide = function () { if (wide.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }

  /* Language picker */
  $$('[data-lang-menu]').forEach(function (det) {
    d.addEventListener('click', function (e) { if (det.open && !det.contains(e.target)) det.open = false; });
    det.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && det.open) { det.open = false; $('summary', det).focus(); }
    });
    $$('a[data-lang]', det).forEach(function (a) {
      a.addEventListener('click', function () { local.set('hd-lang', a.getAttribute('data-lang')); });
    });
  });

  /* On English pages, offer the visitor's own language */
  var sg = $('#hd-suggest');
  if (sg && !local.get('hd-suggest-off')) {
    var pick = local.get('hd-lang');
    if (!pick) {
      var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
      if (/^ja/.test(nav)) pick = 'ja';
      else if (/^zh-(tw|hk|mo|hant)/.test(nav)) pick = 'zh-tw';
      else if (/^zh/.test(nav)) pick = 'zh-cn';
      else if (/^vi/.test(nav)) pick = 'vi';
      else if (/^th/.test(nav)) pick = 'th';
    }
    var item = null;
    try { item = JSON.parse(sg.textContent).filter(function (x) { return x.code === pick; })[0]; } catch (e) { item = null; }
    if (item) {
      var bar = d.createElement('div');
      bar.className = 'suggest';
      bar.setAttribute('lang', item.code === 'zh-cn' ? 'zh-CN' : item.code === 'zh-tw' ? 'zh-TW' : item.code);
      bar.innerHTML = '<div class="wrap"><span class="suggest__text"></span><a></a><button type="button"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
      $('.suggest__text', bar).textContent = item.text;
      var a = $('a', bar);
      a.textContent = item.cta;
      a.href = item.url + location.hash;
      a.addEventListener('click', function () { local.set('hd-lang', item.code); });
      var x = $('button', bar);
      x.setAttribute('aria-label', item.close);
      x.addEventListener('click', function () { local.set('hd-suggest-off', '1'); bar.remove(); });
      var skip = $('.skip');
      (skip ? skip.parentNode : d.body).insertBefore(bar, skip ? skip.nextSibling : d.body.firstChild);
    }
  }

  /* Services: list on one side, details on the other */
  var cat = $('[data-catalog]');
  if (cat) {
    var rows = $$('.svcrow', cat);
    var arts = $$('.svc', cat);
    var groups = $$('.group', cat);
    var chips = $$('.chip');
    var detail = $('#detail');
    var byId = {};
    arts.forEach(function (a) { byId[a.id] = a; });
    var narrow = w.matchMedia('(max-width: 900px)');
    var current = null;

    var select = function (id, opts) {
      if (!byId[id]) return;
      opts = opts || {};
      current = id;
      arts.forEach(function (a) { a.classList.toggle('is-active', a.id === id); });
      rows.forEach(function (r) { r.setAttribute('aria-current', r.getAttribute('data-id') === id ? 'true' : 'false'); });
      if (opts.hash && history.replaceState) history.replaceState(null, '', '#' + id);
      if (opts.reveal && (narrow.matches || detail.getBoundingClientRect().top < 0)) {
        byId[id].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        var h = $('.svc__name', byId[id]);
        if (h) h.focus({ preventScroll: true });
      }
    };
    var filter = function (c, keep, hash) {
      chips.forEach(function (ch) { ch.setAttribute('aria-pressed', ch.getAttribute('data-cat') === c ? 'true' : 'false'); });
      groups.forEach(function (g) { g.hidden = !(c === 'all' || g.getAttribute('data-cat') === c); });
      var cur = byId[current];
      if (!keep || !cur || (c !== 'all' && cur.getAttribute('data-cat') !== c)) {
        var first = c === 'all' ? arts[0] : arts.filter(function (a) { return a.getAttribute('data-cat') === c; })[0];
        if (first) select(first.id, { hash: hash });
      }
    };
    rows.forEach(function (r) {
      r.addEventListener('click', function (e) {
        e.preventDefault();
        select(r.getAttribute('data-id'), { hash: true, reveal: true });
      });
    });
    chips.forEach(function (ch) {
      ch.addEventListener('click', function () { filter(ch.getAttribute('data-cat'), true, true); });
    });
    $$('.svc__back', cat).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var row = $('.svcrow[aria-current="true"]', cat);
        var target = row || $('#list');
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        if (row) row.focus({ preventScroll: true });
      });
    });
    var fromHash = function () {
      var h = decodeURIComponent(location.hash.slice(1));
      if (h.indexOf('cat-') === 0 && chips.some(function (ch) { return ch.getAttribute('data-cat') === h.slice(4); })) {
        current = null;
        filter(h.slice(4), false, false);
        return;
      }
      filter('all', true, false);
      if (byId[h]) select(h, { reveal: narrow.matches });
      else if (!current) select(arts[0].id);
    };
    fromHash();
    w.addEventListener('hashchange', fromHash);
  }

  /* Request form */
  var form = $('#reqform');
  if (form) initRequest(form);

  function initRequest(form) {
    var cfg = JSON.parse($('#req-config').textContent);
    var T = cfg.t;
    var el = {
      details: $('#details'), when: $('#when'), where: $('#where'), name: $('#name'),
      contact: $('#contact'), contactLabel: $('#contact-label'), replylang: $('#replylang'),
      consent: $('#consent'), submit: $('#submit'), fail: $('#sendfail')
    };
    var sum = { service: $('[data-sum="service"]'), from: $('[data-sum="from"]'), channel: $('[data-sum="channel"]') };
    var specific = null;
    var busy = false;
    var DRAFT = 'hd-request-draft';

    var radio = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; };
    var check = function (name, value) { var r = form.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (r) r.checked = true; };

    var updateSummary = function () {
      var chip = radio('service');
      if (specific) {
        sum.service.textContent = cfg.services[specific].name;
        sum.from.textContent = cfg.services[specific].from;
      } else if (chip) {
        sum.service.textContent = cfg.chips[chip].name;
        sum.from.textContent = cfg.chips[chip].from;
      } else {
        sum.service.textContent = T.notChosen;
        sum.from.textContent = '—';
      }
      sum.channel.textContent = cfg.channels[radio('channel')].name;
    };
    var updateChannel = function () {
      var ch = cfg.channels[radio('channel')];
      el.contactLabel.textContent = ch.label;
      el.contact.placeholder = ch.placeholder;
      el.contact.type = ch.type;
      el.contact.setAttribute('inputmode', ch.im);
      el.contact.setAttribute('autocomplete', ch.ac);
      clearErr('contact');
    };
    var errEl = function (k) { return $('#err-' + k); };
    var fieldOf = function (k) {
      return k === 'service' ? null : k === 'consent' ? el.consent : el[k];
    };
    var showErr = function (k, msg) {
      var p = errEl(k);
      if (msg) $('span', p).textContent = msg;
      p.hidden = false;
      var f = fieldOf(k);
      if (f) f.setAttribute('aria-invalid', 'true');
    };
    var clearErr = function (k) {
      var p = errEl(k);
      if (p) p.hidden = true;
      var f = fieldOf(k);
      if (f) f.removeAttribute('aria-invalid');
    };

    /* Save a draft so nothing is lost if the visitor leaves and comes back */
    var saveDraft = function () {
      session.set(DRAFT, JSON.stringify({
        service: radio('service'), specific: specific, channel: radio('channel'),
        details: el.details.value, when: el.when.value, where: el.where.value,
        name: el.name.value, contact: el.contact.value, replylang: el.replylang.value
      }));
    };
    var draft = null;
    try { draft = JSON.parse(session.get(DRAFT) || 'null'); } catch (e) { draft = null; }
    if (draft) {
      if (draft.service) check('service', draft.service);
      if (draft.specific && cfg.services[draft.specific]) specific = draft.specific;
      if (draft.channel) check('channel', draft.channel);
      ['details', 'when', 'where', 'name', 'contact'].forEach(function (k) { if (draft[k]) el[k].value = draft[k]; });
      if (draft.replylang) el.replylang.value = draft.replylang;
    }
    var params = new URLSearchParams(location.search);
    var sp = params.get('service');
    if (sp && cfg.services[sp]) { specific = sp; check('service', cfg.services[sp].chip); }
    var dp = params.get('d');
    if (dp && !el.details.value) el.details.value = dp.slice(0, 1500);
    updateChannel();
    updateSummary();

    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'service') {
        if (specific && cfg.services[specific].chip !== t.value) specific = null;
        clearErr('service');
        updateSummary();
      } else if (t.name === 'channel') {
        updateChannel();
        updateSummary();
      } else if (t === el.consent && el.consent.checked) {
        clearErr('consent');
      }
      saveDraft();
    });
    ['details', 'name', 'contact'].forEach(function (k) { el[k].addEventListener('input', function () { clearErr(k); }); });
    form.addEventListener('input', saveDraft);

    /* Spam check (Cloudflare Turnstile) */
    var ts = { token: '', id: null, state: 'loading', waiters: [] };
    var settle = function () { var ws = ts.waiters; ts.waiters = []; ws.forEach(function (f) { f(); }); };
    w.hdTurnstileReady = function () {
      try {
        ts.id = w.turnstile.render('#ts', {
          sitekey: cfg.sitekey,
          language: cfg.tsLang,
          appearance: 'interaction-only',
          size: 'flexible',
          action: 'request',
          callback: function (token) { ts.token = token; ts.state = 'ready'; settle(); },
          'expired-callback': function () { ts.token = ''; },
          'error-callback': function () { ts.state = 'error'; settle(); },
          'timeout-callback': function () { ts.token = ''; }
        });
      } catch (e) { ts.state = 'error'; settle(); }
    };
    var s = d.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=hdTurnstileReady';
    s.async = true;
    s.onerror = function () { ts.state = 'error'; settle(); };
    d.head.appendChild(s);
    var getToken = function (ms) {
      return new Promise(function (resolve) {
        if (ts.token) return resolve(ts.token);
        if (ts.state === 'error') return resolve('');
        var timer = setTimeout(function () { resolve(ts.token); }, ms);
        ts.waiters.push(function () { clearTimeout(timer); resolve(ts.token); });
      });
    };
    var resetTurnstile = function () {
      ts.token = '';
      try { if (w.turnstile && ts.id !== null) { ts.state = 'loading'; w.turnstile.reset(ts.id); } } catch (e) { /* ignore */ }
    };

    var validate = function () {
      var bad = null;
      var first = function (f) { if (!bad) bad = f; };
      if (!radio('service')) { showErr('service'); first(form.querySelector('input[name="service"]')); }
      if (!el.details.value.trim()) { showErr('details'); first(el.details); }
      if (!el.name.value.trim()) { showErr('name'); first(el.name); }
      var v = el.contact.value.trim();
      var ch = radio('channel');
      if (!v) { showErr('contact', T.errContact); first(el.contact); }
      else if (ch === 'whatsapp' && (!/^(\+|00)/.test(v) || v.replace(/\D/g, '').length < 8)) { showErr('contact', T.errPhone); first(el.contact); }
      else if (ch === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showErr('contact', T.errEmail); first(el.contact); }
      if (!el.consent.checked) { showErr('consent'); first(el.consent); }
      return bad;
    };
    var compose = function () {
      var chip = radio('service');
      var ch = radio('channel');
      var contact = el.contact.value.trim();
      var svc = specific ? cfg.services[specific].en + ' (' + cfg.chips[chip].en + ')' : cfg.chips[chip].en;
      var lines = [
        '[Service] ' + svc,
        el.when.value.trim() ? '[When] ' + el.when.value.trim() : '',
        el.where.value.trim() ? '[Where] ' + el.where.value.trim() : '',
        '[Reply on] ' + cfg.channels[ch].en + ': ' + contact,
        '[Reply in] ' + (cfg.langEn[el.replylang.value] || el.replylang.value),
        '[Details] ' + el.details.value.trim(),
        '[Page] ' + cfg.page
      ].filter(Boolean);
      return { name: el.name.value.trim(), contact: cfg.channels[ch].en + ': ' + contact, message: lines.join('\n') };
    };
    var setBusy = function (on) {
      busy = on;
      el.submit.disabled = on;
      el.submit.textContent = on ? T.sending : T.submit;
    };
    var showFail = function (msg, payload) {
      $('[data-msg]', el.fail).textContent = msg;
      var wa = $('[data-wa]', el.fail);
      if (payload) wa.href = 'https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(payload.message + '\n[Name] ' + payload.name);
      el.fail.hidden = false;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      el.fail.hidden = true;
      var bad = validate();
      if (bad) { bad.focus(); return; }
      var payload = compose();
      setBusy(true);
      getToken(12000).then(function (token) {
        if (!token) { setBusy(false); showFail(T.errVerify, payload); return null; }
        return fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key, apikey: cfg.key },
          body: JSON.stringify({ name: payload.name, contact: payload.contact, message: payload.message, is_secret: true, turnstileToken: token })
        }).then(function (res) {
          return res.text().then(function (txt) {
            var data = null;
            try { data = JSON.parse(txt); } catch (err) { data = null; }
            if (!res.ok || (data && (data.error || data.ok === false))) throw new Error('send failed');
            done(radio('channel'));
          });
        }).catch(function () {
          setBusy(false);
          resetTurnstile();
          showFail(T.errSend, payload);
        });
      });
    });

    function done(ch) {
      stats('submit', ch);
      session.del(DRAFT);
      $('[data-sent-text]').textContent = T.sentText.replace('{channel}', cfg.channels[ch].name);
      $('[data-req-form]').hidden = true;
      var sent = $('[data-req-sent]');
      sent.hidden = false;
      d.title = T.sentTitle + ' | Haedurio';
      w.scrollTo(0, 0);
      $('h1', sent).focus();
    }

    /* "Close" goes back if the visitor came from this site */
    var close = $('[data-close]');
    if (close && d.referrer.indexOf(location.origin + '/') === 0 && history.length > 1) {
      close.addEventListener('click', function (e) { e.preventDefault(); history.back(); });
    }
  }
})();
