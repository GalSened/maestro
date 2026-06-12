/* MAESTRO audio — Web Audio synthesized piano, chord pad, metronome.
 * No samples: works offline, loads instantly. */
(function (root) {
  'use strict';

  let ctx = null, master = null, padGain = null;

  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp); comp.connect(ctx.destination);
      padGain = ctx.createGain();
      padGain.gain.value = 0.32; // accompaniment sits behind the melody
      padGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

  /* Piano-ish voice: 3 detuned/overtone partials through a lowpass that
   * opens with velocity, exponential decay scaled by pitch (bass rings longer). */
  function pianoVoice(midi, when, dur, vel, dest) {
    const f = midiToFreq(midi);
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * (3 + 5 * vel)), when);
    lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 1.6), when + 0.6);
    out.connect(lp); lp.connect(dest);

    const decay = Math.max(0.7, 2.6 - (midi - 48) * 0.025);
    const stop = when + Math.min(dur + 0.45, decay);
    const partials = [
      { type: 'triangle', ratio: 1, gain: 0.62, detune: 0 },
      { type: 'sine', ratio: 2, gain: 0.22, detune: 3 },
      { type: 'sine', ratio: 3, gain: 0.09, detune: -3 },
    ];
    for (const p of partials) {
      const o = ctx.createOscillator();
      o.type = p.type; o.frequency.value = f * p.ratio; o.detune.value = p.detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(p.gain * vel, when + 0.008); // hammer attack
      g.gain.exponentialRampToValueAtTime(0.0001, stop);
      o.connect(g); g.connect(out);
      o.start(when); o.stop(stop + 0.05);
    }
  }

  function note(midi, { when = 0, dur = 0.5, vel = 0.9 } = {}) {
    ensure();
    pianoVoice(midi, when || ctx.currentTime, dur, vel, master);
  }

  function chord(midis, { when = 0, dur = 1.2, strum = 0.02 } = {}) {
    ensure();
    const t0 = when || ctx.currentTime;
    midis.forEach((m, i) => pianoVoice(m, t0 + i * strum, dur, 0.55, padGain));
  }

  /* Soft "thunk" for wrong presses — gentle, never punishing. */
  function thunk() {
    ensure();
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    lp.type = 'lowpass'; lp.frequency.value = 300;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.18);
  }

  function tick(when, accent) {
    ensure();
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1600 : 1100;
    g.gain.setValueAtTime(accent ? 0.12 : 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.06);
  }

  root.MaestroAudio = {
    ensure,
    note, chord, thunk, tick,
    now: () => ensure().currentTime,
  };
})(typeof self !== 'undefined' ? self : this);
