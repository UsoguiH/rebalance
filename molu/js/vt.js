// Moving between screens. A classic script in <head> of every inner page.
//
// 1) Instant screens: a tap on an in-app link does not load a new document. The next page's HTML is usually already
//    in memory (fetched while you look at the current one) and its module loaded once, so we swap <body> in place, call
//    the page's mount() (each page module exports one) and animate with a same-document View Transition. No network wait, no blank frame. Anything odd
//    (another site, the start screen, a failed fetch) falls back to a normal page load, which still animates
//    (cross-document View Transitions, below).
// 2) The move: gate (from the start screen) · push (one level deeper: home → salon) · pop (back up) · tab (between the
//    bar's pages). CSS in molu.css draws each. The salon card's picture grows into the salon cover, and back.
(function () {
  var DEPTH = { 'index.html': 0, '': 0, 'explore.html': 1, 'favorites.html': 1, 'account.html': 1, 'appointments.html': 1, 'categories.html': 1, 'offers.html': 1, 'salon.html': 2, 'business.html': 2, 'dashboard.html': 2, 'join.html': 3 };
  var file = function (u) { try { return new URL(u, location.href).pathname.split('/').pop(); } catch (e) { return ''; } };
  var depth = function (u) { var f = file(u); return f in DEPTH ? DEPTH[f] : 1; };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  var COVER = 'salon-cover';
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- page lifetime: listeners on window/document and intervals belong to the page that added them ----------
  var add = EventTarget.prototype.addEventListener, owned = [], timers = [];
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if ((this === window || this === document) && !/leaflet/i.test(new Error().stack || '')) owned.push([this, type, fn, opts]);
    return add.call(this, type, fn, opts);
  };
  var setInt = window.setInterval;
  window.setInterval = function () { var id = setInt.apply(window, arguments); timers.push(id); return id; };
  function teardown() {
    owned.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); owned = [];
    timers.forEach(clearInterval); timers = [];
  }
  var on = function (target, type, fn, opts) { add.call(target, type, fn, opts); }; // ours: never torn down

  // ---------- the salon picture morph ----------
  function cardArt(id) { // a salon can sit in several rows: take the one on screen
    var list = document.querySelectorAll('.sc-card[data-id="' + id + '"] .img');
    for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) return list[i]; }
    return null;
  }
  function clearNames() { document.querySelectorAll('[style*="view-transition-name"]').forEach(function (el) { if (el.style.viewTransitionName === COVER || el.style.viewTransitionName === 'gate-face') el.style.viewTransitionName = ''; }); }
  function moveType(from, to) {
    var a = depth(from), b = depth(to);
    return a === 0 ? 'gate' : b > a ? 'push' : b < a ? 'pop' : 'tab';
  }
  // after the new page is in: name the picture on the arriving side
  function nameArrival(from) {
    var salon = file(location.href) === 'salon.html', morph = ss.get('molu_morph'); ss.set('molu_morph', null);
    if (salon && morph && morph === new URLSearchParams(location.search).get('id')) { var c = document.querySelector('.cover'); if (c) c.style.viewTransitionName = COVER; }
    if (file(from) === 'salon.html' && !salon) { var id = new URL(from, location.href).searchParams.get('id'), art = id && cardArt(id); if (art) art.style.viewTransitionName = COVER; }
  }

  // tapping a salon card marks its picture (capture: before the page or the router sees the click)
  on(document, 'click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    ss.set('molu_from', location.href);
    var card = a.closest('.sc-card'), art = card && card.querySelector('.img');
    ss.set('molu_morph', art ? card.dataset.id : null);
    if (art) { clearNames(); art.style.viewTransitionName = COVER; }
  }, true);

  // ---------- 1) instant screens ----------
  var pages = {}, navId = 0;
  function fetchPage(url) { // the HTML of a screen doesn't depend on ?id=…, so one copy per file
    var key = url.split(/[?#]/)[0];
    return pages[key] || (pages[key] = fetch(key, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .catch(function (err) { delete pages[key]; throw err; }));
  }
  // an in-app screen we can swap to (null: let the browser load it)
  function appUrl(href) {
    var u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !/\.html$/.test(u.pathname)) return null;
    var f = u.pathname.split('/').pop();
    if (!(f in DEPTH) || DEPTH[f] === 0) return null; // the start screen loads as itself
    return u.href;
  }
  function linkUrl(a) {
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#') return null;
    return appUrl(h);
  }

  function go(url, opts) {
    opts = opts || {};
    var id = ++navId, from = location.href, type = opts.type || moveType(from, url);
    return fetchPage(url).then(function (html) {
      if (id !== navId) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var script = doc.querySelector('script[type="module"][src]');
      if (!script) throw new Error('no page script');
      var entry = new URL(script.getAttribute('src'), url).href;
      if (opts.push !== false) {
        try { history.replaceState(Object.assign({}, history.state, { y: scrollY }), ''); history.pushState({ y: 0 }, '', url); }
        catch (err) { location.href = url; return; }
      }
      if (type === 'pop' && file(from) === 'salon.html') { var c = document.querySelector('.cover'); if (c) c.style.viewTransitionName = COVER; }
      var update = function () {
        teardown();
        document.title = doc.title;
        var tc = doc.querySelector('meta[name="theme-color"]'), mine = document.querySelector('meta[name="theme-color"]');
        if (tc && mine) mine.content = tc.content;
        var b = document.body;
        [].slice.call(b.attributes).forEach(function (at) { b.removeAttribute(at.name); });
        [].slice.call(doc.body.attributes).forEach(function (at) { b.setAttribute(at.name, at.value); });
        b.innerHTML = doc.body.innerHTML;
        document.documentElement.style.overflow = '';
        window.__softnav = true; // from now on page modules wait to be mounted instead of running on import
        return import(entry).then(function (mod) {
          mod.default();
          scrollTo(0, opts.y || 0);
          nameArrival(from);
          ss.set('molu_from', location.href);
        });
      };
      if (!document.startViewTransition || calm) return update();
      var vt;
      try { vt = document.startViewTransition({ update: update, types: [type] }); }
      catch (err) { document.documentElement.dataset.vt = type; vt = document.startViewTransition(update); vt.finished.finally(function () { delete document.documentElement.dataset.vt; }); }
      vt.finished.finally(clearNames);
      return vt.updateCallbackDone;
    }).catch(function () { if (id === navId) location.href = url; });
  }

  // on window, so it runs after the page's own handlers (they may cancel the click)
  on(window, 'click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'), url = linkUrl(a);
    if (!url) return;
    e.preventDefault();
    go(url);
  });
  // back and forward between screens we swapped
  on(window, 'popstate', function (e) {
    if (!appUrl(location.href)) { location.reload(); return; }
    var from = ss.get('molu_from') || '';
    go(location.href, { push: false, y: e.state && e.state.y || 0, type: moveType(from, location.href) === 'push' ? 'pop' : moveType(from, location.href) });
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // fetch what you are likely to open next: on intent (finger down / mouse over), and the bar's pages when idle
  var warm = function (e) { var url = linkUrl(e.target.closest && e.target.closest('a[href]')); if (url) fetchPage(url).catch(function () {}); };
  on(document, 'pointerdown', warm, { passive: true });
  on(document, 'mouseover', warm, { passive: true });
  on(window, 'load', function () {
    (window.requestIdleCallback || setTimeout)(function () {
      ['explore', 'salon', 'favorites', 'account', 'appointments'].forEach(function (n) {
        fetchPage(n + '.html').catch(function () {});
        var l = document.createElement('link'); l.rel = 'modulepreload'; l.href = 'js/dist/' + n + '.js'; document.head.appendChild(l);
      });
    }, { timeout: 2500 });
  });

  // ---------- 2) full page loads still animate (cross-document View Transitions) ----------
  on(window, 'pageswap', function (e) {
    ss.set('molu_from', location.href);
    if (!e.viewTransition) return;
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    var cover = document.querySelector('.cover');
    if (cover && (!to || depth(to) < 2)) cover.style.viewTransitionName = COVER;
  });
  on(window, 'pagehide', function () { ss.set('molu_from', location.href); });
  on(window, 'pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    var act = window.navigation && navigation.activation;
    var from = (act && act.from && act.from.url) || ss.get('molu_from') || '';
    var type = ss.get('molu_gate') ? 'gate' : moveType(from, location.href);
    if (type === 'tab' && act && act.navigationType === 'traverse' && depth(location.href) === 2) type = 'pop';
    ss.set('molu_gate', null);
    // from the start screen: the half of the picture you chose shrinks into this section's avatar in the top bar
    if (type === 'gate') { var face = document.querySelector('#sec [aria-pressed="true"] .face'); if (face) face.style.viewTransitionName = 'gate-face'; }
    try { vt.types.add(type); } catch (err) { document.documentElement.dataset.vt = type; vt.finished.then(function () { delete document.documentElement.dataset.vt; }); }
    nameArrival(from);
    vt.finished.finally(clearNames);
  });
  on(window, 'pageshow', function (e) { if (e.persisted) clearNames(); });
})();
