'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../engine.js');
const DEFS = require('../songs.js');

test('library: has at least 10 songs', () => {
  assert.ok(Array.isArray(DEFS) && DEFS.length >= 10, `got ${DEFS && DEFS.length}`);
});

test('library: every song builds cleanly (parses, in range, chords align)', () => {
  for (const def of DEFS) {
    assert.doesNotThrow(() => M.buildSong(def), `song "${def.id}" failed to build`);
  }
});

test('library: ids are unique', () => {
  const ids = DEFS.map(d => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('library: ordered by non-decreasing tier (learning path)', () => {
  for (let i = 1; i < DEFS.length; i++) {
    assert.ok(DEFS[i].tier >= DEFS[i - 1].tier,
      `${DEFS[i].id} (tier ${DEFS[i].tier}) after ${DEFS[i - 1].id} (tier ${DEFS[i - 1].tier})`);
  }
});

test('library: every phrase is a learnable chunk (3..14 notes)', () => {
  for (const def of DEFS) {
    const s = M.buildSong(def);
    for (const [a, b] of s.phrases) {
      const len = b - a + 1;
      assert.ok(len >= 3 && len <= 14, `${def.id}: phrase of ${len} notes`);
    }
  }
});

test('library: chord track covers the melody (within 8 beats of the end)', () => {
  for (const def of DEFS) {
    const s = M.buildSong(def);
    const chordBeats = s.chords.reduce((t, c) => t + c.beats, 0);
    assert.ok(chordBeats <= s.totalBeats, `${def.id}: chords overflow`);
    assert.ok(s.totalBeats - chordBeats <= 8, `${def.id}: chords stop ${s.totalBeats - chordBeats} beats early`);
  }
});

test('library: metadata sane (names, bpm, tier)', () => {
  for (const def of DEFS) {
    assert.ok(def.he && def.he.length >= 2, `${def.id}: missing Hebrew name`);
    assert.ok(def.en && def.en.length >= 2, `${def.id}: missing English name`);
    assert.ok(def.bpm >= 60 && def.bpm <= 160, `${def.id}: bpm ${def.bpm}`);
    assert.ok([1, 2, 3].includes(def.tier), `${def.id}: tier ${def.tier}`);
  }
});

// 45-note ceiling calibrated to the canonical full Twinkle (42 notes, AABBAA
// form) — the standard first-lesson song. Anything longer is not tier 1.
test('library: tier 1 songs are short enough for a first session (<= 45 notes)', () => {
  for (const def of DEFS.filter(d => d.tier === 1)) {
    const s = M.buildSong(def);
    assert.ok(s.notes.length <= 45, `${def.id}: ${s.notes.length} notes`);
  }
});
