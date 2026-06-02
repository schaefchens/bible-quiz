// Note frequencies in Hz
const N = {
  C2: 65.41,  G2: 98.00,
  A2: 110.00, Bb2: 116.54,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00,
  Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63,
  F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33,
  C6: 1046.50,
};

// Four background music tracks, increasing in tension
const TRACKS = {
  // Levels 1-5: Peaceful C-major, slow and hopeful
  calm: {
    bpm: 68,
    melodyVol: 0.095,
    bassVol:   0.065,
    padVol:    0.050,
    padType:   'sine',
    lfoRate:   0.22,
    lfoDepth:  1.5,
    melody: [
      [N.C4, 1], [N.E4, 1], [N.G4, 1], [N.A4, 1],
      [N.G4, 1], [N.E4, 2],
      [N.D4, 1], [N.F4, 1], [N.A4, 1], [N.G4, 1],
      [N.E4, 1], [N.C4, 3],
    ],
    bass: [
      [N.C3, 2], [N.G3, 2],
      [N.C3, 2], [N.G3, 2],
      [N.F3, 2], [N.C3, 2],
    ],
    pads: [[N.C3, 0.040], [N.E3, 0.030], [N.G3, 0.028]],
  },

  // Levels 6-10: A-minor, building tension
  tense: {
    bpm: 94,
    melodyVol: 0.105,
    bassVol:   0.075,
    padVol:    0.060,
    padType:   'triangle',
    lfoRate:   0.40,
    lfoDepth:  2.2,
    melody: [
      [N.A3, 1], [N.C4, 1], [N.E4, 1], [N.A4, 1],
      [N.Ab4, 0.5], [N.G4, 0.5], [N.F4, 1],
      [N.E4, 1], [N.D4, 1], [N.C4, 1], [N.B3, 1],
      [N.A3, 3],
    ],
    bass: [
      [N.A2, 2], [N.E3, 2],
      [N.A2, 2], [N.E3, 2],
      [N.F3, 2], [N.E3, 2],
    ],
    pads: [[N.A2, 0.045], [N.C3, 0.035], [N.E3, 0.030]],
  },

  // Levels 11-14: D-minor, intense and dramatic
  intense: {
    bpm: 120,
    melodyVol: 0.115,
    bassVol:   0.085,
    padVol:    0.060,
    padType:   'sawtooth',
    lfoRate:   0.60,
    lfoDepth:  3.0,
    melody: [
      [N.D4, 0.5], [N.F4, 0.5], [N.A4, 0.5], [N.D5, 0.5],
      [N.C5, 1],   [N.Bb4, 0.5], [N.A4, 0.5],
      [N.G4, 1],   [N.F4, 0.5],  [N.Eb4, 0.5],
      [N.D4, 2],
    ],
    bass: [
      [N.D3, 1], [N.A3, 1],
      [N.D3, 1], [N.A3, 1],
      [N.Bb3, 1], [N.A3, 1],
      [N.G3, 1],  [N.D3, 1],
    ],
    pads: [[N.D3, 0.055], [N.F3, 0.040], [N.A3, 0.035]],
  },

  // Level 15: C-minor, climactic and epic
  final: {
    bpm: 132,
    melodyVol: 0.130,
    bassVol:   0.095,
    padVol:    0.075,
    padType:   'sawtooth',
    lfoRate:   0.80,
    lfoDepth:  4.0,
    melody: [
      [N.C4, 0.5], [N.Eb4, 0.5], [N.G4, 0.5], [N.C5, 0.5],
      [N.Eb5, 1],  [N.D5, 0.5],  [N.C5, 0.5],
      [N.Bb4, 0.5],[N.Ab4, 0.5], [N.G4, 0.5], [N.Bb4, 0.5],
      [N.C5, 2],
    ],
    bass: [
      [N.C3, 0.5], [N.C3, 0.5], [N.G3, 1],
      [N.C3, 0.5], [N.C3, 0.5], [N.G3, 1],
      [N.Bb2, 1],  [N.F3, 1],
      [N.Ab2, 1],  [N.Eb3, 1],
    ],
    pads: [[N.C3, 0.065], [N.Eb3, 0.048], [N.G3, 0.042]],
  },
};

