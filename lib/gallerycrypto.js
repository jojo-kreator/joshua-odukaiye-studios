/* Locks and unlocks a client's gallery link with an access code.
 *
 * The link is encrypted in the browser (AES-GCM, with a key made from the access code by PBKDF2, 250,000 rounds),
 * so galleries.js holds only scrambled text. The same file runs on the website and inside tools/gallery-maker.html.
 */
(function (root) {
  'use strict';
  var ITER = 250000;
  // No look-alike characters (no i, l, o, 0 or 1), so codes are easy to read out or type from a message.
  var ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  function normalize(code) {
    return String(code == null ? '' : code).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function toB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function fromB64(str) {
    var s = atob(str), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function deriveKey(code, salt) {
    var subtle = root.crypto.subtle;
    return subtle.importKey('raw', enc.encode(normalize(code)), 'PBKDF2', false, ['deriveKey']).then(function (material) {
      return subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  /* Returns a random code such as "k7qm-4txd" (about 40 bits). */
  function generateCode() {
    var out = '';
    var limit = 256 - (256 % ALPHABET.length); // reject values that would bias the choice
    while (out.length < 8) {
      var buf = root.crypto.getRandomValues(new Uint8Array(16));
      for (var i = 0; i < buf.length && out.length < 8; i++) {
        if (buf[i] < limit) out += ALPHABET[buf[i] % ALPHABET.length];
      }
    }
    return out.slice(0, 4) + '-' + out.slice(4);
  }

  /* Promise of an entry { v, s, i, d } that only the right code can open. */
  function create(code, url) {
    var salt = root.crypto.getRandomValues(new Uint8Array(16));
    var iv = root.crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(code, salt).then(function (key) {
      return root.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify({ u: url })));
    }).then(function (data) {
      return { v: 1, s: toB64(salt), i: toB64(iv), d: toB64(new Uint8Array(data)) };
    });
  }

  /* Promise of the link, or null when the code does not open this entry. */
  function unlock(code, entry) {
    if (!entry || entry.v !== 1 || !normalize(code)) return Promise.resolve(null);
    var salt, iv, data;
    try { salt = fromB64(entry.s); iv = fromB64(entry.i); data = fromB64(entry.d); }
    catch (e) { return Promise.resolve(null); }
    return deriveKey(code, salt).then(function (key) {
      return root.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    }).then(function (plain) {
      var u = JSON.parse(dec.decode(plain)).u;
      return typeof u === 'string' && /^https:\/\//i.test(u) ? u : null;
    }).catch(function () { return null; });
  }

  var api = { normalize: normalize, generateCode: generateCode, create: create, unlock: unlock };
  root.GalleryCrypto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
