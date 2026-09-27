// =============================================
// DILI: HEX-FALL — Cyber Synth Web Audio Engine
// =============================================
const HexAudio = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let bgmInterval = null;
  let bgmStep = 0;
  let isMuted = false;

  function init() {
    if (ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.6, ctx.currentTime);
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0.2, ctx.currentTime);
      musicGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.65, ctx.currentTime);
      sfxGain.connect(masterGain);
    } catch (e) {
      console.warn('[HexAudio] AudioContext unavailable:', e.message);
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
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.6, ctx.currentTime, 0.05);
    }
    return !isMuted;
  }

  function getIsMuted() {
    return isMuted;
  }

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

  function playNoise(duration, vol = 0.15) {
    if (!ctx || isMuted) return;
    try {
      const bufSize = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2400;
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start();
    } catch (_) {}
  }

  // SFX Actions
  function sfxJump() {
    playTone(280, 0.12, 'sine', sfxGain, 0.28);
    setTimeout(() => playTone(520, 0.1, 'sine', sfxGain, 0.22), 40);
  }

  function sfxLand() {
    playNoise(0.06, 0.18);
    playTone(140, 0.08, 'triangle', sfxGain, 0.25);
  }

  function sfxTileWarning() {
    playTone(380, 0.08, 'sawtooth', sfxGain, 0.12);
  }

  function sfxTileDrop() {
    playTone(180, 0.25, 'sawtooth', sfxGain, 0.15);
    playNoise(0.12, 0.1);
  }

  function sfxDive() {
    playTone(650, 0.18, 'sawtooth', sfxGain, 0.2);
    playTone(220, 0.25, 'sine', sfxGain, 0.25);
  }

  function sfxCollectCrystal() {
    playTone(880, 0.09, 'sine', sfxGain, 0.3);
    setTimeout(() => playTone(1320, 0.14, 'sine', sfxGain, 0.28), 50);
  }

  function sfxPowerUp() {
    const freqs = [440, 554, 659, 880, 1108];
    freqs.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'triangle', sfxGain, 0.25), i * 50);
    });
  }

  function sfxCountdown() {
    playTone(480, 0.12, 'square', sfxGain, 0.25);
  }

  function sfxGo() {
    playTone(880, 0.25, 'sine', sfxGain, 0.35);
    setTimeout(() => playTone(1174, 0.35, 'triangle', sfxGain, 0.35), 80);
  }

  function sfxElimination() {
    playTone(280, 0.4, 'sawtooth', sfxGain, 0.25);
    setTimeout(() => playTone(140, 0.6, 'sawtooth', sfxGain, 0.25), 100);
    playNoise(0.4, 0.2);
  }

  function sfxVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 880.00, 1046.50, 1318.51];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.28, 'triangle', sfxGain, 0.32), i * 110);
    });
  }

  // Synthesizer BGM sequence
  const bgmPattern = [
    { note: 130.81, dur: 0.2 }, { note: 164.81, dur: 0.2 }, { note: 196.00, dur: 0.2 }, { note: 261.63, dur: 0.2 },
    { note: 155.56, dur: 0.2 }, { note: 196.00, dur: 0.2 }, { note: 233.08, dur: 0.2 }, { note: 311.13, dur: 0.2 },
    { note: 146.83, dur: 0.2 }, { note: 185.00, dur: 0.2 }, { note: 220.00, dur: 0.2 }, { note: 293.66, dur: 0.2 },
    { note: 174.61, dur: 0.2 }, { note: 220.00, dur: 0.2 }, { note: 261.63, dur: 0.2 }, { note: 349.23, dur: 0.2 }
  ];

  function startMusic() {
    if (!ctx) init();
    resumeCtx();
    stopMusic();
    bgmStep = 0;
    bgmInterval = setInterval(() => {
      if (isMuted) return;
      const p = bgmPattern[bgmStep % bgmPattern.length];
      playTone(p.note, p.dur, 'triangle', musicGain, 0.16);
      if (bgmStep % 4 === 0) {
        // Bass kick
        playTone(p.note / 2, 0.35, 'sine', musicGain, 0.18);
      }
      bgmStep++;
    }, 190);
  }

  function stopMusic() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  return {
    init, resumeCtx, toggleMute, getIsMuted,
    sfxJump, sfxLand, sfxTileWarning, sfxTileDrop, sfxDive,
    sfxCollectCrystal, sfxPowerUp, sfxCountdown, sfxGo,
    sfxElimination, sfxVictory,
    startMusic, stopMusic
  };
})();
