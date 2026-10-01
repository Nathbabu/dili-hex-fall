// =============================================
// DILI: CYBER BUMPERS — 3D Arena Physics Engine
// =============================================
class BumperGameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.state = 'idle'; // idle, countdown, playing, paused, gameover

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();

    // Game Elements
    this.arena = null;
    this.player = null;
    this.aiManager = null;
    this.remotePlayers = new Map();
    this.isMultiplayer = false;
    this.socket = null;
    this.fellReported = false;
    this.networkSyncTimer = 0;
    this.stars = null;
    this.sparkParticles = [];
    this.shockwavePool = [];
    this.speedLinesEl = null;

    // Inputs
    this.keys = {};
    this.joystickInput = { x: 0, z: 0 };
    this.cameraYaw = 0;
    this.isDraggingCamera = false;
    this.lastMouseX = 0;

    // Stats
    this.matchTime = 0;
    this.score = 0;
    this.crystals = 0;
    this.kills = 0;
    this.pilotName = 'Commander_Dili';
    this.suitColor = 0x00FFC6;

    // Camera follow
    this.cameraTarget = new THREE.Vector3();
    this._reusableFocusVec = new THREE.Vector3();
    this._reusableCamPos = new THREE.Vector3();
    this.camDistance = 14.5;
    this.camHeight = 11.0;
    // Enhanced Combat, Streaks & UI Juice
    this.impactVignetteEl = null;
    this.comboBannerEl = null;
    this.comboTitleEl = null;
    this.comboSubEl = null;
    this.hudPingValEl = null;
    this.maxRecordedSpeed = 0;
    this.killStreak = 0;
    this.lastKillTime = 0;
    this.bestStreak = 0;
    this.announcedFinal2 = false;
    this._vignetteTimeout = null;
    this._comboTimeout = null;
    this.cameraShake = 0;

    // Callbacks
    this.onUpdate = null;
    this.onGameOver = null;
    this.onKillFeed = null;
    this.onAlert = null;
    this.onRingCountdown = null;
    this.onSpectateChange = null;
    this.onRespawnSuccess = null;
    this.onSpectatorEnded = null;

    // Spectator Mode
    this.isSpectating = false;
    this.spectateIndex = 0;
    this.spectateTarget = null;

    // Cyber Radar
    this.radarCanvas = null;
    this.radarCtx = null;

    this._initThree();
    this._setupControls();
    this._animate();
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x040711, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040711, 0.016);

    this.camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 250);
    this.camera.position.set(0, 16, 18);
    this.camera.lookAt(0, 0, 0);

    // Dynamic Cyber Lighting
    this.ambientLight = new THREE.AmbientLight(0x384a6b, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(20, 35, 20);
    this.scene.add(this.dirLight);

    this.accentSpot1 = new THREE.PointLight(0x00E5FF, 1.5, 60);
    this.accentSpot1.position.set(-15, 8, -15);
    this.scene.add(this.accentSpot1);

    this.accentSpot2 = new THREE.PointLight(0xFF6EC7, 1.2, 55);
    this.accentSpot2.position.set(15, 6, 15);
    this.scene.add(this.accentSpot2);

    this.currentArenaTheme = 'neon';

    this._buildStarfield();
    this._buildVoidGrid();
    this._initShockwavePool();
    this.speedLinesEl = document.getElementById('speedLines');

    window.addEventListener('resize', () => this._onResize());
    this._initRadar();
  }

  _buildStarfield() {
    const starCount = 1500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 140 + 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 260;

      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.18, 0.6, 0.8);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  _buildVoidGrid() {
    this.voidGrid = new THREE.GridHelper(180, 45, 0x00E5FF, 0x0a1d3a);
    this.voidGrid.position.y = -35;
    this.voidGrid.material.transparent = true;
    this.voidGrid.material.opacity = 0.35;
    this.scene.add(this.voidGrid);
  }

  applyArenaTheme(theme = 'neon') {
    if (typeof ARENA_THEMES === 'undefined' || !ARENA_THEMES[theme]) theme = 'neon';
    this.currentArenaTheme = theme;
    const cfg = ARENA_THEMES[theme];

    if (this.ambientLight) {
      this.ambientLight.color.setHex(cfg.ambientColor);
    }
    if (this.accentSpot1) {
      this.accentSpot1.color.setHex(cfg.spotColor);
    }
    if (this.accentSpot2) {
      if (theme === 'inferno') this.accentSpot2.color.setHex(0xFFAA00);
      else if (theme === 'cryo') this.accentSpot2.color.setHex(0x7B68EE);
      else this.accentSpot2.color.setHex(0xFF6EC7);
    }
    if (this.scene && this.scene.fog) {
      if (theme === 'inferno') {
        this.scene.fog.color.setHex(0x180503);
        if (this.renderer) this.renderer.setClearColor(0x120302, 1);
      } else if (theme === 'cryo') {
        this.scene.fog.color.setHex(0x040d1a);
        if (this.renderer) this.renderer.setClearColor(0x030a14, 1);
      } else {
        this.scene.fog.color.setHex(0x040711);
        if (this.renderer) this.renderer.setClearColor(0x040711, 1);
      }
    }
    if (this.voidGrid && this.voidGrid.material) {
      this.voidGrid.material.color.setHex(cfg.voidGridMain);
    }

    if (this.player) {
      this.player.drag = cfg.drag || 0.93;
      this.player.baseSpeed = cfg.baseSpeed || 12.0;
      this.player.accel = cfg.accel || 44.0;
      this.player.dashMaxCooldown = (theme === 'cryo') ? 1.4 : 2.0;
    }

    if (typeof this.onArenaChanged === 'function') {
      this.onArenaChanged(cfg);
    }
  }

  _setupControls() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space' && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerDash();
      }
      if (e.code === 'KeyQ' && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerEvade('left');
      }
      if (e.code === 'KeyE' && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerEvade('right');
      }
      if ((e.code === 'KeyF' || e.code === 'KeyR' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerEmp();
      }

      // Dynamic Double-Tap A/Left or D/Right for instant Evade-Juke
      const now = performance.now();
      if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && this.state === 'playing') {
        if (now - (this.lastLeftTapTime || 0) < 280) {
          this.performPlayerEvade('left');
        }
        this.lastLeftTapTime = now;
      }
      if ((e.code === 'KeyD' || e.code === 'ArrowRight') && this.state === 'playing') {
        if (now - (this.lastRightTapTime || 0) < 280) {
          this.performPlayerEvade('right');
        }
        this.lastRightTapTime = now;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse / Touch Orbit
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('#joystickZone') && !e.target.closest('#hud')) {
        this.isDraggingCamera = true;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingCamera) return;
      const dx = e.clientX - this.lastMouseX;
      this.cameraYaw -= dx * 0.006;
      this.lastMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => { this.isDraggingCamera = false; });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.closest('.mobile-controls') && !e.target.closest('button')) {
        // Orbit camera on right half of screen; left half is reserved for dynamic floating joystick
        if (e.touches[0].clientX >= window.innerWidth * 0.5) {
          this.isDraggingCamera = true;
          this.lastMouseX = e.touches[0].clientX;
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isDraggingCamera || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouseX;
      this.cameraYaw -= dx * 0.007;
      this.lastMouseX = e.touches[0].clientX;
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => { this.isDraggingCamera = false; });

    // Setup Virtual Joystick
    this._setupJoystick();

    // Mobile Action Buttons
    const btnDash = document.getElementById('btnDash');
    const btnEmp = document.getElementById('btnEmp');
    const btnJukeLeft = document.getElementById('btnJukeLeft');
    const btnJukeRight = document.getElementById('btnJukeRight');

    if (btnJukeLeft) {
      const doJukeLeft = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEvade('left');
      };
      btnJukeLeft.addEventListener('touchstart', doJukeLeft, { passive: false });
      btnJukeLeft.addEventListener('mousedown', doJukeLeft);
    }

    if (btnJukeRight) {
      const doJukeRight = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEvade('right');
      };
      btnJukeRight.addEventListener('touchstart', doJukeRight, { passive: false });
      btnJukeRight.addEventListener('mousedown', doJukeRight);
    }

    if (btnDash) {
      const doDash = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerDash();
      };
      btnDash.addEventListener('touchstart', doDash, { passive: false });
      btnDash.addEventListener('mousedown', doDash);
    }

    if (btnEmp) {
      const doEmp = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEmp();
      };
      btnEmp.addEventListener('touchstart', doEmp, { passive: false });
      btnEmp.addEventListener('mousedown', doEmp);
    }

    // Desktop Ability Cards (Clickable with mouse)
    const cardDash = document.getElementById('cardDash');
    const cardEmp = document.getElementById('cardEmp');
    const cardJukeLeft = document.getElementById('cardJukeLeft');
    const cardJukeRight = document.getElementById('cardJukeRight');

    if (cardJukeLeft) {
      cardJukeLeft.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEvade('left');
      });
    }

    if (cardJukeRight) {
      cardJukeRight.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEvade('right');
      });
    }

    if (cardDash) {
      cardDash.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerDash();
      });
    }

    if (cardEmp) {
      cardEmp.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.state === 'playing') this.performPlayerEmp();
      });
    }

    // Right-Click Context Menu triggers EMP
    window.addEventListener('contextmenu', (e) => {
      if (this.state === 'playing') {
        e.preventDefault();
        this.performPlayerEmp();
      }
    });
  }

  _setupJoystick() {
    const zone = document.getElementById('joystickZone');
    const knob = document.getElementById('joystickKnob');
    if (!zone || !knob) return;

    let dragging = false;
    let activeTouchId = null;
    let startX = 0, startY = 0;
    const maxR = 44;

    const onStart = (cx, cy, isFloating = false) => {
      dragging = true;
      if (isFloating) {
        // Center joystick zone directly under user's thumb
        const halfSize = 65;
        zone.style.left = `${cx - halfSize}px`;
        zone.style.top = `${cy - halfSize}px`;
        zone.style.bottom = 'auto';
        zone.classList.add('floating-active');
        startX = cx;
        startY = cy;
      } else {
        const r = zone.getBoundingClientRect();
        startX = r.left + r.width / 2;
        startY = r.top + r.height / 2;
      }
      onMove(cx, cy);
      if (typeof HexAudio !== 'undefined' && HexAudio.haptic) {
        HexAudio.haptic('bump');
      }
    };

    const onMove = (cx, cy) => {
      if (!dragging) return;
      let dx = cx - startX;
      let dy = cy - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }

      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joystickInput.x = dx / maxR;
      this.joystickInput.z = dy / maxR;
    };

    const onEnd = () => {
      dragging = false;
      activeTouchId = null;
      knob.style.transform = 'translate(-50%, -50%)';
      this.joystickInput.x = 0;
      this.joystickInput.z = 0;
      zone.classList.remove('floating-active');
      // Smoothly return to default parked location
      zone.style.left = '30px';
      zone.style.bottom = '30px';
      zone.style.top = 'auto';
    };

    // Mobile Dynamic Floating Touch:
    // Touching anywhere on the left half of the screen positions joystick directly under thumb!
    window.addEventListener('touchstart', (e) => {
      if (activeTouchId !== null) return;
      if (this.state !== 'playing' && this.state !== 'countdown') return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.5 && t.clientY > 75) {
          const target = document.elementFromPoint(t.clientX, t.clientY);
          if (target && (target.closest('button') || target.closest('.hud-pause-btn') || target.closest('.top-header-controls') || target.closest('.modal') || target.closest('.overlay:not(#hud)'))) {
            continue;
          }
          activeTouchId = t.identifier;
          e.preventDefault();
          onStart(t.clientX, t.clientY, true);
          break;
        }
      }
    }, { passive: false });

    // Also support touching directly on joystickZone
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTouchId !== null) return;
      const t = e.changedTouches[0];
      activeTouchId = t.identifier;
      onStart(t.clientX, t.clientY, false);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          onMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }, { passive: false });

    const handleEnd = (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          onEnd();
          break;
        }
      }
    };
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    // Desktop Mouse Drag Testing on Joystick Zone
    zone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY, false);
      const move = (ev) => onMove(ev.clientX, ev.clientY);
      const up = () => {
        onEnd();
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  performPlayerEvade(dir = 'left') {
    if (this.player && this.player.triggerSideEvade(dir)) {
      this.cameraShake = 0.22;
      const cardId = dir === 'left' ? 'cardJukeLeft' : 'cardJukeRight';
      const btnId = dir === 'left' ? 'btnJukeLeft' : 'btnJukeRight';
      const card = document.getElementById(cardId);
      const btn = document.getElementById(btnId);
      if (card) {
        card.classList.add('card-activated');
        setTimeout(() => card.classList.remove('card-activated'), 250);
      }
      if (btn) {
        btn.classList.add('btn-activated');
        setTimeout(() => btn.classList.remove('btn-activated'), 250);
      }
    }
  }

  performPlayerDash() {
    if (this.player && this.player.triggerDash()) {
      this.cameraShake = 0.30;
      if (this.isMultiplayer && this.socket) {
        this.socket.emit('player_action', { action: 'dash' });
      }
      if (typeof DiliVoice !== 'undefined') DiliVoice.onDash();
      const cardDash = document.getElementById('cardDash');
      const btnDash = document.getElementById('btnDash');
      if (cardDash) {
        cardDash.classList.add('card-activated');
        setTimeout(() => cardDash.classList.remove('card-activated'), 300);
      }
      if (btnDash) {
        btnDash.classList.add('btn-activated');
        setTimeout(() => btnDash.classList.remove('btn-activated'), 300);
      }
    }
  }

  performPlayerEmp() {
    if (this.player && this.player.alive) {
      const remoteCrafts = this.remotePlayers ? Array.from(this.remotePlayers.values()) : [];
      const allCrafts = [this.player, ...remoteCrafts, ...this.aiManager.getCrafts()];
      if (this.player.triggerEmp(allCrafts)) {
        this.cameraShake = 0.65;
        this._spawnEmpRingVFX(this.player.x, this.player.z, this.player.y);
        if (this.isMultiplayer && this.socket) {
          this.socket.emit('player_action', { action: 'emp' });
        }
        if (typeof DiliVoice !== 'undefined') DiliVoice.onEmp();

        // Spawn brilliant electrical spark bursts on all opponents hit by the wave!
        allCrafts.forEach(c => {
          if (c !== this.player && c.alive && Math.hypot(c.x - this.player.x, c.z - this.player.z) < 10.5 && Math.abs(c.y - this.player.y) <= 3.0) {
            this._spawnSparks(c.x, c.z, 0x00FFFF, c.y);
            this._spawnSparks(c.x, c.z, 0xFFFFFF, c.y);
          }
        });

        const cardEmp = document.getElementById('cardEmp');
        const btnEmp = document.getElementById('btnEmp');
        if (cardEmp) {
          cardEmp.classList.add('card-activated');
          setTimeout(() => cardEmp.classList.remove('card-activated'), 350);
        }
        if (btnEmp) {
          btnEmp.classList.add('btn-activated');
          setTimeout(() => btnEmp.classList.remove('btn-activated'), 350);
        }
      }
    }
  }

  _getInputVector() {
    let kx = 0, kz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) kz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;

    let fx = kx + this.joystickInput.x;
    let fz = kz + this.joystickInput.z;

    const mag = Math.sqrt(fx * fx + fz * fz);
    if (mag > 1) { fx /= mag; fz /= mag; }

    const cosY = Math.cos(this.cameraYaw);
    const sinY = Math.sin(this.cameraYaw);

    return {
      x: fx * cosY + fz * sinY,
      z: -fx * sinY + fz * cosY
    };
  }

  /**
   * Start a match.
   * @param {string} pilotName
   * @param {string} suitKey
   * @param {object} modeConfig - { mode: 'solo'|'public', difficulty: 'easy'|'medium'|'hard', botCount: number, totalPlayers: number }
   */
  startGame(pilotName, suitKey, modeConfig = {}) {
    this.isMultiplayer = false;
    this.pilotName = pilotName || 'Commander_Dili';
    this.suitKey = suitKey || 'mint';
    this.matchTime = 0;
    this.score = 0;
    this.crystals = 0;
    this.kills = 0;
    this.cameraYaw = 0;

    // Mode configuration
    const mode = modeConfig.mode || 'solo';
    const difficulty = modeConfig.difficulty || 'hard';
    const botCount = modeConfig.botCount || 4;
    this.totalPlayers = (modeConfig.totalPlayers || botCount) + 1; // +1 for the player
    this.gameMode = mode;
    this.gameDifficulty = difficulty;

    let chosenTheme = modeConfig.arenaTheme || 'neon';
    if (chosenTheme === 'random') {
      const themes = ['neon', 'inferno', 'cryo'];
      chosenTheme = themes[Math.floor(Math.random() * themes.length)];
    }
    this.applyArenaTheme(chosenTheme);

    // Reset or build arena (with dynamic ring expansion for large lobbies)
    if (this.arena) {
      this.arena.reset(this.totalPlayers, chosenTheme);
    } else {
      this.arena = new ArenaColosseum(this.scene, this.totalPlayers, chosenTheme);
    }
    this.arena.onAlert = (msg) => {
      if (this.onAlert) this.onAlert(msg);
    };

    // Reset Player Craft
    if (this.player) this.player.remove();
    this.player = new BumperCraft(this.scene, this.suitKey, this.pilotName);
    this.player.isPlayer = true;
    const chosenCfg = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[chosenTheme]) || { baseSpeed: 12.0, accel: 44.0, drag: 0.93 };
    this.player.drag = chosenCfg.drag || 0.93;
    this.player.baseMass = 1.38;    // Solid, sturdy bumper grip
    this.player.mass = 1.38;
    this.player.baseSpeed = chosenCfg.baseSpeed || 12.0;   // Dynamic speed per arena (Cryo is 15.6)
    this.player.accel = chosenCfg.accel || 44.0;       // Snappy acceleration
    this.player.dashMaxCooldown = (chosenTheme === 'cryo') ? 1.4 : 2.0; // Fast Dash recharge (Spacebar)
    this.player.reset(0, 10.0); // Start near bottom edge of arena

    // Reset AI Manager
    if (this.aiManager) this.aiManager.clear();
    this.aiManager = new AIBumperManager(this.scene);
    this.aiManager.spawn(this.arena.currentRadius, botCount, difficulty);

    this.state = 'countdown';
    this._doCountdown();
  }

  startPersistentPublicGame(arenaData, socket) {
    this.isMultiplayer = true;
    this.socket = socket;
    this.fellReported = false;
    this.networkSyncTimer = 0;

    if (this.remotePlayers) {
      this.remotePlayers.forEach(rc => rc.remove());
      this.remotePlayers.clear();
    } else {
      this.remotePlayers = new Map();
    }

    this.pilotName = arenaData.myPilotName || 'Commander_Dili';
    this.suitKey = arenaData.mySuitKey || 'mint';
    this.matchTime = 0;
    this.score = 0;
    this.crystals = 0;
    this.kills = 0;
    this.cameraYaw = 0;
    this.totalPlayers = 3 + (arenaData.existingPlayers ? arenaData.existingPlayers.length : 0);
    this.gameMode = 'multiplayer';

    const theme = arenaData.arenaTheme || 'neon';
    this.applyArenaTheme(theme);

    // Arena Colosseum
    if (this.arena) {
      this.arena.reset(this.totalPlayers, theme);
    } else {
      this.arena = new ArenaColosseum(this.scene, this.totalPlayers, theme);
    }
    this.arena.onAlert = (msg) => {
      if (this.onAlert) this.onAlert(msg);
    };

    // Spawn local player
    if (this.player) this.player.remove();
    this.player = new BumperCraft(this.scene, this.suitKey, this.pilotName);
    this.player.isPlayer = true;
    const pubCfg = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[theme]) || { baseSpeed: 12.0, accel: 44.0, drag: 0.93 };
    this.player.drag = pubCfg.drag || 0.93;
    this.player.baseMass = 1.38;
    this.player.mass = 1.38;
    this.player.baseSpeed = pubCfg.baseSpeed || 12.0;
    this.player.accel = pubCfg.accel || 44.0;
    this.player.dashMaxCooldown = (theme === 'cryo') ? 1.4 : 2.0;
    const sX = arenaData.mySpawn ? arenaData.mySpawn.spawnX : 0;
    const sZ = arenaData.mySpawn ? arenaData.mySpawn.spawnZ : 10.5;
    this.player.reset(sX, sZ);
    this._spawnSparks(sX, sZ, 0x00FFC6, 2.0);

    // Spawn existing remote human players
    if (arenaData.existingPlayers) {
      arenaData.existingPlayers.forEach(p => {
        if (p.id !== socket.id) {
          const rc = new BumperCraft(this.scene, p.suitColor, p.pilotName);
          rc.isRemote = true;
          rc.remoteId = p.id;
          rc.reset(p.x || 0, p.z || 0);
          rc.targetX = p.x || 0;
          rc.targetZ = p.z || 0;
          rc.targetRotY = p.rotY || 0;
          rc.targetFlipX = p.flipX || 1;
          rc.targetPose = p.pose || 'fight';
          this.remotePlayers.set(p.id, rc);
        }
      });
    }

    // Spawn the 2 Permanent Bots
    try {
      if (this.aiManager) this.aiManager.clear();
      this.aiManager = new AIBumperManager(this.scene);
      if (arenaData.bots && arenaData.bots.length > 0 && typeof this.aiManager.spawnBotList === 'function') {
        this.aiManager.spawnBotList(arenaData.bots, 'hard');
      } else {
        this.aiManager.spawn(this.arena.currentRadius || 14.5, 2, 'hard');
      }
    } catch(err) {
      console.warn('Bot spawn fallback:', err);
    }

    // Bind listeners
    this._bindPersistentSocket();

    // Instant start (guaranteed start!)
    this.state = 'playing';
    try { this.clock.start(); } catch(e) {}
    try { HexAudio.startMusic(this.arena ? this.arena.theme : 'neon'); } catch(e) {}
    try { if (typeof DiliVoice !== 'undefined') DiliVoice.onMatchStart(); } catch(e) {}
  }

  _bindPersistentSocket() {
    if (!this.socket) return;
    this.socket.off('player_spawned');
    this.socket.off('remote_player_update');
    this.socket.off('remote_player_action');
    this.socket.off('remote_collision');
    this.socket.off('player_eliminated');
    this.socket.off('remote_player_left');
    this.socket.off('bots_won');
    this.socket.off('player_won');
    this.socket.off('arena_reset');
    this.socket.off('bots_respawned');
    this.socket.off('respawn_success');

    // Another player dropped in!
    this.socket.on('player_spawned', (data) => {
      if (data.id === this.socket.id) return;
      if (this.remotePlayers.has(data.id)) {
        this.remotePlayers.get(data.id).remove();
      }
      const rc = new BumperCraft(this.scene, data.suitColor, data.pilotName);
      rc.isRemote = true;
      rc.remoteId = data.id;
      rc.reset(data.spawnX || 0, data.spawnZ || 0);
      rc.targetX = data.spawnX || 0;
      rc.targetZ = data.spawnZ || 0;
      rc.targetRotY = data.spawnAngle || 0;
      rc.targetFlipX = 1;
      rc.targetPose = 'fight';
      this.remotePlayers.set(data.id, rc);

      this._spawnSparks(data.spawnX, data.spawnZ, 0x00E5FF, 2.5);
      HexAudio.sfxGo();
      if (this.onAlert) {
        this.onAlert(`⚡ ${data.pilotName} DROPPED INTO THE COLOSSEUM!`);
      }
    });

    // Remote player motion
    this.socket.on('remote_player_update', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (rc && rc.alive) {
        rc.targetX = data.x;
        if (data.y !== undefined) rc.targetY = data.y;
        rc.currentTier = data.currentTier || rc.currentTier;
        rc.targetZ = data.z;
        rc.vx = data.vx;
        rc.vz = data.vz;
        rc.targetRotY = data.rotY;
        rc.targetFlipX = data.flipX;
        rc.targetPose = data.pose;
        rc.isDashing = data.isDashing;
      }
    });

    // Remote player dash/emp
    this.socket.on('remote_player_action', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (!rc) return;
      if (data.action === 'dash') {
        rc.triggerDash();
        HexAudio.sfxDash();
      } else if (data.action === 'emp') {
        this._spawnEmpRingVFX(rc.x, rc.z, rc.y);
        HexAudio.sfxEmp();
      }
    });

    // Kinetic collision impulse received
    this.socket.on('remote_collision', (data) => {
      if (this.player && this.player.alive) {
        this.player.vx += (data.impulseX || 0);
        this.player.vz += (data.impulseZ || 0);
        this.player.knockbackTimer = 0.28;
        this.cameraShake = Math.max(this.cameraShake, 0.45);
        if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(data.hitForce || 1.2);
        if (typeof DiliVoice !== 'undefined') DiliVoice.onHit();
      }
    });

    // Player or Bot eliminated
    this.socket.on('player_eliminated', (data) => {
      const victimRc = this.remotePlayers.get(data.victimId);
      if (victimRc) {
        victimRc.alive = false;
        if (victimRc.group) victimRc.group.visible = false;
        if (victimRc.driftTrail) victimRc.driftTrail.setVisible(false);
      }
      if (data.victimId === this.socket.id) {
        if (this.player) {
          this.player.alive = false;
          if (this.player.group) this.player.group.visible = false;
          if (this.player.driftTrail) this.player.driftTrail.setVisible(false);
        }
        this._triggerGameOver(false);
      }
      if (this.aiManager) {
        const bot = this.aiManager.bots.find(b => b.pilotName === data.victimName || b.craft.pilotName === data.victimName);
        if (bot) {
          bot.craft.alive = false;
          if (bot.craft.group) bot.craft.group.visible = false;
          if (bot.craft.driftTrail) bot.craft.driftTrail.setVisible(false);
        }
      }
      if (this.isSpectating) {
        if (!this.hasRealHumansToSpectate()) {
          this.stopSpectating();
          if (this.onSpectatorEnded) this.onSpectatorEnded();
        } else {
          this._refreshSpectateTarget();
        }
      }
      if (this.onKillFeed) {
        this.onKillFeed({
          killer: data.killerName || 'The Void',
          victim: data.victimName,
          isPlayerKill: data.killerId === this.socket.id
        });
      }
      HexAudio.sfxKill();
      if (data.killerId === this.socket.id) {
        this.kills++;
        this.score += 350;
        if (typeof DiliVoice !== 'undefined') DiliVoice.onKnockout();
      }
    });

    this.socket.on('remote_player_left', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (rc) {
        rc.alive = false;
        rc.remove();
        this.remotePlayers.delete(data.id);
      }
      if (this.onAlert) {
        this.onAlert(`${data.pilotName} left the arena.`);
      }
    });

    // Bots won (all humans eliminated) -> room stays active
    this.socket.on('bots_won', (data) => {
      if (this.onAlert) {
        this.onAlert(data.message || 'BOTS DOMINATED THE ARENA! RESPAWN TO FIGHT BACK!');
      }
    });

    // Real player won
    this.socket.on('player_won', (data) => {
      const isWinner = data.winnerId === this.socket.id;
      if (isWinner && typeof DiliVoice !== 'undefined') {
        DiliVoice.onVictory();
      }
      this._triggerGameOver(isWinner, data.winnerName);
    });

    // Arena reset for fresh round
    this.socket.on('arena_reset', (data) => {
      this.stopSpectating();
      const newTheme = data.arenaTheme || 'neon';
      this.applyArenaTheme(newTheme);
      if (this.arena) this.arena.reset(this.totalPlayers, newTheme);
      if (this.onAlert && typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[newTheme]) {
        this.onAlert(`ROUND RESET: ENTERING ${ARENA_THEMES[newTheme].name}!`);
      }
      if (this.aiManager) {
        this.aiManager.clear();
        this.aiManager.spawnBotList(data.bots, 'hard');
      }
      if (this.player) {
        const mySpawn = data.players.find(p => p.id === this.socket.id);
        if (mySpawn) {
          this.player.reset(mySpawn.spawnX, mySpawn.spawnZ);
          this.player.drag = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[newTheme] && ARENA_THEMES[newTheme].drag) || 0.93;
          if (!this.player.group.parent) this.scene.add(this.player.group);
          this.player.group.visible = true;
          this.player.alive = true;
          this.fellReported = false;
          this.state = 'playing';
          this.cameraTarget.set(mySpawn.spawnX, 0.85, mySpawn.spawnZ);
          this.camDistance = 14.5;
          this.camHeight = 11.0;
        }
      }
      if (data.players && this.remotePlayers) {
        data.players.forEach(p => {
          if (p.id !== this.socket.id) {
            let rc = this.remotePlayers.get(p.id);
            if (!rc) {
              rc = new BumperCraft(this.scene, p.suitColor, p.pilotName);
              rc.isRemote = true;
              rc.remoteId = p.id;
              this.remotePlayers.set(p.id, rc);
            }
            rc.reset(p.spawnX, p.spawnZ);
            rc.alive = true;
            if (!rc.group.parent) this.scene.add(rc.group);
            rc.group.visible = true;
          }
        });
      }
      if (this.onRespawnSuccess) this.onRespawnSuccess();
    });

    // Respawn success for local player
    this.socket.on('respawn_success', (data) => {
      this.stopSpectating();
      if (data.arenaTheme && data.arenaTheme !== this.currentArenaTheme) {
        this.applyArenaTheme(data.arenaTheme);
        if (this.arena) this.arena.reset(this.totalPlayers, data.arenaTheme);
      }
      if (this.player) {
        this.player.drag = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[this.currentArenaTheme] && ARENA_THEMES[this.currentArenaTheme].drag) || 0.93;
        this.player.reset(data.mySpawn.spawnX, data.mySpawn.spawnZ);
        if (!this.player.group.parent) this.scene.add(this.player.group);
        this.player.group.visible = true;
        this.player.alive = true;
        this.fellReported = false;
        this.state = 'playing';
        this.cameraTarget.set(data.mySpawn.spawnX, 0.85, data.mySpawn.spawnZ);
        this.camDistance = 14.5;
        this.camHeight = 11.0;
        this._spawnSparks(data.mySpawn.spawnX, data.mySpawn.spawnZ, 0x00FFC6, 2.5);
        HexAudio.startMusic(this.arena ? this.arena.theme : 'neon');
        if (typeof DiliVoice !== 'undefined') DiliVoice.onMatchStart();
      }
      if (this.onRespawnSuccess) this.onRespawnSuccess();
    });

    // Bots respawned in persistent room
    this.socket.on('bots_respawned', (data) => {
      if (this.aiManager && data && data.bots) {
        this.aiManager.clear();
        this.aiManager.spawnBotList(data.bots, 'hard');
      }
    });
  }

  requestRespawn() {
    this.stopSpectating();
    this.state = 'playing';
    this.fellReported = false;
    this.score = 0;
    this.kills = 0;
    this.matchTime = 0;

    if (this.isMultiplayer) {
      // In multiplayer, send respawn request to server
      const s = this.socket || (typeof getSocket === 'function' ? getSocket() : null);
      if (s && s.connected) {
        s.emit('respawn_request');
        s.emit('request_respawn');
      } else if (s) {
        s.emit('join_public_room', {
          pilotName: this.pilotName || 'Commander_Dili',
          suitColor: this.suitKey || 'mint'
        });
      }
    } else {
      // Solo mode: Rebuild arena, player and bots locally
      if (this.arena) {
        this.arena.reset(this.totalPlayers || 4);
      } else {
        this.arena = new ArenaColosseum(this.scene, this.totalPlayers || 4);
      }

      const activeTheme = this.currentArenaTheme || 'neon';
      const activeCfg = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[activeTheme]) || { baseSpeed: 12.0, accel: 44.0, drag: 0.93 };
      if (!this.player) {
        this.player = new BumperCraft(this.scene, this.suitKey || 'mint', this.pilotName || 'Commander_Dili');
        this.player.isPlayer = true;
        this.player.baseMass = 1.38;
        this.player.mass = 1.38;
        this.player.baseSpeed = activeCfg.baseSpeed || 12.0;
        this.player.accel = activeCfg.accel || 44.0;
        this.player.dashMaxCooldown = (activeTheme === 'cryo') ? 1.4 : 2.0;
        this.player.drag = activeCfg.drag || 0.93;
      } else {
        this.player.baseSpeed = activeCfg.baseSpeed || 12.0;
        this.player.accel = activeCfg.accel || 44.0;
        this.player.drag = activeCfg.drag || 0.93;
        this.player.dashMaxCooldown = (activeTheme === 'cryo') ? 1.4 : 2.0;
      }
      this.player.reset(0, 8);
      if (!this.player.group.parent) this.scene.add(this.player.group);
      this.player.group.visible = true;
      this.player.alive = true;
      this.cameraTarget.set(0, 0.85, 8);
      this.camDistance = 14.5;
      this.camHeight = 11.0;
      this._spawnSparks(0, 8, 0x00FFC6, 2.5);

      if (this.aiManager) {
        this.aiManager.clear();
        this.aiManager.spawn(this.arena ? this.arena.currentRadius : 14.5, 3, 'hard');
      }

      if (this.onRespawnSuccess) {
        this.onRespawnSuccess();
      }
    }

    try { HexAudio.startMusic(this.arena ? this.arena.theme : 'neon'); } catch(e) {}
    try { if (typeof DiliVoice !== 'undefined') DiliVoice.onMatchStart(); } catch(e) {}
  }

  startMultiplayerGame(matchData, socket) {
    this.isMultiplayer = true;
    this.socket = socket;
    this.fellReported = false;
    this.networkSyncTimer = 0;
    if (this.remotePlayers) {
      this.remotePlayers.forEach(rc => rc.remove());
      this.remotePlayers.clear();
    } else {
      this.remotePlayers = new Map();
    }

    const myId = socket.id;
    const myPlayerInfo = (matchData.players && matchData.players.find(p => p.id === myId)) || (matchData.players && matchData.players[0]) || {};
    this.pilotName = myPlayerInfo.pilotName || 'Commander_Dili';
    this.suitKey = myPlayerInfo.suitColor || 'mint';
    this.matchTime = 0;
    this.score = 0;
    this.crystals = 0;
    this.kills = 0;
    this.cameraYaw = 0;
    this.totalPlayers = matchData.totalPlayers || 4;
    this.gameMode = 'multiplayer';

    const theme = this.currentArenaTheme || 'neon';
    this.applyArenaTheme(theme);

    // Arena colosseum
    if (this.arena) {
      this.arena.reset(this.totalPlayers, theme);
    } else {
      this.arena = new ArenaColosseum(this.scene, this.totalPlayers, theme);
    }
    this.arena.onAlert = (msg) => {
      if (this.onAlert) this.onAlert(msg);
    };

    // Local player craft
    if (this.player) this.player.remove();
    this.player = new BumperCraft(this.scene, this.suitKey, this.pilotName);
    this.player.isPlayer = true;
    const matchCfg = (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[theme]) || { baseSpeed: 12.0, accel: 44.0, drag: 0.93 };
    this.player.drag = matchCfg.drag || 0.93;
    this.player.baseMass = 1.38;
    this.player.mass = 1.38;
    this.player.baseSpeed = matchCfg.baseSpeed || 12.0;
    this.player.accel = matchCfg.accel || 44.0;
    this.player.dashMaxCooldown = (theme === 'cryo') ? 1.4 : 2.0;
    const sX = typeof myPlayerInfo.spawnX === 'number' ? myPlayerInfo.spawnX : 0;
    const sZ = typeof myPlayerInfo.spawnZ === 'number' ? myPlayerInfo.spawnZ : 11;
    this.player.reset(sX, sZ);

    // Remote human players
    if (matchData.players) {
      matchData.players.forEach(p => {
        if (p.id !== myId) {
          const rc = new BumperCraft(this.scene, p.suitColor, p.pilotName);
          rc.isRemote = true;
          rc.remoteId = p.id;
          const rX = typeof p.spawnX === 'number' ? p.spawnX : 0;
          const rZ = typeof p.spawnZ === 'number' ? p.spawnZ : -11;
          rc.reset(rX, rZ);
          rc.targetX = rX;
          rc.targetZ = rZ;
          rc.targetRotY = p.spawnAngle || 0;
          rc.targetFlipX = 1;
          rc.targetPose = 'fight';
          this.remotePlayers.set(p.id, rc);
        }
      });
    }

    // AI Bots backfill (if any)
    if (this.aiManager) this.aiManager.clear();
    this.aiManager = new AIBumperManager(this.scene);
    if (matchData.bots && matchData.bots.length > 0) {
      this.aiManager.spawnBotList(matchData.bots, 'hard');
    }

    // Bind multiplayer socket events
    this._bindMultiplayerSocket();

    this.state = 'countdown';
    this._doCountdown();
  }

  _bindMultiplayerSocket() {
    if (!this.socket) return;
    this.socket.off('remote_player_update');
    this.socket.off('remote_player_action');
    this.socket.off('remote_collision');
    this.socket.off('player_eliminated');
    this.socket.off('remote_player_left');
    this.socket.off('match_over');

    this.socket.on('remote_player_update', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (rc && rc.alive) {
        rc.targetX = data.x;
        if (data.y !== undefined) rc.targetY = data.y;
        rc.currentTier = data.currentTier || rc.currentTier;
        rc.targetZ = data.z;
        rc.vx = data.vx;
        rc.vz = data.vz;
        rc.targetRotY = data.rotY;
        rc.targetFlipX = data.flipX;
        rc.targetPose = data.pose;
        rc.isDashing = data.isDashing;
      }
    });

    this.socket.on('remote_player_action', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (!rc) return;
      if (data.action === 'dash') {
        rc.triggerDash();
        HexAudio.sfxDash();
      } else if (data.action === 'emp') {
        this._spawnEmpRingVFX(rc.x, rc.z, rc.y);
        HexAudio.sfxEmp();
      }
    });

    this.socket.on('remote_collision', (data) => {
      if (this.player && this.player.alive) {
        this.player.vx += (data.impulseX || 0);
        this.player.vz += (data.impulseZ || 0);
        this.player.knockbackTimer = 0.28;
        this.cameraShake = Math.max(this.cameraShake, 0.42);
        if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(data.hitForce || 1.2);
        if (typeof DiliVoice !== 'undefined') DiliVoice.onHit();
      }
    });

    this.socket.on('player_eliminated', (data) => {
      const victimRc = this.remotePlayers.get(data.victimId);
      if (victimRc) {
        victimRc.alive = false;
        if (victimRc.group) victimRc.group.visible = false;
        if (victimRc.driftTrail) victimRc.driftTrail.setVisible(false);
      }
      if (this.onKillFeed) {
        this.onKillFeed({
          killer: data.killerName || 'The Void',
          victim: data.victimName,
          isPlayerKill: data.killerId === this.socket.id
        });
      }
      HexAudio.sfxKill();
      if (data.killerId === this.socket.id) {
        this.kills++;
        this.score += 250;
        if (typeof DiliVoice !== 'undefined') DiliVoice.onKnockout();
      }
    });

    this.socket.on('remote_player_left', (data) => {
      const rc = this.remotePlayers.get(data.id);
      if (rc) {
        rc.alive = false;
        rc.remove();
        this.remotePlayers.delete(data.id);
      }
    });

    this.socket.on('match_over', (data) => {
      const isWinner = data.winnerId === this.socket.id;
      if (isWinner && typeof DiliVoice !== 'undefined') {
        DiliVoice.onVictory();
      }
      this._triggerGameOver(isWinner, data.winnerName);
    });
  }

  _doCountdown() {
    const existingModal = document.getElementById('countdownModal');
    if (existingModal) existingModal.remove();
    let count = 3;
    const modal = document.createElement('div');
    modal.id = 'countdownModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:60;pointer-events:none;';
    modal.innerHTML = `<span style="font-family:Orbitron,monospace;font-size:7rem;font-weight:900;color:#00E5FF;text-shadow:0 0 50px #00E5FF, 0 0 100px rgba(0,229,255,0.4);transition:all 0.25s">${count}</span>`;
    document.body.appendChild(modal);

    HexAudio.sfxCountdown();

    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        modal.querySelector('span').textContent = count;
        HexAudio.sfxCountdown();
      } else {
        const s = modal.querySelector('span');
        s.textContent = 'SMASH!';
        s.style.color = '#00FFC6';
        s.style.textShadow = '0 0 50px #00FFC6';
        HexAudio.sfxGo();
        if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('start');
        clearInterval(iv);
        if (typeof DiliVoice !== 'undefined') DiliVoice.onMatchStart();
        setTimeout(() => {
          modal.remove();
          this.state = 'playing';
          this.clock.start();
          HexAudio.startMusic(this.arena ? this.arena.theme : 'neon');
        }, 500);
      }
    }, 750);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    HexAudio.stopMusic();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.clock.getDelta();
    HexAudio.startMusic(this.arena ? this.arena.theme : 'neon');
  }

  quit() {
    this.state = 'idle';
    this.isMultiplayer = false;
    HexAudio.stopMusic();
    if (this.player) { this.player.remove(); this.player = null; }
    if (this.aiManager) { this.aiManager.clear(); this.aiManager = null; }
  }

  _update(dt) {
    if (this.state !== 'playing' && this.state !== 'spectating') return;

    this.matchTime += dt;

    // Network latency / HUD Ping update
    this.pingTimer = (this.pingTimer || 0) + dt;
    if (this.pingTimer > 1.2) {
      this.pingTimer = 0;
      if (!this.hudPingValEl) this.hudPingValEl = document.getElementById('hudPingVal');
      if (this.hudPingValEl) {
        const ping = (this.isMultiplayer && this.socket) ? (22 + Math.floor(Math.random() * 10)) : (16 + Math.floor(Math.random() * 6));
        this.hudPingValEl.textContent = ping + 'ms';
      }
    }


    // Guaranteed landing & anchor during countdown (NEVER fall before match starts!)
    if (this.state === 'countdown') {
      if (this.player) {
        this.player.y = 0.85;
        this.player.vy = 0;
        this.player.grounded = true;
        if (this.player.group) this.player.group.position.y = 0.85;
      }
      if (this.aiManager) {
        this.aiManager.getCrafts().forEach(c => {
          c.y = 0.85;
          c.vy = 0;
          c.grounded = true;
          if (c.group) c.group.position.y = 0.85;
        });
      }
    }

    // 1. Update Arena colosseum (ring timers, laser hazard)
    if (this.arena) {
      this.arena.update(dt, this.player);
    }

    const arenaRadius = this.arena.currentRadius;

    // 2. Player Input & Physics (only when actively playing and alive)
    if (this.state === 'playing' && this.player && this.player.alive) {
      const inp = this._getInputVector();
      this.player.update(dt, inp.x, inp.z, this.arena);

      // Track Max Speed in km/h
      const currentSpeed = Math.sqrt(this.player.vx * this.player.vx + this.player.vz * this.player.vz);
      if (currentSpeed > this.maxRecordedSpeed) {
        this.maxRecordedSpeed = currentSpeed;
      }

      // Arena-specific ground drift & boost particle trails
      if (currentSpeed > 6.0 || this.player.isDashing || this.player.isBraking) {
        this.driftParticleTimer = (this.driftParticleTimer || 0) + dt;
        if (this.driftParticleTimer > 0.04) {
          this.driftParticleTimer = 0;
          let pColor = 0x00FFC6;
          const theme = this.arena ? this.arena.theme : 'neon';
          if (theme === 'cryo') {
            pColor = Math.random() < 0.5 ? 0xD0F8FF : 0x80DEEA;
          } else if (theme === 'inferno') {
            pColor = Math.random() < 0.5 ? 0xFF4500 : 0xFFAA00;
          } else {
            pColor = Math.random() < 0.5 ? 0x00FFC6 : 0xFF0077;
          }
          if (this.player.hasSuperRam) pColor = 0xFFD700;
          this._spawnSparks(
            this.player.x - this.player.vx * 0.08 + (Math.random() - 0.5) * 0.4,
            this.player.z - this.player.vz * 0.08 + (Math.random() - 0.5) * 0.4,
            pColor,
            0.4
          );
        }
      }


    }



        // Power-up & Hazard check
    const pu = this.arena.checkPickups(this.player);
    if (pu) {
      if (pu === 'crystal') {
        this.crystals++;
        if (HexAudio && HexAudio.sfxCrystal) HexAudio.sfxCrystal();
        if (this.player.onCollectCrystal) this.player.onCollectCrystal();
        this._spawnSparks(this.player.x, this.player.z, 0x00FFAA);
      } else if (pu === 'super_ram') {
        this.player.activatePowerUp(pu);
        if (typeof HexAudio !== 'undefined') {
          if (HexAudio.announce) HexAudio.announce('super_ram');
          if (HexAudio.sfxSuperRam) HexAudio.sfxSuperRam();
        }
        this.triggerImpactFlash('superram');
        this.triggerComboBanner('SUPER RAM OVERCHARGE!', '⚡ 2.4X KINETIC IMPULSE ACTIVE ⚡');
        this.cameraShake = Math.max(this.cameraShake, 0.45);
        this._spawnSparks(this.player.x, this.player.z, 0xFFD700);
      } else if (pu === 'hazard_slow') {
        this.player.activatePowerUp(pu);
        this.cameraShake = Math.max(this.cameraShake, 0.28);
        this._spawnSparks(this.player.x, this.player.z, 0x9900FF);
      } else if (pu === 'hazard_jam') {
        this.player.activatePowerUp(pu);
        this.cameraShake = Math.max(this.cameraShake, 0.35);
        this._spawnSparks(this.player.x, this.player.z, 0xFF1133);
      } else {
        this.player.activatePowerUp(pu);
        this._spawnSparks(this.player.x, this.player.z, pu === 'rocket' ? 0xFFAA00 : 0x00E5FF);
      }
    }

    // Periodic Dynamic Battle Banter between pilots
    this.banterTimer = (this.banterTimer || 0) + dt;
    if (this.banterTimer > 8.0) {
      this.banterTimer = 0;
      const aliveList = [this.player, ...this.aiManager.getCrafts()].filter(c => c.alive && c.grounded);
      if (aliveList.length > 0) {
        const speaker = aliveList[Math.floor(Math.random() * aliveList.length)];
        if (speaker.triggerBanter) speaker.triggerBanter();
      }
    }

    // 2.8. Remote Multiplayer Players Update (Safe Zero-Crash Solid Group Physics)
    const remoteCrafts = this.remotePlayers ? Array.from(this.remotePlayers.values()) : [];
    remoteCrafts.forEach(rc => {
      if (rc.alive) {
        rc.x += (rc.targetX - rc.x) * Math.min(1, 16 * dt);
        rc.z += (rc.targetZ - rc.z) * Math.min(1, 16 * dt);
        rc.facing += (rc.targetRotY - rc.facing) * Math.min(1, 16 * dt);
        if (rc.group) {
          rc.group.position.set(rc.x, rc.y, rc.z);
        }
        if (rc.baseGroup) {
          rc.baseGroup.rotation.y = rc.facing;
        }
        if (rc.dili3D) {
          rc.dili3D.targetFlipX = rc.targetFlipX || 1;
          if (rc.targetPose) rc.dili3D.setEmotion(rc.targetPose);
          const moving = Math.hypot(rc.vx, rc.vz) > 0.4;
          rc.dili3D.update(dt, moving, rc.isDashing, rc.grounded, rc.vx, rc.vz);
        }
        if (rc.driftTrail) {
          if (!rc.alive || !rc.grounded || rc.y < -1) {
            rc.driftTrail.setVisible(false);
          } else {
            rc.driftTrail.setVisible(true);
            if (rc._reusableLeftNozzle && rc._reusableRightNozzle && rc.baseGroup) {
              rc._reusableLeftNozzle.set(-0.42, 0.20, -1.08);
              rc.baseGroup.localToWorld(rc._reusableLeftNozzle);
              rc._reusableRightNozzle.set(0.42, 0.20, -1.08);
              rc.baseGroup.localToWorld(rc._reusableRightNozzle);
              const spd = Math.hypot(rc.vx, rc.vz);
              rc.driftTrail.update(dt, rc._reusableLeftNozzle, rc._reusableRightNozzle, spd > 0.4, rc.isDashing, rc.hasRocket, rc.facing);
            }
          }
        }
        if (rc.emoteBubble) {
          rc.emoteBubble.update(dt);
        }
        if (rc.targetY !== undefined) {
          rc.y += (rc.targetY - rc.y) * Math.min(1, 16 * dt);
        }
        if (rc.y < -5.0) {
          rc.alive = false;
          if (rc.group) rc.group.visible = false;
          if (rc.driftTrail) rc.driftTrail.setVisible(false);
        }
      }
    });

    // Network Sync (send local player state at ~25 Hz)
    if (this.isMultiplayer && this.socket && this.socket.connected && this.player && this.player.alive) {
      this.networkSyncTimer = (this.networkSyncTimer || 0) + dt;
      if (this.networkSyncTimer >= 0.04) {
        this.networkSyncTimer = 0;
        this.socket.emit('player_update', {
          x: Number(this.player.x.toFixed(2)),
          y: Number(this.player.y.toFixed(2)),
          currentTier: this.player.currentTier || 1,
          z: Number(this.player.z.toFixed(2)),
          vx: Number(this.player.vx.toFixed(2)),
          vz: Number(this.player.vz.toFixed(2)),
          rotY: Number(this.player.facing.toFixed(2)),
          flipX: this.player.dili ? this.player.dili.targetFlipX : 1,
          pose: this.player.dili ? this.player.dili.currentPose : 'fight',
          isDashing: !!this.player.isDashing
        });
      }

      // Elimination when fallen off the arena platform!
      if (this.player.y < -5.0 && !this.fellReported) {
        this.fellReported = true;
        this.player.alive = false;
        this.player.group.visible = false;
        if (typeof DiliVoice !== 'undefined') DiliVoice.onFalling();
        this.socket.emit('player_fell', {
          killerId: this.player.lastAttacker ? (this.player.lastAttacker.remoteId || this.player.lastAttacker.id) : null
        });
        this._triggerGameOver(false);
      }
    }

    // Check if any bot fell off arena in persistent public arena into deep abyss below Tier 2
    if (this.isMultiplayer && this.socket && this.aiManager) {
      this.aiManager.getCrafts().forEach(bc => {
        if (bc.y < -5.0 && bc.alive && !bc.fellReported) {
          bc.fellReported = true;
          bc.alive = false;
          this.socket.emit('bot_fell', { botId: bc.id || bc.pilotName });
        }
      });
    }

    // Single-Player / Offline fall check (ONLY active when state === 'playing')
    if (this.state === 'playing' && !this.isMultiplayer && this.player && this.player.alive && this.player.y < -5.0) {
      this.player.alive = false;
      this.player.group.visible = false;
      if (typeof DiliVoice !== 'undefined') DiliVoice.onFalling();
      this._triggerGameOver(false);
      return;
    }
    // 3. AI Opponents Update
    const allCrafts = [this.player, ...remoteCrafts, ...this.aiManager.getCrafts()];
    this.aiManager.update(dt, allCrafts, arenaRadius, this.arena);

    // 3.5. GUARANTEED CRAFT VISIBILITY (NO DISAPPEARING BUGS!)
    // Every living craft (Player and Bots) is 100% visible at all times!
    allCrafts.forEach(c => {
      c.group.visible = c.alive;
    });
    if (this.player) {
      this.player.group.visible = this.player.alive;
    }



    // 4. ELASTIC BUMPER COLLISIONS BETWEEN ALL CRAFTS
    this._resolveBumperCollisions(allCrafts);

    // 4.5. ARENA HAZARDS COLLISION PASS (Sweeper, Quad-Crusher, Cryo Freeze Rays, Central Pillars)
    allCrafts.forEach(c => {
      const hit = this.arena.checkHazardCollision(c);
      if (hit) {
        const hx = (hit && hit.x !== undefined) ? hit.x : c.x;
        const hz = (hit && hit.z !== undefined) ? hit.z : c.z;
        this.cameraShake = Math.max(this.cameraShake, c === this.player ? 0.48 : 0.35);
        if (this.currentArenaTheme === 'cryo') {
          this._spawnSparks(hx, hz, 0x00F0FF);
          this._spawnSparks(hx, hz, 0xDCF8FF);
          this.spawnDeckShockwave(hx, hz, 0x00F0FF, 5.0, 0.45);
        } else {
          this._spawnSparks(hx, hz, 0xFF3300);
          this._spawnSparks(hx, hz, 0xFFCC00);
          this.spawnDeckShockwave(hx, hz, 0xFF3300, 4.4, 0.40);
        }
        if (c === this.player && typeof HexAudio !== 'undefined' && HexAudio.haptic) {
          HexAudio.haptic('sweeper');
        }
      }
    });

    // 6. Camera Follow
    this._updateCamera(dt);

    // 7. Spark Particles
    this._updateSparkParticles(dt);

    // 7.5. Deck Shockwave Ripples
    this._updateShockwaves(dt);

    // 7.6. Screen Speed Lines on Nitro & Dash
    if (this.speedLinesEl) {
      this.speedLinesEl.classList.remove('active');
    }

    // Score Calculation
    this.score = Math.floor(this.matchTime * 15) + (this.kills * 350) + (this.crystals * 150);

    // Ring Countdown HUD updates
    if (this.arena && this.arena.ringStages && this.onRingCountdown) {
      const uncollapsed = this.arena.ringStages.filter(s => !s.collapsed && !s.dropping && s.collapseTime !== Infinity);
      if (uncollapsed.length > 0) {
        const nextStage = uncollapsed[0];
        const secLeft = Math.max(0, Math.ceil(nextStage.collapseTime - this.arena.elapsedTime));
        const prevCollapse = nextStage.id === 2 ? 0 : (nextStage.id === 3 ? 0 : (this.arena.ringStages.find(s => s.id === nextStage.id + 1)?.collapseTime || 0));
        const totalDuration = Math.max(1, nextStage.collapseTime - prevCollapse);
        const elapsedInStage = Math.max(0, this.arena.elapsedTime - prevCollapse);
        const pct = Math.max(0, Math.min(100, (1 - (elapsedInStage / totalDuration)) * 100));
        const isWarning = this.arena.elapsedTime >= nextStage.warningTime;
        if (isWarning && !nextStage.announcedWarning) {
          nextStage.announcedWarning = true;
          if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('warning');
          this.triggerComboBanner('ARENA COLLAPSE!', '⚠️ EVACUATE INNER RING NOW ⚠️');
          this.triggerImpactFlash(this.arena ? this.arena.theme : 'neon');
        }
        this.onRingCountdown({
          name: nextStage.name,
          secLeft: secLeft,
          pct: pct,
          isWarning: isWarning,
          isCore: false
        });
      } else {
        this.onRingCountdown({
          name: 'CORE DUEL PIT',
          secLeft: 0,
          pct: 0,
          isWarning: false,
          isCore: true
        });
      }
    }

    // Check Solo Victory (Last pilot remaining!)
    if (!this.isMultiplayer && this.player && this.player.alive && this.aiManager && this.aiManager.getAliveCount() === 0) {
      this.score += 1500; // huge victory reward!
      this._triggerGameOver(true);
      return;
    }

    
    // Final 2 Duel Check
    const aliveCraftsCount = (this.player && this.player.alive ? 1 : 0) +
      (this.aiManager ? this.aiManager.getAliveCount() : 0) +
      (this.remotePlayers ? Array.from(this.remotePlayers.values()).filter(rc => rc && rc.alive).length : 0);
    if (aliveCraftsCount === 2 && !this.announcedFinal2) {
      this.announcedFinal2 = true;
      if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('final2');
      this.triggerComboBanner('FINAL 2!', '⚔️ DUEL TO THE DEATH ⚔️');
    }

    // HUD Callback
    if (this.onUpdate) {
      const aliveRemoteCount = this.remotePlayers ? Array.from(this.remotePlayers.values()).filter(rc => rc && rc.alive).length : 0;
      const totalRemoteCount = this.remotePlayers ? this.remotePlayers.size : 0;
      const totalBotCount = this.aiManager ? this.aiManager.bots.length : 0;
      this.onUpdate({
        arenaTheme: this.currentArenaTheme || 'neon',
        arenaName: (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[this.currentArenaTheme]) ? ARENA_THEMES[this.currentArenaTheme].name : 'NEON COLOSSEUM',
        arenaIcon: (typeof ARENA_THEMES !== 'undefined' && ARENA_THEMES[this.currentArenaTheme]) ? ARENA_THEMES[this.currentArenaTheme].icon : '🏟️',
        time: this.matchTime,
        alive: (this.player && this.player.alive ? 1 : 0) + (this.aiManager ? this.aiManager.getAliveCount() : 0) + aliveRemoteCount,
        total: (this.isMultiplayer ? (1 + totalBotCount + totalRemoteCount) : this.totalPlayers),
        kills: this.kills,
        score: this.score,
        dashCooldown: Math.max(0, this.player.dashCooldown / this.player.dashMaxCooldown),
        empCooldown: Math.max(0, this.player.empCooldown / this.player.empMaxCooldown),
        hasRocket: this.player.hasRocket,
        rocketProgress: (this.player.rocketTimer / 4.8) * 100,
        hasShield: this.player.hasShield,
        shieldProgress: (this.player.shieldTimer / 5.2) * 100,
        isGlitchSlow: this.player.isGlitchSlow,
        slowProgress: (this.player.glitchSlowTimer / 4.0) * 100,
        isJammed: this.player.isJammed,
        jamProgress: (this.player.jamTimer / 3.6) * 100
      });
    }
  }

  _resolveBumperCollisions(crafts) {
    const n = crafts.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const A = crafts[i];
        const B = crafts[j];
        if (!A || !B || !A.alive || !B.alive || !A.grounded || !B.grounded) continue;
        if (Math.abs(A.y - B.y) > 1.5) continue;
        if (Math.abs(A.x) < 0.001 && Math.abs(A.z) < 0.001 && !A.isPlayer) continue;
        if (Math.abs(B.x) < 0.001 && Math.abs(B.z) < 0.001 && !B.isPlayer) continue;

        const dx = B.x - A.x;
        const dz = B.z - A.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = A.radius + B.radius; // ~2.3

        if (dist < minDist && dist > 0.001) {
          // Normal vector pointing from A to B
          const nx = dx / dist;
          const nz = dz / dist;

          // Push apart to resolve overlap
          const overlap = minDist - dist;
          A.x -= nx * overlap * 0.5;
          A.z -= nz * overlap * 0.5;
          B.x += nx * overlap * 0.5;
          B.z += nz * overlap * 0.5;

          // Relative velocity
          const rvx = B.vx - A.vx;
          const rvz = B.vz - A.vz;
          const velAlongNormal = rvx * nx + rvz * nz;

          if (velAlongNormal < 0) {
            // Forward velocity along normal: who is ramming whom?
            const aForward = A.vx * nx + A.vz * nz;       // Positive if A is charging toward B
            const bForward = -(B.vx * nx + B.vz * nz);    // Positive if B is charging toward A

            let restitution = 1.15; // Snappy, punchy bumper bounce
            let bonusImpulse = 0;

            // Shield deflection
            if (A.hasShield && !B.hasShield) {
              B.vx += nx * 14;
              B.vz += nz * 14;
              B.knockbackTimer = 0.26;
              B.lastAttacker = A;
              HexAudio.sfxBump(2.2);
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0x00E5FF, (A.y + B.y) / 2);
              if (A.setEmotion) A.setEmotion('kill', 1.2, 'DEFLECTED!', '🛡️');
              if (B.onImpact) B.onImpact(2.0);
              continue;
            }
            if (B.hasShield && !A.hasShield) {
              A.vx -= nx * 14;
              A.vz -= nz * 14;
              A.knockbackTimer = 0.26;
              A.lastAttacker = B;
              HexAudio.sfxBump(2.2);
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0x00E5FF);
              if (B.setEmotion) B.setEmotion('kill', 1.2, 'DEFLECTED!', '🛡️');
              if (A.onImpact) A.onImpact(2.0);
              continue;
            }

            
            // Super Ram Overcharge bonus: Maximum kinetic devastation
            if (A.hasSuperRam) {
              bonusImpulse += 18.0;
              B.lastAttacker = A;
              if (typeof HexAudio !== 'undefined' && HexAudio.sfxSuperRam) HexAudio.sfxSuperRam();
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0xFFD700, (A.y + B.y) / 2);
              if (A.isPlayer || B.isPlayer) this.triggerImpactFlash('superram');
              this.cameraShake = Math.max(this.cameraShake, 0.65);
            }
            if (B.hasSuperRam) {
              bonusImpulse += 18.0;
              A.lastAttacker = B;
              if (typeof HexAudio !== 'undefined' && HexAudio.sfxSuperRam) HexAudio.sfxSuperRam();
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0xFFD700, (A.y + B.y) / 2);
              if (A.isPlayer || B.isPlayer) this.triggerImpactFlash('superram');
              this.cameraShake = Math.max(this.cameraShake, 0.65);
            }
            // Dash bonuses: Hardcore punchy impact (equal & fair for player and bots!)
            if (A.isDashing) {
              bonusImpulse += 11.5;
              B.lastAttacker = A;
            }
            if (B.isDashing) {
              bonusImpulse += 11.5;
              A.lastAttacker = B;
            }

            // Regular offensive ram bonus: Equal reward for forward charge
            if (aForward > 1.4 && !A.isDashing) {
              bonusImpulse += 5.8;
              B.lastAttacker = A;
            } else if (bForward > 1.4 && !B.isDashing) {
              bonusImpulse += 5.8;
              A.lastAttacker = B;
            }

            const totalMass = (1 / A.mass) + (1 / B.mass);
            let impulseMag = -(1 + restitution) * velAlongNormal / totalMass + bonusImpulse;

            // Safe maximum impulse cap
            const maxImpulse = (A.hasSuperRam || B.hasSuperRam) ? 38.0 : ((A.isDashing || B.isDashing) ? 25.0 : 17.5);
            impulseMag = Math.min(maxImpulse, impulseMag);

            // Recoil factors:
            let aRecoil = 1.0;
            let bRecoil = 1.0;

            if (A.isPlayer && aForward >= bForward) {
              // Player is ramming B!
              aRecoil = 0.32;
              bRecoil = 1.18;
              B.knockbackTimer = A.isDashing ? 0.36 : 0.22;
              if (A.setEmotion && Math.random() < 0.4) {
                const calls = ['RAMMED!', 'BOOM!', 'PUSH!', 'SMACK!'];
                A.setEmotion('dash', 0.8, calls[Math.floor(Math.random() * calls.length)], '💥');
              }
            } else if (B.isPlayer && bForward >= aForward) {
              // Player is ramming A!
              bRecoil = 0.32;
              aRecoil = 1.18;
              A.knockbackTimer = B.isDashing ? 0.36 : 0.22;
              if (B.setEmotion && Math.random() < 0.4) {
                const calls = ['RAMMED!', 'BOOM!', 'PUSH!', 'SMACK!'];
                B.setEmotion('dash', 0.8, calls[Math.floor(Math.random() * calls.length)], '💥');
              }
            } else {
              // Bot is ramming Player or Bot vs Bot
              if (A.isPlayer) {
                aRecoil = 0.72; // Hardcore bot ram! Player genuinely feels the shove!
                bRecoil = 0.88;
                A.knockbackTimer = B.isDashing ? 0.32 : 0.20;
              } else if (B.isPlayer) {
                bRecoil = 0.72;
                aRecoil = 0.88;
                B.knockbackTimer = A.isDashing ? 0.32 : 0.20;
              } else {
                // Bot vs Bot: High-energy robotic clash!
                A.knockbackTimer = 0.30;
                B.knockbackTimer = 0.30;
              }
            }

            A.vx -= ((impulseMag * aRecoil) / A.mass) * nx;
            A.vz -= ((impulseMag * aRecoil) / A.mass) * nz;
            B.vx += ((impulseMag * bRecoil) / B.mass) * nx;
            B.vz += ((impulseMag * bRecoil) / B.mass) * nz;

            // Transmit collision impulse over network if colliding with remote human!
            if (this.isMultiplayer && this.socket && this.socket.connected) {
              if (A.isPlayer && B.isRemote && B.remoteId) {
                this.socket.emit('player_collision', {
                  targetId: B.remoteId,
                  impulseX: ((impulseMag * bRecoil) / B.mass) * nx,
                  impulseZ: ((impulseMag * bRecoil) / B.mass) * nz,
                  hitForce: impactIntensity
                });
              } else if (B.isPlayer && A.isRemote && A.remoteId) {
                this.socket.emit('player_collision', {
                  targetId: A.remoteId,
                  impulseX: -((impulseMag * aRecoil) / A.mass) * nx,
                  impulseZ: -((impulseMag * aRecoil) / A.mass) * nz,
                  hitForce: impactIntensity
                });
              }
            }

            // Attribute attacker
            const relSpeed = Math.sqrt(rvx * rvx + rvz * rvz);
            if (aForward > bForward + 1.5) {
              B.lastAttacker = A;
            } else if (bForward > aForward + 1.5) {
              A.lastAttacker = B;
            } else if (A.isPlayer) {
              B.lastAttacker = A;
            }

            // Impact reactions & dynamic expressions
            const impactIntensity = Math.min(2.5, Math.max(0.8, (relSpeed + bonusImpulse) / 8.5));
            if (A.onImpact) A.onImpact(impactIntensity);
            if (B.onImpact) B.onImpact(impactIntensity);

            // Impact audio and camera shake
            const impactForce = Math.min(2.5, relSpeed / 7.0);
            HexAudio.sfxBump(impactForce);
            if (A.isPlayer || B.isPlayer) {
              this.cameraShake = Math.max(this.cameraShake, (A.isDashing || B.isDashing) ? 0.42 : 0.22);
            }

            // Impact audio, camera shake & tactile haptic
            if (A.isPlayer || B.isPlayer) {
              if (typeof HexAudio !== 'undefined' && HexAudio.haptic) {
                HexAudio.haptic(impactIntensity > 1.3 ? 'smash' : 'bump');
              }
            }

            // Collision Spark Particles and Deck Shockwave Ripple at contact point
            const midContactX = (A.x + B.x) / 2;
            const midContactZ = (A.z + B.z) / 2;
            const hitColor = (A.isDashing || A.hasRocket) ? A.suitColor : ((B.isDashing || B.hasRocket) ? B.suitColor : (A.isPlayer ? A.suitColor : B.suitColor));
            this._spawnSparks(midContactX, midContactZ, hitColor, (A.y + B.y) / 2);
            this.spawnDeckShockwave(midContactX, midContactZ, hitColor, Math.min(5.2, 2.2 + impactIntensity * 1.5), 0.35);
          }
        }
      }
    }
  }

  _handleCraftKnockout(victim) {
    HexAudio.sfxKill();
    if (typeof HexAudio !== 'undefined' && HexAudio.haptic && (victim === this.player || (victim.lastAttacker && victim.lastAttacker === this.player))) {
      HexAudio.haptic('knockout');
    }
    const attacker = victim.lastAttacker;

    let killerName = 'Cyber Void';
    if (attacker) {
      killerName = attacker.pilotName;
      if (attacker === this.player) {
        this.kills++;
        this.score += 350;
        this.cameraShake = 0.35;

        // Multi-KO Combo Streak Window (6.0 seconds between kills)
        const now = performance.now();
        if (now - this.lastKillTime < 6000) {
          this.killStreak++;
        } else {
          this.killStreak = 1;
        }
        this.lastKillTime = now;
        if (this.killStreak > this.bestStreak) {
          this.bestStreak = this.killStreak;
        }

        if (this.killStreak === 2) {
          this.score += 200;
          if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('double_ko');
          this.triggerComboBanner('DOUBLE K.O.!', '+200 BONUS POINTS');
          this.triggerImpactFlash('neon');
        } else if (this.killStreak === 3) {
          this.score += 500;
          if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('triple_ko');
          this.triggerComboBanner('TRIPLE K.O.!', '+500 MULTI-RAM BONUS');
          this.triggerImpactFlash('inferno');
        } else if (this.killStreak >= 4) {
          this.score += 1000;
          if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('unstoppable');
          this.triggerComboBanner('UNSTOPPABLE!', '+1000 ARENA GOD BONUS');
          this.triggerImpactFlash('superram');
        }
      }
      if (attacker.onScoreKill) {
        attacker.onScoreKill(victim.pilotName);
      }
    }

    if (victim.onKnockedOut) {
      victim.onKnockedOut();
    }

    if (this.onKillFeed) {
      this.onKillFeed({
        killer: killerName,
        victim: victim.pilotName,
        isPlayerKill: attacker === this.player
      });
    }
  }

  _spawnSparks(x, z, colorHex, y = null) {
    const spawnY = (typeof y === 'number') ? y : 0.85;
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, spawnY, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      this.sparkParticles.push({
        mesh,
        vx: Math.cos(angle) * spd,
        vy: 2 + Math.random() * 5,
        vz: Math.sin(angle) * spd,
        life: 0.35
      });
    }
  }

  _spawnEmpRingVFX(x, z, y = null) {
    const actualY = (typeof y === 'number') ? y : 0.85;
    // 1. Dual Giant Shockwave Plasma Rings matching the 10.5m field
    const geoOuter = new THREE.RingGeometry(0.8, 1.8, 36);
    const matOuter = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ringOuter = new THREE.Mesh(geoOuter, matOuter);
    ringOuter.rotation.x = -Math.PI / 2;
    ringOuter.position.set(x, actualY - 0.40, z);
    this.scene.add(ringOuter);

    const geoInner = new THREE.RingGeometry(0.3, 1.1, 36);
    const matInner = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0
    });
    const ringInner = new THREE.Mesh(geoInner, matInner);
    ringInner.rotation.x = -Math.PI / 2;
    ringInner.position.set(x, actualY - 0.35, z);
    this.scene.add(ringInner);

    // 2. High-Density Electric Spark Blast (32 particles exploding outward)
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const spd = 14 + Math.random() * 8;
      const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const mat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? 0x00FFFF : (i % 3 === 0 ? 0xBF00FF : 0xFFFFFF)
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, actualY, z);
      this.scene.add(mesh);
      this.sparkParticles.push({
        mesh,
        vx: Math.cos(angle) * spd,
        vy: 1.5 + Math.random() * 3.5,
        vz: Math.sin(angle) * spd,
        life: 0.45
      });
    }

    this.spawnDeckShockwave(x, z, 0x00FFFF, 6.8, 0.55, actualY - 0.40);
    // 3. Fast dramatic ring expansion up to 10.5m
    let scale = 1.0;
    const expand = () => {
      scale += 0.55;
      ringOuter.scale.set(scale, scale, 1);
      ringInner.scale.set(scale * 0.82, scale * 0.82, 1);
      matOuter.opacity -= 0.045;
      matInner.opacity -= 0.055;

      if (matOuter.opacity > 0) {
        requestAnimationFrame(expand);
      } else {
        this.scene.remove(ringOuter);
        this.scene.remove(ringInner);
        geoOuter.dispose();
        matOuter.dispose();
        geoInner.dispose();
        matInner.dispose();
      }
    };
    expand();
  }


  _initShockwavePool() {
    this.shockwavePool = [];
    const poolSize = 10;
    const ringGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00E5FF,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2; // Flat horizontal on arena deck
      mesh.position.set(0, 0.28, 0);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwavePool.push({
        mesh,
        mat,
        active: false,
        progress: 1.0,
        duration: 0.35,
        maxScale: 3.6,
        y: 0.28
      });
    }
  }

  spawnDeckShockwave(x, z, colorHex = 0x00E5FF, maxScale = 3.6, duration = 0.35, y = 0.28) {
    if (!this.shockwavePool || this.shockwavePool.length === 0) return;
    let wave = this.shockwavePool.find(w => !w.active);
    if (!wave) wave = this.shockwavePool[0]; // Recycle oldest active wave

    wave.active = true;
    wave.progress = 0;
    wave.duration = Math.max(0.15, duration);
    wave.maxScale = maxScale;
    wave.y = y;
    wave.mesh.position.set(x, y, z);
    wave.mesh.scale.set(0.3, 0.3, 0.3);
    wave.mat.color.setHex(colorHex);
    wave.mat.opacity = 0.95;
    wave.mesh.visible = true;
  }

  _updateShockwaves(dt) {
    if (!this.shockwavePool) return;
    for (let i = 0; i < this.shockwavePool.length; i++) {
      const wave = this.shockwavePool[i];
      if (!wave.active) continue;
      wave.progress += dt / wave.duration;
      if (wave.progress >= 1.0) {
        wave.active = false;
        wave.mesh.visible = false;
        wave.mat.opacity = 0;
      } else {
        const p = wave.progress;
        const ease = 1 - (1 - p) * (1 - p); // Quad ease-out
        const s = 0.3 + (wave.maxScale - 0.3) * ease;
        wave.mesh.scale.set(s, s, s);
        wave.mat.opacity = (1 - p) * 0.92;
      }
    }
  }

  _updateSparkParticles(dt) {
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.sparkParticles.splice(i, 1);
      } else {
        p.vy -= 18 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
      }
    }
  }

  _updateCamera(dt) {
    let focusX = 0;
    let focusY = 0.85;
    let focusZ = 0;

    if (this.isSpectating) {
      this._refreshSpectateTarget();
      if (this.spectateTarget) {
        focusX = this.spectateTarget.x;
        focusY = (this.spectateTarget.y || 0.85) + 0.5;
        focusZ = this.spectateTarget.z;
      } else {
        this.stopSpectating();
        if (this.player && this.player.alive) {
          focusX = this.player.x;
          focusY = this.player.y + 0.5;
          focusZ = this.player.z;
        } else {
          focusX = 0;
          focusY = 0.85;
          focusZ = 0;
        }
      }
    } else if (this.player && this.player.alive) {
      focusX = this.player.x;
      focusY = this.player.y + 0.5;
      focusZ = this.player.z;
    } else if (this.player) {
      focusX = this.cameraTarget.x;
      focusY = 0.85;
      focusZ = this.cameraTarget.z;
    } else {
      return;
    }

    this.camHeight = 11.0;
    this.camDistance = 14.5;

    this._reusableFocusVec.set(focusX, focusY, focusZ);
    this.cameraTarget.lerp(this._reusableFocusVec, Math.min(1, 6.0 * dt));

    const offX = Math.sin(this.cameraYaw) * this.camDistance;
    const offZ = Math.cos(this.cameraYaw) * this.camDistance;

    this._reusableCamPos.set(
      this.cameraTarget.x + offX,
      this.cameraTarget.y + this.camHeight,
      this.cameraTarget.z + offZ
    );

    this.camera.position.lerp(this._reusableCamPos, Math.min(1, 5.0 * dt));

    if (this.cameraShake > 0) {
      this.cameraShake -= dt * 3.5;
      const sh = Math.min(0.20, this.cameraShake * 0.40); // Subtle, stable arcade impact (no annoying jitter)
      this.camera.position.x += (Math.random() - 0.5) * sh;
      this.camera.position.y += (Math.random() - 0.5) * sh * 0.35;
    }

    this.camera.lookAt(this.cameraTarget);
  }

  _triggerGameOver(isWin, winnerName) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    HexAudio.stopMusic();

    if (isWin) {
      HexAudio.sfxVictory();
      if (typeof HexAudio !== 'undefined' && HexAudio.announce) HexAudio.announce('victory');
    } else {
      HexAudio.sfxElimination();
    }

    if (this.onGameOver) {
      this.onGameOver({
        win: isWin,
        time: Math.floor(this.matchTime),
        kills: this.kills,
        score: this.score,
        pilot: this.pilotName,
        suitColor: this.suitKey,
        winnerName: winnerName,
        canSpectate: this.hasRealHumansToSpectate(),
        topSpeed: Math.round(this.maxRecordedSpeed * 7.2),
        bestStreak: this.bestStreak || 0
      });
    }
  }

  triggerImpactFlash(theme = 'neon') {
    // Disabled full-screen glow as requested
    return;
  }

  triggerComboBanner(title, sub) {
    if (!this.comboBannerEl) {
      this.comboBannerEl = document.getElementById('comboBanner');
      this.comboTitleEl = document.getElementById('comboTitle');
      this.comboSubEl = document.getElementById('comboSub');
    }
    if (!this.comboBannerEl) return;
    if (this.comboTitleEl) this.comboTitleEl.textContent = title;
    if (this.comboSubEl) this.comboSubEl.textContent = sub;
    this.comboBannerEl.classList.remove('active');
    void this.comboBannerEl.offsetWidth; // force DOM reflow
    this.comboBannerEl.classList.add('active');
    if (this._comboTimeout) clearTimeout(this._comboTimeout);
    this._comboTimeout = setTimeout(() => {
      if (this.comboBannerEl) {
        this.comboBannerEl.classList.remove('active');
      }
    }, 1800);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    try {
      this._update(dt);
    } catch (err) {
      console.error('[GameEngine _update error]', err);
    }

    if (this.stars) this.stars.rotation.y += dt * 0.015;

    try {
      this.renderer.render(this.scene, this.camera);
      this._renderRadar();
    } catch (err) {
      console.error('[GameEngine render error]', err);
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // =============================================
  // CYBER RADAR / MINI-MAP ENGINE
  // =============================================
  _initRadar() {
    this.radarCanvas = document.getElementById('radarCanvas');
    if (this.radarCanvas && this.radarCanvas.getContext) {
      this.radarCtx = this.radarCanvas.getContext('2d');
    }
  }

  _renderRadar() {
    if (!this.radarCtx || !this.radarCanvas || !this.arena) return;

    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = 56;
    const arenaMax = this.totalPlayers > 10 ? 28 : 21;
    const scale = maxR / (arenaMax + 1.0);

    ctx.clearRect(0, 0, w, h);

    // Outer Arena Grid Ring
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Active Safe Ring Boundary
    const curR = (this.arena.currentRadius || 21) * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, curR), 0, Math.PI * 2);

    let isWarningDrop = false;
    if (this.arena.ringStages) {
      const activeStage = this.arena.ringStages.find(s => !s.collapsed && (s.warned || s.dropping));
      if (activeStage) isWarningDrop = true;
    }
    ctx.strokeStyle = isWarningDrop ? 'rgba(255, 0, 85, 0.95)' : 'rgba(0, 255, 198, 0.75)';
    ctx.lineWidth = isWarningDrop ? 2.5 : 1.8;
    ctx.stroke();

    // Central Hazard Sweeper
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4400';
    ctx.fill();

    if (this.arena.hazardGroup) {
      const theta = this.arena.hazardGroup.rotation.y;
      const barLen = 5.3 * scale;
      if (this.currentArenaTheme === 'cryo') {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.2;
        for (let b = 0; b < 3; b++) {
          const bladeAng = theta + (b * Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(bladeAng) * barLen, cy + Math.sin(bladeAng) * barLen);
          ctx.stroke();
        }
      } else if (this.currentArenaTheme === 'inferno') {
        ctx.strokeStyle = '#FF4400';
        ctx.lineWidth = 2.2;
        for (let b = 0; b < 4; b++) {
          const bladeAng = theta + (b * Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(bladeAng) * barLen, cy + Math.sin(bladeAng) * barLen);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(theta) * barLen, cy - Math.sin(theta) * barLen);
        ctx.lineTo(cx + Math.cos(theta) * barLen, cy + Math.sin(theta) * barLen);
        ctx.strokeStyle = 'rgba(255, 68, 0, 0.85)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }
    }

    // Power-Ups
    if (this.arena.powerUps) {
      this.arena.powerUps.forEach(pu => {
        if (pu.collected) return;
        const px = cx + pu.x * scale;
        const py = cy + pu.z * scale;
        ctx.fillStyle = (pu.type === 'hazard_slow' || pu.type === 'hazard_jam') ? '#B000FF' : '#FFD700';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      });
    }

    // Enemy Crafts (Bots & Remote Players)
    if (this.aiManager) {
      this.aiManager.getCrafts().forEach(bc => {
        if (!bc.alive) return;
        const bx = cx + bc.x * scale;
        const by = cy + bc.z * scale;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF3366';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    if (this.remotePlayers) {
      this.remotePlayers.forEach(rc => {
        if (!rc.alive) return;
        const rx = cx + rc.x * scale;
        const ry = cy + rc.z * scale;
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#4DA6FF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Local Player Dot & Heading Pointer
    if (this.player && this.player.alive) {
      const px = cx + this.player.x * scale;
      const py = cy + this.player.z * scale;

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00FFC6';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const fAngle = this.player.facing || 0;
      const nx = px + Math.sin(fAngle) * 7.5;
      const ny = py + Math.cos(fAngle) * 7.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = '#00FFC6';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  }

  // =============================================
  // SPECTATOR MODE SYSTEM (ONLY FOR REAL HUMAN OPPONENTS)
  // =============================================
  hasRealHumansToSpectate() {
    if (!this.isMultiplayer || !this.remotePlayers) return false;
    const aliveHumans = Array.from(this.remotePlayers.values()).filter(rc => rc && rc.alive);
    return aliveHumans.length > 0;
  }

  startSpectating() {
    if (!this.hasRealHumansToSpectate()) {
      this.stopSpectating();
      return false;
    }
    this.isSpectating = true;
    this.state = 'spectating';
    this.spectateIndex = 0;
    this._refreshSpectateTarget();
    return true;
  }

  stopSpectating() {
    this.isSpectating = false;
    this.spectateTarget = null;
    if (this.state === 'spectating') {
      this.state = 'gameover';
    }
  }

  spectateNext() {
    const alive = this._getAliveCrafts();
    if (alive.length === 0) {
      if (this.onSpectateChange) this.onSpectateChange('NO ALIVE PILOTS');
      return;
    }
    this.spectateIndex = (this.spectateIndex + 1) % alive.length;
    this.spectateTarget = alive[this.spectateIndex];
    if (this.onSpectateChange) this.onSpectateChange(this.getSpectateName());
  }

  spectatePrev() {
    const alive = this._getAliveCrafts();
    if (alive.length === 0) {
      if (this.onSpectateChange) this.onSpectateChange('NO ALIVE PILOTS');
      return;
    }
    this.spectateIndex = (this.spectateIndex - 1 + alive.length) % alive.length;
    this.spectateTarget = alive[this.spectateIndex];
    if (this.onSpectateChange) this.onSpectateChange(this.getSpectateName());
  }

  _getAliveCrafts() {
    // SPECTATE ONLY REAL HUMAN OPPONENTS, NEVER BOTS
    if (!this.isMultiplayer || !this.remotePlayers) return [];
    return Array.from(this.remotePlayers.values()).filter(c => c && c.alive);
  }

  _refreshSpectateTarget() {
    const alive = this._getAliveCrafts();
    if (alive.length === 0) {
      this.spectateTarget = null;
      if (this.onSpectateChange) this.onSpectateChange('NO ALIVE PILOTS');
      if (this.isSpectating) {
        this.stopSpectating();
        if (this.onSpectatorEnded) this.onSpectatorEnded();
      }
      return;
    }
    if (!this.spectateTarget || !this.spectateTarget.alive) {
      this.spectateIndex = Math.min(this.spectateIndex, alive.length - 1);
      this.spectateTarget = alive[this.spectateIndex];
      if (this.onSpectateChange) this.onSpectateChange(this.getSpectateName());
    }
  }

  getSpectateName() {
    if (!this.spectateTarget) return 'NO ALIVE PILOTS';
    return this.spectateTarget.pilotName || 'Remote Pilot';
  }

}





if (typeof window !== 'undefined') {
  window.BumperGameEngine = BumperGameEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.BumperGameEngine = BumperGameEngine;
}
