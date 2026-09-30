// ===================================================================
// DILI: CYBER BUMPERS - High-Octane Audio Synth & Dili Voice Engine
// ===================================================================
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
      masterGain.gain.setValueAtTime(0.75, ctx.currentTime);
      masterGain.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.85, ctx.currentTime);
      sfxGain.connect(masterGain);

      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0.24, ctx.currentTime);
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
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.75, ctx.currentTime, 0.05);
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

  // Mobile Haptic Vibration Feedback (navigator.vibrate)
  function haptic(type = 'bump') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      switch (type) {
        case 'bump':
          navigator.vibrate(22);
          break;
        case 'smash':
        case 'heavy':
        case 'sweeper':
        case 'rotor':
          navigator.vibrate([55, 30, 75]);
          break;
        case 'super_ram':
          navigator.vibrate([80, 40, 110]);
          break;
        case 'boost_vent':
          navigator.vibrate([35, 25, 45]);
          break;
        case 'kill':
          navigator.vibrate([40, 30, 80]);
          break;
        case 'dash':
          navigator.vibrate(35);
          break;
        case 'emp':
          navigator.vibrate([40, 25, 60]);
          break;
        case 'sweeper':
          navigator.vibrate([55, 30, 55]);
          break;
        case 'powerup':
        case 'crystal':
          navigator.vibrate([25, 20, 25]);
          break;
        case 'knockout':
          navigator.vibrate([60, 40, 80]);
          break;
        default:
          navigator.vibrate(20);
          break;
      }
    } catch (_) {}
  }

  // Heavy Visceral Metallic Crash (Hard Bumper Impact)
  function sfxHeavyCrash(intensity = 1.0) {
    haptic('smash');
    playPunch(0.24 * Math.min(2, intensity), 0.65 * Math.min(1.5, intensity));
    playTone(180, 0.15, 'sawtooth', sfxGain, 0.45 * intensity);
    setTimeout(() => playTone(95, 0.25, 'sine', sfxGain, 0.6 * intensity), 30);
    setTimeout(() => playTone(440, 0.08, 'square', sfxGain, 0.25 * intensity), 50);
  }

  // Bumper Collision Impact
  function sfxBump(intensity = 1.0) {
    haptic('bump');
    playPunch(0.12 * Math.min(2, intensity), 0.35 * Math.min(1.5, intensity));
    playTone(160, 0.1, 'sawtooth', sfxGain, 0.25 * intensity);
  }

  // Ram Dash Rocket Boost
    // Cyber Gravity Jump Launcher SFX (High-energy vertical booster blast)
  function sfxJumpPad() {
    playPunch(0.40, 0.70); // Initial explosive rocket thump
    playTone(260, 0.45, 'sawtooth', sfxGain, 0.45);
    setTimeout(() => playTone(540, 0.35, 'triangle', sfxGain, 0.50), 50);
    setTimeout(() => playTone(920, 0.30, 'sine', sfxGain, 0.45), 110);
  }

  function sfxDash() {
    haptic('dash');
    playTone(350, 0.3, 'sawtooth', sfxGain, 0.35);
    playTone(180, 0.4, 'sine', sfxGain, 0.4);
    setTimeout(() => playTone(600, 0.2, 'sawtooth', sfxGain, 0.25), 60);
  }

  // EMP Shockwave Pulse (Massive visceral sub-bass explosion & electric thunder)
  function sfxEmp() {
    haptic('emp');
    playPunch(0.55, 0.90); // Heavy sub-bass concussion
    playTone(950, 0.35, 'sawtooth', sfxGain, 0.55);
    playTone(130, 0.70, 'sine', sfxGain, 0.85); // Deep resonant bass rumble
    setTimeout(() => {
      playTone(480, 0.25, 'triangle', sfxGain, 0.45);
    }, 70);
  }

  // Knockout / Elimination Fanfare
  function sfxKill() {
    haptic('knockout');
    const tones = [440, 659, 880, 1174];
    tones.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', sfxGain, 0.38), i * 50);
    });
  }

  // Stadium Crowd Cheer on Knockout/Victory
  function sfxCheer() {
    if (!ctx || isMuted) return;
    try {
      const dur = 1.2;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start();
    } catch (_) {}
  }

  // Arena Collapse Siren Warning
  function sfxAlarm() {
    playTone(520, 0.25, 'sawtooth', sfxGain, 0.28);
    setTimeout(() => playTone(440, 0.25, 'sawtooth', sfxGain, 0.28), 260);
  }

  // Tile / Ring Drop Boom
  function sfxCollapse() {
    playPunch(0.4, 0.65);
    playTone(70, 0.5, 'sawtooth', sfxGain, 0.45);
  }

  // Power-up & Crystals
  function sfxPowerUp() {
    haptic('powerup');
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'sine', sfxGain, 0.35), i * 50);
    });
  }

  function sfxCrystal() {
    haptic('crystal');
    playTone(980, 0.08, 'sine', sfxGain, 0.38);
    setTimeout(() => playTone(1318, 0.14, 'sine', sfxGain, 0.32), 60);
  }

  // Game Endings
  function sfxElimination() {
    playTone(280, 0.4, 'sawtooth', sfxGain, 0.35);
    setTimeout(() => playTone(140, 0.6, 'sawtooth', sfxGain, 0.35), 100);
    playPunch(0.3, 0.4);
  }

  function sfxVictory() {
    haptic('victory');
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 880.00, 1046.50, 1318.51, 1567.98];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'triangle', sfxGain, 0.42), i * 110);
    });
    setTimeout(sfxCheer, 350);
  }

  // Super Ram Kinetic Discharge Thunder
  function sfxSuperRam() {
    haptic('super_ram');
    playPunch(0.55, 1.0); // Devastating sub punch
    playTone(85, 0.65, 'sawtooth', sfxGain, 0.75);
    playTone(175, 0.35, 'square', sfxGain, 0.55);
    setTimeout(() => playTone(350, 0.22, 'sawtooth', sfxGain, 0.50), 30);
    setTimeout(() => playTone(720, 0.18, 'triangle', sfxGain, 0.45), 70);
  }

  // Ice Freeze Mine Deploy & Detonation
  function sfxMineDrop() {
    playTone(420, 0.08, 'sine', sfxGain, 0.35);
    setTimeout(() => playTone(580, 0.12, 'triangle', sfxGain, 0.38), 40);
  }

  function sfxMineFreeze() {
    haptic('sweeper');
    playPunch(0.30, 0.60);
    playTone(880, 0.25, 'sawtooth', sfxGain, 0.50);
    playTone(1320, 0.35, 'sine', sfxGain, 0.45);
    setTimeout(() => playTone(660, 0.30, 'square', sfxGain, 0.40), 60);
  }

  function sfxCountdown() { playTone(440, 0.12, 'square', sfxGain, 0.28); }
  function sfxGo() {
    playTone(880, 0.25, 'sine', sfxGain, 0.45);
    setTimeout(() => playTone(1174, 0.35, 'triangle', sfxGain, 0.45), 70);
  }

  // Mascot Voice Synth fallbacks
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

  function sfxSweeperSmack() {
    haptic('sweeper');
    playPunch(0.32, 0.75);
    playTone(95, 0.35, 'sawtooth', sfxGain, 0.55);
    playTone(55, 0.45, 'sine', sfxGain, 0.70);
    setTimeout(() => playTone(320, 0.12, 'square', sfxGain, 0.35), 25);
    setTimeout(() => playTone(180, 0.20, 'triangle', sfxGain, 0.40), 60);
  }

  function sfxTrapGlitch() {
    playTone(320, 0.12, 'sawtooth', sfxGain, 0.4);
    setTimeout(() => playTone(210, 0.14, 'square', sfxGain, 0.35), 45);
    setTimeout(() => playTone(120, 0.22, 'sine', sfxGain, 0.45), 110);
    setTimeout(() => playTone(75, 0.28, 'triangle', sfxGain, 0.5), 180);
    playPunch(0.18, 0.4);
  }

  function sfxTrapJam() {
    playTone(650, 0.08, 'sawtooth', sfxGain, 0.45);
    setTimeout(() => playTone(180, 0.12, 'square', sfxGain, 0.4), 30);
    setTimeout(() => playTone(820, 0.07, 'sawtooth', sfxGain, 0.45), 70);
    setTimeout(() => playTone(140, 0.25, 'square', sfxGain, 0.4), 110);
    playPunch(0.12, 0.35);
  }

  function sfxVoiceTaunt() {
    playTone(880, 0.08, 'triangle', sfxGain, 0.3);
    setTimeout(() => playTone(1174, 0.14, 'sine', sfxGain, 0.35), 70);
  }

  // ============================================================
  // DISTINCT DYNAMIC SOUNDTRACKS PER ARENA
  // ============================================================
  // 1. NEON COLOSSEUM (132 BPM Driving Cyber Synthwave in A Minor)
  const neonBgmNotes = [
    { n: 110.00, d: 0.14, type: 'sawtooth', kick: true },  // A2
    { n: 110.00, d: 0.14, type: 'sawtooth', kick: false },
    { n: 130.81, d: 0.14, type: 'sawtooth', kick: false }, // C3
    { n: 146.83, d: 0.14, type: 'sawtooth', kick: false }, // D3
    { n: 110.00, d: 0.14, type: 'sawtooth', kick: true },  // A2
    { n: 164.81, d: 0.14, type: 'triangle', kick: false }, // E3
    { n: 220.00, d: 0.14, type: 'sine',     kick: false }, // A3 arpeggio
    { n: 164.81, d: 0.14, type: 'triangle', kick: false }, // E3
    { n: 98.00,  d: 0.14, type: 'sawtooth', kick: true },  // G2
    { n: 123.47, d: 0.14, type: 'sawtooth', kick: false }, // B2
    { n: 146.83, d: 0.14, type: 'sawtooth', kick: false }, // D3
    { n: 196.00, d: 0.14, type: 'sine',     kick: false }, // G3
    { n: 130.81, d: 0.14, type: 'sawtooth', kick: true },  // C3
    { n: 164.81, d: 0.14, type: 'triangle', kick: false }, // E3
    { n: 261.63, d: 0.18, type: 'sine',     kick: false }, // C4
    { n: 164.81, d: 0.14, type: 'triangle', kick: false }  // E3
  ];

  // 2. INFERNO FORGE (150 BPM Heavy Industrial Bassline & Metal Rhythm in D Minor)
  const infernoBgmNotes = [
    { n: 73.42,  d: 0.12, type: 'sawtooth', kick: true },  // D2 heavy sub
    { n: 73.42,  d: 0.12, type: 'square',   kick: true },  // Double punch kick
    { n: 87.31,  d: 0.12, type: 'sawtooth', kick: false }, // F2
    { n: 98.00,  d: 0.12, type: 'square',   kick: false }, // G2
    { n: 73.42,  d: 0.12, type: 'sawtooth', kick: true },  // D2
    { n: 110.00, d: 0.12, type: 'sawtooth', kick: false }, // A2
    { n: 146.83, d: 0.12, type: 'square',   kick: true },  // D3 industrial slap
    { n: 130.81, d: 0.12, type: 'sawtooth', kick: false }, // C3
    { n: 65.41,  d: 0.12, type: 'sawtooth', kick: true },  // C2 deep growl
    { n: 73.42,  d: 0.12, type: 'sawtooth', kick: false }, // D2
    { n: 87.31,  d: 0.12, type: 'square',   kick: false }, // F2
    { n: 110.00, d: 0.12, type: 'sawtooth', kick: true },  // A2
    { n: 61.74,  d: 0.14, type: 'sawtooth', kick: true },  // B1
    { n: 73.42,  d: 0.12, type: 'square',   kick: false }, // D2
    { n: 146.83, d: 0.18, type: 'sawtooth', kick: false }, // D3
    { n: 164.81, d: 0.12, type: 'square',   kick: false }  // E3
  ];

  // 3. CRYO GLACIER (164 BPM Rapid Arctic Drum-and-Bass Drift in F# Minor)
  const cryoBgmNotes = [
    { n: 92.50,  d: 0.10, type: 'sawtooth', kick: true },  // F#2
    { n: 185.00, d: 0.09, type: 'sine',     kick: false }, // F#3 bell
    { n: 110.00, d: 0.09, type: 'sawtooth', kick: false }, // A2
    { n: 220.00, d: 0.09, type: 'triangle', kick: true },  // A3 icy pluck
    { n: 123.47, d: 0.09, type: 'sawtooth', kick: false }, // B2
    { n: 246.94, d: 0.09, type: 'sine',     kick: false }, // B3
    { n: 92.50,  d: 0.10, type: 'sawtooth', kick: true },  // F#2
    { n: 277.18, d: 0.11, type: 'sine',     kick: false }, // C#4 crystal chime
    { n: 82.41,  d: 0.10, type: 'sawtooth', kick: true },  // E2
    { n: 164.81, d: 0.09, type: 'sine',     kick: false }, // E3
    { n: 92.50,  d: 0.09, type: 'sawtooth', kick: false }, // F#2
    { n: 220.00, d: 0.09, type: 'triangle', kick: true },  // A3
    { n: 110.00, d: 0.09, type: 'sawtooth', kick: false }, // A2
    { n: 277.18, d: 0.09, type: 'sine',     kick: false }, // C#4
    { n: 329.63, d: 0.13, type: 'sine',     kick: false }, // E4 high frost ping
    { n: 277.18, d: 0.09, type: 'triangle', kick: false }  // C#4
  ];

  let currentMusicTheme = 'neon';

  function startMusic(theme = 'neon') {
    if (!ctx) init();
    resumeCtx();
    if (bgmInterval && currentMusicTheme === theme) return; // Already playing this track
    stopMusic();

    currentMusicTheme = (theme === 'inferno' || theme === 'cryo') ? theme : 'neon';
    bgmStep = 0;

    let notes = neonBgmNotes;
    let tempoMs = 175; // ~132 BPM

    if (currentMusicTheme === 'inferno') {
      notes = infernoBgmNotes;
      tempoMs = 155;   // ~150 BPM
    } else if (currentMusicTheme === 'cryo') {
      notes = cryoBgmNotes;
      tempoMs = 138;   // ~164 BPM
    }

    bgmInterval = setInterval(() => {
      if (isMuted) return;
      const b = notes[bgmStep % notes.length];
      playTone(b.n, b.d, b.type || 'sawtooth', musicGain, 0.19);
      if (b.kick) {
        playPunch(0.08, currentMusicTheme === 'inferno' ? 0.35 : 0.25);
      }
      bgmStep++;
    }, tempoMs);
  }

  function stopMusic() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  // ============================================================
  // CYBER ANNOUNCER ENGINE
  // ============================================================
  function announce(event) {
    if (isMuted) return;
    try {
      switch (event) {
        case 'start':
          playTone(523, 0.12, 'square', sfxGain, 0.4);
          setTimeout(() => playTone(659, 0.12, 'square', sfxGain, 0.4), 80);
          setTimeout(() => playTone(1046, 0.35, 'triangle', sfxGain, 0.5), 160);
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('FIGHT!', 'attack', true);
          break;
        case 'double_ko':
          haptic('kill');
          playPunch(0.35, 0.85);
          playTone(620, 0.15, 'sawtooth', sfxGain, 0.6);
          setTimeout(() => playTone(930, 0.30, 'triangle', sfxGain, 0.65), 70);
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('DOUBLE K.O.!', 'attack', true);
          break;
        case 'triple_ko':
          haptic('kill');
          playPunch(0.45, 0.95);
          playTone(740, 0.15, 'sawtooth', sfxGain, 0.65);
          setTimeout(() => playTone(1110, 0.35, 'square', sfxGain, 0.70), 70);
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('TRIPLE K.O.! UNSTOPPABLE!', 'attack', true);
          break;
        case 'unstoppable':
          haptic('kill');
          playPunch(0.55, 1.0);
          [523, 784, 1046, 1567].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'triangle', sfxGain, 0.6), i * 60));
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('BUMPER GOD!', 'attack', true);
          break;
        case 'warning':
          haptic('smash');
          playTone(660, 0.20, 'square', sfxGain, 0.45);
          setTimeout(() => playTone(440, 0.25, 'sawtooth', sfxGain, 0.50), 120);
          break;
        case 'final2':
          playPunch(0.40, 0.8);
          playTone(440, 0.25, 'triangle', sfxGain, 0.5);
          setTimeout(() => playTone(880, 0.45, 'sawtooth', sfxGain, 0.55), 140);
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('FINAL TWO FIGHTERS!', 'panic', true);
          break;
        case 'super_ram':
          sfxSuperRam();
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('SUPER RAM READY!', 'attack', true);
          break;
        case 'victory':
          sfxVictory();
          if (typeof DiliVoice !== 'undefined') DiliVoice.speak('ARENA CHAMPION!', 'happy', true);
          break;
      }
    } catch (_) {}
  }

  return {
    init, resumeCtx, toggleMute, getIsMuted, haptic,
    sfxBump, sfxHeavyCrash, sfxDash,
    sfxJumpPad, sfxEmp, sfxKill, sfxCheer, sfxAlarm, sfxCollapse,
    sfxPowerUp, sfxCrystal, sfxElimination, sfxVictory,
    sfxCountdown, sfxGo,
    sfxVoiceOof, sfxVoiceHappy, sfxVoicePanic, sfxVoiceScream, sfxVoiceTaunt, sfxSweeperSmack, sfxTrapGlitch, sfxTrapJam,
    sfxSuperRam, sfxMineDrop, sfxMineFreeze, announce,
    startMusic, stopMusic
  };
})();