export class AudioManager {
  constructor() {
    this.ctx            = null;
    this.masterGain     = null;
    this.bgGain         = null;
    this.sfxGain        = null;
    this._audioMode     = 'all'; // 'all' | 'sfx' | 'muted'
    this._currentTrack  = null;
    this._padNodes      = [];
    this._melodyTimer   = null;
    this._bassTimer     = null;
    this._melodyIndex   = 0;
    this._bassIndex     = 0;
    this._melodyNext    = 0;
    this._bassNext      = 0;
    this._initialized   = false;
  }

  async ensureInit() {
    if (this._initialized) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    this.ctx        = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.bgGain     = this.ctx.createGain();
    this.sfxGain    = this.ctx.createGain();

    this.masterGain.gain.value = 0.80;
    this.bgGain.gain.value     = 1.0;
    this.sfxGain.gain.value    = 1.0;

    this.bgGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this._initialized = true;

    // iOS Safari creates AudioContext in 'suspended' state; must resume inside
    // the user-gesture call stack that triggered init.
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    // Belt-and-suspenders: re-resume on any future interaction (iOS re-suspends
    // after screen lock, incoming call, tab switch, etc.).
    const resumeCtx = () => { if (this.ctx.state === 'suspended') this.ctx.resume(); };
    document.addEventListener('touchstart', resumeCtx, { passive: true });
    document.addEventListener('click',      resumeCtx, { passive: true });
  }

  get audioMode() { return this._audioMode; }

  setAudioMode(mode) {
    this._audioMode = mode;
    if (!this.masterGain) return;
    const now = this.ctx.currentTime;
    const t   = 0.08;
    if (mode === 'muted') {
      this.masterGain.gain.setTargetAtTime(0, now, t);
    } else if (mode === 'sfx') {
      this.masterGain.gain.setTargetAtTime(0.80, now, t);
      this.bgGain.gain.setTargetAtTime(0, now, t);
      this.sfxGain.gain.setTargetAtTime(1.0, now, t);
    } else {
      this.masterGain.gain.setTargetAtTime(0.80, now, t);
      this.bgGain.gain.setTargetAtTime(1.0, now, t);
      this.sfxGain.gain.setTargetAtTime(1.0, now, t);
    }
  }

  cycleAudioMode() {
    const next = this._audioMode === 'all'  ? 'sfx'
               : this._audioMode === 'sfx'  ? 'muted'
               : 'all';
    this.setAudioMode(next);
    return next;
  }

  // ─── Low-level tone helper ───────────────────────────────────────────────

  _tone(freq, duration, type, volume, delayFromNow = 0, dest = null) {
    if (!this.ctx || freq <= 0) return;
    const start = this.ctx.currentTime + Math.max(0, delayFromNow);
    const end   = start + duration;

    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);

