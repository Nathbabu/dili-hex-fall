// ========================================================
// DILI: CYBER BUMPERS — Authentic Dlicom Mascot Gyro-Craft
// ========================================================

class EmoteBubble {
  constructor(scene, parentGroup) {
    this.scene = scene;
    this.parentGroup = parentGroup;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 384;
    this.canvas.height = 160;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthTest: false
    });

    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(2.4, 1.0, 1);
    this.sprite.position.set(0, 3.2, 0); // Float directly above Dili's ears
    this.parentGroup.add(this.sprite);

    this.active = false;
    this.timer = 0;
    this.duration = 1.6;
    this.elapsed = 0;
  }

  show(text, emoji = '💥', color = '#00FFC6') {
    this.active = true;
    this.timer = this.duration;
    this.elapsed = 0;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, 384, 160);

    // Comic Speech Bubble with neon glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;

    // Dark sleek glassmorphic bubble fill
    ctx.fillStyle = 'rgba(8, 14, 28, 0.94)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(16, 16, 352, 104, 22);
    } else {
      ctx.rect(16, 16, 352, 104);
    }
    ctx.fill();

    // Vibrant glowing border
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Pointer pointing straight down to Dili's head
    ctx.beginPath();
    ctx.moveTo(192 - 18, 120);
    ctx.lineTo(192, 148);
    ctx.lineTo(192 + 18, 120);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8, 14, 28, 0.94)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Big expressive Emoji
    ctx.font = 'bold 36px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 30, 68);

    // Dynamic Comic Text
    ctx.font = '900 24px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillText(text, 86, 68);

    this.texture.needsUpdate = true;
    this.material.opacity = 1;
    this.sprite.position.y = 3.2;
  }

  update(dt) {
    if (!this.active) return;

    this.timer -= dt;
    this.elapsed += dt;

    // Elastic pop animation with gentle upward drift
    const popProgress = Math.min(1, this.elapsed * 8);
    const popScale = 1.0 + Math.sin(popProgress * Math.PI) * 0.26;
    this.sprite.scale.set(2.4 * popScale, 1.0 * popScale, 1);
    this.sprite.position.y = 3.2 + (this.elapsed * 0.22);

    // Smooth fade out
    if (this.timer <= 0.45) {
      this.material.opacity = Math.max(0, this.timer / 0.45);
    }

    if (this.timer <= 0) {
      this.active = false;
      this.material.opacity = 0;
    }
  }

  remove() {
    this.parentGroup.remove(this.sprite);
    this.texture.dispose();
    this.material.dispose();
  }
}

class BumperCraft {
  constructor(scene, suitKey = 'mint', pilotName = 'Dili') {
    this.scene = scene;
    this.suitKey = this._normalizeSuit(suitKey);
    this.pilotName = pilotName;
    this.group = new THREE.Group();
    this.isPlayer = false;

    // Physics
    this.x = 0;
    this.y = 0.85;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.facing = 0;
    this.radius = 1.15;
    this.mass = 1.0;
    this.baseSpeed = 10.8;
    this.accel = 38.0;
    this.drag = 0.93;
    this.alive = true;
    this.grounded = true;
    this.kills = 0;
    this.lastAttacker = null;

    // Squash & Stretch Spring Physics
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.wobbleAngle = 0;

    // Emotions & Expressions
    // States: 'idle', 'dash', 'hit', 'shock', 'near_edge', 'kill', 'celebrate'
    this.currentEmotion = 'idle';
    this.emotionLockTimer = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.wasNearEdge = false;

    // Abilities & Cooldowns
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashMaxCooldown = 3.2;

    this.empCooldown = 0;
    this.empMaxCooldown = 5.5;

    // Power-ups
    this.hasShield = false;
    this.shieldTimer = 0;
    this.hasRocket = false;
    this.rocketTimer = 0;

    // Suit Palette
    this._suitColors = {
      mint:    { hex: 0x00FFC6, str: '#00FFC6', screen: '#00e6b8' },
      pink:    { hex: 0xFF6EC7, str: '#FF6EC7', screen: '#ff55aa' },
      gold:    { hex: 0xFFD700, str: '#FFD700', screen: '#ffcc00' },
      blue:    { hex: 0x4DA6FF, str: '#4DA6FF', screen: '#3399ff' },
      crimson: { hex: 0xFF3344, str: '#FF3344', screen: '#ff3344' }
    };
    const palette = this._suitColors[this.suitKey] || this._suitColors.mint;
    this.suitColor = palette.hex;
    this.suitColorStr = palette.str;
    this.screenColorStr = palette.screen;

    // Textures & Images (Official high-res Dili cutout poses)
    this.baseImages = {};
    this._loadBaseTextures();

    // Canvas for Dili Rendering with Dynamic Face Expressions (512x512)
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 512;
    this.faceCanvas.height = 512;
    this.faceCtx = this.faceCanvas.getContext('2d');
    this.compositeTexture = new THREE.CanvasTexture(this.faceCanvas);

    this._buildCraft();
    this.emoteBubble = new EmoteBubble(this.scene, this.group);
  }

