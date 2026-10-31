(function () {
  'use strict';
  var SITE = window.SITE || {};
  var DATA = window.PORTFOLIO || [];
  var $ = function (id) { return document.getElementById(id); };

  var CFG = SITE.supabase || {};
  var db = window.Supa && Supa.configured(CFG) ? Supa.create(CFG) : null;
  var STORAGE_BUCKET = 'photos';
  var waBase = '';
  var STATIC_NAME = SITE.name || '';

  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function selectText(node) {
    var r = document.createRange(); r.selectNodeContents(node);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  /* A stored path is either a file that ships with the site ("img/...") or a file in photo storage. */
  function fileUrl(path) {
    if (!path) return '';
    if (/^(img\/|https?:\/\/)/.test(path)) return path;
    return db ? db.publicUrl(STORAGE_BUCKET, path) : path;
  }

  /* ---------- the studio's details ---------- */
  function applyDetails(d) {
    waBase = 'https://wa.me/' + (d.whatsapp || '');
    $('phoneText').textContent = d.phone || '';
    $('waDirect').href = waBase;
    $('mailText').textContent = d.email || '';
    $('mailLink').href = 'mailto:' + (d.email || '');
    $('cityText').textContent = d.city || '';
    $('year').textContent = new Date().getFullYear();
    if (d.instagram) {
      $('igRow').hidden = false;
      $('igLink').href = 'https://instagram.com/' + d.instagram;
      $('igLink').textContent = '@' + d.instagram;
    } else { $('igRow').hidden = true; }
    if (d.logo) {
      var logo = $('brandLogo');
      logo.onload = function () { logo.hidden = false; };
      logo.src = fileUrl(d.logo);
    }
    if (d.name) {
      STATIC_NAME = d.name;
      $('brandName').textContent = d.name;
      $('footName').textContent = d.name;
      document.title = d.name + (d.city ? ' | Photographer in ' + d.city : '');
      var words = d.name.split(/\s+/).filter(Boolean), h = $('heroName');
      if (words.join(' ') !== h.textContent.replace(/\s+/g, ' ').trim()) {
        h.textContent = '';
        words.forEach(function (w) { h.appendChild(mk('span', '', w)); });
      }
    }
    if (d.city) $('heroWhere').textContent = 'Photography studio in ' + d.city;
    if (d.lede) $('heroLede').textContent = d.lede;
    if (d.headline) $('about-h').textContent = d.headline;
    if (d.bio && d.bio.trim()) {
      var host = $('bioText'); host.textContent = '';
      d.bio.split(/\n\s*\n/).forEach(function (p) { if (p.trim()) host.appendChild(mk('p', '', p.trim())); });
    }
    if (d.services && d.services.length) {
      var ul = $('servicesList'); ul.textContent = '';
      d.services.forEach(function (t) { if (t) ul.appendChild(mk('li', '', t)); });
    }
    if (d.hero && d.hero.full) {
      var hi = $('heroImg');
      hi.src = fileUrl(d.hero.full); hi.alt = d.hero.alt || '';
      hi.width = d.hero.w; hi.height = d.hero.h;
    }
  }
  applyDetails({
    name: '', city: SITE.city, whatsapp: SITE.whatsapp, phone: SITE.phoneDisplay, email: SITE.email,
    instagram: SITE.instagram, logo: SITE.logo
  });
  $('copyMail').addEventListener('click', function () {
    var btn = this, email = $('mailText').textContent;
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
    try { navigator.clipboard.writeText(email).then(done, function () { selectText($('mailText')); }); }
    catch (e) { selectText($('mailText')); }
  });

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

  /* Turns the file-based list (portfolio.js) into the same shape the dashboard sends. */
  function fromFiles(list) {
    return list.map(function (ch) {
      return { id: ch.id, title: ch.title, note: ch.note, narrow: !!ch.narrow, rows: ch.rows.map(function (r) {
        return r.map(function (p) {
          var d = p[1].split(':');
          return { full: 'img/' + p[0] + '.jpg', thumb: 'img/' + p[0] + '-m.jpg', w: +d[0], h: +d[1], alt: p[2] };
        });
      }) };
    });
  }
  /* Dashboard sections hold photos in order; the rows are worked out here. */
  function fromDashboard(sections) {
    return sections.filter(function (s) { return s.photos && s.photos.length; }).map(function (s) {
      var ars = s.photos.map(function (p) { return p.w / p.h; });
      var opts = s.narrow ? { target: 1.4, max: 2 } : { target: 2.6, max: 3 };
      var rows = PhotoLayout.rows(ars, opts).map(function (idx) {
        var r = idx.map(function (i) { return s.photos[i]; });
        r.fill = PhotoLayout.fill(ars, idx, opts.target);
        return r;
      });
      return { id: s.id, title: s.title, note: s.note || '', narrow: !!s.narrow, rows: rows };
    });
  }

  function renderChapters(chapters) {
    host.querySelectorAll('.chapter').forEach(function (n) { n.remove(); });
    flat = [];
    chapters.forEach(function (ch) {
      var sec = mk('section', 'chapter');
      sec.id = ch.id;
      sec.setAttribute('aria-labelledby', ch.id + '-h');
      var wrap = mk('div', 'wrap');
      var head = mk('header', 'chapter-head');
      var h = mk('h2', 'chapter-title', ch.title); h.id = ch.id + '-h';
      var count = 0;
      ch.rows.forEach(function (r) { count += r.length; });
      head.appendChild(h);
      head.appendChild(mk('p', 'chapter-note', ((ch.note ? ch.note + ' ' : '') + count + (count === 1 ? ' photograph.' : ' photographs.'))));
      wrap.appendChild(head);

      var rows = mk('div', 'rows');
      ch.rows.forEach(function (r) {
        var row = mk('div', 'row' + (ch.narrow ? ' is-narrow' : '') + (r.fill && r.fill < 0.85 ? ' is-part' : ''));
        if (r.fill && r.fill < 0.85) row.style.width = Math.round(r.fill * 100) + '%';
        r.forEach(function (p) {
          var idx = flat.length;
          flat.push({ src: fileUrl(p.full), alt: p.alt, chapter: ch.title, group: ch.id });
          var fig = mk('figure', 'shot');
          fig.style.setProperty('--ar', (p.w / p.h).toFixed(4));
          var btn = mk('button', 'shot-btn');
          btn.type = 'button';
          btn.setAttribute('aria-label', 'View larger' + (p.alt ? ': ' + p.alt : ''));
          btn.dataset.i = idx;
          var img = new Image();
          img.src = fileUrl(p.thumb);
          img.alt = p.alt || '';
          img.width = p.w; img.height = p.h;
          img.loading = 'lazy'; img.decoding = 'async';
          btn.appendChild(img); fig.appendChild(btn); row.appendChild(fig);
        });
        rows.appendChild(row);
      });
      wrap.appendChild(rows);
      sec.appendChild(wrap);
      host.appendChild(sec);
    });
    refreshNav(chapters);
  }
  function refreshNav(chapters) {
    var first = nav.querySelector('a[href^="#"]');
    if (first && chapters.length) first.setAttribute('href', '#' + chapters[0].id);
  }
  host.addEventListener('click', function (e) {
    var b = e.target.closest('.shot-btn');
    if (b) openViewer(+b.dataset.i, b);
  });

  /* Show the photographs: from the dashboard when it is connected and has photos, otherwise from the files that ship with the site. */
  var fileChapters = fromFiles(DATA);
  if (!db) {
    renderChapters(fileChapters);
  } else {
    var waitMsg = $('chaptersWait'), settled = false;
    waitMsg.hidden = false;
    var settle = function (chapters) {
      if (settled) return; settled = true;
      waitMsg.hidden = true;
      renderChapters(chapters);
    };
    var timer = setTimeout(function () { settle(fileChapters); }, 6000);
    db.getSite().then(function (site) {
      clearTimeout(timer);
      if (!site || !site.studio) { settle(fileChapters); return; }
      var d = site.studio;
      applyDetails({ name: d.name, city: d.city, whatsapp: d.whatsapp, phone: d.phone, email: d.email, instagram: d.instagram,
        logo: d.logo, lede: d.lede, headline: d.headline, bio: d.bio, services: d.services, hero: d.hero });
      var chapters = fromDashboard(site.sections || []);
      settle(chapters.length ? chapters : fileChapters);
    }, function () { clearTimeout(timer); settle(fileChapters); });
  }

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
  function galBad(msg) { galBtn.disabled = false; galStatus.classList.add('is-bad'); galStatus.textContent = msg; }
  function galGood(url) {
    galBtn.disabled = false;
    galStatus.textContent = 'Your gallery is ready.';
    galOpen.href = url; galOpen.hidden = false; galOpen.focus();
  }
  var NOT_FOUND = 'That code did not open a gallery. Check it and try again, or message us on WhatsApp.';
  galForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('galCode').value;
    galOpen.hidden = true; galStatus.classList.remove('is-bad');
    if (!GalleryCrypto.normalize(code)) { galStatus.textContent = 'Enter your access code.'; galStatus.classList.add('is-bad'); return; }
    galBtn.disabled = true; galStatus.textContent = 'Checking the code…';
    var tryFiles = function () {
      var list = window.GALLERIES || [], i = 0;
      (function next() {
        if (i >= list.length) return galBad(NOT_FOUND);
        GalleryCrypto.unlock(code, list[i++]).then(function (url) { if (!url) return next(); galGood(url); });
      })();
    };
    if (!db) return tryFiles();
    db.openGallery(code).then(function (url) {
      if (typeof url === 'string' && /^https:\/\//i.test(url)) return galGood(url);
      if ((window.GALLERIES || []).length) return tryFiles();
      galBad(NOT_FOUND);
    }, function (err) {
      if (/too_many/.test(err.message)) galBad('Too many tries. Please wait a few minutes and try again, or message us on WhatsApp.');
      else galBad('We could not check the code just now. Check your internet and try again.');
    });
  });

  /* ---------- booking form (opens WhatsApp with the message filled in) ---------- */
  var book = $('bookForm'), err = $('formError'), send = $('waSend');
  book.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('fName').value.trim();
    if (!name) { err.textContent = 'Enter your name so we know who to reply to.'; $('fName').focus(); return; }
    err.textContent = '';
    var lines = [
      'Hello ' + STATIC_NAME + ', my name is ' + name + '.',
      'I would like to book: ' + $('fType').value + '.'
    ];
    if ($('fDate').value) lines.push('Preferred date: ' + $('fDate').value + '.');
    if ($('fPlace').value.trim()) lines.push('Location: ' + $('fPlace').value.trim() + '.');
    if ($('fMsg').value.trim()) lines.push('Details: ' + $('fMsg').value.trim());
    send.href = waBase + '?text=' + encodeURIComponent(lines.join('\n'));
    send.click(); // must happen straight away, before anything is saved, or the browser may block the new tab
    if (db && !$('fWebsite').value) {
      db.submitEnquiry({ name: name, contact: $('fContact').value, kind: $('fType').value, date: $('fDate').value,
        place: $('fPlace').value, message: $('fMsg').value }).catch(function () {});
    }
    err.textContent = 'WhatsApp should open in a new tab. If it did not, use the number above.';
  });
})();