    osc.type            = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.setValueAtTime(volume, end - 0.04);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.start(start);
    osc.stop(end + 0.02);
  }

  // ─── Sound effects ───────────────────────────────────────────────────────

  // Soft tentative ping: answer highlighted but not yet confirmed
  playPreselect() {
    if (!this.ctx) return;
    this._tone(880, 0.10, 'sine', 0.10);
    this._tone(1320, 0.08, 'sine', 0.06, 0.05);
  }

  // Definitive confirm click
  playClick() {
    if (!this.ctx) return;
    this._tone(1080, 0.055, 'square', 0.13);
    this._tone(650,  0.075, 'sine',   0.09, 0.012);
  }

  playCorrect() {
    if (!this.ctx) return;
    // Rising C-major arpeggio with chord bloom
    const arp = [[N.C5, 0.18, 0], [N.E5, 0.18, 0.10], [N.G5, 0.18, 0.22], [N.C6, 0.50, 0.36]];
    arp.forEach(([f, d, t]) => this._tone(f, d, 'sine', 0.24, t));
    // Warm chord under the top note
    [[N.C4, 0.70, 0.36], [N.E4, 0.70, 0.36], [N.G4, 0.70, 0.36]].forEach(([f, d, t]) =>
      this._tone(f, d, 'sine', 0.09, t)
    );
    // Sparkle
    this._tone(N.C6 * 2, 0.18, 'sine', 0.05, 0.36);
  }

  playWrong() {
    if (!this.ctx) return;
    // Classic descending buzzer
    const t   = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(370, t);
    osc.frequency.exponentialRampToValueAtTime(88, t + 0.85);
    g.gain.setValueAtTime(0.26, t);
    g.gain.setValueAtTime(0.26, t + 0.70);
    g.gain.linearRampToValueAtTime(0, t + 0.90);
    osc.start(t);
    osc.stop(t + 0.95);
    // Low thud
    this._tone(58, 0.55, 'sine', 0.28);
    // Losing stinger 1s later: short short long, descending
    this._tone(N.G4,  0.18, 'sine', 0.22, 1.50);
    this._tone(N.Eb4, 0.18, 'sine', 0.22, 1.72);
    this._tone(N.C4,  0.55, 'sine', 0.22, 1.94);
  }

  playSafeHaven() {
    if (!this.ctx) return;
    // Ascending harp-like glissando + warm chord
    const mel  = [N.G4, N.A4, N.B4, N.C5, N.E5, N.C5, N.G5];
    const dels = [0, 0.09, 0.18, 0.27, 0.44, 0.63, 0.84];
    mel.forEach((f, i) => this._tone(f, 0.40, 'sine', 0.18, dels[i]));
    [[N.C4, 1.5], [N.E4, 1.5], [N.G4, 1.5]].forEach(([f, d]) =>
      this._tone(f, d, 'sine', 0.07, 0.27)
    );
  }

  playTierComplete() {
    if (!this.ctx) return;
    // Bright, joyful ~3-second fanfare — brighter and longer than playSafeHaven
    // Rising arpeggio burst
    const arp = [
      [N.C5, 0.15, 0],    [N.E5, 0.15, 0.12], [N.G5, 0.15, 0.24],
      [N.C6, 0.30, 0.38],
    ];
    arp.forEach(([f, d, t]) => this._tone(f, d, 'sine', 0.26, t));
    // Second flourish — sparkly high notes
    const flourish = [
      [N.E5, 0.12, 0.72], [N.G5, 0.12, 0.86], [N.A5, 0.12, 1.00],
      [N.C6, 0.40, 1.16],
    ];
    flourish.forEach(([f, d, t]) => this._tone(f, d, 'triangle', 0.22, t));
    // Warm chord bloom under the fanfare
    [[N.C4, 2.0], [N.E4, 2.0], [N.G4, 2.0]].forEach(([f, d]) =>
      this._tone(f, d, 'sine', 0.09, 0.38)
    );
    // Final triumphant chord hit
    [[N.C5, 1.2], [N.E5, 1.2], [N.G5, 1.2]].forEach(([f, d]) =>
      this._tone(f, d, 'sine', 0.14, 1.60)
    );
    // Extra sparkle overtone
    this._tone(N.C6 * 2, 0.20, 'sine', 0.06, 1.60);
  }

  playVictory() {
    if (!this.ctx) return;
    // Grand fanfare
    const mel = [
      [N.C5, 0.25, 0],   [N.C5, 0.25, 0.28], [N.C5, 0.25, 0.56],
      [N.Eb5, 0.60, 0.84],[N.G5, 0.25, 1.55], [N.Eb5, 0.25, 1.82],
      [N.G5, 0.90, 2.10],
    ];
    mel.forEach(([f, d, t]) => this._tone(f, d, 'triangle', 0.22, t));
    // Bass line
    [[N.C3, 0.5, 0], [N.G3, 0.5, 0.56], [N.Eb3, 1.0, 0.84], [N.C3, 1.2, 2.10]].forEach(
      ([f, d, t]) => this._tone(f, d, 'sine', 0.14, t)
    );
    // Chord bursts
    [[N.C4, 0.4, 0.84], [N.Eb4, 0.4, 0.84], [N.G4, 0.4, 0.84],
     [N.C4, 0.9, 2.10],  [N.Eb4, 0.9, 2.10], [N.G4, 0.9, 2.10]].forEach(
      ([f, d, t]) => this._tone(f, d, 'sine', 0.10, t)
    );
  }

  // ─── Background music ────────────────────────────────────────────────────

  setMusicLevel(questionIndex) {
    const level = questionIndex + 1;
    let id;
    if      (level === 15) id = 'final';
    else if (level >= 11)  id = 'intense';
    else if (level >= 6)   id = 'tense';
    else                   id = 'calm';

    if (id === this._currentTrack) return;
    this._startTrack(id);
  }

  _stopBg(fadeTime = 1.2) {
    if (this._melodyTimer) { clearTimeout(this._melodyTimer); this._melodyTimer = null; }
    if (this._bassTimer)   { clearTimeout(this._bassTimer);   this._bassTimer = null; }

    const now = this.ctx?.currentTime ?? 0;
    this._padNodes.forEach(({ osc, gain, lfo }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeTime);
        osc.stop(now + fadeTime + 0.05);
        lfo.stop(now + fadeTime + 0.05);
      } catch {}
    });
    this._padNodes = [];
  }

  _startTrack(id) {
    if (!this.ctx) return;
    const FADE_OUT = 1.4;

    this._stopBg(FADE_OUT);
    this._currentTrack = id;

    const tr   = TRACKS[id];
    const beat = 60 / tr.bpm;

    // ── Pad drones ────────────────────────────────────────────
    const padStart = this.ctx.currentTime + FADE_OUT * 0.6;
    this._padNodes = tr.pads.map(([freq, vol], idx) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo  = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();

      lfo.type            = 'sine';
      lfo.frequency.value = tr.lfoRate + idx * 0.06;
      lfoG.gain.value     = tr.lfoDepth;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);

      osc.type            = tr.padType === 'sawtooth' ? 'sawtooth' : 'sine';
      osc.frequency.value = freq * (1 + (idx - 1) * 0.0018);

      gain.gain.setValueAtTime(0, padStart);
      gain.gain.linearRampToValueAtTime(vol, padStart + 2.2);

      osc.connect(gain);
      gain.connect(this.bgGain);

      lfo.start(padStart);
      osc.start(padStart);
      return { osc, gain, lfo };
    });

    // ── Melody look-ahead scheduler ───────────────────────────
    const LOOKAHEAD   = 0.35;
    const SCHEDULE_MS = 80;

    this._melodyIndex = 0;
    this._melodyNext  = this.ctx.currentTime + FADE_OUT + 0.4;

    const schedMelody = () => {
      if (this._currentTrack !== id) return;
      while (this._melodyNext < this.ctx.currentTime + LOOKAHEAD) {
        const [freq, beats] = tr.melody[this._melodyIndex % tr.melody.length];
        const dur = beats * beat;
        this._tone(freq, dur * 0.82, 'triangle', tr.melodyVol,
          this._melodyNext - this.ctx.currentTime, this.bgGain);
        this._melodyNext += dur;
        this._melodyIndex++;
      }
      this._melodyTimer = setTimeout(schedMelody, SCHEDULE_MS);
    };
    schedMelody();

    // ── Bass look-ahead scheduler ─────────────────────────────
    this._bassIndex = 0;
    this._bassNext  = this.ctx.currentTime + FADE_OUT + 0.4;

    const schedBass = () => {
      if (this._currentTrack !== id) return;
      while (this._bassNext < this.ctx.currentTime + LOOKAHEAD) {
        const [freq, beats] = tr.bass[this._bassIndex % tr.bass.length];
        const dur = beats * beat;
        this._tone(freq, dur * 0.68, 'sine', tr.bassVol,
          this._bassNext - this.ctx.currentTime, this.bgGain);
        this._bassNext += dur;
        this._bassIndex++;
      }
      this._bassTimer = setTimeout(schedBass, SCHEDULE_MS);
    };
    schedBass();
  }

  stopAll(fadeTime = 0.8) {
    this._stopBg(fadeTime);
    this._currentTrack = null;
  }
}
