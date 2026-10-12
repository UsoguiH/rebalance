// Page-to-page motion (cross-document View Transitions). A classic script in <head>, so it is listening before the
// first frame. It names the kind of move from where you came from (CSS in molu.css does the motion):
//   gate — from the start screen · push — one level deeper (home → salon) · pop — back up · tab — between bar pages
// and it morphs the salon picture: the card you tapped grows into the salon's cover, and shrinks back on the way out.
(function () {
  var DEPTH = { 'index.html': 0, '': 0, 'explore.html': 1, 'favorites.html': 1, 'account.html': 1, 'appointments.html': 1, 'categories.html': 1, 'offers.html': 1, 'salon.html': 2, 'business.html': 2, 'join.html': 3 };
  var file = function (u) { try { return new URL(u, location.href).pathname.split('/').pop(); } catch (e) { return ''; } };
  var depth = function (u) { var f = file(u); return f in DEPTH ? DEPTH[f] : 1; };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  var COVER = 'salon-cover';

  // the one card picture that should morph (a salon can sit in several rows: take the one on screen)
  function cardArt(id) {
    var list = document.querySelectorAll('.sc-card[data-id="' + id + '"] .img');
    for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) return list[i]; }
    return null;
  }
  function clearNames() { document.querySelectorAll('[style*="view-transition-name"]').forEach(function (el) { if (el.style.viewTransitionName === COVER) el.style.viewTransitionName = ''; }); }

  // leaving: tapping a salon card marks its picture
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    ss.set('molu_from', location.href);
    var card = a.closest('.sc-card'), art = card && card.querySelector('.img');
    ss.set('molu_morph', art ? card.dataset.id : null);
    if (art) { clearNames(); art.style.viewTransitionName = COVER; }
  }, true);

  // leaving the salon page: its cover goes back into the card
  addEventListener('pageswap', function (e) {
    ss.set('molu_from', location.href);
    if (!e.viewTransition) return;
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    var cover = document.querySelector('.cover');
    if (cover && (!to || depth(to) < 2)) cover.style.viewTransitionName = COVER;
  });
  addEventListener('pagehide', function () { ss.set('molu_from', location.href); });

  // arriving: pick the move
  addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    var act = window.navigation && navigation.activation;
    var from = (act && act.from && act.from.url) || ss.get('molu_from') || '';
    var a = depth(from), b = depth(location.href);
    var type = ss.get('molu_gate') || a === 0 ? 'gate' : b > a ? 'push' : b < a ? 'pop' : (act && act.navigationType === 'traverse' && b === 2 ? 'pop' : 'tab');
    ss.set('molu_gate', null);
    try { vt.types.add(type); } catch (err) { document.documentElement.dataset.vt = type; vt.finished.then(function () { delete document.documentElement.dataset.vt; }); }
    var salon = file(location.href) === 'salon.html', fromSalon = file(from) === 'salon.html';
    var morph = ss.get('molu_morph'); ss.set('molu_morph', null);
    if (salon && morph && morph === new URLSearchParams(location.search).get('id')) { var c = document.querySelector('.cover'); if (c) c.style.viewTransitionName = COVER; }
    if (fromSalon && !salon) { var id = new URL(from, location.href).searchParams.get('id'), art = id && cardArt(id); if (art) art.style.viewTransitionName = COVER; }
    vt.finished.finally(clearNames);
  });
  // once this page is settled, quietly fetch the pages you are most likely to open next (small; the shared code is cached)
  addEventListener('load', function () {
    (window.requestIdleCallback || setTimeout)(function () {
      ['explore', 'salon', 'favorites', 'account', 'appointments'].forEach(function (n) {
        if (file(location.href) === n + '.html') return;
        var l = document.createElement('link'); l.rel = 'modulepreload'; l.href = 'js/dist/' + n + '.js'; document.head.appendChild(l);
      });
    }, { timeout: 2500 });
  });
  // coming back from the bfcache: drop any stale name
  addEventListener('pageshow', function (e) { if (e.persisted) clearNames(); });
})();
