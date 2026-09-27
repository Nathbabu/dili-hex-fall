// =============================================
// DILI: HEX-FALL — 3D Cyber Arena Engine
// =============================================
class HexFallEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.state = 'idle'; // idle, countdown, playing, paused, gameover

    // Three.js Core
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();

    // Scene Objects
    this.hexGrid = null;
    this.player = null;
    this.aiManager = null;
    this.stars = null;

    // Input
    this.keys = {};
    this.joystickInput = { x: 0, z: 0 };
    this.cameraYaw = 0;
    this.isDraggingCamera = false;
    this.lastMouseX = 0;

    // Game stats
    this.survivalTime = 0;
    this.score = 0;
    this.crystalsCollected = 0;
    this.playerTier = 0;
    this.pilotName = 'Dili_Cadet';
    this.suitColor = 0x00FFC6;

    // Camera follow
    this.cameraTarget = new THREE.Vector3();
    this.cameraDistance = 15;
    this.cameraHeight = 11;
    this.cameraShake = 0;

    // Callbacks
    this.onUpdate = null;
    this.onGameOver = null;
    this.onPowerUp = null;

    this._initThree();
    this._setupInputs();
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
    this.renderer.setClearColor(0x050810, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050810, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      250
    );
    this.camera.position.set(0, 16, 18);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0x405580, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 30, 20);
    this.scene.add(dirLight);

    const pointCyan = new THREE.PointLight(0x00E5FF, 1.2, 50);
    pointCyan.position.set(-12, 6, -10);
    this.scene.add(pointCyan);

    const pointPink = new THREE.PointLight(0xFF6EC7, 0.8, 45);
    pointPink.position.set(12, 4, 10);
    this.scene.add(pointPink);

    this._createStarfield();
    this._createAbyssGrid();

    window.addEventListener('resize', () => this._onResize());
  }

  _createStarfield() {
    const starCount = 1400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120 + 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;

      const c = new THREE.Color().setHSL(0.52 + Math.random() * 0.16, 0.6, 0.75);
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

  _createAbyssGrid() {
    const gridHelper = new THREE.GridHelper(160, 40, 0x00E5FF, 0x003366);
    gridHelper.position.y = -35;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.4;
    this.scene.add(gridHelper);
  }

  _setupInputs() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.state === 'playing') {
        e.preventDefault();
        if (this.player && this.player.grounded) {
          this.player.jump();
          HexAudio.sfxJump();
        }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.player && this.state === 'playing') {
          this.player.dive();
          HexAudio.sfxDive();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Camera Drag Orbit (Mouse & Non-Control Touch)
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

    window.addEventListener('mouseup', () => {
      this.isDraggingCamera = false;
    });

    // Touch orbit on canvas
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.closest('.mobile-controls')) {
        this.isDraggingCamera = true;
        this.lastMouseX = e.touches[0].clientX;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isDraggingCamera || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouseX;
      this.cameraYaw -= dx * 0.007;
      this.lastMouseX = e.touches[0].clientX;
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isDraggingCamera = false;
    }, { passive: true });

    // Mobile Virtual Joystick
    this._setupVirtualJoystick();

    // Mobile Action Buttons
    const btnJump = document.getElementById('btnJump');
    const btnDive = document.getElementById('btnDive');

    const handleJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this.player && this.player.grounded && this.state === 'playing') {
        this.player.jump();
        HexAudio.sfxJump();
      }
    };
    if (btnJump) {
      btnJump.addEventListener('touchstart', handleJump, { passive: false });
      btnJump.addEventListener('mousedown', handleJump);
    }

    const handleDive = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this.player && this.state === 'playing') {
        this.player.dive();
        HexAudio.sfxDive();
      }
    };
    if (btnDive) {
      btnDive.addEventListener('touchstart', handleDive, { passive: false });
      btnDive.addEventListener('mousedown', handleDive);
    }
  }

  _setupVirtualJoystick() {
    const zone = document.getElementById('joystickZone');
    const knob = document.getElementById('joystickKnob');
    if (!zone || !knob) return;

    let dragging = false;
    let startX = 0, startY = 0;
    const maxR = 42;

    const onStart = (clientX, clientY) => {
      dragging = true;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    };

    const onMove = (clientX, clientY) => {
      if (!dragging) return;
      let dx = clientX - startX;
      let dy = clientY - startY;
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
      knob.style.transform = 'translate(-50%, -50%)';
      this.joystickInput.x = 0;
      this.joystickInput.z = 0;
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchend', onEnd);
    zone.addEventListener('touchcancel', onEnd);

    zone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
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

    // Rotate input relative to camera yaw
    const cosY = Math.cos(this.cameraYaw);
    const sinY = Math.sin(this.cameraYaw);

    const worldX = fx * cosY + fz * sinY;
    const worldZ = -fx * sinY + fz * cosY;

    return { x: worldX, z: worldZ };
  }

  startGame(pilotName, suitColorHex) {
    this.pilotName = pilotName || 'Dili_Cadet';
    this.suitColor = suitColorHex || 0x00FFC6;
    this.survivalTime = 0;
    this.score = 0;
    this.crystalsCollected = 0;
    this.playerTier = 0;
    this.cameraYaw = 0;

    if (this.hexGrid) {
      this.hexGrid.reset();
    } else {
      this.hexGrid = new HexGrid(this.scene);
      this.hexGrid.build();
    }

    if (this.player) this.player.remove();
    this.player = new Character3D(this.scene, this.suitColor, this.pilotName);
    this.player.isPlayer = true;
    this.player.reset(0, this.hexGrid.getTierY(0) + 2, 0);

    if (this.aiManager) this.aiManager.clear();
    this.aiManager = new AIManager(this.scene, this.hexGrid);
    this.aiManager.spawn();

    this.state = 'countdown';
    this._doCountdown();
  }

  _doCountdown() {
    let count = 3;
    const overlay = document.createElement('div');
    overlay.id = 'countdownModal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:60;pointer-events:none;';
    overlay.innerHTML = `<span style="font-family:Orbitron,monospace;font-size:7rem;font-weight:900;color:#00E5FF;text-shadow:0 0 50px #00E5FF, 0 0 100px rgba(0,229,255,0.4);transition:all 0.25s">${count}</span>`;
    document.body.appendChild(overlay);

    HexAudio.sfxCountdown();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        overlay.querySelector('span').textContent = count;
        HexAudio.sfxCountdown();
      } else {
        const span = overlay.querySelector('span');
        span.textContent = 'GO!';
        span.style.color = '#00FFC6';
        span.style.textShadow = '0 0 50px #00FFC6';
        HexAudio.sfxGo();
        clearInterval(interval);
        setTimeout(() => {
          overlay.remove();
          this.state = 'playing';
          this.clock.start();
          HexAudio.startMusic();
        }, 550);
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
    this.clock.getDelta(); // flush delta
    HexAudio.startMusic();
  }

  quit() {
    this.state = 'idle';
    HexAudio.stopMusic();
    if (this.player) { this.player.remove(); this.player = null; }
    if (this.aiManager) { this.aiManager.clear(); this.aiManager = null; }
  }

  _update(dt) {
    if (this.state !== 'playing') return;

    this.survivalTime += dt;

    // Player Movement
    const inp = this._getInputVector();
    this.player.update(dt, inp.x, inp.z);

    // Continuous Ground Collision
    this._checkGroundCollision(this.player);

    // Tile Stepping
    this._checkTileStepping(this.player, true);

    // Pickups
    this._checkPickups();

    // AI Astronauts
    if (this.aiManager) {
      this.aiManager.update(dt);
      this.aiManager.bots.forEach(b => {
        this._checkGroundCollision(b.character);
        this._checkTileStepping(b.character, false);
      });
    }

    // Hex Grid Animation & Drop
    if (this.hexGrid) this.hexGrid.update(dt);

    // Camera follow
    this._updateCamera(dt);

    // Live score calculation
    this.score = Math.floor(this.survivalTime * 12) + (this.crystalsCollected * 100);

    // Check Death
    if (!this.player.alive) {
      this._triggerGameOver(false);
      return;
    }

    // Check Victory (Last pilot alive!)
    if (this.aiManager && this.aiManager.getAliveCount() === 0) {
      this.score += 1000; // 1000 bonus victory points
      this._triggerGameOver(true);
      return;
    }

    // Power-up HUD status
    let activePowerUp = null;
    let powerUpProgress = 0;
    if (this.player.hasGlider) {
      activePowerUp = { icon: '🪂', name: 'GLIDER JETPACK' };
      powerUpProgress = (this.player.gliderTimer / 5.0) * 100;
    } else if (this.player.frozenTiles) {
      activePowerUp = { icon: '❄️', name: 'MATRIX FREEZE' };
      powerUpProgress = (this.player.freezeTimer / 3.5) * 100;
    }

    // HUD Callback
    if (this.onUpdate) {
      this.onUpdate({
        time: this.survivalTime,
        tier: this.playerTier + 1,
        tierLabel: this.hexGrid ? this.hexGrid.getTierLabel(this.playerTier) : 'ORBIT',
        alive: 1 + (this.aiManager ? this.aiManager.getAliveCount() : 0),
        total: 5,
        crystals: this.crystalsCollected,
        score: this.score,
        powerUp: activePowerUp,
        powerUpProgress
      });
    }
  }

  _checkGroundCollision(character) {
    if (!this.hexGrid || !character.alive) return;

    for (let tierIdx = 0; tierIdx <= 3; tierIdx++) {
      const tierY = this.hexGrid.getTierY(tierIdx);
      const landingY = tierY + 0.18;

      // Crossing or on landing surface check
      const wasAbove = character.prevY >= landingY - 0.2;
      const isNearOrBelow = character.y <= landingY + 0.35 && character.y >= landingY - 1.4;

      if (character.vy <= 0 && wasAbove && isNearOrBelow) {
        const tileIdx = this.hexGrid.getTileAt(character.x, character.z, tierIdx);
        if (tileIdx >= 0 && this.hexGrid.isTileSolid(tierIdx, tileIdx)) {
          if (!character.grounded && character.isPlayer) {
            HexAudio.sfxLand();
          }
          character.y = landingY;
          character.vy = 0;
          character.grounded = true;
          character.currentTier = tierIdx;
          if (character.isPlayer) this.playerTier = tierIdx;
          return;
        }
      }
    }

    character.grounded = false;
  }

  _checkTileStepping(character, isPlayer) {
    if (!character.grounded || !character.alive) return;

    const tierIdx = character.currentTier;
    const tileIdx = this.hexGrid.getTileAt(character.x, character.z, tierIdx);

    if (tileIdx >= 0 && !character.frozenTiles) {
      const tier = this.hexGrid.tiers[tierIdx];
      if (tier && tier.states[tileIdx]) {
        const state = tier.states[tileIdx];
        if (state.active && !state.steppedOn) {
          this.hexGrid.stepOnTile(tierIdx, tileIdx);
          if (isPlayer) {
            this.cameraShake = 0.12;
          }
        }
      }
    }
  }

  _checkPickups() {
    if (!this.player || !this.player.alive) return;

    const puType = this.hexGrid.checkPowerUp(this.player.x, this.player.z, this.playerTier);
    if (puType) {
      this.player.activatePowerUp(puType);
      HexAudio.sfxPowerUp();
      this.cameraShake = 0.22;
    }

    if (this.hexGrid.checkCrystal(this.player.x, this.player.z, this.playerTier)) {
      this.crystalsCollected++;
      HexAudio.sfxCollectCrystal();
    }
  }

  _updateCamera(dt) {
    if (!this.player) return;

    // Smooth follow target
    this.cameraTarget.lerp(
      new THREE.Vector3(this.player.x, this.player.y + 1.2, this.player.z),
      6 * dt
    );

    // Compute orbit camera position based on yaw
    const offsetX = Math.sin(this.cameraYaw) * this.cameraDistance;
    const offsetZ = Math.cos(this.cameraYaw) * this.cameraDistance;

    const targetCamPos = new THREE.Vector3(
      this.cameraTarget.x + offsetX,
      this.cameraTarget.y + this.cameraHeight,
      this.cameraTarget.z + offsetZ
    );

    this.camera.position.lerp(targetCamPos, 4.5 * dt);

    // Camera Shake
    if (this.cameraShake > 0) {
      this.cameraShake -= dt;
      const sh = this.cameraShake * 2.5;
      this.camera.position.x += (Math.random() - 0.5) * sh;
      this.camera.position.y += (Math.random() - 0.5) * sh * 0.5;
    }

    this.camera.lookAt(this.cameraTarget);
  }

  _triggerGameOver(isWin) {
    this.state = 'gameover';
    HexAudio.stopMusic();

    if (isWin) {
      HexAudio.sfxVictory();
    } else {
      HexAudio.sfxElimination();
    }

    if (this.onGameOver) {
      this.onGameOver({
        win: isWin,
        time: Math.floor(this.survivalTime),
        tier: this.playerTier + 1,
        crystals: this.crystalsCollected,
        score: this.score,
        pilot: this.pilotName,
        suitColor: this.suitColor
      });
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this._update(dt);

    if (this.stars) {
      this.stars.rotation.y += dt * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
