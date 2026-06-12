'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../engine.js');

// ---------- computer-keyboard mapping ----------
test('keyToMidi: GarageBand-style two-row mapping from base C', () => {
  assert.equal(M.keyToMidi('a', 60), 60);  // C4
  assert.equal(M.keyToMidi('w', 60), 61);  // C#4
  assert.equal(M.keyToMidi('s', 60), 62);  // D4
  assert.equal(M.keyToMidi('f', 60), 65);  // F4
  assert.equal(M.keyToMidi('t', 60), 66);  // F#4
  assert.equal(M.keyToMidi('j', 60), 71);  // B4
  assert.equal(M.keyToMidi('k', 60), 72);  // C5
  assert.equal(M.keyToMidi(';', 60), 76);  // E5
  assert.equal(M.keyToMidi('A', 60), 60);  // case-insensitive
  assert.equal(M.keyToMidi('q', 60), null); // unmapped
  assert.equal(M.keyToMidi('a', 48), 48);  // octave shift moves base
});

test('midiToKey: reverse lookup for hint labels', () => {
  assert.equal(M.midiToKey(60, 60), 'a');
  assert.equal(M.midiToKey(66, 60), 't');
  assert.equal(M.midiToKey(76, 60), ';');
  assert.equal(M.midiToKey(47, 60), null); // outside mapped window
});

// ---------- wait-mode state machine ----------
const DRILL = M.buildSong({
  id: 'drill', he: 'תרגיל', en: 'Drill', tier: 1, bpm: 100, key: 'C',
  melody: 'C4:1 D4:1 | E4:1 F4:1',  // 2 phrases x 2 notes
});

test('wait-mode: expects first note of first phrase', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 2 });
  assert.equal(wm.expected(), 60);
  assert.deepEqual(wm.phraseRange(), [0, 1]);
});

test('wait-mode: wrong press does not advance', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 2 });
  const r = wm.press(65);
  assert.equal(r.correct, false);
  assert.equal(wm.expected(), 60);
});

test('wait-mode: clean pass loops phrase, second clean pass advances', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 2 });
  let r = wm.press(60); assert.equal(r.correct, true); assert.equal(r.phrasePass, false);
  r = wm.press(62);                       // end of phrase, clean pass #1
  assert.equal(r.phrasePass, true);
  assert.equal(r.phraseDone, false);
  assert.equal(wm.expected(), 60);        // looped back
  wm.press(60); r = wm.press(62);         // clean pass #2
  assert.equal(r.phraseDone, true);
  assert.equal(wm.expected(), 64);        // phrase 2 starts (E4)
  assert.equal(wm.state().phrase, 1);
});

test('wait-mode: a pass with a mistake does not count as clean', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 2 });
  wm.press(99);                           // mistake
  wm.press(60); let r = wm.press(62);     // finish the pass
  assert.equal(r.phrasePass, false);      // dirty pass
  assert.equal(wm.state().cleanPasses, 0);
  wm.press(60); wm.press(62);             // clean #1
  wm.press(60); r = wm.press(62);         // clean #2
  assert.equal(r.phraseDone, true);
});

test('wait-mode: finishing last phrase completes the song', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 1 });
  wm.press(60); wm.press(62);             // phrase 1 done (1 pass required)
  wm.press(64); const r = wm.press(65);   // phrase 2 done
  assert.equal(r.done, true);
  assert.equal(wm.state().done, true);
  assert.equal(wm.expected(), null);
});

test('wait-mode: jumpToPhrase resets cleanly', () => {
  const wm = M.createWaitMode(DRILL, { passesRequired: 2 });
  wm.press(60);
  wm.jumpToPhrase(1);
  assert.equal(wm.expected(), 64);
  assert.equal(wm.state().cleanPasses, 0);
});

// ---------- scorer ----------
const SCORED = M.buildSong({
  id: 'scored', he: 'מבחן', en: 'Scored', tier: 1, bpm: 120, key: 'C',
  melody: 'C4:1 D4:1 E4:1 F4:1', // at 120bpm: notes at 0, 500, 1000, 1500 ms
});

