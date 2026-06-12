'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// every file the app ships — the service worker must precache all of them
const CORE_ASSETS = [
  'index.html', 'styles.css', 'engine.js', 'songs.js', 'audio.js', 'ui.js',
  'manifest.webmanifest',
];

test('manifest: valid JSON with installability-required fields', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.dir, 'rtl');
  assert.equal(m.lang, 'he');
  assert.equal(m.display, 'standalone');
  assert.ok(m.name && m.short_name, 'name/short_name');
  assert.ok(m.start_url.startsWith('.'), 'start_url must be relative (subpath hosting)');
  assert.ok(m.theme_color && m.background_color, 'colors');
});

test('manifest: declares 192 + 512 + maskable icons, all files exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  const sizes = m.icons.map(i => i.sizes);
  assert.ok(sizes.includes('192x192'), 'needs 192x192');
  assert.ok(sizes.includes('512x512'), 'needs 512x512');
  assert.ok(m.icons.some(i => (i.purpose || '').includes('maskable')), 'needs a maskable icon');
  for (const i of m.icons) {
    assert.ok(!i.src.startsWith('/'), `icon src must be relative: ${i.src}`);
    assert.ok(fs.existsSync(path.join(root, i.src)), `icon file missing: ${i.src}`);
    assert.ok(fs.statSync(path.join(root, i.src)).size > 500, `icon suspiciously small: ${i.src}`);
  }
});

test('service worker: precaches every core asset and all manifest icons', () => {
  const sw = read('sw.js');
  const m = JSON.parse(read('manifest.webmanifest'));
  for (const a of [...CORE_ASSETS, ...m.icons.map(i => i.src)]) {
    assert.ok(sw.includes(a.replace(/^\.\//, '')), `sw.js precache missing: ${a}`);
  }
  assert.match(sw, /maestro-v\d+/, 'versioned cache name for safe updates');
});

test('index.html: wires manifest, iOS metas, apple-touch-icon, SW registration', () => {
  const html = read('index.html');
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.ok(fs.existsSync(path.join(root, 'icons/apple-touch-icon.png')), 'apple-touch-icon.png missing');
  assert.match(html, /serviceWorker/, 'must register the service worker');
  assert.match(html, /location\.protocol/, 'SW registration must be guarded so file:// keeps working');
});