// ===================================================================
// DILI VOICE ENGINE (Expressive Anime/Cyber Bunny Astronaut Voice)
// Uses Web Speech Synthesis with high-energy pitch + audio SFX layering
// ===================================================================
const DiliVoice = (() => {
  'use strict';

  let hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let lastSpeakTime = 0;
  const COOLDOWN_MS = 2400; // Prevent spamming voice lines

  function speak(text, emotion = 'normal', force = false) {
    if (!text || HexAudio.getIsMuted()) return;
    const now = Date.now();
    if (!force && now - lastSpeakTime < COOLDOWN_MS) return;
    lastSpeakTime = now;

    if (!hasSpeech || !window.speechSynthesis) {
      if (emotion === 'happy') HexAudio.sfxVoiceHappy();
      else if (emotion === 'panic') HexAudio.sfxVoicePanic();
      else HexAudio.sfxVoiceTaunt();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.volume = 0.85;

      if (emotion === 'happy') {
        u.pitch = 1.65;
        u.rate = 1.25;
      } else if (emotion === 'panic') {
        u.pitch = 1.85;
        u.rate = 1.35;
      } else if (emotion === 'attack') {
        u.pitch = 1.50;
        u.rate = 1.30;
      } else {
        u.pitch = 1.55;
        u.rate = 1.20;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const best = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Victoria')));
        if (best) u.voice = best;
      }

      window.speechSynthesis.speak(u);
    } catch (_) {
      HexAudio.sfxVoiceHappy();
    }
  }

  const PHRASES = {
    start: ['Ready to smash!', "Let's roll!", 'Colosseum battle, go!'],
    hit: ['Ouch!', 'Whoa!', 'Hey, watch it!'],
    knockout: ['K.O.!', 'Off you go!', 'Target eliminated!'],
    falling: ['Nooooo!', "I'm falling!"],
    victory: ['Victory is ours!', 'Dili Champion!', 'We did it!']
  };

  function randomPhrase(list) {
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  return {
    speak,
    onMatchStart: () => speak(randomPhrase(PHRASES.start), 'happy', true),
    onDash: () => {},
    onEmp: () => {},
    onHit: () => {
      HexAudio.sfxVoiceOof();
      speak(randomPhrase(PHRASES.hit), 'panic');
    },
    onKnockout: () => {
      HexAudio.sfxKill();
      speak(randomPhrase(PHRASES.knockout), 'happy', true);
    },
    onFalling: () => {
      HexAudio.sfxVoiceScream();
      speak(randomPhrase(PHRASES.falling), 'panic', true);
    },
    onVictory: () => {
      HexAudio.sfxVictory();
      speak(randomPhrase(PHRASES.victory), 'happy', true);
    }
  };
})();
