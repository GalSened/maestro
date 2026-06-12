'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../engine.js');

// ---------- note math ----------
test('noteToMidi: naturals, sharps, flats', () => {
  assert.equal(M.noteToMidi('C4'), 60);
  assert.equal(M.noteToMidi('A4'), 69);
  assert.equal(M.noteToMidi('C3'), 48);
  assert.equal(M.noteToMidi('C6'), 84);
  assert.equal(M.noteToMidi('F#4'), 66);
  assert.equal(M.noteToMidi('Bb3'), 58);
  assert.equal(M.noteToMidi('G#5'), 80);
});

test('noteToMidi: invalid tokens throw with the token in the message', () => {
  for (const bad of ['H4', 'C', 'c4', 'C#', 'C99', '']) {
    assert.throws(() => M.noteToMidi(bad), new RegExp(bad.replace(/[#]/g, '\\#') || 'empty'), bad);
  }
});

test('midiToName round-trips', () => {
  assert.equal(M.midiToName(60), 'C4');
  assert.equal(M.midiToName(66), 'F#4');
  assert.equal(M.midiToName(48), 'C3');
  for (let m = 48; m <= 84; m++) assert.equal(M.noteToMidi(M.midiToName(m)), m);
});

test('isBlackKey', () => {
  assert.equal(M.isBlackKey(60), false); // C
  assert.equal(M.isBlackKey(61), true);  // C#
  assert.equal(M.isBlackKey(66), true);  // F#
  assert.equal(M.isBlackKey(71), false); // B
});

// ---------- melody parser ----------
test('parseMelody: notes with beats and start times', () => {
  const r = M.parseMelody('C4:1 D4:0.5 E4:1.5');
  assert.equal(r.notes.length, 3);
  assert.deepEqual(r.notes.map(n => n.midi), [60, 62, 64]);
  assert.deepEqual(r.notes.map(n => n.beats), [1, 0.5, 1.5]);
  assert.deepEqual(r.notes.map(n => n.start), [0, 1, 1.5]);
  assert.equal(r.totalBeats, 3);
});

test('parseMelody: rests advance time but produce no notes', () => {
  const r = M.parseMelody('C4:1 R:2 D4:1');
  assert.equal(r.notes.length, 2);
  assert.equal(r.notes[1].start, 3);
  assert.equal(r.totalBeats, 4);
});

test('parseMelody: | marks phrase boundaries as note-index ranges', () => {
  const r = M.parseMelody('C4:1 D4:1 | E4:1 F4:1 G4:1 | A4:1');
  assert.deepEqual(r.phrases, [[0, 1], [2, 4], [5, 5]]);
});

test('parseMelody: whole string is one phrase when no bars', () => {
  const r = M.parseMelody('C4:1 D4:1');
  assert.deepEqual(r.phrases, [[0, 1]]);
});

test('parseMelody: bad token throws naming the token', () => {
  assert.throws(() => M.parseMelody('C4:1 X9:1'), /X9/);
  assert.throws(() => M.parseMelody('C4'), /C4/);       // missing beats
  assert.throws(() => M.parseMelody('C4:zz'), /zz/);    // bad beats
  assert.throws(() => M.parseMelody('C4:0'), /C4:0/);   // zero duration
  assert.throws(() => M.parseMelody(''), /empty/i);
  assert.throws(() => M.parseMelody('| C4:1'), /phrase/i); // empty phrase
});

// ---------- chords ----------
test('chordToMidis: triads and sevenths voiced in octave 3', () => {
  assert.deepEqual(M.chordToMidis('C'), [48, 52, 55]);       // C3 E3 G3
  assert.deepEqual(M.chordToMidis('Am'), [57, 60, 64]);      // A3 C4 E4
  assert.deepEqual(M.chordToMidis('G7'), [55, 59, 62, 65]);  // G3 B3 D4 F4
  assert.deepEqual(M.chordToMidis('Bb'), [58, 62, 65]);
  assert.deepEqual(M.chordToMidis('F#m'), [54, 57, 61]);
});

test('chordToMidis: unknown symbol throws', () => {
  assert.throws(() => M.chordToMidis('Q'), /Q/);
  assert.throws(() => M.chordToMidis('Csus13'), /Csus13/);
});

test('parseChords: symbols with beats and start times', () => {
  const r = M.parseChords('C:4 G7:2 Am:2');
  assert.equal(r.length, 3);
  assert.deepEqual(r.map(c => c.symbol), ['C', 'G7', 'Am']);
  assert.deepEqual(r.map(c => c.start), [0, 4, 6]);
  assert.deepEqual(r.map(c => c.beats), [4, 2, 2]);
});

// ---------- song builder ----------
const TINY = {
  id: 'tiny', he: 'זעיר', en: 'Tiny', tier: 1, bpm: 100, key: 'C',
  melody: 'C4:1 D4:1 | E4:2',
  chords: 'C:2 G7:2',
};

test('buildSong: assembles validated song object', () => {
  const s = M.buildSong(TINY);
  assert.equal(s.id, 'tiny');
  assert.equal(s.notes.length, 3);
  assert.equal(s.totalBeats, 4);
  assert.equal(s.phrases.length, 2);
  assert.equal(s.chords.length, 2);
  assert.equal(s.bpm, 100);
});

test('buildSong: rejects notes outside C3..C6', () => {
  assert.throws(() => M.buildSong({ ...TINY, melody: 'B2:1' }), /range|B2/i);
  assert.throws(() => M.buildSong({ ...TINY, melody: 'C#6:1' }), /range|C#6/i);
});

test('buildSong: rejects chord track longer than melody', () => {
  assert.throws(() => M.buildSong({ ...TINY, chords: 'C:4 G7:4 C:4' }), /chord/i);
});

test('buildSong: requires id, names, bpm, tier', () => {
  assert.throws(() => M.buildSong({ ...TINY, id: undefined }), /id/i);
  assert.throws(() => M.buildSong({ ...TINY, he: undefined }), /he/i);
  assert.throws(() => M.buildSong({ ...TINY, bpm: 0 }), /bpm/i);
  assert.throws(() => M.buildSong({ ...TINY, tier: undefined }), /tier/i);
});

test('beatsToMs converts via bpm and tempo factor', () => {
  assert.equal(M.beatsToMs(1, 120, 1), 500);
  assert.equal(M.beatsToMs(2, 60, 1), 2000);
  assert.equal(M.beatsToMs(1, 100, 0.5), 1200); // half speed = longer ms
});
