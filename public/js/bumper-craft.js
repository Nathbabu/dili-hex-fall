// ========================================================
// DILI: CYBER BUMPERS — Upgraded Expressive Mascot Craft
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
    this.sprite.position.set(0, 3.15, 0); // Float directly above Dili & Nameplate
    this.parentGroup.add(this.sprite);

    this.active = false;
    this.timer = 0;
    this.duration = 1.7;
    this.elapsed = 0;
  }

  show(text, emoji = '💥', color = '#00FFC6') {
    this.active = true;
    this.timer = this.duration;
    this.elapsed = 0;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, 384, 160);

    // Comic Speech Balloon with glowing neon outline
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;

    // Dark sleek glassmorphic bubble fill
    ctx.fillStyle = 'rgba(7, 12, 24, 0.94)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(16, 16, 352, 104, 22);
    } else {
      ctx.rect(16, 16, 352, 104);
    }
    ctx.fill();

    // Vibrant Glowing Border
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Pointer pointing straight down to character's head
    ctx.beginPath();
    ctx.moveTo(192 - 18, 120);
    ctx.lineTo(192, 148);
    ctx.lineTo(192 + 18, 120);
    ctx.closePath();
    ctx.fillStyle = 'rgba(7, 12, 24, 0.94)';
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
    this.sprite.position.y = 3.15;
  }

  update(dt) {
    if (!this.active) return;

    this.timer -= dt;
    this.elapsed += dt;

    // Elastic pop animation with gentle upward drift
    const popProgress = Math.min(1, this.elapsed * 8);
    const popScale = 1.0 + Math.sin(popProgress * Math.PI) * 0.28;
    this.sprite.scale.set(2.4 * popScale, 1.0 * popScale, 1);
    this.sprite.position.y = 3.15 + (this.elapsed * 0.22);

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
    // States: 'idle', 'dash', 'hit', 'shock', 'near_edge', 'kill', 'emp', 'falling', 'celebrate'
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
      mint:    { hex: 0x00FFC6, str: '#00FFC6' },
      pink:    { hex: 0xFF6EC7, str: '#FF6EC7' },
      gold:    { hex: 0xFFD700, str: '#FFD700' },
      blue:    { hex: 0x4DA6FF, str: '#4DA6FF' },
      crimson: { hex: 0xFF3344, str: '#FF3344' }
    };
    const palette = this._suitColors[this.suitKey] || this._suitColors.mint;
    this.suitColor = palette.hex;
    this.suitColorStr = palette.str;

    // Textures & Images
    this.baseImages = {};
    this._loadBaseTextures();

    // High-Resolution Face & Cyber Armor Canvas (512x512)
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

    this.baseImages = {
      jump: loadImg('jump'),
      rocket: loadImg('rocket'),
      fall: loadImg('fall')
    };
  }

  _buildCraft() {
    const suitCol = new THREE.Color(this.suitColor);
    const darkMetal = new THREE.Color(0x080e1a);

    // 1. Heavy Multi-ring Bumper Base
    const baseGroup = new THREE.Group();

    // Glowing Neon Torus Bumper
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

    // Carbon Disc Chassis
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
      const spikeGeo = new THREE.ConeGeometry(0.13, 0.38, 6);
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
    for (let side of [-0.45, 0.45]) {
      const tubeGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.42, 12);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1a2333, metalness: 0.9, roughness: 0.3 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.x = Math.PI / 2 + 0.2;
      tube.position.set(side, 0.22, -0.92);
      this.thrusters.add(tube);

      // Glowing nozzle ring
      const nozGeo = new THREE.TorusGeometry(0.13, 0.04, 8, 16);
      const nozMat = new THREE.MeshBasicMaterial({ color: this.suitColor });
      const noz = new THREE.Mesh(nozGeo, nozMat);
      noz.position.set(side, 0.22, -1.1);
      noz.rotation.x = Math.PI / 2;
      this.thrusters.add(noz);
    }
    baseGroup.add(this.thrusters);

    // Exhaust Jet Flame Sprites (animated on movement/dash)
    const flameGeo = new THREE.ConeGeometry(0.18, 0.7, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.8
    });
    this.leftFlame = new THREE.Mesh(flameGeo, flameMat);
    this.leftFlame.rotation.x = -Math.PI / 2;
    this.leftFlame.position.set(-0.45, 0.22, -1.45);
    this.leftFlame.scale.set(0.1, 0.1, 0.1);
    this.thrusters.add(this.leftFlame);

    this.rightFlame = new THREE.Mesh(flameGeo, flameMat.clone());
    this.rightFlame.rotation.x = -Math.PI / 2;
    this.rightFlame.position.set(0.45, 0.22, -1.45);
    this.rightFlame.scale.set(0.1, 0.1, 0.1);
    this.thrusters.add(this.rightFlame);

    this.group.add(baseGroup);

    // 2. THE UPGRADED DILI CHARACTER (Expressive 3D Sprite with Face Canvas)
    const diliMat = new THREE.SpriteMaterial({
      map: this.compositeTexture,
      transparent: true,
      alphaTest: 0.02
    });
    this.diliSprite = new THREE.Sprite(diliMat);
    this.diliSprite.scale.set(2.05, 2.25, 1);
    this.diliSprite.position.set(0, 1.20, 0);
    this.group.add(this.diliSprite);

    // 3. Force Shield Sphere
    const shieldGeo = new THREE.SphereGeometry(1.42, 22, 18);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00E5FF,
      emissive: 0x00E5FF,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.38,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.0;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 4. Overhead Nameplate
    this.nameSprite = this._createNameBadge(this.pilotName);
    this.nameSprite.position.set(0, 2.45, 0);
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
  // DYNAMIC DILI COMPOSITOR: COMBAT VISOR, GEAR & EXPRESSIONS
  // =============================================================
  _redrawExpressiveDili() {
    const ctx = this.faceCtx;
    ctx.clearRect(0, 0, 512, 512);

    // 1. Base Dili Artwork Layer
    let pose = 'jump';
    if (!this.grounded) pose = 'fall';
    else if (this.isDashing || this.hasRocket) pose = 'rocket';

    const baseImg = this.baseImages[pose];
    if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
      ctx.drawImage(baseImg, 32, 42, 448, 448);
    } else {
      ctx.fillStyle = this.suitColorStr;
      ctx.beginPath();
      ctx.ellipse(256, 256, 160, 180, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const emo = this.currentEmotion;
    const suitCol = this.suitColorStr;

    // 2. COMBAT UPGRADE 1: Cyber Shoulder Pauldrons (Left & Right)
    ctx.save();
    ctx.fillStyle = '#0a1426';
    ctx.strokeStyle = suitCol;
    ctx.lineWidth = 3;
    ctx.shadowColor = suitCol;
    ctx.shadowBlur = 10;

    // Left shoulder plate
    ctx.beginPath();
    ctx.moveTo(115, 305);
    ctx.lineTo(155, 290);
    ctx.lineTo(145, 335);
    ctx.lineTo(105, 330);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right shoulder plate
    ctx.beginPath();
    ctx.moveTo(397, 305);
    ctx.lineTo(357, 290);
    ctx.lineTo(367, 335);
    ctx.lineTo(407, 330);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. COMBAT UPGRADE 2: Chestplate Arc Reactor Core
    ctx.save();
    ctx.translate(256, 325);
    ctx.shadowColor = suitCol;
    ctx.shadowBlur = (this.isDashing || emo === 'emp') ? 22 : 12;

    // Outer dark hexagonal housing
    ctx.fillStyle = '#070f1e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = Math.cos(a) * 24;
      const ry = Math.sin(a) * 24;
      i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = suitCol;
    ctx.stroke();

    // Inner glowing core
    ctx.fillStyle = suitCol;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Reactor energy pulse gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. COMBAT UPGRADE 3: Antenna Booster Plasma Halos
    ctx.save();
    ctx.strokeStyle = suitCol;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = suitCol;
    ctx.shadowBlur = (this.isDashing || emo === 'emp') ? 24 : 12;

    // Left & Right Antenna Halos
    ctx.beginPath();
    ctx.ellipse(172, 72, 22, 10, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(340, 72, 22, 10, 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing tip nodes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(172, 72, 7, 0, Math.PI * 2);
    ctx.arc(340, 72, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. COMBAT UPGRADE 4: HOLOGRAPHIC CYBER VISOR & DYNAMIC EXPRESSIONS
    // Visor center is located at (256, 212)
    ctx.save();
    ctx.translate(256, 212);

    // Visor Frame with bevel and dark HUD glass
    ctx.shadowColor = suitCol;
    ctx.shadowBlur = 14;

    const grad = ctx.createLinearGradient(-84, -42, 84, 42);
    grad.addColorStop(0, 'rgba(8, 16, 34, 0.92)');
    grad.addColorStop(1, 'rgba(15, 28, 56, 0.95)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-86, -40, 172, 80, 24);
    } else {
      ctx.rect(-86, -40, 172, 80);
    }
    ctx.fill();

    ctx.lineWidth = 4.0;
    ctx.strokeStyle = suitCol;
    ctx.stroke();

    // Corner Tech Bolts on Visor
    ctx.fillStyle = '#ffffff';
    for (let bx of [-72, 72]) {
      for (let by of [-26, 26]) {
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Digital Scanlines across visor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = -36; y < 36; y += 6) {
      ctx.fillRect(-80, y, 160, 2);
    }

    // -------------------------------------------------------------
    // DYNAMIC FACIAL EXPRESSIONS RENDERED INSIDE VISOR
    // -------------------------------------------------------------
    if (emo === 'dash') {
      // FIERCE ATTACK EYES (Slanted angular eyes with turbo speed flares)
      ctx.shadowColor = '#FF3344';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFD700';

      // Left sharp battle eye
      ctx.beginPath();
      ctx.moveTo(-52, -18);
      ctx.lineTo(-18, -4);
      ctx.lineTo(-46, 12);
      ctx.closePath();
      ctx.fill();

      // Right sharp battle eye
      ctx.beginPath();
      ctx.moveTo(52, -18);
      ctx.lineTo(18, -4);
      ctx.lineTo(46, 12);
      ctx.closePath();
      ctx.fill();

      // Determined Grin
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 14, 18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Turbo Speed Decals (>>>)
      ctx.font = '900 16px Orbitron';
      ctx.fillStyle = '#00FFC6';
      ctx.textAlign = 'center';
      ctx.fillText('>>>', 0, -20);

    } else if (emo === 'hit') {
      // DIZZY SPIRAL / KNOCKOUT EYES (Cartoon impact stars & wobbly mouth)
      ctx.shadowColor = '#FF3344';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#FF4455';
      ctx.lineWidth = 4;

      // Left X eye
      ctx.beginPath();
      ctx.moveTo(-45, -12); ctx.lineTo(-25, 8);
      ctx.moveTo(-25, -12); ctx.lineTo(-45, 8);
      ctx.stroke();

      // Right X eye
      ctx.beginPath();
      ctx.moveTo(25, -12); ctx.lineTo(45, 8);
      ctx.moveTo(45, -12); ctx.lineTo(25, 8);
      ctx.stroke();

      // Wobbly squiggly mouth
      ctx.strokeStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(-24, 22);
      ctx.quadraticCurveTo(-12, 16, 0, 22);
      ctx.quadraticCurveTo(12, 28, 24, 22);
      ctx.stroke();

      // Floating impact stars above
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('💫', 0, -26);

    } else if (emo === 'shock') {
      // ELECTRIFIED / LASER BURNED (Wide shocked pupils & zig-zag mouth)
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFFFFF';

      // Wide shocked ring eyes
      ctx.beginPath();
      ctx.arc(-34, -4, 15, 0, Math.PI * 2);
      ctx.arc(34, -4, 15, 0, Math.PI * 2);
      ctx.fill();

      // Tiny pinprick shocked pupils
      ctx.fillStyle = '#FF3344';
      ctx.beginPath();
      ctx.arc(-34, -4, 4, 0, Math.PI * 2);
      ctx.arc(34, -4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Shocked open "O" mouth
      ctx.fillStyle = '#0a1020';
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 20, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (emo === 'near_edge') {
      // PANICKING AT EDGE (Trembling eyes looking down, sweat beads)
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 14;

      // Trembling wide eyes looking downwards
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-34, -6, 14, 0, Math.PI * 2);
      ctx.arc(34, -6, 14, 0, Math.PI * 2);
      ctx.fill();

      // Pupils shifted all the way down
      ctx.fillStyle = '#081224';
      ctx.beginPath();
      ctx.arc(-34, 1, 6, 0, Math.PI * 2);
      ctx.arc(34, 1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Quivering wavy mouth
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, 22);
      ctx.lineTo(-11, 26);
      ctx.lineTo(0, 22);
      ctx.lineTo(11, 26);
      ctx.lineTo(22, 22);
      ctx.stroke();

      // Flying sweat drops
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('💧', 64, -20);
      ctx.fillText('💧', -64, -20);

    } else if (emo === 'kill') {
      // SMUG VICTORY WINK & SHADES (Knocked rival out)
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 18;

      // Left eye: Cool Wink curve
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(-34, -2, 14, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();

      // Right eye: Sparkling open star pupil
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(34, -2, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(34, -2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Smug angled smirk
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-16, 20);
      ctx.quadraticCurveTo(8, 28, 28, 16);
      ctx.stroke();

      // Star sparkle twinkle
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('✨', 54, -20);

    } else if (emo === 'celebrate') {
      // CRYSTAL / STAR EYES
      ctx.shadowColor = '#00FFC6';
      ctx.shadowBlur = 18;
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', -34, -4);
      ctx.fillText('★', 34, -4);

      // Joyous big smile
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 10, 18, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

    } else if (emo === 'emp') {
      // OVERDRIVEN CYBER LIGHTNING EYES
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 24;
      ctx.font = '900 24px Orbitron';
      ctx.fillStyle = '#00E5FF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[ ⚡  ⚡ ]', 0, -4);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-45, 12, 90, 12);

    } else if (!this.grounded) {
      // UTTER HORROR FALLING (Screaming into the abyss)
      ctx.shadowColor = '#FF3344';
      ctx.shadowBlur = 18;

      // Terrified tiny pin-eyes
      ctx.fillStyle = '#FF3344';
      ctx.beginPath();
      ctx.arc(-34, -8, 6, 0, Math.PI * 2);
      ctx.arc(34, -8, 6, 0, Math.PI * 2);
      ctx.fill();

      // Big gaping screaming mouth
      ctx.fillStyle = '#060a16';
      ctx.strokeStyle = '#FF3344';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 14, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stream of comic tears flying up
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('💧', -50, -28);
      ctx.fillText('💧', 50, -28);

    } else {
      // IDLE / CRUISING PILOT (Confident pilot eyes, blinking & cyber HUD reticle)
      if (this.isBlinking) {
        // Closed relaxed blink line
        ctx.strokeStyle = suitCol;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-46, -2); ctx.lineTo(-22, -2);
        ctx.moveTo(22, -2);  ctx.lineTo(46, -2);
        ctx.stroke();
      } else {
        // Glowing cyan/mint pilot eyes
        ctx.fillStyle = suitCol;
        ctx.shadowColor = suitCol;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(-34, -2, 11, 0, Math.PI * 2);
        ctx.arc(34, -2, 11, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-31, -5, 4, 0, Math.PI * 2);
        ctx.arc(37, -5, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Confident pilot smile
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 10, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Tactical HUD reticle in corner
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-68, -26, 32, 18);
      ctx.strokeRect(36, -26, 32, 18);
    }

    ctx.restore();
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
    this.squashX = 0.76;
    this.squashY = 1.38;

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
    this.squashX = 1.42 * Math.min(1.6, intensity);
    this.squashY = 0.68;

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
    const zaps = ['ZAPPED!', 'HOT HOT HOT!', 'SHORT CIRCUIT!', 'SIZZLE!'];
    const txt = zaps[Math.floor(Math.random() * zaps.length)];
    this.setEmotion('shock', 0.9, txt, '⚡');
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
      this.setEmotion('emp', 1.3, 'FORCEFIELD!', '🛡️');
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
      if (this.rocketTimer <= 0) this.hasRocket = false;
    }

    // Dash status
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.mass = 3.2;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.mass = 1.0;
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
    const flipX = (inputX < -0.1 ? -1 : 1);
    this.diliSprite.scale.set(
      2.05 * this.squashX * flipX,
      2.25 * this.squashY,
      1
    );

    // Idle Bobbing Animation
    if (this.grounded) {
      const bob = Math.sin(performance.now() * 0.008) * 0.06;
      this.diliSprite.position.y = 1.20 + bob;
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
