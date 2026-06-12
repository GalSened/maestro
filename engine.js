/* MAESTRO engine — pure logic, no DOM/no audio. Loaded by the browser as a
 * <script> (window.Maestro) and by node tests via require(). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Maestro = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- note math ----------
  const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const RANGE_LO = 48; // C3
  const RANGE_HI = 84; // C6

  function noteToMidi(token) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(token);
    if (!m) throw new Error(`bad note token: "${token === '' ? 'empty' : token}"`);
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return PITCH_CLASS[m[1]] + acc + (Number(m[3]) + 1) * 12;
  }

  function midiToName(midi) {
    return NAMES_SHARP[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  function isBlackKey(midi) {
    return NAMES_SHARP[midi % 12].length === 2;
  }

  // ---------- melody parser ----------
  // "C4:1 D4:0.5 R:2 | E4:1" — pitch:beats tokens, R = rest, | = phrase boundary
  function parseMelody(text) {
    if (!text || !text.trim()) throw new Error('empty melody');
    const notes = [];
    const phrases = [];
    let cursor = 0;          // running time in beats
    let phraseStart = 0;     // note index where current phrase began
    const endPhrase = () => {
      if (notes.length === phraseStart) throw new Error('empty phrase in melody');
      phrases.push([phraseStart, notes.length - 1]);
      phraseStart = notes.length;
    };
    for (const tok of text.trim().split(/\s+/)) {
      if (tok === '|') { endPhrase(); continue; }
      const m = /^([A-Ga-gR](?:#|b)?\d?):(.+)$/.exec(tok);
      if (!m) throw new Error(`bad melody token: "${tok}"`);
      const beats = Number(m[2]);
      if (!Number.isFinite(beats) || beats <= 0) throw new Error(`bad duration in token: "${tok}" ("${m[2]}")`);
      if (m[1] === 'R') { cursor += beats; continue; }
      notes.push({ midi: noteToMidi(m[1]), beats, start: cursor });
      cursor += beats;
    }
    endPhrase();
    return { notes, phrases, totalBeats: cursor };
  }

  // ---------- chords ----------
  const CHORD_QUALITIES = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6] };

  function chordToMidis(symbol) {
    const m = /^([A-G])(#|b)?(m7|m|7|dim)?$/.exec(symbol);
    if (!m) throw new Error(`unknown chord symbol: "${symbol}"`);
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const root = 48 + ((PITCH_CLASS[m[1]] + acc + 12) % 12); // voiced from octave 3
    return CHORD_QUALITIES[m[3] || ''].map(iv => root + iv);
  }

  function parseChords(text) {
    if (!text || !text.trim()) return [];
    const out = [];
    let cursor = 0;
    for (const tok of text.trim().split(/\s+/)) {
      const i = tok.lastIndexOf(':');
      if (i < 1) throw new Error(`bad chord token: "${tok}"`);
      const symbol = tok.slice(0, i);
      const beats = Number(tok.slice(i + 1));
      if (!Number.isFinite(beats) || beats <= 0) throw new Error(`bad chord duration: "${tok}"`);
      out.push({ symbol, midis: chordToMidis(symbol), beats, start: cursor });
      cursor += beats;
    }
    return out;
  }

  // ---------- song builder ----------
  function buildSong(def) {
    for (const field of ['id', 'he', 'en']) {
      if (!def[field]) throw new Error(`song missing ${field}`);
    }
    if (!def.bpm || def.bpm <= 0) throw new Error(`song ${def.id}: bad bpm`);
    if (def.tier == null) throw new Error(`song ${def.id}: missing tier`);
    const mel = parseMelody(def.melody);
    for (const n of mel.notes) {
      if (n.midi < RANGE_LO || n.midi > RANGE_HI) {
        throw new Error(`song ${def.id}: note ${midiToName(n.midi)} out of range C3..C6`);
      }
    }
    const chords = parseChords(def.chords || '');
    const chordBeats = chords.reduce((s, c) => s + c.beats, 0);
    if (chordBeats > mel.totalBeats) {
      throw new Error(`song ${def.id}: chord track (${chordBeats} beats) longer than melody (${mel.totalBeats})`);
    }
    return {
      id: def.id, he: def.he, en: def.en, tier: def.tier, bpm: def.bpm, key: def.key || 'C',
      notes: mel.notes, phrases: mel.phrases, totalBeats: mel.totalBeats, chords,
    };
  }

  function beatsToMs(beats, bpm, tempoFactor) {
    return (beats * 60000) / (bpm * (tempoFactor || 1));
  }

  return {
    RANGE_LO, RANGE_HI,
    noteToMidi, midiToName, isBlackKey,
    parseMelody, parseChords, chordToMidis,
    buildSong, beatsToMs,
  };
});
