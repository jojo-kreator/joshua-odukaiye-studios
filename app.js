(function () {
  'use strict';
  var SITE = window.SITE || {};
  var DATA = window.PORTFOLIO || [];
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- details from config.js ---------- */
  var waBase = 'https://wa.me/' + (SITE.whatsapp || '');
  $('phoneText').textContent = SITE.phoneDisplay || '';
  $('waDirect').href = waBase;
  $('mailText').textContent = SITE.email || '';
  $('mailLink').href = 'mailto:' + (SITE.email || '');
  $('cityText').textContent = SITE.city || '';
  $('year').textContent = new Date().getFullYear();
  if (SITE.instagram) {
    $('igRow').hidden = false;
    $('igLink').href = 'https://instagram.com/' + SITE.instagram;
    $('igLink').textContent = '@' + SITE.instagram;
  }
  if (SITE.logo) {
    var logo = $('brandLogo');
    logo.src = SITE.logo;
    logo.onload = function () { logo.hidden = false; };
  }
  $('copyMail').addEventListener('click', function () {
    var btn = this, done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
    try {
      navigator.clipboard.writeText(SITE.email || '').then(done, function () { selectText($('mailText')); });
    } catch (e) { selectText($('mailText')); }
  });
  function selectText(node) {
    var r = document.createRange(); r.selectNodeContents(node);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- header ---------- */
  var bar = $('bar'), nav = $('nav'), menuBtn = $('menuBtn');
  function onScroll() { bar.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  });

  /* ---------- chapters ---------- */
  var flat = []; // every photo in order, for the viewer
  var host = $('chapters');
  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  DATA.forEach(function (ch) {
    var sec = mk('section', 'chapter');
    sec.id = ch.id;
    sec.setAttribute('aria-labelledby', ch.id + '-h');
    var wrap = mk('div', 'wrap');
    var head = mk('header', 'chapter-head');
    var h = mk('h2', 'chapter-title', ch.title); h.id = ch.id + '-h';
    var count = 0;
    ch.rows.forEach(function (r) { count += r.length; });
    head.appendChild(h);
    head.appendChild(mk('p', 'chapter-note', ch.note + ' ' + count + (count === 1 ? ' photograph.' : ' photographs.')));
    wrap.appendChild(head);

    var rows = mk('div', 'rows');
    ch.rows.forEach(function (r) {
      var row = mk('div', 'row' + (ch.narrow ? ' is-narrow' : ''));
      r.forEach(function (p) {
        var dims = p[1].split(':'), w = +dims[0], hgt = +dims[1];
        var idx = flat.length;
        flat.push({ src: 'img/' + p[0] + '.jpg', alt: p[2], chapter: ch.title, group: ch.id });
        var fig = mk('figure', 'shot');
        fig.style.setProperty('--ar', (w / hgt).toFixed(4));
        var btn = mk('button', 'shot-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'View larger: ' + p[2]);
        btn.dataset.i = idx;
        var img = new Image();
        img.src = 'img/' + p[0] + '-m.jpg';
        img.alt = p[2];
        img.width = w; img.height = hgt;
        img.loading = 'lazy'; img.decoding = 'async';
        btn.appendChild(img); fig.appendChild(btn); row.appendChild(fig);
      });
      rows.appendChild(row);
    });
    wrap.appendChild(rows);
    sec.appendChild(wrap);
    host.appendChild(sec);
  });
  host.addEventListener('click', function (e) {
    var b = e.target.closest('.shot-btn');
    if (b) openViewer(+b.dataset.i, b);
  });

  /* ---------- viewer ---------- */
  var lb = $('lb'), lbImg = $('lbImg'), lbCap = $('lbCap'), lbCount = $('lbCount');
  var cur = 0, group = [], returnTo = null, touchX = null;
  function indicesOf(g) { var a = []; flat.forEach(function (p, i) { if (p.group === g) a.push(i); }); return a; }
  function show(i) {
    var p = flat[group[i]];
    cur = i;
    lbImg.src = p.src; lbImg.alt = p.alt;
    lbCount.textContent = 'Frame ' + (i + 1) + ' of ' + group.length;
    lbCap.textContent = p.chapter + '. ' + p.alt;
    [i - 1, i + 1].forEach(function (n) { if (group[n] !== undefined) new Image().src = flat[group[n]].src; });
  }
  function openViewer(flatIndex, trigger) {
    group = indicesOf(flat[flatIndex].group);
    returnTo = trigger || null;
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    show(group.indexOf(flatIndex));
    $('lbClose').focus();
  }
  function closeViewer() {
    lb.hidden = true;
    document.documentElement.style.overflow = '';
    if (returnTo) returnTo.focus();
  }
  function step(d) { var n = cur + d; if (n >= 0 && n < group.length) show(n); }
  $('lbClose').addEventListener('click', closeViewer);
  $('lbPrev').addEventListener('click', function () { step(-1); });
  $('lbNext').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) closeViewer(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') { // keep focus inside the viewer
      var f = [$('lbClose'), $('lbPrev'), $('lbNext')], i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });
  lb.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- client galleries ---------- */
  var galForm = $('galForm'), galStatus = $('galStatus'), galOpen = $('galOpen'), galBtn = $('galBtn');
  galForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('galCode').value;
    galOpen.hidden = true; galStatus.classList.remove('is-bad');
    if (!GalleryCrypto.normalize(code)) { galStatus.textContent = 'Enter your access code.'; galStatus.classList.add('is-bad'); return; }
    var list = window.GALLERIES || [];
    galBtn.disabled = true; galStatus.textContent = 'Checking the code…';
    var i = 0;
    (function next() {
      if (i >= list.length) {
        galBtn.disabled = false; galStatus.classList.add('is-bad');
        galStatus.textContent = 'That code did not open a gallery. Check it and try again, or message us on WhatsApp.';
        return;
      }
      GalleryCrypto.unlock(code, list[i++]).then(function (url) {
        if (!url) return next();
        galBtn.disabled = false;
        galStatus.textContent = 'Your gallery is ready.';
        galOpen.href = url; galOpen.hidden = false; galOpen.focus();
      });
    })();
  });

  /* ---------- booking form (opens WhatsApp with the message filled in) ---------- */
  var book = $('bookForm'), err = $('formError'), send = $('waSend');
  book.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('fName').value.trim();
    if (!name) { err.textContent = 'Enter your name so we know who to reply to.'; $('fName').focus(); return; }
    err.textContent = '';
    var lines = [
      'Hello ' + (SITE.name || '') + ', my name is ' + name + '.',
      'I would like to book: ' + $('fType').value + '.'
    ];
    if ($('fDate').value) lines.push('Preferred date: ' + $('fDate').value + '.');
    if ($('fPlace').value.trim()) lines.push('Location: ' + $('fPlace').value.trim() + '.');
    if ($('fMsg').value.trim()) lines.push('Details: ' + $('fMsg').value.trim());
    send.href = waBase + '?text=' + encodeURIComponent(lines.join('\n'));
    send.click();
    err.textContent = 'WhatsApp should open in a new tab. If it did not, use the number above.';
  });
})();