test('scorer: perfect/good/miss timing windows', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 1 });
  assert.equal(sc.press(60, 0).verdict, 'perfect');
  assert.equal(sc.press(62, 600).verdict, 'perfect');   // +100ms
  assert.equal(sc.press(64, 1200).verdict, 'good');     // +200ms
  assert.equal(sc.press(65, 1900).verdict, 'miss');     // +400ms, out of window
});

test('scorer: wrong pitch is a miss and resets combo', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 1 });
  sc.press(60, 0); sc.press(62, 500);
  assert.equal(sc.summary().combo, 2);
  const r = sc.press(71, 1000);                          // wrong note
  assert.equal(r.verdict, 'miss');
  assert.equal(sc.summary().combo, 0);
  assert.equal(sc.summary().maxCombo, 2);
});

test('scorer: each expected note consumed once', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 1 });
  assert.equal(sc.press(60, 0).verdict, 'perfect');
  assert.equal(sc.press(60, 80).verdict, 'miss');        // C4 already consumed
});

test('scorer: sweep marks unplayed past notes as missed', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 1 });
  sc.press(60, 0);
  const newlyMissed = sc.sweep(1400); // D4(500) and E4(1000) are past the good window
  assert.equal(newlyMissed, 2);
  assert.equal(sc.summary().missed, 2);
});

test('scorer: tempo factor stretches expected times', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 0.5 }); // half speed: D4 at 1000ms
  assert.equal(sc.press(60, 0).verdict, 'perfect');
  assert.equal(sc.press(62, 1000).verdict, 'perfect');
});

test('scorer: summary accuracy and completion', () => {
  const sc = M.createScorer(SCORED, { tempoFactor: 1 });
  sc.press(60, 0); sc.press(62, 500); sc.press(64, 1000); sc.press(65, 1500);
  const s = sc.summary();
  assert.equal(s.perfect, 4);
  assert.equal(s.accuracy, 1);
  assert.equal(s.finished, true);
});

test('starsForAccuracy thresholds', () => {
  assert.equal(M.starsForAccuracy(0.59), 0);
  assert.equal(M.starsForAccuracy(0.6), 1);
  assert.equal(M.starsForAccuracy(0.8), 2);
  assert.equal(M.starsForAccuracy(0.93), 3);
  assert.equal(M.starsForAccuracy(1), 3);
});

// ---------- progression / unlock ----------
test('unlockedCount: 3 free, +1 per song with progress', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.equal(M.unlockedCount({}, ids), 3);
  assert.equal(M.unlockedCount({ a: { stars: 1 } }, ids), 4);
  assert.equal(M.unlockedCount({ a: { stars: 2 }, b: { learnDone: true } }, ids), 5);
  assert.equal(M.unlockedCount({ a: { stars: 1 }, b: { stars: 1 }, c: { stars: 1 }, d: { stars: 1 } }, ids), 6); // capped
});

// ---------- progress store ----------
function memStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('progress: defaults, update, best-result keeping', () => {
  const p = M.createProgress(memStorage());
  assert.deepEqual(p.get('x').stars, 0);
  p.update('x', { learnDone: true });
  assert.equal(p.get('x').learnDone, true);
  p.recordResult('x', { accuracy: 0.85, stars: 2 });
  p.recordResult('x', { accuracy: 0.7, stars: 1 });   // worse — must not regress
  assert.equal(p.get('x').stars, 2);
  assert.equal(p.get('x').bestAccuracy, 0.85);
});

test('progress: persists through storage round-trip', () => {
  const store = memStorage();
  M.createProgress(store).update('x', { learnDone: true });
  assert.equal(M.createProgress(store).get('x').learnDone, true);
});

test('progress: daily streak math', () => {
  const p = M.createProgress(memStorage());
  assert.equal(p.touchStreak('2026-06-12').streakDays, 1);
  assert.equal(p.touchStreak('2026-06-12').streakDays, 1); // same day no-op
  assert.equal(p.touchStreak('2026-06-13').streakDays, 2); // consecutive
  assert.equal(p.touchStreak('2026-06-20').streakDays, 1); // gap resets
});

test('progress: survives corrupt storage JSON', () => {
  const store = memStorage();
  store.setItem('maestro.v1', '{not json');
  const p = M.createProgress(store);
  assert.equal(p.get('x').stars, 0);
});
