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

  // ---------- computer-keyboard mapping ----------
  // GarageBand/Ableton standard: home row = white keys, row above = black keys.
  const KEY_OFFSETS = {
    a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
    k: 12, o: 13, l: 14, p: 15, ';': 16,
  };

  function keyToMidi(key, baseMidi) {
    const off = KEY_OFFSETS[String(key).toLowerCase()];
    return off == null ? null : baseMidi + off;
  }

  function midiToKey(midi, baseMidi) {
    const off = midi - baseMidi;
    for (const k in KEY_OFFSETS) if (KEY_OFFSETS[k] === off) return k;
    return null;
  }

  // ---------- wait-mode state machine ----------
  // Learn mode: the song waits for the right key. Each phrase loops until
  // `passesRequired` clean (mistake-free) passes, then chains to the next.
  function createWaitMode(song, opts) {
    const passesRequired = (opts && opts.passesRequired) || 2;
    let phrase = 0, noteIdx = song.phrases[0][0];
    let cleanPasses = 0, dirty = false, done = false;

    const range = () => song.phrases[phrase];

    function jumpToPhrase(p) {
      phrase = p; noteIdx = song.phrases[p][0];
      cleanPasses = 0; dirty = false; done = false;
    }

    function press(midi) {
      if (done) return { correct: false, phrasePass: false, phraseDone: false, done: true };
      if (midi !== song.notes[noteIdx].midi) {
        dirty = true;
        return { correct: false, phrasePass: false, phraseDone: false, done: false };
      }
      const res = { correct: true, phrasePass: false, phraseDone: false, done: false };
      if (noteIdx < range()[1]) { noteIdx++; return res; }
      // pass finished
      if (!dirty) { cleanPasses++; res.phrasePass = true; }
      dirty = false;
      if (cleanPasses >= passesRequired) {
        res.phraseDone = true;
        if (phrase >= song.phrases.length - 1) { done = true; res.done = true; noteIdx = -1; }
        else jumpToPhrase(phrase + 1);
      } else {
        noteIdx = range()[0]; // loop the phrase
      }
      return res;
    }

    return {
      press, jumpToPhrase,
      expected: () => (done ? null : song.notes[noteIdx].midi),
      expectedIndex: () => (done ? null : noteIdx),
      phraseRange: () => range().slice(),
      state: () => ({ phrase, noteIdx, cleanPasses, done, phraseCount: song.phrases.length }),
    };
  }

  // ---------- scorer (Play / Perform modes) ----------
  const PERFECT_MS = 120, GOOD_MS = 260;

  function starsForAccuracy(acc) {
    return acc >= 0.93 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
  }

  function createScorer(song, opts) {
    const tempoFactor = (opts && opts.tempoFactor) || 1;
    const expected = song.notes.map(n => ({
      midi: n.midi, t: beatsToMs(n.start, song.bpm, tempoFactor), state: 'pending',
    }));
    let perfect = 0, good = 0, missed = 0, wrong = 0, combo = 0, maxCombo = 0;

    const bumpCombo = () => { combo++; if (combo > maxCombo) maxCombo = combo; };

    function press(midi, tMs) {
      // nearest pending note of this pitch within the good window
      let best = null, bestDt = Infinity;
      for (const e of expected) {
        if (e.state !== 'pending' || e.midi !== midi) continue;
        const dt = Math.abs(tMs - e.t);
        if (dt < bestDt) { best = e; bestDt = dt; }
      }
      if (!best || bestDt > GOOD_MS) {
        wrong++; combo = 0;
        return { verdict: 'miss', noteIndex: best ? expected.indexOf(best) : -1 };
      }
      best.state = bestDt <= PERFECT_MS ? 'perfect' : 'good';
      if (best.state === 'perfect') perfect++; else good++;
      bumpCombo();
      return { verdict: best.state, noteIndex: expected.indexOf(best) };
    }

    function sweep(tMs) {
      let n = 0;
      for (const e of expected) {
        if (e.state === 'pending' && tMs - e.t > GOOD_MS) { e.state = 'missed'; missed++; combo = 0; n++; }
      }
      return n;
    }

    function summary() {
      const total = expected.length;
      const accuracy = total ? (perfect + 0.6 * good) / total : 0;
      return {
        perfect, good, missed, wrong, combo, maxCombo, total,
        accuracy,
        stars: starsForAccuracy(accuracy),
        finished: expected.every(e => e.state !== 'pending'),
      };
    }

    return { press, sweep, summary, noteState: i => expected[i].state };
  }

  // ---------- progression ----------
  const FREE_SONGS = 3;

  function unlockedCount(progressMap, songIds) {
    let earned = 0;
    for (const id of songIds) {
      const p = progressMap[id];
      if (p && (p.learnDone || (p.stars || 0) >= 1)) earned++;
    }
    return Math.min(songIds.length, FREE_SONGS + earned);
  }

  // ---------- progress store ----------
  const STORE_KEY = 'maestro.v1';

  function createProgress(storage) {
    const mem = new Map();
    const store = storage || { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
    let data;
    try { data = JSON.parse(store.getItem(STORE_KEY)) || {}; }
    catch (e) { data = {}; }
    if (!data.songs) data.songs = {};
    if (!data.streak) data.streak = { last: null, days: 0 };
    if (!data.totalNotes) data.totalNotes = 0;

    const save = () => { try { store.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* storage full/blocked */ } };
    const song = id => data.songs[id] || { learnDone: false, stars: 0, bestAccuracy: 0, plays: 0 };

    function update(id, patch) {
      data.songs[id] = Object.assign(song(id), patch);
      save();
      return data.songs[id];
    }

    function recordResult(id, { accuracy, stars }) {
      const s = song(id);
      return update(id, {
        plays: s.plays + 1,
        stars: Math.max(s.stars, stars),
        bestAccuracy: Math.max(s.bestAccuracy, accuracy),
      });
    }

    function touchStreak(dayStr) {
      const st = data.streak;
      if (st.last !== dayStr) {
        const prev = new Date(st.last + 'T00:00:00Z');
        const cur = new Date(dayStr + 'T00:00:00Z');
        st.days = (st.last && cur - prev === 86400000) ? st.days + 1 : 1;
        st.last = dayStr;
        save();
      }
      return { streakDays: st.days };
    }

    function addNotes(n) { data.totalNotes += n; save(); return data.totalNotes; }

    return {
      get: song, update, recordResult, touchStreak, addNotes,
      all: () => data.songs,
      streak: () => ({ streakDays: data.streak.days, last: data.streak.last }),
      totalNotes: () => data.totalNotes,
    };
  }

  return {
    RANGE_LO, RANGE_HI,
    noteToMidi, midiToName, isBlackKey,
    parseMelody, parseChords, chordToMidis,
    buildSong, beatsToMs,
    keyToMidi, midiToKey,
    createWaitMode, createScorer, starsForAccuracy,
    unlockedCount, createProgress,
  };
});