  _normalizeSuit(suit) {
    if (typeof suit === 'number') {
      if (suit === 0xFF6EC7) return 'pink';
      if (suit === 0xFFD700) return 'gold';
      if (suit === 0x4DA6FF) return 'blue';
      if (suit === 0xFF3344 || suit === 0xFF4444) return 'crimson';
      return 'mint';
    }
    const s = String(suit || 'mint').toLowerCase();
    if (s === 'cobalt') return 'blue';
    return ['mint', 'pink', 'gold', 'blue', 'crimson'].includes(s) ? s : 'mint';
  }

  _loadBaseTextures() {
    const suit = this.suitKey;
    const loadImg = (pose) => {
      const img = new Image();
      img.src = `/assets/characters/dili-${pose}-cutout-${suit}.png`;
      img.onload = () => { this._redrawExpressiveDili(); };
      img.onerror = () => {
        img.src = `/assets/characters/dili-${pose}-cutout-mint.png`;
      };
      return img;
    };

    // Authentic Fight Game Poses: No jumping or Superman flying!
    this.baseImages = {
      fight:   loadImg('fight'),   // Ground Combat Brawler Stance (default)
      ram:     loadImg('ram'),     // Ground Ram Charge / Heavy Punch
      hit:     loadImg('hit'),     // Reeling Dizzy Impact Stance
      victory: loadImg('victory'), // Champion Smug Taunt Stance
      fall:    loadImg('fall')     // Tumbling off platform edge
    };
  }

  _buildCraft() {
    const suitCol = new THREE.Color(this.suitColor);
    const darkMetal = new THREE.Color(0x0a101f);

    // 1. Sleek Combat Bumper Gyro-Saucer
    const baseGroup = new THREE.Group();

    // Glowing Neon Torus Bumper Ring
    const ringGeo = new THREE.TorusGeometry(1.10, 0.18, 14, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: suitCol,
      emissive: suitCol,
      emissiveIntensity: 0.95,
      metalness: 0.7,
      roughness: 0.2
    });
    this.bumperRing = new THREE.Mesh(ringGeo, ringMat);
    this.bumperRing.rotation.x = Math.PI / 2;
    this.bumperRing.position.y = 0.12;
    baseGroup.add(this.bumperRing);

    // Carbon Disc Chassis Platform
    const chassisGeo = new THREE.CylinderGeometry(0.98, 1.04, 0.22, 28);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: darkMetal,
      emissive: suitCol,
      emissiveIntensity: 0.2,
      metalness: 0.9,
      roughness: 0.25
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.1;
    baseGroup.add(chassis);

