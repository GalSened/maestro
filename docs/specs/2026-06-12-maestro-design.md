# MAESTRO (מאסטרו) — Fast, Fun Keyboard-Learning App — Design

**Date:** 2026-06-12 · **Owner:** Gal · **Goal:** learn to play recognizable songs on keys as fast as possible, with fun-first UX (not classic boring lessons).

## Research grounding

- **Wait-mode works** (Synthesia "Practice the Melody", La Touche Musicale): the song pauses until you press the right key → zero-failure learning, instant confidence.
- **Gamification retains** (Simply Piano/Yousician): stars, streaks, combos, immediate per-note feedback.
- **The Synthesia trap**: falling-notes-only produces "light followers" who never internalize the song. Counter: *phased guidance withdrawal* + *phrase chunking* (the way human teachers actually teach songs fast).
- **Fun factor nobody combines**: auto-accompaniment — backing chords under the user's one-finger melody, so minute-one playing already *sounds like music*.

## Core learning loop (per song)

1. **לימוד (Learn)** — wait-mode, phrase by phrase (4–10 notes). Phrase loops until 2 clean passes, then chains to the next. Falling notes + lit target keys + letter hints. Wrong press = soft thunk, no penalty.
2. **נגינה (Play)** — whole song at 70% tempo (slider 40–100%), rhythm matters, scored per note (perfect/good/miss), combo multiplier. Hints on.
3. **הופעה (Perform)** — 100% tempo, key-highlights OFF (notes still fall), score → stars. This is the dependency-withdrawal phase: ≥93% = ⭐⭐⭐.

Stars: ≥60% ⭐, ≥80% ⭐⭐, ≥93% ⭐⭐⭐ (Perform). Learn completion grants the song's first checkmark; songs unlock progressively (3 open at start, each star unlocks more).

## Input

- On-screen piano C3–C6 (touch/click, multi-touch).
- Computer keyboard: A-row = white keys, W-row = black keys (GarageBand/Ableton standard), letters rendered on keys.
- **Web MIDI**: auto-detect, hot-plug, "🎹 מחובר" badge. All three inputs concurrently active.

## Audio

Web Audio API synthesized piano: 3 detuned oscillator partials + exponential decay + lowpass, master compressor. Metronome tick. Auto-accompaniment: per-measure chord track per song, played as soft block/arpeggiated chords in Learn/Play (toggleable). No samples → 0 network, instant load.

## Songs (public domain / traditional only)

Tiered: 1) כוכב קטן, המנון לשמחה (Ode to Joy), יום הולדת שמח, Jingle Bells, מרי והכבשה; 2) הבאנו שלום עליכם, הבה נגילה, When the Saints, Amazing Grace, דוד מלך ישראל; 3) לאליזה (פתיחה), קנון בר״ה (פשוט), Greensleeves, התקווה, מינואט בסול.
Format: compact text notation `"E4:1 E4:1 F4:1 G4:1 | ..."` (pitch:beats, `|` = phrase boundary) + chords `"C:4 G:4 ..."` + bpm/key/tier/names(he,en). Parser is pure + unit-tested; every song validated (parses, in C3–C6 range, phrases sane, chord symbols known).

## Architecture (single folder, file://-safe, no build step)

- `index.html` — shell, screens (home/journey, song view), loads scripts in order.
- `engine.js` — PURE logic (UMD export for node tests): notation parser, song model, wait-mode state machine, scheduler math, scoring/star math, keyboard mapping, progress store (localStorage wrapper, injectable).
- `audio.js` — piano synth, metronome, accompaniment player (thin; logic stays in engine).
- `ui.js` — canvas falling-notes renderer + DOM piano + screens + feedback (combo, praise, confetti).
- `songs.js` — library in compact notation.
- `styles.css` — Hebrew RTL, dark stage aesthetic.
- `tests/engine.test.mjs` — node:test against engine + songs.

## UX laws

Zero-setup (open → playing in <10s) · one primary action per screen · never-stuck (wait-mode) · always-reachable tempo + phrase-loop controls · Hebrew RTL with big type · every keypress gives audible+visual response <16ms · praise in Hebrew (מושלם! אש! רצף!) · no punishment sounds, ever.

## Error handling

AudioContext unlock on first gesture (suspended → resume). MIDI unavailable → silently absent (badge only when present). localStorage absent → in-memory fallback. Unknown notation token → parser throws with token+song id (caught by test suite, never ships).

## Testing

TDD on engine: parser, mapping, wait-mode transitions, scoring windows, star math, unlock logic, every-song validation. UI verified via Playwright MCP on the real built page (screenshots: home, learn-mode mid-phrase, perform results) before declaring done.
