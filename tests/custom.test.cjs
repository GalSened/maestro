'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../engine.js');

function memStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

const VALID = { he: 'שיר שלי', melody: 'C4:1 D4:1 E4:2', chords: 'C:4', bpm: 100 };

test('custom store: add returns a built, playable song with a custom- id', () => {
  const cs = M.createCustomStore(memStorage());
  const song = cs.add(VALID);
  assert.ok(song.id.startsWith('custom-'), song.id);
  assert.equal(song.he, 'שיר שלי');
  assert.equal(song.notes.length, 3);
  assert.equal(song.custom, true);
});

test('custom store: list returns built songs, newest last', () => {
  const cs = M.createCustomStore(memStorage());
  cs.add(VALID);
  cs.add({ ...VALID, he: 'שני' });
  const list = cs.list();
  assert.equal(list.length, 2);
  assert.equal(list[1].he, 'שני');
});

test('custom store: invalid notation throws with the bad token, nothing saved', () => {
  const cs = M.createCustomStore(memStorage());
  assert.throws(() => cs.add({ ...VALID, melody: 'C4:1 XX:9' }), /XX/);
  assert.equal(cs.list().length, 0);
});

test('custom store: melody out of keyboard range is rejected', () => {
  const cs = M.createCustomStore(memStorage());
  assert.throws(() => cs.add({ ...VALID, melody: 'A1:1' }), /range|A1/i);
});

test('custom store: missing name rejected', () => {
  const cs = M.createCustomStore(memStorage());
  assert.throws(() => cs.add({ ...VALID, he: '' }), /he|שם/);
});

test('custom store: chords are optional', () => {
  const cs = M.createCustomStore(memStorage());
  const song = cs.add({ he: 'בלי ליווי', melody: 'C4:1 D4:1 E4:1', bpm: 90 });
  assert.deepEqual(song.chords, []);
});

test('custom store: remove deletes by id', () => {
  const cs = M.createCustomStore(memStorage());
  const s = cs.add(VALID);
  cs.remove(s.id);
  assert.equal(cs.list().length, 0);
});

test('custom store: persists across instances (storage round-trip)', () => {
  const store = memStorage();
  M.createCustomStore(store).add(VALID);
  const again = M.createCustomStore(store);
  assert.equal(again.list().length, 1);
  assert.equal(again.list()[0].notes.length, 3);
});

test('custom store: survives corrupt storage', () => {
  const store = memStorage();
  store.setItem('maestro.custom', 'oops{');
  assert.equal(M.createCustomStore(store).list().length, 0);
});

test('custom store: a stored song that no longer validates is skipped, not fatal', () => {
  const store = memStorage();
  store.setItem('maestro.custom', JSON.stringify([
    { he: 'תקין', melody: 'C4:1', bpm: 100, id: 'custom-1' },
    { he: 'שבור', melody: 'ZZ:1', bpm: 100, id: 'custom-2' },
  ]));
  const list = M.createCustomStore(store).list();
  assert.equal(list.length, 1);
  assert.equal(list[0].he, 'תקין');
});
