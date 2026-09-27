// =============================================
// DILI: CYBER BUMPERS — High-Octane Audio Synth
// =============================================
const HexAudio = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let bgmInterval = null;
  let bgmStep = 0;
  let isMuted = false;

  function init() {
    if (ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
      masterGain.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.75, ctx.currentTime);
      sfxGain.connect(masterGain);

      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0.22, ctx.currentTime);
      musicGain.connect(masterGain);
    } catch (e) {
      console.warn('[Audio] Init error:', e.message);
    }
  }

  function resumeCtx() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.7, ctx.currentTime, 0.05);
    }
    return !isMuted;
  }

  function getIsMuted() {
    return isMuted;
  }

  // Tactile Tone Generator
  function playTone(freq, duration, type = 'sine', gainNode = sfxGain, vol = 0.3) {
    if (!ctx || isMuted) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(gainNode || sfxGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  // Heavy Impact Noise with Low-Pass Punch
  function playPunch(duration = 0.15, vol = 0.45) {
    if (!ctx || isMuted) return;
    try {
      const bufSize = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + duration);

      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start();

      // Deep sub-bass boom
      playTone(90, duration * 1.5, 'sine', sfxGain, vol * 0.8);
    } catch (_) {}
  }

  // Bumper Collision Impact
  function sfxBump(intensity = 1.0) {
    playPunch(0.12 * Math.min(2, intensity), 0.35 * Math.min(1.5, intensity));
    playTone(160, 0.1, 'sawtooth', sfxGain, 0.25 * intensity);
  }

  // Ram Dash Rocket Boost
  function sfxDash() {
    playTone(350, 0.3, 'sawtooth', sfxGain, 0.35);
    playTone(180, 0.4, 'sine', sfxGain, 0.4);
    setTimeout(() => playTone(600, 0.2, 'sawtooth', sfxGain, 0.25), 60);
  }

  // EMP Shockwave Pulse
  function sfxEmp() {
    playTone(800, 0.4, 'sawtooth', sfxGain, 0.4);
    playTone(200, 0.6, 'sine', sfxGain, 0.5);
    playPunch(0.25, 0.4);
  }

  // Knockout / Elimination
  function sfxKill() {
    const tones = [440, 659, 880, 1174];
    tones.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', sfxGain, 0.35), i * 50);
    });
  }

  // Arena Collapse Siren Warning
  function sfxAlarm() {
    playTone(520, 0.25, 'sawtooth', sfxGain, 0.25);
    setTimeout(() => playTone(440, 0.25, 'sawtooth', sfxGain, 0.25), 260);
  }

  // Tile / Ring Drop Boom
  function sfxCollapse() {
    playPunch(0.4, 0.6);
    playTone(70, 0.5, 'sawtooth', sfxGain, 0.4);
  }

  // Power-up & Crystals
  function sfxPowerUp() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'sine', sfxGain, 0.3), i * 50);
    });
  }

  function sfxCrystal() {
    playTone(980, 0.08, 'sine', sfxGain, 0.35);
    setTimeout(() => playTone(1318, 0.14, 'sine', sfxGain, 0.3), 60);
  }

  // Game Endings
  function sfxElimination() {
    playTone(280, 0.4, 'sawtooth', sfxGain, 0.35);
    setTimeout(() => playTone(140, 0.6, 'sawtooth', sfxGain, 0.35), 100);
    playPunch(0.3, 0.4);
  }

  function sfxVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 880.00, 1046.50, 1318.51, 1567.98];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'triangle', sfxGain, 0.4), i * 110);
    });
  }

  function sfxCountdown() { playTone(440, 0.12, 'square', sfxGain, 0.25); }
  function sfxGo() {
    playTone(880, 0.25, 'sine', sfxGain, 0.4);
    setTimeout(() => playTone(1174, 0.35, 'triangle', sfxGain, 0.4), 70);
  }

  // Mascot Voice & Emote Reaction SFX
  function sfxVoiceOof() {
    playTone(280, 0.08, 'triangle', sfxGain, 0.4);
    setTimeout(() => playTone(190, 0.12, 'sawtooth', sfxGain, 0.35), 40);
  }

  function sfxVoiceHappy() {
    [784, 1047, 1318].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.09, 'sine', sfxGain, 0.32), i * 45);
    });
  }

  function sfxVoicePanic() {
    [660, 520, 660, 520].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.06, 'sawtooth', sfxGain, 0.3), i * 50);
    });
  }

  function sfxVoiceScream() {
    if (!ctx || isMuted) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.2);
      g.gain.setValueAtTime(0.38, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (_) {}
  }

  function sfxVoiceTaunt() {
    playTone(880, 0.08, 'triangle', sfxGain, 0.3);
    setTimeout(() => playTone(1174, 0.14, 'sine', sfxGain, 0.35), 70);
  }

  // Fast Techno-Cyber Bassline (130 BPM)
  const bgmNotes = [
    { n: 110.00, d: 0.15 }, { n: 110.00, d: 0.15 }, { n: 130.81, d: 0.15 }, { n: 146.83, d: 0.15 },
    { n: 110.00, d: 0.15 }, { n: 164.81, d: 0.15 }, { n: 146.83, d: 0.15 }, { n: 130.81, d: 0.15 },
    { n: 98.00,  d: 0.15 }, { n: 98.00,  d: 0.15 }, { n: 123.47, d: 0.15 }, { n: 146.83, d: 0.15 },
    { n: 130.81, d: 0.15 }, { n: 164.81, d: 0.15 }, { n: 196.00, d: 0.20 }, { n: 164.81, d: 0.15 }
  ];

  function startMusic() {
    if (!ctx) init();
    resumeCtx();
    stopMusic();
    bgmStep = 0;
    bgmInterval = setInterval(() => {
      if (isMuted) return;
      const b = bgmNotes[bgmStep % bgmNotes.length];
      playTone(b.n, b.d, 'sawtooth', musicGain, 0.18);
      // Kick drum punch on quarter beats
      if (bgmStep % 4 === 0) {
        playPunch(0.09, 0.25);
      }
      bgmStep++;
    }, 175);
  }

  function stopMusic() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  return {
    init, resumeCtx, toggleMute, getIsMuted,
    sfxBump, sfxDash, sfxEmp, sfxKill, sfxAlarm, sfxCollapse,
    sfxPowerUp, sfxCrystal, sfxElimination, sfxVictory,
    sfxCountdown, sfxGo,
    sfxVoiceOof, sfxVoiceHappy, sfxVoicePanic, sfxVoiceScream, sfxVoiceTaunt,
    startMusic, stopMusic
  };
})();