    // 4 Corner Hazard Deflectors
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.36, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: suitCol,
        emissive: suitCol,
        emissiveIntensity: 1.2
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      spike.position.set(Math.cos(ang) * 1.18, 0.12, Math.sin(ang) * 1.18);
      spike.rotation.y = -ang + Math.PI / 2;
      spike.rotation.z = -Math.PI / 2;
      baseGroup.add(spike);
    }

    // Dual Rear Rocket Exhaust Thrusters
    this.thrusters = new THREE.Group();
    for (let side of [-0.42, 0.42]) {
      const tubeGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.38, 12);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x141e30, metalness: 0.9, roughness: 0.3 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.x = Math.PI / 2 + 0.2;
      tube.position.set(side, 0.20, -0.92);
      this.thrusters.add(tube);

      const nozGeo = new THREE.TorusGeometry(0.12, 0.035, 8, 16);
      const nozMat = new THREE.MeshBasicMaterial({ color: this.suitColor });
      const noz = new THREE.Mesh(nozGeo, nozMat);
      noz.position.set(side, 0.20, -1.08);
      noz.rotation.x = Math.PI / 2;
      this.thrusters.add(noz);
    }
    baseGroup.add(this.thrusters);

    // Exhaust Jet Flame Sprites (animated on movement/dash)
    const flameGeo = new THREE.ConeGeometry(0.18, 0.7, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: this.suitColor,
      transparent: true,
      opacity: 0.85
    });
    this.leftFlame = new THREE.Mesh(flameGeo, flameMat);
    this.leftFlame.rotation.x = -Math.PI / 2;
    this.leftFlame.position.set(-0.42, 0.20, -1.45);
    this.leftFlame.scale.set(0.1, 0.1, 0.1);
    this.thrusters.add(this.leftFlame);

    this.rightFlame = new THREE.Mesh(flameGeo, flameMat.clone());
    this.rightFlame.rotation.x = -Math.PI / 2;
    this.rightFlame.position.set(0.42, 0.20, -1.45);
    this.rightFlame.scale.set(0.1, 0.1, 0.1);
    this.thrusters.add(this.rightFlame);

    this.group.add(baseGroup);

    // 2. THE AUTHENTIC DLICOM DILI MASCOT (High-res 3D Billboard Sprite)
    const diliMat = new THREE.SpriteMaterial({
      map: this.compositeTexture,
      transparent: true,
      alphaTest: 0.02
    });
    this.diliSprite = new THREE.Sprite(diliMat);
    this.diliSprite.scale.set(2.2, 2.2, 1);
    this.diliSprite.position.set(0, 1.25, 0); // Positioned proudly on the bumper platform
    this.group.add(this.diliSprite);

    // 3. Force Shield Sphere
    const shieldGeo = new THREE.SphereGeometry(1.45, 22, 18);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00E5FF,
      emissive: 0x00E5FF,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.38,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.1;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 4. Overhead Nameplate
    this.nameSprite = this._createNameBadge(this.pilotName);
    this.nameSprite.position.set(0, 2.55, 0);
    this.group.add(this.nameSprite);

    this.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.group);

    this._redrawExpressiveDili();
  }

  _createNameBadge(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(6, 10, 20, 0.88)';
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 240, 48, 12);
    } else {
      ctx.rect(8, 8, 240, 48);
    }
    ctx.fill();

    ctx.strokeStyle = this.suitColorStr;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 14), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.9, 0.48, 1);
    return sprite;
  }

  // =============================================================
  // AUTHENTIC DILI MASCOT COMPOSITOR: DYNAMIC NATURAL EXPRESSIONS
  // =============================================================
  _redrawExpressiveDili() {
    const ctx = this.faceCtx;
    ctx.clearRect(0, 0, 512, 512);

    // 1. Authentic Ground Combat Fighter Poses:
    // NO jumping or Superman flying! All poses are grounded arena combat brawler poses!
    let pose = 'fight';
    if (!this.grounded) {
      pose = 'fall'; // Falling off arena platform
    } else if (this.isDashing || this.hasRocket || this.currentEmotion === 'dash' || this.currentEmotion === 'emp') {
      pose = 'ram'; // Heavy ground ram tackle charge
    } else if (this.currentEmotion === 'hit') {
      pose = 'hit'; // Reeling impact stance with cartoon dizzy eyes
    } else if (this.currentEmotion === 'kill' || this.currentEmotion === 'celebrate') {
      pose = 'victory'; // Champion hands-on-hips smug taunt & wink
    }

    const baseImg = this.baseImages[pose] || this.baseImages.fight;
    if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
      ctx.drawImage(baseImg, 0, 0, 512, 512);
    } else if (this.baseImages.fight && this.baseImages.fight.complete) {
      ctx.drawImage(this.baseImages.fight, 0, 0, 512, 512);
    } else {
      ctx.fillStyle = this.suitColorStr;
      ctx.beginPath();
      ctx.ellipse(256, 256, 160, 180, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 2. Comic Floating Overlays (Floating outside/above helmet, never obscuring 3D face)
    if (this.currentEmotion === 'near_edge') {
      ctx.font = '32px sans-serif';
      ctx.fillText('💧', 340, 150);
    }

    this.compositeTexture.needsUpdate = true;
  }

  // Set Emotion State and Trigger Animated Speech Bubble
  setEmotion(emotion, duration = 1.3, bubbleText = null, emoji = '💥') {
    this.currentEmotion = emotion;
    this.emotionLockTimer = duration;
    this._redrawExpressiveDili();

    if (bubbleText) {
      this.emoteBubble.show(bubbleText, emoji, this.suitColorStr);
    }
  }

  triggerDash() {
    if (this.dashCooldown > 0 || !this.alive || !this.grounded) return false;

    this.isDashing = true;
    this.dashTimer = 0.58;
    this.dashCooldown = this.dashMaxCooldown;

    // Physical Stretch Forward
    this.squashX = 0.78;
    this.squashY = 1.35;

    const dashSpeed = 26.5;
    this.vx = Math.sin(this.facing) * dashSpeed;
    this.vz = Math.cos(this.facing) * dashSpeed;

    HexAudio.sfxDash();

    const callouts = ['RAM DASH!', 'TURBO BOOST!', 'OUTTA MY WAY!', 'FULL POWER!'];
    const txt = callouts[Math.floor(Math.random() * callouts.length)];
    this.setEmotion('dash', 0.85, txt, '🔥');

    return true;
  }

  triggerEmp(otherCrafts) {
    if (this.empCooldown > 0 || !this.alive || !this.grounded) return false;

    this.empCooldown = this.empMaxCooldown;
    HexAudio.sfxEmp();

    const empRadius = 9.0;
    const empForce = 24.5;

    otherCrafts.forEach(c => {
      if (c === this || !c.alive) return;
      const dx = c.x - this.x;
      const dz = c.z - this.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < empRadius && dist > 0.01) {
        const falloff = 1 - (dist / empRadius);
        const force = empForce * (0.5 + falloff * 0.5);
        c.vx += (dx / dist) * force;
        c.vz += (dz / dist) * force;
        c.lastAttacker = this;

        c.onImpact(1.8);
      }
    });

    const empLines = ['EMP BURST!', 'SYSTEM SHOCK!', 'STATIC BLAST!'];
    const txt = empLines[Math.floor(Math.random() * empLines.length)];
    this.setEmotion('emp', 1.1, txt, '⚡');
    return true;
  }

  // Called when hit by another craft (light or heavy)
  onImpact(intensity = 1.0) {
    // Physical Squash
    this.squashX = 1.38 * Math.min(1.5, intensity);
    this.squashY = 0.70;

    if (this.isPlayer && HexAudio && HexAudio.sfxVoiceOof) {
      HexAudio.sfxVoiceOof();
    }

    if (intensity >= 1.3) {
      const heavyHits = ['💥 OOF!', '💢 CRUNCH!', '💫 BONK!', '💥 CLANG!'];
      const txt = heavyHits[Math.floor(Math.random() * heavyHits.length)];
      this.setEmotion('hit', 0.85, txt, '💥');
    } else {
      const lightHits = ['BUMP!', 'WHOA!', 'WATCH IT!', 'CLANG!'];
      const txt = lightHits[Math.floor(Math.random() * lightHits.length)];
      this.setEmotion('hit', 0.65, txt, '💢');
    }
  }

  // Called when hit by central rotating laser hazard
  onLaserShock() {
    this.squashX = 1.3;
    this.squashY = 0.75;
    const zaps = ['ZAPPED!', 'HOT HOT HOT!', 'OUCH!', 'SIZZLE!'];
    const txt = zaps[Math.floor(Math.random() * zaps.length)];
    this.setEmotion('hit', 0.9, txt, '⚡');
  }

  // Called when this craft knocks a rival out
  onScoreKill(victimName) {
    this.kills++;
    if (this.isPlayer && HexAudio && HexAudio.sfxVoiceHappy) {
      HexAudio.sfxVoiceHappy();
    }
    const taunts = ['REKT!', 'BYE BYE!', 'SEE YA!', 'EZ KO!', 'TO THE MOON!'];
    const txt = taunts[Math.floor(Math.random() * taunts.length)];
    this.setEmotion('kill', 1.8, txt, '😈');
  }

  // Called when this craft gets knocked off the platform
  onKnockedOut() {
    if (this.isPlayer && HexAudio && HexAudio.sfxVoiceScream) {
      HexAudio.sfxVoiceScream();
    }
    const screams = ['NOOOOO!', 'AAAAAAH!', 'CURSE YOU!', 'I\'LL BE BACK!'];
    const txt = screams[Math.floor(Math.random() * screams.length)];
    this.setEmotion('falling', 2.5, txt, '😱');
  }

  // Called when successfully picking up crystals or powerups
  onCollectCrystal() {
    if (this.isPlayer && HexAudio && HexAudio.sfxVoiceHappy) {
      HexAudio.sfxVoiceHappy();
    }
    const lines = ['+150 CYBER!', 'SHINY!', 'SCORE!', 'NICE!'];
    const txt = lines[Math.floor(Math.random() * lines.length)];
    this.setEmotion('celebrate', 1.0, txt, '💎');
  }

  activatePowerUp(type) {
    if (type === 'rocket') {
      this.hasRocket = true;
      this.rocketTimer = 4.5;
      HexAudio.sfxPowerUp();
      this.setEmotion('dash', 1.5, 'HYPER ROCKET!', '🚀');
    } else if (type === 'shield') {
      this.hasShield = true;
      this.shieldTimer = 5.0;
      this.shieldMesh.visible = true;
      HexAudio.sfxPowerUp();
      this.setEmotion('celebrate', 1.3, 'FORCEFIELD!', '🛡️');
    }
  }

  triggerBanter() {
    if (this.currentEmotion !== 'idle' || !this.alive || !this.grounded) return;
    const banter = ['WHO\'S NEXT?', 'LOCKED ON!', 'CAN\'T CATCH ME!', 'BRING IT ON!'];
    const txt = banter[Math.floor(Math.random() * banter.length)];
    this.setEmotion('idle', 1.2, txt, '😏');
  }

  update(dt, inputX = 0, inputZ = 0, arenaRadius = 21) {
    if (!this.alive) return;

    // Cooldowns
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.empCooldown > 0) this.empCooldown -= dt;

    // Blinking Cycle (Every ~3.2 seconds)
    this.blinkTimer += dt;
    if (this.blinkTimer > 3.2) {
      this.isBlinking = true;
      if (this.currentEmotion === 'idle') this._redrawExpressiveDili();
      if (this.blinkTimer > 3.38) {
        this.isBlinking = false;
        this.blinkTimer = 0;
        if (this.currentEmotion === 'idle') this._redrawExpressiveDili();
      }
    }

    // Emotion Lock Timer
    if (this.emotionLockTimer > 0) {
      this.emotionLockTimer -= dt;
      if (this.emotionLockTimer <= 0) {
        this.currentEmotion = 'idle';
        this._redrawExpressiveDili();
      }
    }

    // Powerup Timers
    if (this.hasShield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.hasShield = false;
        this.shieldMesh.visible = false;
      } else {
        this.shieldMesh.rotation.y += dt * 3.5;
      }
    }

    if (this.hasRocket) {
      this.rocketTimer -= dt;
      if (this.rocketTimer <= 0) {
        this.hasRocket = false;
        this._redrawExpressiveDili();
      }
    }

    // Dash status
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.mass = 3.2;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.mass = 1.0;
        this._redrawExpressiveDili();
      }
    } else {
      this.mass = this.hasRocket ? 2.2 : 1.0;
    }

    // Spring squash & stretch recovery back to 1.0
    this.squashX += (1.0 - this.squashX) * Math.min(1, 16 * dt);
    this.squashY += (1.0 - this.squashY) * Math.min(1, 16 * dt);

    // Steering Physics
    if (this.grounded) {
      const topSpeed = this.isDashing ? 26.5 : (this.hasRocket ? 17.5 : this.baseSpeed);
      const accel = this.hasRocket ? this.accel * 1.5 : this.accel;

      this.vx += inputX * accel * dt;
      this.vz += inputZ * accel * dt;

      const curSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
      if (curSpeed > topSpeed) {
        this.vx = (this.vx / curSpeed) * topSpeed;
        this.vz = (this.vz / curSpeed) * topSpeed;
      }

      this.vx *= Math.pow(this.drag, dt * 60);
      this.vz *= Math.pow(this.drag, dt * 60);

      // Jet Exhaust Flame Animation
      const spdRatio = curSpeed / topSpeed;
      const flameLen = this.isDashing ? 2.2 : (this.hasRocket ? 1.6 : spdRatio * 0.9);
      if (flameLen > 0.05) {
        this.leftFlame.scale.set(1.0, 1.0, flameLen);
        this.rightFlame.scale.set(1.0, 1.0, flameLen);
        this.leftFlame.visible = true;
        this.rightFlame.visible = true;
      } else {
        this.leftFlame.visible = false;
        this.rightFlame.visible = false;
      }
    }

    if (Math.abs(inputX) > 0.1 || Math.abs(inputZ) > 0.1) {
      const targetFacing = Math.atan2(inputX, inputZ);
      let diff = targetFacing - this.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facing += diff * Math.min(1, 14 * dt);
    }

    // Arena Perimeter & Fall Check
    const distFromCenter = Math.sqrt(this.x * this.x + this.z * this.z);

    // Dynamic Edge Panic & Recovery Reaction
    if (this.grounded && distFromCenter > arenaRadius - 2.8) {
      if (!this.wasNearEdge) {
        this.wasNearEdge = true;
        if (this.isPlayer && HexAudio && HexAudio.sfxVoicePanic) {
          HexAudio.sfxVoicePanic();
        }
        const panics = ['WHOA WHOA!', 'TOO CLOSE!', 'WATCH OUT!', 'YIKES!'];
        const txt = panics[Math.floor(Math.random() * panics.length)];
        this.setEmotion('near_edge', 1.2, txt, '⚠️');
      }
      // Panic Jitter
      this.wobbleAngle = Math.sin(performance.now() * 0.04) * 0.14;
    } else {
      if (this.wasNearEdge && this.grounded && distFromCenter < arenaRadius - 4.5) {
        this.wasNearEdge = false;
        if (this.currentEmotion === 'near_edge') {
          const relieves = ['PHEW!', 'NOT TODAY!', 'CLOSE ONE!'];
          const txt = relieves[Math.floor(Math.random() * relieves.length)];
          this.setEmotion('kill', 1.0, txt, '😮‍💨');
        }
      }
      this.wobbleAngle = 0;
    }

    // Falling over platform edge
    if (distFromCenter > arenaRadius + 0.35) {
      this.grounded = false;
      this.vy -= 36 * dt;
      this.y += this.vy * dt;

      if (this.currentEmotion !== 'falling') {
        this.onKnockedOut();
      }

      this.diliSprite.material.rotation += dt * 4;
    } else {
      this.grounded = true;
      this.y = 0.85;
      this.vy = 0;
      this.diliSprite.material.rotation = this.wobbleAngle;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.group.position.set(this.x, this.y, this.z);

    // Dynamic Sprite scale with squash, stretch, and horizontal flip
    if (inputX < -0.1) this.lastFlipX = -1; else if (inputX > 0.1) this.lastFlipX = 1;
    const flipX = this.lastFlipX || 1;
    this.diliSprite.scale.set(
      2.2 * this.squashX * flipX,
      2.2 * this.squashY,
      1
    );

    // Idle Bobbing Animation
    if (this.grounded && !this.isDashing) {
      const bob = Math.sin(performance.now() * 0.008) * 0.06;
      this.diliSprite.position.y = 1.25 + bob;
    }

    this.bumperRing.material.emissiveIntensity = this.isDashing ? 2.8 : (this.hasShield ? 2.2 : 0.95);

    // Update Emote Bubble
    this.emoteBubble.update(dt);

    if (this.y < -30) {
      this.alive = false;
      this.scene.remove(this.group);
      this.emoteBubble.remove();
    }
  }

  reset(x, z) {
    this.alive = true;
    this.grounded = true;
    this.x = x;
    this.y = 0.85;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.facing = Math.atan2(-x, -z);
    this.isDashing = false;
    this.hasShield = false;
    this.hasRocket = false;
    this.dashCooldown = 0;
    this.empCooldown = 0;
    this.lastAttacker = null;
    this.currentEmotion = 'idle';
    this.emotionLockTimer = 0;
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.wasNearEdge = false;
    this.group.position.set(x, 0.85, z);
    this._redrawExpressiveDili();
  }

  remove() {
    this.emoteBubble.remove();
    this.scene.remove(this.group);
  }
}
