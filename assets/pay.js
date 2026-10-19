/* Haedurio payment page: /pay/?o=CODE
   The order (title, amount) always comes from the server. After the card
   payment, the server asks PortOne whether it really went through before the
   order is marked paid. */
(function () {
  'use strict';
  var cfgEl = document.getElementById('pay-config');
  if (!cfgEl) return;
  var C = JSON.parse(cfgEl.textContent);
  var T = C.t;
  var SDK = 'https://cdn.portone.io/v2/browser-sdk.js';

  function $(s, r) { return (r || document).querySelector(s); }
  function fill(str, vars) { return str.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }); }
  function group(n, sep) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  function money(n) { return C.lang === 'vi' ? group(n, '.') + ' ₩' : '₩' + group(n, ','); }

  function show(name) {
    document.querySelectorAll('[data-pay]').forEach(function (el) { el.hidden = el.getAttribute('data-pay') !== name; });
    window.scrollTo(0, 0);
  }
  function loading(text) { $('[data-loading-text]').textContent = text; show('loading'); }
  function closed(title, text) {
    $('[data-closed-title]').textContent = title;
    $('[data-closed-text]').textContent = text;
    show('closed');
    $('[data-closed-title]').focus();
  }
  function closedFor(status) {
    if (status === 'paid') return;
    if (status === 'expired') return closed(T.expiredTitle, T.expiredText);
    if (status === 'cancelled' || status === 'refunded') return closed(T.cancelledTitle, T.cancelledText);
    closed(T.invalidTitle, T.invalidText);
  }
  function paid(order) {
    $('[data-paid-text]').textContent = fill(T.paidText, { amount: money(order.amount), item: order.title });
    show('paid');
    $('[data-pay="paid"] h1').focus();
  }

  function call(body) {
    return fetch(C.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + C.key, apikey: C.key },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok && !data.error) throw new Error('HTTP ' + r.status);
        return data;
      });
    });
  }

  var params = new URLSearchParams(location.search);
  var code = (params.get('o') || '').trim().toLowerCase();
  var order = null;
  var busy = false;
  var form = $('#payform');
  var btn = $('#paybtn');
  var fields = {
    name: { el: $('#pname'), err: $('#err-pname'), ok: function (v) { return v.length >= 2; } },
    email: { el: $('#pemail'), err: $('#err-pemail'), ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); } },
    phone: { el: $('#pphone'), err: $('#err-pphone'), ok: function (v) { return /^\+?[\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 7; } },
  };
  var consent = $('#pconsent');
  var consentErr = $('#err-pconsent');

  function setError(f, on) {
    f.err.hidden = !on;
    if (on) f.el.setAttribute('aria-invalid', 'true'); else f.el.removeAttribute('aria-invalid');
  }
  function failBox(text) {
    var box = $('#payfail');
    if (!text) { box.hidden = true; return; }
    $('[data-fail-title]', box).textContent = T.failTitle;
    $('[data-fail-text]', box).textContent = text;
    box.hidden = false;
  }
  function setBusy(on, text) {
    busy = on;
    btn.disabled = on;
    btn.textContent = on ? text : fill(T.payButton, { amount: money(order.amount) });
  }

  function openForm(o) {
    order = o;
    $('[data-o="title"]').textContent = o.title;
    $('[data-o="code"]').textContent = o.code.toUpperCase();
    $('[data-o="amount"]').textContent = money(o.amount);
    $('[data-pay-test]').hidden = !o.test;
    if (o.name && !fields.name.el.value) fields.name.el.value = o.name;
    if (o.email && !fields.email.el.value) fields.email.el.value = o.email;
    if (o.phone && !fields.phone.el.value) fields.phone.el.value = o.phone;
    setBusy(false);
    show('form');
  }

  function cleanUrl() {
    if (history.replaceState) history.replaceState(null, '', location.pathname + '?o=' + encodeURIComponent(code));
  }

  function loadSdk() {
    if (window.PortOne) return Promise.resolve(window.PortOne);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SDK;
      s.onload = function () { window.PortOne ? resolve(window.PortOne) : reject(new Error('sdk')); };
      s.onerror = function () { reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }

  function complete(paymentId) {
    loading(T.checking);
    return call({ action: 'complete', code: code, paymentId: paymentId }).then(function (res) {
      if (res.ok && res.status === 'paid') return paid(res.order);
      if (res.error === 'closed' && res.order) return closedFor(res.order.status);
      return reload(T.failText);
    }).catch(function () { return reload(T.failText); });
  }

  // Load the order. If `fail` is given, show the form again with that message.
  function reload(fail) {
    return call({ action: 'get', code: code }).then(function (res) {
      if (!res.ok || !res.order) return closed(T.invalidTitle, T.invalidText);
      if (res.order.status === 'paid') return paid(res.order);
      if (res.order.status !== 'open') return closedFor(res.order.status);
      openForm(res.order);
      failBox(fail || '');
    }).catch(function () { closed(T.failTitle, T.loadError); });
  }

  function validate() {
    var first = null;
    Object.keys(fields).forEach(function (k) {
      var f = fields[k];
      var bad = !f.ok(f.el.value.trim());
      setError(f, bad);
      if (bad && !first) first = f.el;
    });
    consentErr.hidden = consent.checked;
    if (!consent.checked && !first) first = consent;
    if (first) first.focus();
    return !first;
  }

  Object.keys(fields).forEach(function (k) {
    var f = fields[k];
    f.el.addEventListener('input', function () { if (!f.err.hidden && f.ok(f.el.value.trim())) setError(f, false); });
  });
  consent.addEventListener('change', function () { if (consent.checked) consentErr.hidden = true; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || !order) return;
    failBox('');
    if (!validate()) return;
    var name = fields.name.el.value.trim();
    var email = fields.email.el.value.trim();
    var phone = fields.phone.el.value.trim();
    var paymentId = 'hd-' + code + '-' + Date.now().toString(36);
    setBusy(true, T.opening);

    call({ action: 'start', code: code, paymentId: paymentId, name: name, email: email, phone: phone })
      .then(function (res) {
        if (!res.ok) {
          if (res.order) { closedFor(res.order.status); return null; }
          throw new Error(res.error || 'start');
        }
        return loadSdk();
      })
      .then(function (PortOne) {
        if (!PortOne) return null;
        return PortOne.requestPayment({
          storeId: C.storeId,
          channelKey: order.test ? C.channels.test : C.channels.live,
          paymentId: paymentId,
          orderName: order.title.slice(0, 40),
          totalAmount: order.amount,
          currency: 'CURRENCY_KRW',
          payMethod: 'CARD',
          locale: 'EN_US',
          customer: { fullName: name, email: email, phoneNumber: phone.replace(/\D/g, '') },
          redirectUrl: location.origin + location.pathname + '?o=' + encodeURIComponent(code),
        });
      })
      .then(function (res) {
        if (res === null) return;
        if (!res) { setBusy(false); return; }
        if (res.code != null) {
          if (window.console) console.warn('Payment not completed:', res.code, res.message);
          setBusy(false);
          failBox(T.failText);
          return;
        }
        return complete(res.paymentId || paymentId);
      })
      .catch(function (err) {
        if (window.console) console.error(err);
        if (order) { setBusy(false); failBox(T.failText); }
      });
  });

  /* ---------- Start ---------- */
  if (!/^[a-z0-9]{6,20}$/.test(code)) {
    closed(T.invalidTitle, T.invalidText);
    return;
  }
  var returned = params.get('paymentId');
  if (returned) {
    // Back from the card company's page (mobile).
    var failed = params.get('code');
    cleanUrl();
    if (failed) {
      if (window.console) console.warn('Payment not completed:', failed, params.get('message'));
      reload(T.failText);
    } else {
      complete(returned);
    }
    return;
  }
  reload();
})();
