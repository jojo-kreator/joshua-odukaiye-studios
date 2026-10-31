/* The photographer dashboard. Nothing here is visible to visitors: every private action needs the photographer's login,
 * and the database itself refuses to show private data to anyone else. */
(function () {
  'use strict';
  var SITE = window.SITE || {};
  var CFG = SITE.supabase || {};
  var app = document.getElementById('app');
  var BUCKET = 'photos';
  var db = null;
  var S = { studio: null, sections: [], photos: [], galleries: [], enquiries: [], tab: 'galleries', fresh: null };

  /* ---------- small helpers ---------- */
  function h(tag, props) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k in n && k !== 'list') n[k] = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(n, x); });
    else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function mount(node) { app.textContent = ''; app.appendChild(node); window.scrollTo(0, 0); }
  function toast(msg, kind) {
    var t = h('div', { class: 'toast ' + (kind || ''), text: msg });
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'bad' ? 7000 : 2600);
  }
  function copy(text, what) {
    function ok() { toast((what || 'Text') + ' copied.', 'good'); }
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
    function fallback() {
      var t = h('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Could not copy. Select the text and copy it yourself.', 'bad'); }
      t.remove();
    }
  }
  function slugify(s, max) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 38);
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  /* Nigerian numbers written 0705... become 234705...; anything already with a country code is kept. */
  function toWhatsapp(s) {
    var d = digits(s);
    if (/^0\d{10}$/.test(d)) return '234' + d.slice(1);
    if (/^00/.test(d)) d = d.slice(2);
    return d;
  }
  function cleanInstagram(s) {
    return String(s || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  }
  function when(iso) {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; }
  }
  function siteUrl() { return new URL('./', location.href).href; }
  function friendly(err) {
    var m = String((err && err.message) || err || 'Something went wrong.');
    if (err && err.status === 0) return m;
    if (/invalid login/i.test(m)) return 'That email or password is not right.';
    if (/email not confirmed/i.test(m)) return 'This email has not been confirmed yet. Check your inbox, or confirm the user in Supabase.';
    if (/row-level security|not allowed/i.test(m)) return 'That was not allowed. Log out, log in again, and retry.';
    if (/jwt|expired/i.test(m)) return 'Your login has expired. Please log in again.';
    if (err && err.code === '23505') return 'That already exists. Choose a different one.';
    return m;
  }
  function fail(err) {
    if (err && (err.status === 401 || /jwt expired/i.test(err.message || ''))) { toast('Your login has expired. Please log in again.', 'bad'); return renderLogin(); }
    toast(friendly(err), 'bad');
  }
  function busy(btn, on, label) {
    btn.disabled = on;
    if (on) { if (label) { btn.dataset.l = btn.textContent; btn.textContent = label; } }
    else if (btn.dataset.l) { btn.textContent = btn.dataset.l; delete btn.dataset.l; }
  }
  function field(label, input, hint) {
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    input.id = id;
    return h('div', null, h('label', { for: id }, label), input, hint ? h('p', { class: 'hint', text: hint }) : null);
  }

  /* ---------- start ---------- */
  function boot() {
    if (!window.Supa || !Supa.configured(CFG)) return renderNotConnected();
    db = Supa.create(CFG);
    var hash = db.acceptHash(location.hash);
    if (hash) history.replaceState(null, '', location.pathname + location.search);
    if (hash && hash.error) return renderLogin('That link did not work: ' + hash.error + ' Request a new one below.');
    if (hash && hash.type === 'recovery') return renderNewPassword();
    if (!db.signedIn()) return renderLogin();
    mount(h('p', { class: 'boot', text: 'Loading your dashboard…' }));
    loadAll().then(afterLoad, function (e) {
      if (e && (e.status === 401 || e.status === 403 || /jwt/i.test(e.message))) { db.signOut(); return renderLogin('Please log in again.'); }
      mount(h('div', { class: 'center' }, h('div', { class: 'card narrow' },
        h('h1', { text: 'Could not load' }), h('p', { class: 'muted', text: friendly(e) }),
        h('button', { class: 'btn btn-gold', text: 'Try again', onclick: boot }))));
    });
  }

  function renderNotConnected() {
    mount(h('div', { class: 'center' }, h('div', { class: 'card narrow' },
      h('h1', { text: 'Dashboard not connected yet' }),
      h('p', { class: 'muted', text: 'This page needs the three connection details in config.js (url, anonKey and studio). Follow SETUP-DASHBOARD.md, then reload this page.' }))));
  }

  /* ---------- login ---------- */
  function renderLogin(message) {
    var email = h('input', { type: 'email', autocomplete: 'username', required: true, inputMode: 'email' });
    var pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    var err = h('p', { class: 'err', role: 'alert', text: message || '' });
    var btn = h('button', { class: 'btn btn-gold', type: 'submit', text: 'Log in' });
    var forgot = h('button', { class: 'linkbtn', type: 'button', text: 'Forgot your password?', onclick: function () {
      if (!email.value.trim()) { err.textContent = 'Type your email above first, then press this again.'; email.focus(); return; }
      db.recover(email.value.trim(), location.origin + location.pathname).then(function () {
        err.style.color = 'var(--good)'; err.textContent = 'If that email has an account, a reset link is on its way. Open it on this device.';
      }, function (e) { err.style.color = ''; err.textContent = friendly(e); });
    } });
    var form = h('form', { novalidate: true, onsubmit: function (e) {
      e.preventDefault(); err.style.color = ''; err.textContent = '';
      if (!email.value.trim() || !pw.value) { err.textContent = 'Enter your email and password.'; return; }
      busy(btn, true, 'Logging in…');
      db.signIn(email.value.trim(), pw.value).then(function () { return loadAll(); }).then(afterLoad, function (e2) { busy(btn, false); err.textContent = friendly(e2); });
    } }, field('Email', email), field('Password', pw), err, h('div', { class: 'row spread' }, btn, forgot));
    mount(h('div', { class: 'center' }, h('div', { class: 'card narrow' },
      h('h1', { text: 'Studio dashboard' }), h('p', { class: 'muted', text: 'Private. For the photographer only.' }), form)));
    email.focus();
  }

  function renderNewPassword() {
    var pw = h('input', { type: 'password', autocomplete: 'new-password', minLength: 8 });
    var err = h('p', { class: 'err', role: 'alert' });
    var btn = h('button', { class: 'btn btn-gold', type: 'submit', text: 'Save new password' });
    mount(h('div', { class: 'center' }, h('div', { class: 'card narrow' },
      h('h1', { text: 'Choose a new password' }),
      h('form', { novalidate: true, onsubmit: function (e) {
        e.preventDefault(); err.textContent = '';
        if (pw.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
        busy(btn, true);
        db.setPassword(pw.value).then(function () { toast('Password changed.', 'good'); boot(); }, function (e2) { busy(btn, false); err.textContent = friendly(e2); });
      } }, field('New password', pw, 'At least 8 characters.'), err, btn))));
  }

  /* ---------- loading ---------- */
  function loadAll() {
    return db.select('studios', { select: '*' }).then(function (rows) {
      S.studio = rows[0] || null;
      if (!S.studio) { S.sections = []; S.photos = []; S.galleries = []; S.enquiries = []; return; }
      var mine = { studio_id: 'eq.' + S.studio.id };
      return Promise.all([
        db.select('sections', Object.assign({ select: '*', order: 'position.asc,created_at.asc' }, mine)),
        db.select('photos', Object.assign({ select: '*', order: 'position.asc,created_at.asc' }, mine)),
        db.select('galleries', Object.assign({ select: '*', order: 'created_at.desc' }, mine)),
        db.select('enquiries', Object.assign({ select: '*', order: 'created_at.desc', limit: 300 }, mine))
      ]).then(function (r) { S.sections = r[0]; S.photos = r[1]; S.galleries = r[2]; S.enquiries = r[3]; });
    });
  }
  function afterLoad() { if (!S.studio) renderSetup(); else renderMain(); }

  /* ---------- first-time studio setup ---------- */
  function renderSetup() {
    var name = h('input', { type: 'text', value: SITE.name || '', autocomplete: 'off' });
    var slug = h('input', { type: 'text', value: CFG.studio || slugify(SITE.name), autocomplete: 'off', spellcheck: false });
    var err = h('p', { class: 'err', role: 'alert' });
    var btn = h('button', { class: 'btn btn-gold', type: 'submit', text: 'Create my studio' });
    name.addEventListener('input', function () { if (!CFG.studio) slug.value = slugify(name.value); });
    mount(h('div', { class: 'center' }, h('div', { class: 'card narrow' },
      h('h1', { text: 'Set up your studio' }),
      h('p', { class: 'muted', text: 'One time only. Your details from config.js are filled in for you and can be changed later in the dashboard.' }),
      h('form', { novalidate: true, onsubmit: function (e) {
        e.preventDefault(); err.textContent = '';
        var s = slugify(slug.value);
        if (!name.value.trim()) { err.textContent = 'Enter your studio name.'; return; }
        if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s)) { err.textContent = 'The web name needs 3 to 40 letters, numbers or dashes.'; return; }
        var uid = db.session() && db.session().user && db.session().user.id;
        busy(btn, true, 'Creating…');
        (uid ? Promise.resolve({ id: uid }) : db.whoAmI()).then(function (u) {
          return db.insert('studios', [{ owner_id: u.id, slug: s, name: name.value.trim(), city: SITE.city || '', whatsapp: toWhatsapp(SITE.whatsapp),
            phone_display: SITE.phoneDisplay || '', email: SITE.email || '', instagram: cleanInstagram(SITE.instagram) }]);
        }).then(function () { return loadAll(); }).then(function () {
          if (CFG.studio && CFG.studio !== s) toast('Remember: set studio to "' + s + '" in config.js, or visitors will not see your photos.', 'bad');
          renderMain();
        }, function (e2) { busy(btn, false); err.textContent = e2.code === '23505' ? 'That web name is taken. Try another.' : friendly(e2); });
      } }, field('Studio name', name), field('Web name', slug, 'Short, lower case, no spaces. It must match "studio" in config.js.'), err, btn))));
  }

  /* ---------- main shell ---------- */
  var TABS = [['galleries', 'Client galleries'], ['photos', 'Photos'], ['details', 'Site details'], ['enquiries', 'Enquiries']];
  function newCount() { return S.enquiries.filter(function (e) { return !e.handled; }).length; }
  function renderMain() {
    var tabsEl = h('div', { class: 'tabs', role: 'navigation', 'aria-label': 'Dashboard sections' });
    var panel = h('main', { class: 'panel' });
    function draw() {
      tabsEl.textContent = '';
      TABS.forEach(function (t) {
        var b = h('button', { class: 'tab', type: 'button', onclick: function () { S.tab = t[0]; draw(); } }, t[1],
          t[0] === 'enquiries' && newCount() ? h('span', { class: 'badge', text: String(newCount()) }) : null);
        if (S.tab === t[0]) b.setAttribute('aria-current', 'page');
        tabsEl.appendChild(b);
      });
      panel.textContent = '';
      panel.appendChild(h('div', { class: 'wrap' }, ({ galleries: galleriesPanel, photos: photosPanel, details: detailsPanel, enquiries: enquiriesPanel })[S.tab](draw)));
      if (S.tab === 'enquiries') window.scrollTo(0, 0);
    }
    var root = h('div', null,
      h('header', { class: 'top' }, h('div', { class: 'wrap' },
        h('div', { class: 'top-in' },
          h('span', { class: 'top-name', text: S.studio.name || 'Studio' }),
          h('div', { class: 'row' },
            h('a', { class: 'btn btn-ghost btn-sm', href: './', target: '_blank', rel: 'noopener', text: 'View my site' }),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Log out', onclick: function () { db.signOut(); S.studio = null; renderLogin(); } }))),
        tabsEl)),
      panel);
    mount(root);
    draw();
  }

  /* =====================================================================
   *  Client galleries
   * ===================================================================== */
  function codeMessage(g) {
    return 'Hello' + (g.client_name ? ' ' + g.client_name : '') + ', your photos from ' + (S.studio.name || 'the studio') + ' are ready.\n' +
      'Open ' + siteUrl() + '#galleries and enter this access code: ' + g.code;
  }
  function galleriesPanel(redraw) {
    var client = h('input', { type: 'text', autocomplete: 'off' });
    var link = h('input', { type: 'url', placeholder: 'https://drive.google.com/drive/folders/…', spellcheck: false, autocomplete: 'off' });
    var note = h('input', { type: 'text', autocomplete: 'off' });
    var err = h('p', { class: 'err', role: 'alert' });
    var btn = h('button', { class: 'btn btn-gold', type: 'submit', text: 'Create gallery and code' });
    function create(attempt) {
      var g = { studio_id: S.studio.id, client_name: client.value.trim(), code: GalleryCrypto.generateCode(), drive_url: link.value.trim(), note: note.value.trim() };
      return db.insert('galleries', [g]).catch(function (e) { if (e.code === '23505' && attempt < 3) return create(attempt + 1); throw e; });
    }
    var form = h('form', { class: 'box', novalidate: true, onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      if (!client.value.trim()) { err.textContent = 'Enter the client’s name so you can find them later.'; client.focus(); return; }
      if (!/^https:\/\/\S+$/i.test(link.value.trim())) { err.textContent = 'Paste the full Google Drive folder link, starting with https://'; link.focus(); return; }
      busy(btn, true, 'Creating…');
      create(0).then(function (rows) {
        S.galleries.unshift(rows[0]); S.fresh = rows[0].id; busy(btn, false); redraw();
        if (!/drive\.google\.com|photos\.app\.goo\.gl|dropbox\.com|pic-time|pixieset/i.test(rows[0].drive_url)) toast('That link is not from Google Drive. Make sure it opens for anyone who has it.', 'bad');
      }, function (e2) { busy(btn, false); err.textContent = friendly(e2); });
    } },
      h('h3', { text: 'New client gallery' }),
      h('p', { class: 'hint', text: 'In Google Drive, share the client’s folder as “Anyone with the link can view”, copy its link, and paste it here. The code is made for you.' }),
      h('div', { class: 'grid2' }, field('Client name', client), field('Google Drive folder link', link)),
      field('Private note (only you see this)', note), err, btn);

    var list = h('div', { class: 'glist' });
    if (!S.galleries.length) list.appendChild(h('p', { class: 'empty', text: 'No client galleries yet. Create the first one above.' }));
    S.galleries.forEach(function (g) {
      var item = h('div', { class: 'gitem' + (g.active ? '' : ' is-off') + (S.fresh === g.id ? ' fresh' : '') },
        h('div', { class: 'row spread' }, h('span', { class: 'gname', text: g.client_name || 'Unnamed client' }),
          h('span', { class: 'pill' + (g.active ? ' on' : ''), text: g.active ? 'Open' : 'Paused' })),
        h('div', { class: 'gcode', text: g.code }),
        h('div', { class: 'glink', text: g.drive_url }),
        g.note ? h('p', { class: 'hint', text: g.note }) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-gold btn-sm', type: 'button', text: 'Copy message to send', onclick: function () { copy(codeMessage(g), 'Message'); } }),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Copy code', onclick: function () { copy(g.code, 'Code'); } }),
          h('a', { class: 'btn btn-ghost btn-sm', href: 'https://wa.me/?text=' + encodeURIComponent(codeMessage(g)), target: '_blank', rel: 'noopener', text: 'Send on WhatsApp' }),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: g.active ? 'Pause' : 'Reopen', onclick: function () {
            db.update('galleries', { id: 'eq.' + g.id }, { active: !g.active }).then(function (r) { Object.assign(g, r[0]); redraw(); }, fail);
          } }),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Change link', onclick: function () {
            var v = window.prompt('Paste the new Google Drive link for ' + (g.client_name || 'this client') + ':', g.drive_url);
            if (v === null) return; v = v.trim();
            if (!/^https:\/\/\S+$/i.test(v)) return toast('That is not a full link starting with https://', 'bad');
            db.update('galleries', { id: 'eq.' + g.id }, { drive_url: v }).then(function (r) { Object.assign(g, r[0]); redraw(); toast('Link updated.', 'good'); }, fail);
          } }),
          h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Delete', onclick: function () {
            if (!window.confirm('Delete the gallery for ' + (g.client_name || 'this client') + '? Their code will stop working. The photos in Google Drive are not touched.')) return;
            db.remove('galleries', { id: 'eq.' + g.id }).then(function () { S.galleries = S.galleries.filter(function (x) { return x !== g; }); redraw(); }, fail);
          } })));
      list.appendChild(item);
    });
    return [h('div', null, h('h2', { text: 'Client galleries' }),
      h('p', { class: 'lead', text: 'Make a private code for each client. They enter it in the “Client galleries” box on your site and their Drive folder opens. Nobody else can see the link.' })), form, list];
  }

  /* =====================================================================
   *  Photos
   * ===================================================================== */
  function sectionPhotos(id) {
    return S.photos.filter(function (p) { return p.section_id === id; }).sort(function (a, b) { return a.position - b.position; });
  }
  function renumber(list, table) {
    var changed = [];
    list.forEach(function (it, i) { if (it.position !== i) { it.position = i; changed.push(it); } });
    return Promise.all(changed.map(function (it) { return db.update(table, { id: 'eq.' + it.id }, { position: it.position }); }));
  }
  function storagePaths(p) {
    return [p.full_path, p.thumb_path].filter(function (x) { return x && !/^(img\/|https?:)/.test(x); });
  }
  function previewUrl(path) { return /^(img\/|https?:)/.test(path) ? path : db.publicUrl(BUCKET, path); }
  function sectionBySlug(slug) { return S.sections.filter(function (s) { return s.slug === slug; })[0]; }

  function decode(file) {
    var fallback = function () {
      return new Promise(function (res, rej) {
        var u = URL.createObjectURL(file), i = new Image();
        i.onload = function () { URL.revokeObjectURL(u); res(i); };
        i.onerror = function () { rej(new Error('That file could not be read as a picture.')); };
        i.src = u;
      });
    };
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(fallback);
    return fallback();
  }
  function render(src, longEdge, type, quality) {
    var w = src.naturalWidth || src.width, hgt = src.naturalHeight || src.height;
    var k = Math.min(1, longEdge / Math.max(w, hgt));
    var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(hgt * k));
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var x = c.getContext('2d');
    if (type === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); }
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, cw, ch);
    return new Promise(function (res, rej) {
      c.toBlob(function (b) { b ? res({ blob: b, w: cw, h: ch }) : rej(new Error('Could not prepare the picture.')); }, type, quality);
    });
  }
  function rnd() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function uploadOne(file, section, line) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error('Use JPEG, PNG or WebP pictures (RAW files cannot be shown on a website).'));
    if (file.size > 60 * 1024 * 1024) return Promise.reject(new Error('This file is over 60 MB. Export a smaller JPEG.'));
    var base = S.studio.id + '/' + rnd(), fullPath = base + '.jpg', thumbPath = base + '-m.jpg', done = [];
    line('Preparing…');
    return decode(file).then(function (src) {
      return Promise.all([render(src, 2000, 'image/jpeg', 0.85), render(src, 1200, 'image/jpeg', 0.82)]);
    }).then(function (r) {
      line('Uploading…');
      return db.upload(BUCKET, fullPath, r[0].blob, 'image/jpeg').then(function () { done.push(fullPath); return db.upload(BUCKET, thumbPath, r[1].blob, 'image/jpeg'); })
        .then(function () { done.push(thumbPath); });
    }).then(function () {
      return decode(file); // dimensions of the thumbnail ratio
    }).then(function (src) {
      var w = src.naturalWidth || src.width, hgt = src.naturalHeight || src.height, k = Math.min(1, 1200 / Math.max(w, hgt));
      var list = sectionPhotos(section.id);
      return db.insert('photos', [{ studio_id: S.studio.id, section_id: section.id, full_path: fullPath, thumb_path: thumbPath,
        w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(hgt * k)), alt: section.title + ' photograph', position: list.length }]);
    }).then(function (rows) { S.photos.push(rows[0]); }, function (e) {
      if (done.length) db.removeFiles(BUCKET, done).catch(function () {});
      throw e;
    });
  }

  function importExisting(redraw, btn) {
    var chapters = window.PORTFOLIO || [];
    busy(btn, true, 'Bringing them in…');
    var pos = S.sections.length;
    chapters.reduce(function (chain, ch, ci) {
      return chain.then(function () {
        var existing = sectionBySlug(ch.id);
        var secP = existing ? Promise.resolve(existing) :
          db.insert('sections', [{ studio_id: S.studio.id, slug: ch.id, title: ch.title, note: ch.note || '', narrow: !!ch.narrow, position: pos + ci }]).then(function (r) { S.sections.push(r[0]); return r[0]; });
        return secP.then(function (sec) {
          var rows = [], n = 0;
          ch.rows.forEach(function (r) { r.forEach(function (p) {
            var d = p[1].split(':');
            rows.push({ studio_id: S.studio.id, section_id: sec.id, full_path: 'img/' + p[0] + '.jpg', thumb_path: 'img/' + p[0] + '-m.jpg', w: +d[0], h: +d[1], alt: p[2], position: n++ });
          }); });
          return db.insert('photos', rows).then(function (r) { r.forEach(function (x) { S.photos.push(x); }); });
        });
      });
    }, Promise.resolve()).then(function () { toast('Your current photos are now in the dashboard.', 'good'); redraw(); }, function (e) { busy(btn, false); fail(e); });
  }

  function photosPanel(redraw) {
    var out = [h('div', null, h('h2', { text: 'Photos' }),
      h('p', { class: 'lead', text: 'Upload photographs into sections. Each section becomes a chapter on your site. Rows are arranged automatically, in the order you set here.' }))];

    if (!S.photos.length && (window.PORTFOLIO || []).length) {
      var ib = h('button', { class: 'btn btn-gold', type: 'button', text: 'Bring in the photos already on my site' });
      ib.addEventListener('click', function () { importExisting(redraw, ib); });
      out.push(h('div', { class: 'box' }, h('h3', { text: 'Your site already has ' + window.PORTFOLIO.reduce(function (n, c) { return n + c.rows.reduce(function (m, r) { return m + r.length; }, 0); }, 0) + ' photographs' }),
        h('p', { class: 'hint', text: 'Bring them in so you can reorder, rename or remove them here. They stay stored in your site folder.' }), h('div', { class: 'row' }, ib)));
    }

    /* upload */
    var secSel = h('select');
    S.sections.forEach(function (s) { secSel.appendChild(h('option', { value: s.id, text: s.title })); });
    var fileIn = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
    var queue = h('ul', { class: 'queue' });
    var upBtn = h('button', { class: 'btn btn-gold', type: 'button', text: 'Upload photos' });
    upBtn.addEventListener('click', function () {
      var files = Array.prototype.slice.call(fileIn.files || []);
      var sec = S.sections.filter(function (s) { return s.id === secSel.value; })[0];
      if (!sec) return toast('Create a section first (below), then choose it here.', 'bad');
      if (!files.length) return toast('Choose one or more photographs first.', 'bad');
      busy(upBtn, true); queue.textContent = '';
      var okCount = 0;
      files.reduce(function (chain, f) {
        var li = h('li', null, h('span', { text: f.name }), h('span', { text: 'Waiting' })); queue.appendChild(li);
        var set = function (t, c) { li.lastChild.textContent = t; li.lastChild.className = c || ''; };
        return chain.then(function () { return uploadOne(f, sec, set); }).then(function () { okCount++; set('Done', 'ok'); }, function (e) { set(friendly(e), 'bad'); });
      }, Promise.resolve()).then(function () {
        busy(upBtn, false); fileIn.value = '';
        if (okCount) { toast(okCount + (okCount === 1 ? ' photo' : ' photos') + ' added.', 'good'); setTimeout(redraw, 900); }
      });
    });
    out.push(h('div', { class: 'drop' }, h('h3', { text: 'Add photographs' }),
      S.sections.length ? [field('Put them in', secSel), field('Choose photographs', fileIn, 'JPEG, PNG or WebP. They are resized for the web here, and location data is removed.'), h('div', { class: 'row', style: 'margin-top:12px' }, upBtn), queue]
        : h('p', { class: 'hint', text: 'Create your first section below, then come back to upload.' })));

    /* new section */
    var tTitle = h('input', { type: 'text', placeholder: 'Weddings', autocomplete: 'off' });
    var tNote = h('input', { type: 'text', placeholder: 'One line about this chapter (optional)', autocomplete: 'off' });
    var secErr = h('p', { class: 'err', role: 'alert' });
    out.push(h('form', { class: 'box', novalidate: true, onsubmit: function (e) {
      e.preventDefault(); secErr.textContent = '';
      var title = tTitle.value.trim(); if (!title) { secErr.textContent = 'Give the section a name.'; return; }
      var slug = slugify(title, 30) || 'section', n = 1, base = slug;
      while (sectionBySlug(slug)) slug = base + '-' + (++n);
      db.insert('sections', [{ studio_id: S.studio.id, slug: slug, title: title, note: tNote.value.trim(), position: S.sections.length }])
        .then(function (r) { S.sections.push(r[0]); redraw(); }, function (e2) { secErr.textContent = friendly(e2); });
    } }, h('h3', { text: 'New section' }), h('div', { class: 'grid2' }, field('Section name', tTitle), field('Short description', tNote)), secErr,
      h('div', { class: 'row' }, h('button', { class: 'btn btn-ghost', type: 'submit', text: 'Add section' }))));

    /* sections and photos */
    S.sections.forEach(function (sec, si) {
      var title = h('input', { type: 'text', value: sec.title, 'aria-label': 'Section name' });
      var note = h('input', { type: 'text', value: sec.note, placeholder: 'Short description', 'aria-label': 'Section description' });
      function saveSec(patch) { return db.update('sections', { id: 'eq.' + sec.id }, patch).then(function (r) { Object.assign(sec, r[0]); toast('Saved.', 'good'); }, fail); }
      title.addEventListener('change', function () { if (!title.value.trim()) { title.value = sec.title; return; } saveSec({ title: title.value.trim() }); });
      note.addEventListener('change', function () { saveSec({ note: note.value.trim() }); });
      var narrow = h('input', { type: 'checkbox', checked: sec.narrow, onchange: function () { saveSec({ narrow: narrow.checked }); } });
      var vis = h('input', { type: 'checkbox', checked: sec.visible, onchange: function () { saveSec({ visible: vis.checked }); } });
      function moveSec(d) {
        var j = si + d; if (j < 0 || j >= S.sections.length) return;
        S.sections.splice(si, 1); S.sections.splice(j, 0, sec);
        renumber(S.sections, 'sections').then(redraw, function (e) { fail(e); });
      }
      var photos = sectionPhotos(sec.id);
      var grid = h('div', { class: 'pgrid' });
      if (!photos.length) grid.appendChild(h('p', { class: 'empty', text: 'No photographs here yet.' }));
      photos.forEach(function (p, pi) {
        var alt = h('input', { type: 'text', value: p.alt, 'aria-label': 'Describe this photograph', placeholder: 'Describe the photo' });
        alt.addEventListener('change', function () { db.update('photos', { id: 'eq.' + p.id }, { alt: alt.value.trim() }).then(function (r) { Object.assign(p, r[0]); toast('Saved.', 'good'); }, fail); });
        var mv = h('select', { 'aria-label': 'Move to another section' }, h('option', { value: '', text: 'Move to…' }));
        S.sections.forEach(function (o) { if (o.id !== sec.id) mv.appendChild(h('option', { value: o.id, text: o.title })); });
        mv.addEventListener('change', function () {
          var target = S.sections.filter(function (o) { return o.id === mv.value; })[0]; if (!target) return;
          var tl = sectionPhotos(target.id);
          db.update('photos', { id: 'eq.' + p.id }, { section_id: target.id, position: tl.length }).then(function (r) {
            Object.assign(p, r[0]); return renumber(sectionPhotos(sec.id), 'photos');
          }).then(redraw, fail);
        });
        function movePhoto(d) {
          var j = pi + d; if (j < 0 || j >= photos.length) return;
          var l = photos.slice(); l.splice(pi, 1); l.splice(j, 0, p);
          renumber(l, 'photos').then(redraw, fail);
        }
        var isCover = S.studio.hero_photo_id === p.id;
        var card = h('div', { class: 'pcard' },
          h('div', { class: 'pic' }, h('img', { src: previewUrl(p.thumb_path), alt: p.alt, loading: 'lazy' }), isCover ? h('span', { class: 'pill on cover', text: 'Cover photo' }) : null),
          h('div', { class: 'pbody' }, alt,
            h('div', { class: 'row' },
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '←', 'aria-label': 'Move earlier', disabled: pi === 0, onclick: function () { movePhoto(-1); } }),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '→', 'aria-label': 'Move later', disabled: pi === photos.length - 1, onclick: function () { movePhoto(1); } }),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: isCover ? 'Remove cover' : 'Make cover', onclick: function () {
                db.update('studios', { id: 'eq.' + S.studio.id }, { hero_photo_id: isCover ? null : p.id }).then(function (r) { S.studio = r[0]; redraw(); toast(isCover ? 'Cover photo cleared.' : 'This is now the big photo at the top of your site.', 'good'); }, fail);
              } })),
            S.sections.length > 1 ? mv : null,
            h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Delete photo', onclick: function () {
              if (!window.confirm('Delete this photograph from your site?')) return;
              db.remove('photos', { id: 'eq.' + p.id }).then(function () {
                S.photos = S.photos.filter(function (x) { return x !== p; });
                if (S.studio.hero_photo_id === p.id) S.studio.hero_photo_id = null;
                db.removeFiles(BUCKET, storagePaths(p)).catch(function () {});
                return renumber(sectionPhotos(sec.id), 'photos');
              }).then(redraw, fail);
            } })));
        grid.appendChild(card);
      });
      out.push(h('section', { class: 'sec', 'aria-label': sec.title },
        h('div', { class: 'sec-head' },
          h('div', { class: 'grid2' }, field('Section name', title), field('Short description', note)),
          h('div', { class: 'row spread' },
            h('div', { class: 'row' }, h('label', { class: 'check' }, vis, 'Show on my site'), h('label', { class: 'check' }, narrow, 'Mostly tall photos (keeps them from getting too big)')),
            h('div', { class: 'row' },
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Move section up', disabled: si === 0, onclick: function () { moveSec(-1); } }),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Move section down', disabled: si === S.sections.length - 1, onclick: function () { moveSec(1); } }),
              h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Delete section', onclick: function () {
                if (!window.confirm('Delete the section "' + sec.title + '" and its ' + photos.length + ' photographs from your site?')) return;
                var paths = []; photos.forEach(function (p) { paths = paths.concat(storagePaths(p)); });
                db.remove('sections', { id: 'eq.' + sec.id }).then(function () {
                  S.sections = S.sections.filter(function (x) { return x !== sec; });
                  S.photos = S.photos.filter(function (x) { return x.section_id !== sec.id; });
                  if (S.studio.hero_photo_id && !S.photos.some(function (x) { return x.id === S.studio.hero_photo_id; })) S.studio.hero_photo_id = null;
                  db.removeFiles(BUCKET, paths).catch(function () {});
                  redraw();
                }, fail);
              } })))),
        grid));
    });
    return out;
  }

  /* =====================================================================
   *  Site details
   * ===================================================================== */
  function detailsPanel(redraw) {
    var st = S.studio;
    var f = {
      name: h('input', { type: 'text', value: st.name }),
      city: h('input', { type: 'text', value: st.city, placeholder: 'Lagos, Nigeria' }),
      phone: h('input', { type: 'text', value: st.phone_display, placeholder: '0705 582 1035' }),
      whatsapp: h('input', { type: 'text', value: st.whatsapp, inputMode: 'tel', placeholder: '2347055821035' }),
      email: h('input', { type: 'email', value: st.email }),
      instagram: h('input', { type: 'text', value: st.instagram, placeholder: 'yourusername', autocapitalize: 'none' }),
      lede: h('textarea', { rows: 3, value: st.lede, placeholder: 'The line under your name at the top of the site (leave empty to keep the current one)' }),
      headline: h('input', { type: 'text', value: st.headline, placeholder: 'Leave empty to keep the current heading' }),
      bio: h('textarea', { rows: 10, value: st.bio, placeholder: 'Your bio. Leave a blank line between paragraphs. Leave empty to keep the current bio.' }),
      services: h('textarea', { rows: 6, value: (st.services || []).join('\n'), placeholder: 'One service per line' })
    };
    f.bio.value = st.bio; f.lede.value = st.lede; f.services.value = (st.services || []).join('\n');
    var err = h('p', { class: 'err', role: 'alert' });
    var wa = h('p', { class: 'hint' });
    function showWa() { var n = toWhatsapp(f.whatsapp.value || f.phone.value); wa.textContent = n ? 'WhatsApp messages will go to wa.me/' + n : 'Enter your number so bookings can reach you.'; }
    f.whatsapp.addEventListener('input', showWa); f.phone.addEventListener('input', showWa); showWa();
    var save = h('button', { class: 'btn btn-gold', type: 'submit', text: 'Save changes' });
    var form = h('form', { class: 'box', novalidate: true, onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var wnum = toWhatsapp(f.whatsapp.value || f.phone.value);
      if (!f.name.value.trim()) { err.textContent = 'Your studio name cannot be empty.'; return; }
      if (wnum && !/^\d{8,15}$/.test(wnum)) { err.textContent = 'That WhatsApp number does not look right. Use digits only, with the country code, for example 2347055821035.'; return; }
      var ig = cleanInstagram(f.instagram.value);
      if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) { err.textContent = 'Instagram: use just your username, with letters, numbers, dots or underscores.'; return; }
      busy(save, true, 'Saving…');
      db.update('studios', { id: 'eq.' + st.id }, {
        name: f.name.value.trim(), city: f.city.value.trim(), phone_display: f.phone.value.trim(), whatsapp: wnum, email: f.email.value.trim(),
        instagram: ig, lede: f.lede.value.trim(), headline: f.headline.value.trim(), bio: f.bio.value.trim(),
        services: f.services.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20)
      }).then(function (r) { S.studio = r[0]; busy(save, false, ''); toast('Saved. Your site now shows the new details.', 'good'); redraw(); }, function (e2) { busy(save, false, ''); err.textContent = friendly(e2); });
    } },
      h('h3', { text: 'Studio and contact' }),
      h('div', { class: 'grid2' }, field('Studio name', f.name), field('Based in', f.city), field('Phone number shown on the site', f.phone),
        field('WhatsApp number (for bookings)', f.whatsapp, 'A Nigerian number like 0705 582 1035 is converted for you.'), field('Email', f.email), field('Instagram username', f.instagram, 'Leave empty to hide Instagram.')),
      wa,
      h('h3', { text: 'Words on your site', style: 'margin-top:22px' }),
      field('Opening line', f.lede), field('About heading', f.headline), field('Bio', f.bio, 'Leave a blank line between paragraphs.'), field('Services', f.services),
      err, h('div', { class: 'row' }, save));

    /* logo */
    var logoIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
    var logoBox = h('div', { class: 'box' }, h('h3', { text: 'Logo' }),
      st.logo_path ? h('p', null, h('img', { src: previewUrl(st.logo_path), alt: 'Your logo', style: 'max-height:64px;max-width:240px;background:#0d0d0e;padding:8px;border-radius:3px' })) : h('p', { class: 'hint', text: 'No logo yet. A PNG with a transparent background looks best.' }),
      field('Choose a logo picture', logoIn),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Upload logo', onclick: function () {
          var file = logoIn.files && logoIn.files[0]; if (!file) return toast('Choose a picture first.', 'bad');
          var path = S.studio.id + '/logo-' + rnd() + '.png', old = S.studio.logo_path;
          decode(file).then(function (src) { return render(src, 800, 'image/png'); })
            .then(function (r) { return db.upload(BUCKET, path, r.blob, 'image/png'); })
            .then(function () { return db.update('studios', { id: 'eq.' + S.studio.id }, { logo_path: path }); })
            .then(function (r) { S.studio = r[0]; if (old) db.removeFiles(BUCKET, storagePaths({ full_path: old })).catch(function () {}); toast('Logo saved.', 'good'); redraw(); }, fail);
        } }),
        st.logo_path ? h('button', { class: 'btn btn-danger', type: 'button', text: 'Remove logo', onclick: function () {
          var old = S.studio.logo_path;
          db.update('studios', { id: 'eq.' + S.studio.id }, { logo_path: '' }).then(function (r) { S.studio = r[0]; db.removeFiles(BUCKET, storagePaths({ full_path: old })).catch(function () {}); redraw(); }, fail);
        } }) : null));

    /* password + connection */
    var npw = h('input', { type: 'password', autocomplete: 'new-password' });
    var pwBox = h('div', { class: 'box' }, h('h3', { text: 'Change password' }), field('New password', npw, 'At least 8 characters.'),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-ghost', type: 'button', text: 'Change password', onclick: function () {
        if (npw.value.length < 8) return toast('Use at least 8 characters.', 'bad');
        db.setPassword(npw.value).then(function () { npw.value = ''; toast('Password changed.', 'good'); }, fail);
      } })));
    var mismatch = CFG.studio && CFG.studio !== st.slug;
    var conn = h('div', { class: 'box' }, h('h3', { text: 'Connection' }),
      h('p', { class: 'hint', text: 'Your web name is ' + st.slug + '. The "studio" line in config.js must be exactly this.' }),
      mismatch ? h('p', { class: 'err', text: 'config.js says "' + CFG.studio + '", so visitors will not see what you change here. Fix config.js.' }) : h('p', { class: 'hint', text: 'config.js matches. Good.' }));
    return [h('div', null, h('h2', { text: 'Site details' }), h('p', { class: 'lead', text: 'Everything here updates your public site as soon as you save.' })), form, logoBox, pwBox, conn];
  }

  /* =====================================================================
   *  Enquiries
   * ===================================================================== */
  function enquiriesPanel(redraw) {
    var list = h('div', { class: 'elist' });
    if (!S.enquiries.length) list.appendChild(h('p', { class: 'empty', text: 'No enquiries yet. When someone fills in the booking form on your site, it appears here.' }));
    S.enquiries.forEach(function (q) {
      var c = q.contact || '', num = /@/.test(c) ? '' : toWhatsapp(c);
      var item = h('div', { class: 'eitem' + (q.handled ? '' : ' is-new') },
        h('div', { class: 'row spread' }, h('span', { class: 'ename', text: q.name }), h('span', { class: 'pill' + (q.handled ? '' : ' on'), text: q.handled ? 'Done' : 'New' })),
        h('div', { class: 'facts' }, h('span', { text: q.kind || 'Enquiry' }), q.wanted_on ? h('span', { text: 'Date: ' + q.wanted_on }) : null, q.place ? h('span', { text: 'Where: ' + q.place }) : null, c ? h('span', { text: 'Contact: ' + c }) : null, h('span', { text: when(q.created_at) })),
        q.message ? h('p', { class: 'emsg', text: q.message }) : null,
        h('div', { class: 'row' },
          /^\d{9,15}$/.test(num) ? h('a', { class: 'btn btn-gold btn-sm', target: '_blank', rel: 'noopener', text: 'Reply on WhatsApp',
            href: 'https://wa.me/' + num + '?text=' + encodeURIComponent('Hello ' + q.name + ', thank you for your enquiry to ' + (S.studio.name || 'the studio') + '.') }) : null,
          /@/.test(c) ? h('a', { class: 'btn btn-gold btn-sm', text: 'Reply by email', href: 'mailto:' + c + '?subject=' + encodeURIComponent('Your enquiry to ' + (S.studio.name || 'the studio')) }) : null,
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: q.handled ? 'Mark as new' : 'Mark as done', onclick: function () {
            db.update('enquiries', { id: 'eq.' + q.id }, { handled: !q.handled }).then(function (r) { Object.assign(q, r[0]); redraw(); }, fail);
          } }),
          h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Delete', onclick: function () {
            if (!window.confirm('Delete this enquiry from ' + q.name + '?')) return;
            db.remove('enquiries', { id: 'eq.' + q.id }).then(function () { S.enquiries = S.enquiries.filter(function (x) { return x !== q; }); redraw(); }, fail);
          } })));
      list.appendChild(item);
    });
    var refresh = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Check for new enquiries', onclick: function () {
      db.select('enquiries', { select: '*', order: 'created_at.desc', limit: 300, studio_id: 'eq.' + S.studio.id }).then(function (r) { S.enquiries = r; redraw(); toast('Up to date.', 'good'); }, fail);
    } });
    return [h('div', { class: 'row spread' }, h('div', null, h('h2', { text: 'Booking enquiries' }),
      h('p', { class: 'lead', text: 'Messages sent through the booking form on your site. The same message also opens in WhatsApp for the visitor.' })), refresh), list];
  }

  boot();
})();
