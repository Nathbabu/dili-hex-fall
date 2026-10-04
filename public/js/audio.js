// ===================================================================
// DILI: CYBER BUMPERS - High-Octane Audio Synth & Dili Voice Engine
// ===================================================================
const HexAudio = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let isMuted = false;
  let currentAudio = null;
  let currentTrackIdx = 0;
  let musicVolume = 0.70;

  function init() {
    if (ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();

      // Master studio limiter/compressor: keeps mix punchy and crystal clear without clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, ctx.currentTime);
      compressor.knee.setValueAtTime(24, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.20, ctx.currentTime);
      compressor.connect(ctx.destination);

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
      masterGain.connect(compressor);

      sfxGain = ctx.createGain();
      // Controlled SFX volume (0.20): crisp impacts, perfectly balanced under high-energy music
      sfxGain.gain.setValueAtTime(0.20, ctx.currentTime);
      sfxGain.connect(masterGain);

      musicGain = ctx.createGain();
      // High-energy, loud & clear background NCS music (0.75)
      musicGain.gain.setValueAtTime(0.75, ctx.currentTime);
      musicGain.connect(masterGain);
    } catch (e) {
      console.warn('[Audio] Init error:', e.message);
    }
  }

  // Universal user-gesture AudioContext auto-unlock
  if (typeof window !== 'undefined') {
    const unlockAudio = () => {
      if (!ctx) init();
      resumeCtx();
      if (currentAudio && currentAudio.paused && !isMuted) {
        currentAudio.play().catch(() => {});
      }
      if (ctx && ctx.state === 'running') {
        ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown'].forEach(ev => {
          window.removeEventListener(ev, unlockAudio, true);
        });
      }
    };
    ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown'].forEach(ev => {
      window.addEventListener(ev, unlockAudio, { passive: true, capture: true });
    });
  }

  function resumeCtx() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.85, ctx.currentTime, 0.05);
    }
    if (currentAudio) {
      currentAudio.volume = isMuted ? 0 : musicVolume;
      if (!isMuted && currentAudio.paused) {
        currentAudio.play().catch(() => {});
      }
    } else if (!isMuted) {
      startMusic(currentTrackIdx);
    }
    return !isMuted;
  }

  function setMusicVolume(val) {
    musicVolume = Math.max(0, Math.min(1.0, val));
    if (currentAudio) {
      currentAudio.volume = isMuted ? 0 : musicVolume;
    }
    if (musicGain && ctx) {
      musicGain.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.05);
    }
  }

  function setSfxVolume(val) {
    if (sfxGain && ctx) {
      const v = Math.max(0, Math.min(1.0, val));
      sfxGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    }
  }

  function getMusicVolume() {
    return musicGain ? musicGain.gain.value : 0.75;
  }

  function getSfxVolume() {
    return sfxGain ? sfxGain.gain.value : 0.20;
  }

  function getIsMuted() {
    return isMuted;
  }

  // Tactile Tone Generator (Safe against parameter swapping)
  function playTone(freq, duration, type = 'sine', gainNode = sfxGain, vol = 0.3) {
    if (!ctx || isMuted) return;
    try {
      let d = typeof duration === 'number' ? duration : (typeof type === 'number' ? type : 0.08);
      let t = typeof type === 'string' ? type : (typeof duration === 'string' ? duration : 'sine');
      const validTypes = ['sine', 'square', 'sawtooth', 'triangle'];
      if (!validTypes.includes(t)) t = 'sine';

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = t;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      osc.connect(g);
      g.connect(gainNode || sfxGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + d);
    } catch (_) {}
  }

  function sfxClick() {
    playTone(600, 0.05, 'triangle', sfxGain, 0.25);
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
    playPunch(0.15 * Math.min(1.5, intensity), 0.26 * Math.min(1.2, intensity));
    playTone(180, 0.12, 'sawtooth', sfxGain, 0.22 * intensity);
    setTimeout(() => playTone(95, 0.18, 'sine', sfxGain, 0.28 * intensity), 30);
    setTimeout(() => playTone(440, 0.06, 'square', sfxGain, 0.15 * intensity), 50);
  }

  // Bumper Collision Impact (rate-limited so rapid scraping doesn't drown out music)
  let lastBumpSoundTime = 0;
  function sfxBump(intensity = 1.0) {
    if (isMuted || !ctx) return;
    const now = ctx.currentTime;
    if (now - lastBumpSoundTime < 0.065) return;
    lastBumpSoundTime = now;

    haptic('bump');
    playPunch(0.06 * Math.min(1.2, intensity), 0.14 * Math.min(1.0, intensity));
    playTone(160, 0.05, 'sawtooth', sfxGain, 0.12 * intensity);
  }

  // Ram Dash Rocket Boost
  // Cyber Gravity Jump Launcher SFX (High-energy vertical booster blast)
  function sfxJumpPad() {
    playPunch(0.20, 0.25);
    playTone(260, 0.25, 'sawtooth', sfxGain, 0.22);
    setTimeout(() => playTone(540, 0.20, 'triangle', sfxGain, 0.25), 50);
  }

  function sfxDash() {
    haptic('dash');
    playTone(320, 0.18, 'sawtooth', sfxGain, 0.20);
    playTone(180, 0.20, 'sine', sfxGain, 0.24);
  }

  // EMP Shockwave Pulse (Sub-bass explosion & electric crackle)
  function sfxEmp() {
    haptic('emp');
    playPunch(0.26, 0.32);
    playTone(850, 0.20, 'sawtooth', sfxGain, 0.26);
    playTone(130, 0.40, 'sine', sfxGain, 0.32);
    setTimeout(() => {
      playTone(480, 0.18, 'triangle', sfxGain, 0.22);
    }, 70);
  }

  // Knockout / Elimination Fanfare
  function sfxKill() {
    haptic('knockout');
    const tones = [440, 659, 880, 1174];
    tones.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', sfxGain, 0.30), i * 50);
    });
  }

  // Stadium Crowd Cheer on Knockout/Victory
  function sfxCheer() {
    if (!ctx || isMuted) return;
    try {
      const dur = 1.0;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(sfxGain);
      src.start();
    } catch (_) {}
  }

  // Arena Collapse Siren Warning
  function sfxAlarm() {
    playTone(520, 0.20, 'sawtooth', sfxGain, 0.22);
    setTimeout(() => playTone(440, 0.20, 'sawtooth', sfxGain, 0.22), 260);
  }

  // Tile / Ring Drop Boom
  function sfxCollapse() {
    playPunch(0.25, 0.30);
    playTone(70, 0.35, 'sawtooth', sfxGain, 0.25);
  }

  // Power-up & Crystals
  function sfxPowerUp() {
    haptic('powerup');
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.10, 'sine', sfxGain, 0.25), i * 50);
    });
  }

  function sfxCrystal() {
    haptic('crystal');
    playTone(980, 0.08, 'sine', sfxGain, 0.28);
    setTimeout(() => playTone(1318, 0.12, 'sine', sfxGain, 0.24), 60);
  }

  // Game Endings
  function sfxElimination() {
    playTone(280, 0.35, 'sawtooth', sfxGain, 0.26);
    setTimeout(() => playTone(140, 0.45, 'sawtooth', sfxGain, 0.26), 100);
    playPunch(0.20, 0.25);
  }

  function sfxVictory() {
    haptic('victory');
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 880.00, 1046.50, 1318.51, 1567.98];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.25, 'triangle', sfxGain, 0.32), i * 110);
    });
    setTimeout(sfxCheer, 350);
  }

  // Super Ram Kinetic Discharge Thunder
  function sfxSuperRam() {
    haptic('super_ram');
    playPunch(0.32, 0.38);
    playTone(85, 0.45, 'sawtooth', sfxGain, 0.35);
    playTone(175, 0.25, 'square', sfxGain, 0.28);
    setTimeout(() => playTone(350, 0.18, 'sawtooth', sfxGain, 0.25), 30);
    setTimeout(() => playTone(720, 0.14, 'triangle', sfxGain, 0.22), 70);
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
  // AUTHENTIC NCS (NoCopyrightSounds) GAMING RADIO PLAYLIST
  // Real YouTube Gaming Anthems (Alan Walker, Elektronomia, Tobu, etc.)
  // High-fidelity local MP3 playback with instant seek & skip
  // ============================================================
  const NCS_TRACKS = [
    {
      id: 'alan_walker_fade',
      name: 'Fade',
      artist: 'Alan Walker',
      genre: 'Electro House',
      icon: '⚡',
      src: '/assets/music/01-alan-walker-fade.mp3'
    },
    {
      id: 'elektronomia_sky_high',
      name: 'Sky High',
      artist: 'Elektronomia',
      genre: 'Progressive House',
      icon: '🚀',
      src: '/assets/music/02-elektronomia-sky-high.mp3'
    },
    {
      id: 'cartoon_on_and_on',
      name: 'On & On',
      artist: 'Cartoon ft. Daniel Levi',
      genre: 'Drum & Bass',
      icon: '✨',
      src: '/assets/music/03-cartoon-on-and-on.mp3'
    },
    {
      id: 'different_heaven_my_heart',
      name: 'My Heart',
      artist: 'Different Heaven & EH!DE',
      genre: 'Dubstep',
      icon: '❤️',
      src: '/assets/music/04-different-heaven-my-heart.mp3'
    },
    {
      id: 'disfigure_blank',
      name: 'Blank',
      artist: 'Disfigure',
      genre: 'Melodic Dubstep',
      icon: '🌌',
      src: '/assets/music/05-disfigure-blank.mp3'
    },
    {
      id: 'tobu_candyland',
      name: 'Candyland',
      artist: 'Tobu',
      genre: 'Melodic Bounce',
      icon: '🍭',
      src: '/assets/music/06-tobu-candyland.mp3'
    },
    {
      id: 'deaf_kev_invincible',
      name: 'Invincible',
      artist: 'DEAF KEV',
      genre: 'Glitch Hop',
      icon: '🛡️',
      src: '/assets/music/07-deaf-kev-invincible.mp3'
    },
    {
      id: 'warriyo_mortals',
      name: 'Mortals',
      artist: 'Warriyo ft. Laura Brehm',
      genre: 'Future Trap',
      icon: '🌋',
      src: '/assets/music/08-warriyo-mortals.mp3'
    }
  ];

  function _getAudioElement() {
    if (!currentAudio && typeof Audio !== 'undefined') {
      currentAudio = new Audio();
      currentAudio.preload = 'auto';
      currentAudio.addEventListener('ended', () => {
        nextTrack();
      });
      currentAudio.addEventListener('error', (e) => {
        console.warn('[HexAudio] Track error, auto-advancing:', e);
        nextTrack();
      });
    }
    return currentAudio;
  }

  function startMusic(trackSelect = null, forceRestart = false) {
    if (!ctx) init();
    resumeCtx();

    if (typeof trackSelect === 'string') {
      const lower = trackSelect.toLowerCase();
      if (lower === 'inferno') currentTrackIdx = 7; // Warriyo Mortals
      else if (lower === 'cryo') currentTrackIdx = 4; // Disfigure Blank
      else if (lower === 'neon') currentTrackIdx = 0; // Alan Walker Fade
      else {
        const found = NCS_TRACKS.findIndex(t =>
          t.id === lower ||
          t.name.toLowerCase().includes(lower) ||
          t.artist.toLowerCase().includes(lower)
        );
        if (found !== -1) currentTrackIdx = found;
      }
    } else if (typeof trackSelect === 'number') {
      currentTrackIdx = Math.max(0, Math.min(NCS_TRACKS.length - 1, trackSelect));
    }

    const audio = _getAudioElement();
    if (!audio) return NCS_TRACKS[currentTrackIdx];

    const track = NCS_TRACKS[currentTrackIdx];

    // If already playing this track and not force-restarted, just make sure volume and play state are active
    if (!forceRestart && audio.src && audio.src.includes(track.src) && !audio.paused) {
      audio.volume = isMuted ? 0 : musicVolume;
      return track;
    }

    try {
      audio.src = track.src;
      audio.volume = isMuted ? 0 : musicVolume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Unlocks automatically on first user click/touch
        });
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ncs-track-changed', { detail: track }));
    }

    return track;
  }

  function stopMusic() {
    if (currentAudio) {
      currentAudio.pause();
    }
  }

  function pauseMusic() {
    if (currentAudio) {
      currentAudio.pause();
    }
  }

  function resumeMusic() {
    if (currentAudio && !isMuted) {
      currentAudio.play().catch(() => {});
    } else {
      startMusic(currentTrackIdx);
    }
  }

  function nextTrack() {
    currentTrackIdx = (currentTrackIdx + 1) % NCS_TRACKS.length;
    return startMusic(currentTrackIdx, true);
  }

  function prevTrack() {
    currentTrackIdx = (currentTrackIdx - 1 + NCS_TRACKS.length) % NCS_TRACKS.length;
    return startMusic(currentTrackIdx, true);
  }

  function getCurrentTrack() {
    return NCS_TRACKS[currentTrackIdx];
  }

  function getPlaylist() {
    return NCS_TRACKS;
  }

  function setTrackByIndex(idx) {
    if (typeof idx === 'number' && idx >= 0 && idx < NCS_TRACKS.length) {
      currentTrackIdx = idx;
      return startMusic(currentTrackIdx, true);
    }
    return getCurrentTrack();
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
    init, resumeCtx, toggleMute, getIsMuted, haptic, playTone, sfxClick,
    sfxBump, sfxHeavyCrash, sfxDash,
    sfxJumpPad, sfxEmp, sfxKill, sfxCheer, sfxAlarm, sfxCollapse,
    sfxPowerUp, sfxCrystal, sfxElimination, sfxVictory,
    sfxCountdown, sfxGo,
    sfxVoiceOof, sfxVoiceHappy, sfxVoicePanic, sfxVoiceScream, sfxVoiceTaunt, sfxSweeperSmack, sfxTrapGlitch, sfxTrapJam,
    sfxSuperRam, sfxMineDrop, sfxMineFreeze, announce,
    startMusic, stopMusic,
    nextTrack, prevTrack, getCurrentTrack, getPlaylist, setTrackByIndex,
    setMusicVolume, setSfxVolume, getMusicVolume, getSfxVolume
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
