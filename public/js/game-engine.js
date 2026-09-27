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
    this.stars = null;
    this.sparkParticles = [];

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
    this.camDistance = 14.5;
    this.camHeight = 11.0;
    this.cameraShake = 0;

    // Callbacks
    this.onUpdate = null;
    this.onGameOver = null;
    this.onKillFeed = null;
    this.onAlert = null;

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
    const ambient = new THREE.AmbientLight(0x384a6b, 0.85);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 35, 20);
    this.scene.add(dirLight);

    const cyanSpot = new THREE.PointLight(0x00E5FF, 1.5, 60);
    cyanSpot.position.set(-15, 8, -15);
    this.scene.add(cyanSpot);

    const pinkSpot = new THREE.PointLight(0xFF6EC7, 1.2, 55);
    pinkSpot.position.set(15, 6, 15);
    this.scene.add(pinkSpot);

    this._buildStarfield();
    this._buildVoidGrid();

    window.addEventListener('resize', () => this._onResize());
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
    const grid = new THREE.GridHelper(180, 45, 0x00E5FF, 0x0a1d3a);
    grid.position.y = -35;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    this.scene.add(grid);
  }

  _setupControls() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space' && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerDash();
      }
      if ((e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.state === 'playing') {
        e.preventDefault();
        this.performPlayerEmp();
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

    this.canvas.addEventListener('touchend', () => { this.isDraggingCamera = false; });

    // Setup Virtual Joystick
    this._setupJoystick();

    // Mobile Action Buttons
    const btnDash = document.getElementById('btnDash');
    const btnEmp = document.getElementById('btnEmp');

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
  }

  _setupJoystick() {
    const zone = document.getElementById('joystickZone');
    const knob = document.getElementById('joystickKnob');
    if (!zone || !knob) return;

    let dragging = false;
    let startX = 0, startY = 0;
    const maxR = 42;

    const onStart = (cx, cy) => {
      dragging = true;
      const r = zone.getBoundingClientRect();
      startX = r.left + r.width / 2;
      startY = r.top + r.height / 2;
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

  performPlayerDash() {
    if (this.player && this.player.triggerDash()) {
      this.cameraShake = 0.25;
    }
  }

  performPlayerEmp() {
    if (this.player) {
      const allCrafts = [this.player, ...this.aiManager.getCrafts()];
      if (this.player.triggerEmp(allCrafts)) {
        this.cameraShake = 0.35;
        this._spawnEmpRingVFX(this.player.x, this.player.z);
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

  startGame(pilotName, suitKey) {
    this.pilotName = pilotName || 'Commander_Dili';
    this.suitKey = suitKey || 'mint';
    this.matchTime = 0;
    this.score = 0;
    this.crystals = 0;
    this.kills = 0;
    this.cameraYaw = 0;

    // Reset or build arena
    if (this.arena) {
      this.arena.reset();
    } else {
      this.arena = new ArenaColosseum(this.scene);
    }
    this.arena.onAlert = (msg) => {
      if (this.onAlert) this.onAlert(msg);
    };

    // Reset Player Craft
    if (this.player) this.player.remove();
    this.player = new BumperCraft(this.scene, this.suitKey, this.pilotName);
    this.player.isPlayer = true;
    this.player.reset(0, 11); // Start near bottom edge of arena

    // Reset AI Manager
    if (this.aiManager) this.aiManager.clear();
    this.aiManager = new AIBumperManager(this.scene);
    this.aiManager.spawn(this.arena.currentRadius);

    this.state = 'countdown';
    this._doCountdown();
  }

  _doCountdown() {
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
        clearInterval(iv);
        setTimeout(() => {
          modal.remove();
          this.state = 'playing';
          this.clock.start();
          HexAudio.startMusic();
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

    this.matchTime += dt;

    // 1. Update Arena colosseum (ring timers, laser hazard)
    if (this.arena) {
      this.arena.update(dt);
    }

    const arenaRadius = this.arena.currentRadius;

    // 2. Player Input & Physics
    const inp = this._getInputVector();
    this.player.update(dt, inp.x, inp.z, arenaRadius);



    // Power-up check
    const pu = this.arena.checkPickups(this.player);
    if (pu) {
      if (pu === 'crystal') {
        this.crystals++;
        HexAudio.sfxCrystal();
        if (this.player.onCollectCrystal) this.player.onCollectCrystal();
      } else {
        this.player.activatePowerUp(pu);
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

    // 3. AI Opponents Update
    const allCrafts = [this.player, ...this.aiManager.getCrafts()];
    this.aiManager.update(dt, allCrafts, arenaRadius, this.arena);



    // 4. ELASTIC BUMPER COLLISIONS BETWEEN ALL CRAFTS
    this._resolveBumperCollisions(allCrafts);

    // 4.5. SOLID IMPENETRABLE CYBER SWEEPER & PILLAR COLLISION (Final physics pass)
    allCrafts.forEach(c => {
      const hit = this.arena.checkHazardCollision(c);
      if (hit) {
        this.cameraShake = Math.max(this.cameraShake, c === this.player ? 0.48 : 0.35);
        this._spawnSparks(hit.x, hit.z, 0xFF3300);
        this._spawnSparks(hit.x, hit.z, 0xFFCC00);
      }
    });

    // 5. Check Knockout Credit
    allCrafts.forEach(c => {
      if (!c.alive && !c.deathCredited) {
        c.deathCredited = true;
        this._handleCraftKnockout(c);
      }
    });

    // 6. Camera Follow
    this._updateCamera(dt);

    // 7. Spark Particles
    this._updateSparkParticles(dt);

    // Score Calculation
    this.score = Math.floor(this.matchTime * 15) + (this.kills * 350) + (this.crystals * 150);

    // Check Player Death
    if (!this.player.alive) {
      this._triggerGameOver(false);
      return;
    }

    // Check Victory (Last pilot remaining!)
    if (this.aiManager.getAliveCount() === 0) {
      this.score += 1500; // huge victory reward!
      this._triggerGameOver(true);
      return;
    }

    // HUD Callback
    if (this.onUpdate) {
      this.onUpdate({
        time: this.matchTime,
        alive: 1 + this.aiManager.getAliveCount(),
        total: 5,
        kills: this.kills,
        score: this.score,
        dashCooldown: Math.max(0, this.player.dashCooldown / this.player.dashMaxCooldown),
        empCooldown: Math.max(0, this.player.empCooldown / this.player.empMaxCooldown),
        hasRocket: this.player.hasRocket,
        rocketProgress: (this.player.rocketTimer / 4.5) * 100,
        hasShield: this.player.hasShield,
        shieldProgress: (this.player.shieldTimer / 5.0) * 100
      });
    }
  }

  _resolveBumperCollisions(crafts) {
    const n = crafts.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const A = crafts[i];
        const B = crafts[j];
        if (!A.alive || !B.alive || !A.grounded || !B.grounded) continue;

        const dx = B.x - A.x;
        const dz = B.z - A.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = A.radius + B.radius; // ~2.1

        if (dist < minDist && dist > 0.001) {
          // Normal vector from A to B
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
            // Elastic collision with extra bounce juice
            let restitution = 1.35;

            // Extra impulse if either is dashing or rocket powered!
            let bonusImpulse = 0;
            if (A.isDashing) {
              bonusImpulse += 18.0;
              B.lastAttacker = A;
            }
            if (B.isDashing) {
              bonusImpulse += 18.0;
              A.lastAttacker = B;
            }

            // Shield recoil
            if (A.hasShield) {
              B.vx += nx * 24;
              B.vz += nz * 24;
              B.lastAttacker = A;
              HexAudio.sfxBump(2.0);
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0x00E5FF);
              if (A.setEmotion) A.setEmotion('kill', 1.2, 'DEFLECTED!', '🛡️');
              if (B.onImpact) B.onImpact(2.0);
              continue;
            }
            if (B.hasShield) {
              A.vx -= nx * 24;
              A.vz -= nz * 24;
              A.lastAttacker = B;
              HexAudio.sfxBump(2.0);
              this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, 0x00E5FF);
              if (B.setEmotion) B.setEmotion('kill', 1.2, 'DEFLECTED!', '🛡️');
              if (A.onImpact) A.onImpact(2.0);
              continue;
            }

            const impulseMag = -(1 + restitution) * velAlongNormal / (1 / A.mass + 1 / B.mass) + bonusImpulse;

            A.vx -= (impulseMag / A.mass) * nx;
            A.vz -= (impulseMag / A.mass) * nz;
            B.vx += (impulseMag / B.mass) * nx;
            B.vz += (impulseMag / B.mass) * nz;

            // Attribute attacker
            const relSpeed = Math.sqrt(rvx * rvx + rvz * rvz);
            if (A.isPlayer || relSpeed > 10) {
              if (Math.abs(A.vx) + Math.abs(A.vz) > Math.abs(B.vx) + Math.abs(B.vz)) {
                B.lastAttacker = A;
              } else {
                A.lastAttacker = B;
              }
            }

            // Trigger dynamic character expressions & comic emote bubbles for both combatants!
            const impactIntensity = Math.min(2.2, Math.max(0.8, (relSpeed + bonusImpulse) / 9.5));
            if (A.onImpact) A.onImpact(impactIntensity);
            if (B.onImpact) B.onImpact(impactIntensity);

            // Impact audio and camera shake
            const impactForce = Math.min(2.5, relSpeed / 8.0);
            HexAudio.sfxBump(impactForce);
            if (A.isPlayer || B.isPlayer) {
              this.cameraShake = Math.max(this.cameraShake, impactForce * 0.22);
            }

            // Collision Spark Particles at contact point
            this._spawnSparks((A.x + B.x) / 2, (A.z + B.z) / 2, A.suitColor);
          }
        }
      }
    }
  }

  _handleCraftKnockout(victim) {
    HexAudio.sfxKill();
    const attacker = victim.lastAttacker;

    let killerName = 'Cyber Void';
    if (attacker) {
      killerName = attacker.pilotName;
      if (attacker === this.player) {
        this.kills++;
        this.score += 350;
        this.cameraShake = 0.35;
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

  _spawnSparks(x, z, colorHex) {
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.85, z);
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

  _spawnEmpRingVFX(x, z) {
    const geo = new THREE.RingGeometry(0.5, 1.2, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.5, z);
    this.scene.add(ring);

    let scale = 1;
    const expand = () => {
      scale += 0.8;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity -= 0.08;
      if (ring.material.opacity > 0) {
        requestAnimationFrame(expand);
      } else {
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    };
    expand();
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
    if (!this.player) return;

    this.cameraTarget.lerp(
      new THREE.Vector3(this.player.x, this.player.y + 0.5, this.player.z),
      6.0 * dt
    );

    const offX = Math.sin(this.cameraYaw) * this.camDistance;
    const offZ = Math.cos(this.cameraYaw) * this.camDistance;

    const targetPos = new THREE.Vector3(
      this.cameraTarget.x + offX,
      this.cameraTarget.y + this.camHeight,
      this.cameraTarget.z + offZ
    );

    this.camera.position.lerp(targetPos, 5.0 * dt);

    if (this.cameraShake > 0) {
      this.cameraShake -= dt;
      const sh = this.cameraShake * 3.5;
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
        time: Math.floor(this.matchTime),
        kills: this.kills,
        score: this.score,
        pilot: this.pilotName,
        suitColor: this.suitKey
      });
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this._update(dt);

    if (this.stars) this.stars.rotation.y += dt * 0.015;

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
