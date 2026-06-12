/* MAESTRO ui — screens, piano, falling-notes canvas, game controllers.
 * Depends on: engine.js (Maestro), songs.js (MAESTRO_SONGS), audio.js (MaestroAudio). */
(function () {
  'use strict';
  const M = window.Maestro, A = window.MaestroAudio;
  const SONGS = window.MAESTRO_SONGS.map(M.buildSong);
  const DEFS_BY_ID = Object.fromEntries(SONGS.map(s => [s.id, s]));

  const progress = M.createProgress(window.localStorage);
  const SETTINGS_KEY = 'maestro.settings';
  let settings = { accomp: true, labels: true, tempo: 0.7 };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { /* defaults */ }
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} };

  const SOLFEGE = { 0: 'דו', 2: 'רה', 4: 'מי', 5: 'פה', 7: 'סול', 9: 'לה', 11: 'סי' };
  const PRAISES = ['מושלם!', 'אש! 🔥', 'איזה יופי!', 'ממשיכים!', 'וואו!', 'מקצוען!', 'בול בזמן!', 'מנגן אמיתי!'];
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const app = document.getElementById('app');
  let midiConnected = false;

  /* ================= HOME ================= */
  function renderHome() {
    current && current.destroy && current.destroy();
    current = null;
    const ids = SONGS.map(s => s.id);
    const open = M.unlockedCount(progress.all(), ids);
    const streak = progress.streak().streakDays;
    app.innerHTML = `
      <div class="screen home">
        <div class="home-head">
          <h1 class="logo">מאסטרו<small>MAESTRO</small></h1>
          <div class="stats">
            ${streak > 0 ? `<span>🔥 <b>${streak}</b> ימים</span>` : ''}
            <span>🎵 <b>${progress.totalNotes().toLocaleString()}</b> תווים</span>
          </div>
        </div>
        <p class="tagline">לומדים לנגן שירים אמיתיים — מהדקה הראשונה.</p>
        <div class="setlist">
          ${SONGS.map((s, i) => songCard(s, i, i < open)).join('')}
        </div>
      </div>`;
    app.querySelectorAll('.song-card:not(.locked)').forEach(el =>
      el.addEventListener('click', () => openSong(el.dataset.id)));
  }

  function songCard(s, i, unlocked) {
    const p = progress.get(s.id);
    const stars = '<span>' + '★'.repeat(p.stars) + '</span><span class="off">' + '★'.repeat(3 - p.stars) + '</span>';
    return `
      <button class="song-card ${unlocked ? '' : 'locked'}" data-id="${s.id}" ${unlocked ? '' : 'disabled'}>
        <span class="song-num">${unlocked ? i + 1 : '🔒'}</span>
        <span class="song-info">
          <h3 class="song-he">${s.he}</h3>
          <div class="song-en">${s.en}</div>
        </span>
        <span class="song-meta">
          ${unlocked
            ? `<span class="stars">${stars}</span>${p.learnDone ? '<span class="tier-dots">נלמד ✓</span>' : `<span class="tier-dots">${'●'.repeat(s.tier)}</span>`}`
            : '<span class="lock-hint">סיימו שיר כדי לפתוח</span>'}
        </span>
      </button>`;
  }

  /* ================= KEY LAYOUT ================= */
  function layoutKeys(lo, hi) {
    while (M.isBlackKey(lo)) lo--;
    while (M.isBlackKey(hi)) hi++;
    const whites = [];
    for (let m = lo; m <= hi; m++) if (!M.isBlackKey(m)) whites.push(m);
    const n = whites.length, keys = [];
    whites.forEach((m, i) => keys.push({ midi: m, black: false, x: i / n, w: 1 / n, cx: (i + 0.5) / n }));
    for (let m = lo + 1; m <= hi; m++) {
      if (!M.isBlackKey(m)) continue;
      const leftWhiteIdx = whites.indexOf(m - 1);
      const bw = 0.62 / n;
      const cx = (leftWhiteIdx + 1) / n;
      keys.push({ midi: m, black: true, x: cx - bw / 2, w: bw, cx });
    }
    return keys;
  }

  /* ================= SONG SCREEN ================= */
  let current = null; // active controller

  function openSong(id, mode) {
    current && current.destroy();
    const song = DEFS_BY_ID[id];
    const p = progress.get(id);
    mode = mode || (p.learnDone ? 'play' : 'learn');
    if (!p.learnDone) mode = 'learn';

    app.innerHTML = `
      <div class="screen song-screen">
        <div class="topbar">
          <button class="btn-ghost" id="back">→ חזרה</button>
          <h2 class="song-title">${song.he}</h2>
          <span class="midi-badge ${midiConnected ? 'on' : ''}" id="midi-badge">🎹 מחובר</span>
          <button class="btn-ghost ${settings.labels ? 'on' : ''}" id="labels" title="שמות תווים">🔤</button>
        </div>
        <div class="mode-tabs">
          <button class="mode-tab ${mode === 'learn' ? 'active' : ''}" data-mode="learn">לימוד<span class="mode-stars">${p.learnDone ? '✓' : 'צעד צעד'}</span></button>
          <button class="mode-tab ${mode === 'play' ? 'active' : ''}" data-mode="play" ${p.learnDone ? '' : 'disabled'}>נגינה<span class="mode-stars">${p.bestAccuracy ? Math.round(p.bestAccuracy * 100) + '%' : 'בקצב'}</span></button>
          <button class="mode-tab ${mode === 'perform' ? 'active' : ''}" data-mode="perform" ${p.learnDone ? '' : 'disabled'}>הופעה<span class="mode-stars">${'★'.repeat(p.stars) || 'הרגע הגדול'}</span></button>
        </div>
        <div class="stage-area">
          <canvas id="notes-canvas"></canvas>
          <div class="hud">
            <div class="phrase-pill" id="pill"></div>
            <div class="combo-box"><div class="combo-num" id="combo"></div><div class="combo-label" id="combo-label"></div></div>
          </div>
          <div class="praise" id="praise"></div>
        </div>
        <div class="controls" id="controls"></div>
        <div class="piano-wrap"><div class="piano" id="piano"></div></div>
      </div>`;

    document.getElementById('back').onclick = renderHome;
    document.getElementById('labels').onclick = e => {
      settings.labels = !settings.labels; saveSettings();
      e.target.classList.toggle('on', settings.labels);
      current && current.refreshLabels();
    };
    app.querySelectorAll('.mode-tab:not(:disabled)').forEach(t =>
      t.addEventListener('click', () => { if (t.dataset.mode !== mode) openSong(id, t.dataset.mode); }));

    current = mode === 'learn' ? new LearnController(song) : new PlayController(song, mode);
  }

  /* ================= SHARED STAGE (piano + canvas + input) ================= */
  class Stage {
    constructor(song) {
      this.song = song;
      const midis = song.notes.map(n => n.midi);
      this.lo = Math.max(M.RANGE_LO, Math.min(...midis) - 1);
      this.hi = Math.min(M.RANGE_HI, Math.max(...midis) + 1);
      this.keys = layoutKeys(this.lo, this.hi);
      this.lo = Math.min(...this.keys.map(k => k.midi));
      this.hi = Math.max(...this.keys.map(k => k.midi));
      this.kbBase = this.lo - (this.lo % 12); // largest C <= lo (computer-key anchor)
      this.keyEls = new Map();
      this.buildPiano();
      this.canvas = document.getElementById('notes-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.fx = [];
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();

      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      this.midiHandler = e => {
        const [st, note, vel] = e.data;
        if ((st & 0xf0) === 0x90 && vel > 0) this.press(note);
      };
      attachMidi(this.midiHandler);
    }

    buildPiano() {
      const piano = document.getElementById('piano');
      piano.innerHTML = '';
      for (const k of this.keys.filter(k => !k.black)) piano.appendChild(this.makeKey(k));
      for (const k of this.keys.filter(k => k.black)) {
        const el = this.makeKey(k);
        el.style.left = (k.x * 100) + '%';
        el.style.setProperty('--bw', (k.w * 100) + '%');
        piano.appendChild(el);
      }
      this.refreshLabels();
      piano.addEventListener('contextmenu', e => e.preventDefault());
    }

    makeKey(k) {
      const el = document.createElement('button');
      el.className = k.black ? 'key-b' : 'key-w';
      el.dataset.midi = k.midi;
      el.addEventListener('pointerdown', e => { e.preventDefault(); this.press(k.midi); });
      this.keyEls.set(k.midi, el);
      return el;
    }

    refreshLabels() {
      for (const k of this.keys) {
        const el = this.keyEls.get(k.midi);
        el.innerHTML = '';
        if (!settings.labels) continue;
        const pc = k.midi % 12;
        const lbl = document.createElement('span');
        lbl.className = 'key-label';
        lbl.textContent = k.black ? (SOLFEGE[pc - 1] + '#') : SOLFEGE[pc];
        el.appendChild(lbl);
        const kb = M.midiToKey(k.midi, this.kbBase);
        if (kb && !isTouchOnly()) {
          const kl = document.createElement('span');
          kl.className = 'kbd-label';
          kl.textContent = kb;
          el.appendChild(kl);
        }
      }
    }

    onKeyDown(e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'z' || e.key === 'Z') { this.kbBase = Math.max(this.lo - 12, this.kbBase - 12); this.refreshLabels(); return; }
      if (e.key === 'x' || e.key === 'X') { this.kbBase = Math.min(this.hi - 4, this.kbBase + 12); this.refreshLabels(); return; }
      const midi = M.keyToMidi(e.key, this.kbBase);
      if (midi != null && midi >= this.lo && midi <= this.hi) { e.preventDefault(); this.press(midi); }
    }
    onKeyUp() { /* visual key-up handled by timeout in flashKey */ }

    press() { /* overridden by controller */ }

    flashKey(midi, cls, ms) {
      const el = this.keyEls.get(midi);
      if (!el) return;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), ms || 110);
    }

    setHint(midi) {
      if (this.hintMidi === midi) return;
      if (this.hintMidi != null) {
        const prev = this.keyEls.get(this.hintMidi);
        prev && prev.classList.remove('hint');
      }
      this.hintMidi = midi;
      if (midi != null) {
        const el = this.keyEls.get(midi);
        el && el.classList.add('hint');
      }
    }

    laneFor(midi) { return this.keys.find(k => k.midi === midi); }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = r.width * dpr;
      this.canvas.height = r.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.W = r.width; this.H = r.height;
    }

    drawBeam(lane, bottomY, h, opts) {
      const ctx = this.ctx;
      const x = lane.x * this.W + 2, w = lane.w * this.W - 4;
      const grd = ctx.createLinearGradient(0, bottomY - h, 0, bottomY);
      grd.addColorStop(0, opts.colorTop);
      grd.addColorStop(1, opts.color);
      ctx.fillStyle = grd;
      ctx.shadowColor = opts.color;
      ctx.shadowBlur = opts.glow || 12;
      roundRect(ctx, x, bottomY - h, w, h, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (opts.label && w > 26) {
        ctx.fillStyle = 'rgba(20,16,4,.85)';
        ctx.font = '600 13px Assistant, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opts.label, x + w / 2, bottomY - Math.min(10, h / 2 - 5));
      }
    }

    spark(midi, color) {
      const lane = this.laneFor(midi);
      if (!lane) return;
      this.fx.push({ x: lane.cx * this.W, y: this.H - 6, t: performance.now(), color });
    }

    drawFx() {
      const now = performance.now(), ctx = this.ctx;
      this.fx = this.fx.filter(f => now - f.t < 350);
      for (const f of this.fx) {
        const k = (now - f.t) / 350;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 8 + k * 34, 0, 7);
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 3 - 2 * k;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    destroy() {
      window.removeEventListener('resize', this.resize);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      detachMidi(this.midiHandler);
      this.dead = true;
    }
  }

  /* ================= LEARN (wait-mode) ================= */
  class LearnController extends Stage {
    constructor(song) {
      super(song);
      this.wm = M.createWaitMode(song, { passesRequired: 2 });
      this.chordIdx = -1;
      this.listening = false;
      this.notesPlayed = 0;
      this.buildControls();
      this.updateHud();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
      progress.touchStreak(todayStr());
    }

    buildControls() {
      const c = document.getElementById('controls');
      c.innerHTML = `
        <button class="btn-ghost" id="listen">🔊 האזינו למשפט</button>
        <label class="ctl"><input type="checkbox" id="accomp" ${settings.accomp ? 'checked' : ''}> ליווי</label>
        <span class="ctl" id="learn-tip">לחצו על הקליד הזוהר — השיר מחכה לכם 🙂</span>`;
      document.getElementById('listen').onclick = () => this.listenPhrase();
      document.getElementById('accomp').onchange = e => { settings.accomp = e.target.checked; saveSettings(); };
    }

    listenPhrase() {
      if (this.listening || this.wm.state().done) return;
      this.listening = true;
      const [a, b] = this.wm.phraseRange();
      const t0 = A.now() + 0.15;
      const base = this.song.notes[a].start;
      for (let i = a; i <= b; i++) {
        const n = this.song.notes[i];
        const at = t0 + M.beatsToMs(n.start - base, this.song.bpm, 0.8) / 1000;
        A.note(n.midi, { when: at, dur: M.beatsToMs(n.beats, this.song.bpm, 0.8) / 1000 });
        setTimeout(() => this.flashKey(n.midi, 'down', 160), (at - A.now()) * 1000);
      }
      const total = M.beatsToMs(this.song.notes[b].start + this.song.notes[b].beats - base, this.song.bpm, 0.8);
      setTimeout(() => { this.listening = false; }, total + 250);
    }

    press(midi) {
      if (this.listening) return;
      const wasIdx = this.wm.expectedIndex();
      const r = this.wm.press(midi);
      if (!r.correct) {
        if (!this.wm.state().done) { A.thunk(); this.flashKey(midi, 'down', 90); }
        return;
      }
      const n = this.song.notes[wasIdx];
      A.note(n.midi, { dur: M.beatsToMs(n.beats, this.song.bpm, 0.85) / 1000 });
      this.flashKey(midi, 'down', 130);
      this.spark(midi, '#ffc25e');
      this.notesPlayed++;
      this.maybeChord(n);
      if (r.done) return this.finish();
      if (r.phraseDone) { praise('משפט הושלם! 🎉'); this.chordIdx = -1; }
      else if (r.phrasePass) praise(pick(PRAISES));
      this.updateHud();
    }

    maybeChord(note) {
      if (!settings.accomp) return;
      const ci = this.song.chords.findIndex(c => note.start >= c.start && note.start < c.start + c.beats);
      if (ci >= 0 && ci !== this.chordIdx) {
        this.chordIdx = ci;
        A.chord(this.song.chords[ci].midis, { dur: 1.4 });
      }
    }

    updateHud() {
      const st = this.wm.state();
      const pill = document.getElementById('pill');
      if (pill) pill.innerHTML =
        `משפט <b>${st.phrase + 1}</b> מתוך ${st.phraseCount}` +
        `<span class="pass-dots">${'●'.repeat(st.cleanPasses)}${'○'.repeat(Math.max(0, 2 - st.cleanPasses))}</span>`;
      this.setHint(this.wm.expected());
    }

    loop(t) {
      if (this.dead) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      const idx = this.wm.expectedIndex();
      if (idx != null) {
        const [a, b] = this.wm.phraseRange();
        let slot = 0;
        for (let i = idx; i <= b && slot < 6; i++, slot++) {
          const n = this.song.notes[i];
          const lane = this.laneFor(n.midi);
          if (!lane) continue;
          const pulse = slot === 0 ? Math.sin(t / 180) * 4 : 0;
          const bottom = this.H - 12 - slot * 62 - pulse;
          const pc = n.midi % 12;
          const name = M.isBlackKey(n.midi) ? SOLFEGE[pc - 1] + '#' : SOLFEGE[pc];
          this.drawBeam(lane, bottom, 44, {
            color: slot === 0 ? '#ffc25e' : 'rgba(255,194,94,' + (0.55 - slot * 0.08) + ')',
            colorTop: 'rgba(255,194,94,.06)',
            glow: slot === 0 ? 22 : 6,
            label: settings.labels ? name : null,
          });
        }
      }
      this.drawFx();
      requestAnimationFrame(this.loop);
    }

    finish() {
      progress.update(this.song.id, { learnDone: true });
      progress.addNotes(this.notesPlayed);
      confetti();
      showResults({
        title: 'למדתם את השיר! 🎉',
        sub: `"${this.song.he}" — כל המשפטים הושלמו`,
        starsEl: '<div class="acc-line">✓</div>',
        rows: [],
        actions: [
          { label: 'לנגינה בקצב ←', primary: true, onClick: () => openSong(this.song.id, 'play') },
          { label: 'חזרה לשירים', onClick: renderHome },
        ],
      });
      maybeUnlockToast();
    }
  }

  /* ================= PLAY / PERFORM (timed + scored) ================= */
  class PlayController extends Stage {
    constructor(song, mode) {
      super(song);
      this.mode = mode; // 'play' | 'perform'
      this.tempo = mode === 'perform' ? 1 : settings.tempo;
      this.buildControls();
      this.startRun();
      progress.touchStreak(todayStr());
    }

    buildControls() {
      const c = document.getElementById('controls');
      c.innerHTML = `
        <button class="btn-ghost" id="restart">↻ מההתחלה</button>
        ${this.mode === 'play' ? `
          <label class="ctl">קצב <input type="range" id="tempo" min="40" max="100" value="${Math.round(this.tempo * 100)}"><b id="tempo-val">${Math.round(this.tempo * 100)}%</b></label>` : ''}
        <label class="ctl"><input type="checkbox" id="accomp" ${settings.accomp ? 'checked' : ''}> ליווי</label>
        ${this.mode === 'perform' ? '<span class="ctl">🎭 בלי רמזים — זו ההופעה שלכם!</span>' : ''}`;
      document.getElementById('restart').onclick = () => this.startRun();
      document.getElementById('accomp').onchange = e => { settings.accomp = e.target.checked; saveSettings(); };
      const tempo = document.getElementById('tempo');
      if (tempo) tempo.oninput = e => {
        this.tempo = settings.tempo = e.target.value / 100;
        document.getElementById('tempo-val').textContent = e.target.value + '%';
        saveSettings();
        this.startRun();
      };
    }

    startRun() {
      this.scorer = M.createScorer(this.song, { tempoFactor: this.tempo });
      this.beatMs = M.beatsToMs(1, this.song.bpm, this.tempo);
      this.countIn = 4;
      this.t0 = A.now() * 1000 + this.beatMs * this.countIn + 350;
      for (let i = 0; i < this.countIn; i++) A.tick(A.now() + 0.35 + (i * this.beatMs) / 1000, i === 0);
      this.scheduledChords = new Set();
      this.finished = false;
      this.notesPlayed = 0;
      this.endMs = M.beatsToMs(this.song.totalBeats, this.song.bpm, this.tempo);
      updateCombo(0);
      const pill = document.getElementById('pill');
      if (pill) pill.textContent = this.mode === 'play' ? 'נגינה בקצב — דיוק בונה כוכבים' : 'הופעה! 🎭';
      if (!this.rafStarted) { this.rafStarted = true; requestAnimationFrame(this.loop.bind(this)); }
    }

    now() { return A.now() * 1000 - this.t0; }

    press(midi) {
      const t = this.now();
      if (this.finished || t < -this.beatMs) return;
      const r = this.scorer.press(midi, t);
      this.flashKey(midi, 'down', 110);
      if (r.verdict === 'miss') {
        A.thunk();
        updateCombo(0);
      } else {
        const n = this.song.notes[r.noteIndex];
        A.note(n.midi, { dur: M.beatsToMs(n.beats, this.song.bpm, this.tempo) / 1000 });
        this.spark(midi, r.verdict === 'perfect' ? '#9be37a' : '#5fd4c4');
        this.notesPlayed++;
        const s = this.scorer.summary();
        updateCombo(s.combo);
        if (s.combo > 0 && s.combo % 10 === 0) praise(`רצף ${s.combo}! 🔥`);
      }
    }

    loop() {
      if (this.dead) return;
      const t = this.now();
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);

      // hit line
      ctx.fillStyle = 'rgba(255,194,94,.25)';
      ctx.fillRect(0, this.H - 4, this.W, 2);

      const v = this.H / 2600; // px per ms — ~2.6s lookahead
      let hintMidi = null;
      for (let i = 0; i < this.song.notes.length; i++) {
        const n = this.song.notes[i];
        const tn = M.beatsToMs(n.start, this.song.bpm, this.tempo);
        const bottom = this.H - 4 - (tn - t) * v;
        const h = Math.max(26, M.beatsToMs(n.beats, this.song.bpm, this.tempo) * v - 4);
        if (bottom < -10 || bottom - h > this.H + 10) continue;
        const lane = this.laneFor(n.midi);
        if (!lane) continue;
        const state = this.scorer.noteState(i);
        const colors = {
          pending: { color: '#ffc25e', colorTop: 'rgba(255,194,94,.08)', glow: 10 },
          perfect: { color: '#9be37a', colorTop: 'rgba(155,227,122,.05)', glow: 4 },
          good: { color: '#5fd4c4', colorTop: 'rgba(95,212,196,.05)', glow: 4 },
          missed: { color: 'rgba(255,122,138,.45)', colorTop: 'rgba(255,122,138,.04)', glow: 0 },
        }[state];
        const pc = n.midi % 12;
        const name = M.isBlackKey(n.midi) ? SOLFEGE[pc - 1] + '#' : SOLFEGE[pc];
        this.drawBeam(lane, bottom, h, Object.assign({
          label: settings.labels && this.mode === 'play' ? name : null,
        }, colors));

        // hint: light the key just before the note arrives (play mode only)
        if (this.mode === 'play' && state === 'pending' && hintMidi == null && tn - t < 420 && tn - t > -120) hintMidi = n.midi;
      }
      this.setHint(this.mode === 'play' ? hintMidi : null);

      // accompaniment scheduler (0.25s lookahead)
      if (settings.accomp) {
        for (let ci = 0; ci < this.song.chords.length; ci++) {
          if (this.scheduledChords.has(ci)) continue;
          const c = this.song.chords[ci];
          const tc = M.beatsToMs(c.start, this.song.bpm, this.tempo);
          if (tc - t < 250 && tc - t > -50) {
            this.scheduledChords.add(ci);
            A.chord(c.midis, { when: this.t0 / 1000 + tc / 1000, dur: Math.min(2, M.beatsToMs(c.beats, this.song.bpm, this.tempo) / 1000) });
          }
        }
      }

      this.scorer.sweep(t);
      this.drawFx();

      if (!this.finished && t > this.endMs + 800) { this.finished = true; this.finish(); }
      requestAnimationFrame(this.loop.bind(this));
    }

    finish() {
      const s = this.scorer.summary();
      progress.addNotes(this.notesPlayed);
      const pct = Math.round(s.accuracy * 100);
      let title, sub, nextAction;
      if (this.mode === 'perform') {
        progress.recordResult(this.song.id, { accuracy: s.accuracy, stars: s.stars });
        title = s.stars >= 3 ? 'הופעה מושלמת!' : s.stars >= 1 ? 'כל הכבוד!' : 'כמעט שם!';
        sub = `"${this.song.he}" בקצב מלא`;
        if (s.stars >= 1) confetti();
        nextAction = s.stars >= 1
          ? { label: 'לשיר הבא ←', primary: true, onClick: () => { renderHome(); } }
          : { label: 'עוד פעם 💪', primary: true, onClick: () => this.startRun() };
      } else {
        progress.update(this.song.id, { bestAccuracy: Math.max(progress.get(this.song.id).bestAccuracy, s.accuracy) });
        title = pct >= 80 ? 'מוכנים להופעה!' : 'יפה מאוד!';
        sub = `דיוק ${pct}% בקצב ${Math.round(this.tempo * 100)}%`;
        nextAction = pct >= 80
          ? { label: 'להופעה! 🎭', primary: true, onClick: () => openSong(this.song.id, 'perform') }
          : { label: 'עוד פעם', primary: true, onClick: () => { closeOverlay(); this.startRun(); } };
      }
      const starsHtml = this.mode === 'perform'
        ? `<div class="big-stars">${[1, 2, 3].map(i =>
            `<span class="${i <= s.stars ? 'lit' : 'off'}" style="animation-delay:${i * .22}s">★</span>`).join('')}</div>`
        : `<div class="acc-line">${pct}%</div>`;
      showResults({
        title, sub,
        starsEl: starsHtml,
        rows: [
          { label: 'מדויק', val: s.perfect, cls: 'p' },
          { label: 'טוב', val: s.good, cls: '' },
          { label: 'פספוס', val: s.missed + s.wrong, cls: 'm' },
          { label: 'רצף שיא', val: s.maxCombo, cls: '' },
        ],
        actions: [nextAction, { label: 'חזרה לשירים', onClick: renderHome }],
      });
      maybeUnlockToast();
    }
  }

  /* ================= shared UI bits ================= */
  function updateCombo(n) {
    const el = document.getElementById('combo'), lbl = document.getElementById('combo-label');
    if (!el) return;
    el.textContent = n > 1 ? n : '';
    lbl.textContent = n > 1 ? 'רצף' : '';
    if (n > 1) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function praise(text) {
    const el = document.getElementById('praise');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  function showResults({ title, sub, starsEl, rows, actions }) {
    closeOverlay();
    const ov = document.createElement('div');
    ov.className = 'overlay'; ov.id = 'overlay';
    ov.innerHTML = `
      <div class="results">
        <h2>${title}</h2>
        <p class="sub">${sub}</p>
        ${starsEl}
        ${rows.length ? `<div class="result-grid">${rows.map(r =>
          `<div class="${r.cls}"><b>${r.val}</b>${r.label}</div>`).join('')}</div>` : '<div style="height:12px"></div>'}
        <div class="btn-row"></div>
      </div>`;
    const btnRow = ov.querySelector('.btn-row');
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = a.primary ? 'btn-main' : 'btn-ghost';
      b.textContent = a.label;
      b.onclick = () => { closeOverlay(); a.onClick(); };
      btnRow.appendChild(b);
    }
    document.body.appendChild(ov);
  }
  function closeOverlay() { const o = document.getElementById('overlay'); o && o.remove(); }

  let lastUnlocked = M.unlockedCount(progress.all(), SONGS.map(s => s.id));
  function maybeUnlockToast() {
    const n = M.unlockedCount(progress.all(), SONGS.map(s => s.id));
    if (n > lastUnlocked) {
      const song = SONGS[n - 1];
      toast(`🔓 נפתח שיר חדש: ${song.he}!`);
    }
    lastUnlocked = n;
  }

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3100);
  }

  /* confetti on the fixed fx canvas */
  function confetti() {
    const cv = document.getElementById('fx-canvas');
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const parts = [];
    const colors = ['#ffc25e', '#5fd4c4', '#ff7a8a', '#9be37a', '#f2ead8'];
    for (let i = 0; i < 130; i++) parts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.4,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 11 - 3,
      r: Math.random() * 5 + 3,
      c: colors[i % colors.length],
      a: Math.random() * 6,
    });
    const t0 = performance.now();
    (function tickFx(t) {
      const k = (t - t0) / 1800;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (k >= 1) return;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.a += 0.1;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.globalAlpha = 1 - k;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
      requestAnimationFrame(tickFx);
    })(t0 + 1);
  }

  /* ================= MIDI ================= */
  const midiHandlers = new Set();
  function attachMidi(h) { midiHandlers.add(h); }
  function detachMidi(h) { midiHandlers.delete(h); }
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(acc => {
      const wire = () => {
        let any = false;
        acc.inputs.forEach(inp => {
          any = true;
          inp.onmidimessage = e => midiHandlers.forEach(h => h(e));
        });
        midiConnected = any;
        const badge = document.getElementById('midi-badge');
        badge && badge.classList.toggle('on', any);
      };
      acc.onstatechange = wire;
      wire();
    }).catch(() => { /* no MIDI — fine */ });
  }

  /* ================= utils ================= */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function isTouchOnly() { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // unlock audio on first interaction anywhere
  ['pointerdown', 'keydown'].forEach(ev =>
    window.addEventListener(ev, () => A.ensure(), { once: true, capture: true }));

  renderHome();
})();
