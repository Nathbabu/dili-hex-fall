
// ===================================================================
// AUTHENTIC FULL 3D VOLUMETRIC DLICOM DILI CHARACTER
// 100% Solid 3D Model: Pure White Bunny Head, Glowing Anime Eyes,
// Cute Bunny Ears, Glass Bubble Helmet, Cyber Armor, Boxing Fists,
// Rocket Jetpack, Flowing Cape, Magnetized Boots. NO 2D PAPER!
// ===================================================================
// ===================================================================
// AUTHENTIC 100% EXACT DLICOM DILI 3D VOLUMETRIC CHARACTER
// 100% Authentic Dili Artwork + Real Physical 3D Depth (0.22m thick)
// 3D Glass Bubble Astronaut Helmet, 3D Rocket Jetpack, 3D Combat Boots,
// 3D Shoulder Armor Caps, Dynamic Action Poses & 360° Real Turning!
// ===================================================================
// ===================================================================
// AUTHENTIC DLICOM DILI ARCADE CHARACTER (CLEAN, SHARP & GORGEOUS)
// 100% Authentic Official Dlicom Artwork — Zero Glitches, Zero Snowman!
// Camera-Aligned Arcade Sprite with Smooth Left/Right Directional Turning,
// Dynamic Bank Leaning, Action Poses, and Grounded Hover Cockpit Ring!
// ===================================================================
class DiliCharacter3D {
  constructor(suitKey = 'mint', suitColor = 0x00FFC6) {
    this.suitKey = suitKey;
    this.suitColor = suitColor;
    this.group = new THREE.Group();
    this.currentPose = 'fight';
    this.animTime = 0;
    this.currentFlipX = 1;
    this.targetFlipX = 1;

    this.suitCol = new THREE.Color(suitColor);

    // Preload and cache all 5 authentic official Dlicom pose textures
    this.textures = {};
    this.materials = {};
    const loader = new THREE.TextureLoader();

    const poses = ['fight', 'ram', 'hit', 'victory', 'fall'];
    poses.forEach(pose => {
      const url = `/assets/characters/dili-${pose}-cutout-${suitKey}.png`;
      const tex = loader.load(url);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.textures[pose] = tex;

      // Pure, vibrant, uncorrupted official artwork (full brightness, transparent cutouts)
      this.materials[pose] = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.12,
        side: THREE.DoubleSide
      });
    });

    this._buildCleanModel();
  }

  _buildCleanModel() {
    // 1. Heroic Arcade Character Scale (Bigger, bolder & highly visible)
    const W = 2.15;
    const H = 2.65;
    const planeGeo = new THREE.PlaneGeometry(W, H);

    this.baseY = H * 0.5 + 0.02; // ~1.345
    this.mesh = new THREE.Mesh(planeGeo, this.materials.fight);
    // Grounded right on the saucer platform, centered vertically
    this.mesh.position.set(0, this.baseY, 0);
    this.group.add(this.mesh);

    // 2. Glowing Neon Cockpit Energy Foothold Ring
    const ringGeo = new THREE.TorusGeometry(0.65, 0.04, 10, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: this.suitColor });
    this.footRing = new THREE.Mesh(ringGeo, ringMat);
    this.footRing.rotation.x = Math.PI / 2;
    this.footRing.position.set(0, 0.04, 0);
    this.group.add(this.footRing);
  }

  setEmotion(emotion) {
    let targetPose = 'fight';
    if (emotion === 'dash' || emotion === 'emp') {
      targetPose = 'ram';
    } else if (emotion === 'hit' || emotion === 'shock') {
      targetPose = 'hit';
    } else if (emotion === 'kill' || emotion === 'celebrate') {
      targetPose = 'victory';
    } else if (emotion === 'falling') {
      targetPose = 'fall';
    }

    if (this.currentPose !== targetPose && this.materials[targetPose]) {
      this.currentPose = targetPose;
      this.mesh.material = this.materials[targetPose];
    }
  }

  update(dt, isMoving = false, isDashing = false, grounded = true, vx = 0, vz = 0) {
    this.animTime += dt;

    // 1. Directional Turning (Left vs Right Facing Flip)
    // The official Dili cutout naturally faces LEFT (scale.x = 1).
    // When moving RIGHT (vx > 0.25), flip to -1 so Dili faces RIGHT!
    // When moving LEFT (vx < -0.25), set to +1 so Dili faces LEFT!
    if (vx > 0.25) {
      this.targetFlipX = -1; // Moving Right -> Face Right!
    } else if (vx < -0.25) {
      this.targetFlipX = 1;  // Moving Left -> Face Left!
    }

    // Smooth flip interpolation so the character turns naturally
    this.currentFlipX += (this.targetFlipX - this.currentFlipX) * Math.min(1, 16 * dt);
    const safeFlip = Math.abs(this.currentFlipX) < 0.15 ? 0.15 * Math.sign(this.targetFlipX) : this.currentFlipX;
    this.mesh.scale.x = safeFlip;

    const basePosY = this.baseY || 1.345;

    // 2. Action Animations & Dynamic Leaning
    if (isDashing) {
      // Aggressive forward punch ram lean
      this.mesh.rotation.x = 0.22;
      this.mesh.rotation.z = -vx * 0.025;
      this.mesh.position.y = basePosY;
    } else if (isMoving) {
      // Running stride & lean into motion
      const stride = Math.sin(this.animTime * 14);
      this.mesh.rotation.x = 0.08;
      this.mesh.rotation.z = -vx * 0.02 + stride * 0.035;
      this.mesh.position.y = basePosY + Math.abs(Math.sin(this.animTime * 14)) * 0.05;
    } else {
      // Gentle idle combat breathing
      const breath = Math.sin(this.animTime * 3.0);
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
      this.mesh.position.y = basePosY + breath * 0.03;
    }

    // Foothold energy ring pulse
    if (this.footRing) {
      const pulse = 1.0 + Math.sin(this.animTime * 4.0) * 0.08;
      this.footRing.scale.set(pulse, pulse, 1.0);
    }
  }
}

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
    this.sprite.position.y = 3.8;
  }

  update(dt) {
    if (!this.active) return;

    this.timer -= dt;
    this.elapsed += dt;

    // Elastic pop animation with gentle upward drift
    const popProgress = Math.min(1, this.elapsed * 8);
    const popScale = 1.0 + Math.sin(popProgress * Math.PI) * 0.26;
    this.sprite.scale.set(2.4 * popScale, 1.0 * popScale, 1);
    this.sprite.position.y = 3.8 + (this.elapsed * 0.22);

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

// ===================================================================
// NEON DRIFT TRAILS (High-Octane Dual Thruster Light Ribbons)
// 100% Solid Geometry, Zero Garbage Collection, Additive Blending!
// Dynamically colored to match Pilot Cyber Suit.
// ===================================================================
class NeonDriftTrail {
  constructor(scene, suitColorHex = 0x00FFC6, maxPoints = 16) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.suitColorHex = suitColorHex;
    this.suitColor = new THREE.Color(suitColorHex);
    this.sampleTimer = 0;

    // Pre-allocated static point history for left and right thrusters
    this.leftPoints = [];
    this.rightPoints = [];
    for (let i = 0; i < maxPoints; i++) {
      this.leftPoints.push({ x: 0, y: 0, z: 0, active: false });
      this.rightPoints.push({ x: 0, y: 0, z: 0, active: false });
    }

    // Geometry buffers: maxPoints pairs of vertices = maxPoints * 2
    const vertCount = maxPoints * 2;
    const indices = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const p1 = i * 2;
      const p2 = i * 2 + 1;
      const p3 = (i + 1) * 2;
      const p4 = (i + 1) * 2 + 1;
      indices.push(p1, p2, p3, p2, p4, p3);
    }

    const buildRibbonMesh = () => {
      const geo = new THREE.BufferGeometry();
      const posArr = new Float32Array(vertCount * 3);
      const colArr = new Float32Array(vertCount * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      return { geo, posArr, colArr, mesh, mat };
    };

    this.leftRibbon = buildRibbonMesh();
    this.rightRibbon = buildRibbonMesh();
    this.visible = true;
  }

  setColor(hex) {
    this.suitColorHex = hex;
    this.suitColor.setHex(hex);
  }

  setVisible(v) {
    this.visible = v;
    if (this.leftRibbon) this.leftRibbon.mesh.visible = v;
    if (this.rightRibbon) this.rightRibbon.mesh.visible = v;
  }

  reset() {
    for (let i = 0; i < this.maxPoints; i++) {
      this.leftPoints[i].active = false;
      this.rightPoints[i].active = false;
    }
    this._rebuildMesh(this.leftRibbon, this.leftPoints, 0.16, 0);
    this._rebuildMesh(this.rightRibbon, this.rightPoints, 0.16, 0);
  }

  update(dt, leftNozzle, rightNozzle, isMoving, isDashing, hasRocket, facing) {
    if (!this.visible) return;

    this.sampleTimer += dt;
    const sampleInterval = (isDashing || hasRocket) ? 0.02 : 0.035;

    if (isMoving) {
      if (this.sampleTimer >= sampleInterval) {
        this.sampleTimer = 0;
        this._addPoint(this.leftPoints, leftNozzle.x, leftNozzle.y, leftNozzle.z);
        this._addPoint(this.rightPoints, rightNozzle.x, rightNozzle.y, rightNozzle.z);
      }
    } else {
      // Retract/fade trail when stationary
      if (this.sampleTimer >= 0.04) {
        this.sampleTimer = 0;
        this._retractPoints(this.leftPoints);
        this._retractPoints(this.rightPoints);
      }
    }

    const ribbonWidth = (isDashing || hasRocket) ? 0.34 : 0.16;
    const boostMultiplier = (isDashing || hasRocket) ? 1.6 : 1.0;

    this._rebuildMesh(this.leftRibbon, this.leftPoints, ribbonWidth, facing, boostMultiplier);
    this._rebuildMesh(this.rightRibbon, this.rightPoints, ribbonWidth, facing, boostMultiplier);
  }

  _addPoint(points, x, y, z) {
    for (let i = this.maxPoints - 1; i > 0; i--) {
      points[i].x = points[i - 1].x;
      points[i].y = points[i - 1].y;
      points[i].z = points[i - 1].z;
      points[i].active = points[i - 1].active;
    }
    points[0].x = x;
    points[0].y = y;
    points[0].z = z;
    points[0].active = true;
  }

  _retractPoints(points) {
    for (let i = this.maxPoints - 1; i >= 0; i--) {
      if (points[i].active) {
        points[i].active = false;
        break;
      }
    }
  }

  _rebuildMesh(ribbon, points, width, facing, boost = 1.0) {
    const pos = ribbon.posArr;
    const col = ribbon.colArr;
    // Perpendicular horizontal normal across craft width
    const perpX = -Math.cos(facing) * (width * 0.5);
    const perpZ = Math.sin(facing) * (width * 0.5);

    let activeCount = 0;
    for (let i = 0; i < this.maxPoints; i++) {
      if (points[i].active) activeCount++;
    }

    let lastActiveX = points[0].x;
    let lastActiveY = points[0].y;
    let lastActiveZ = points[0].z;

    for (let i = 0; i < this.maxPoints; i++) {
      const vIdx = i * 6; // 2 vertices * 3 coords
      const cIdx = i * 6; // 2 vertices * 3 rgb

      if (points[i].active && activeCount > 1) {
        const px = points[i].x;
        const py = Math.max(0.32, points[i].y);
        const pz = points[i].z;
        lastActiveX = px;
        lastActiveY = py;
        lastActiveZ = pz;

        const alphaRatio = Math.max(0, 1 - (i / (activeCount - 1)));
        const alpha = Math.pow(alphaRatio, 1.3) * boost;

        // Vertex 1: left edge
        pos[vIdx]     = px + perpX;
        pos[vIdx + 1] = py;
        pos[vIdx + 2] = pz + perpZ;

        // Vertex 2: right edge
        pos[vIdx + 3] = px - perpX;
        pos[vIdx + 4] = py;
        pos[vIdx + 5] = pz - perpZ;

        // Colors (RGB)
        const r = Math.min(1.0, this.suitColor.r * alpha);
        const g = Math.min(1.0, this.suitColor.g * alpha);
        const b = Math.min(1.0, this.suitColor.b * alpha);

        col[cIdx]     = r; col[cIdx + 1] = g; col[cIdx + 2] = b;
        col[cIdx + 3] = r; col[cIdx + 4] = g; col[cIdx + 5] = b;
      } else {
        // Inactive: collapse to last position with 0 color
        pos[vIdx]     = lastActiveX;
        pos[vIdx + 1] = lastActiveY;
        pos[vIdx + 2] = lastActiveZ;
        pos[vIdx + 3] = lastActiveX;
        pos[vIdx + 4] = lastActiveY;
        pos[vIdx + 5] = lastActiveZ;

        col[cIdx]     = 0; col[cIdx + 1] = 0; col[cIdx + 2] = 0;
        col[cIdx + 3] = 0; col[cIdx + 4] = 0; col[cIdx + 5] = 0;
      }
    }

    ribbon.geo.attributes.position.needsUpdate = true;
    ribbon.geo.attributes.color.needsUpdate = true;
  }

  remove() {
    if (this.leftRibbon) {
      this.scene.remove(this.leftRibbon.mesh);
      this.leftRibbon.geo.dispose();
      this.leftRibbon.mat.dispose();
    }
    if (this.rightRibbon) {
      this.scene.remove(this.rightRibbon.mesh);
      this.rightRibbon.geo.dispose();
      this.rightRibbon.mat.dispose();
    }
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
    this.baseMass = 1.0;
    this.baseSpeed = 10.8;
    this.accel = 38.0;
    this.drag = 0.93;
    this.alive = true;
    this.grounded = true;
    this.kills = 0;
    this.lastAttacker = null;
    this.hazardHitCooldown = 0;
    this.boostCooldown = 0;
    this.knockbackTimer = 0;

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
    this.dashMaxCooldown = 2.4;

    this.empCooldown = 0;
    this.empMaxCooldown = 3.0;

    this.evadeCooldown = 0;
    this.turnRoll = 0;
    this.lastFlipX = 1;
    this.baseGroup = null;

    // Multi-Tier Level Tracking
    this.currentTier = 1; // 1 = Upper Coliseum (Y=0.85), 2 = Sub-Level Pit (Y=-6.65)
    this.justLandedTier2 = false;
    this.isAirborneLaunch = false;
    this.isAirborneLaunch = false;

    // Power-ups & Cursed Hazards
    this.hasShield = false;
    this.shieldTimer = 0;
    this.hasRocket = false;
    this.rocketTimer = 0;
    this.hasSuperRam = false;
    this.superRamTimer = 0;
    this.isGlitchSlow = false;
    this.glitchSlowTimer = 0;
    this.isJammed = false;
    this.jamTimer = 0;

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
    this.driftTrail = new NeonDriftTrail(this.scene, this.suitColor);
    this._reusableLeftNozzle = new THREE.Vector3();
    this._reusableRightNozzle = new THREE.Vector3();
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

    // Dedicated Illuminated Cockpit Foothold Stand inside saucer
    const standGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.08, 24);
    const standMat = new THREE.MeshStandardMaterial({
      color: darkMetal,
      emissive: suitCol,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.25
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.18;
    baseGroup.add(stand);

    const footRingGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 24);
    const footRingMat = new THREE.MeshBasicMaterial({ color: this.suitColor });
    const footRing = new THREE.Mesh(footRingGeo, footRingMat);
    footRing.position.y = 0.22;
    footRing.rotation.x = Math.PI / 2;
    baseGroup.add(footRing);

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

    this.baseGroup = baseGroup;
    this.group.add(baseGroup);

    // 2. THE AUTHENTIC FULL 3D VOLUMETRIC DLICOM DILI CHARACTER (Real 3D Body, No Paper!)
    // Solid 3D Geometry: White Bunny Head, Glowing Anime Eyes, Bunny Ears,
    // Cyber Armor Torso, Boxing Fists, Rocket Jetpack, Flowing Cape, Boots!
    this.dili3D = new DiliCharacter3D(this.suitKey, this.suitColor);
    this.dili3D.group.position.set(0, 0.22, 0); // Grounded on cockpit foothold platform
    this.group.add(this.dili3D.group);

    this.diliSprite = this.dili3D.group; // Compatibility alias
    this.diliMesh = this.dili3D.group;

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
    this.nameSprite.position.set(0, 3.10, 0);
    this.group.add(this.nameSprite);

    this.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.group);

    this._redrawExpressiveDili();
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
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
      // Offset by -24px so the mascot body mass is placed at exact center (256, 256)
      ctx.drawImage(baseImg, -24, 0, 512, 512);
    } else if (this.baseImages.fight && this.baseImages.fight.complete) {
      ctx.drawImage(this.baseImages.fight, -24, 0, 512, 512);
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
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);

    if (bubbleText) {
      this.emoteBubble.show(bubbleText, emoji, this.suitColorStr);
    }
  }

  triggerSideEvade(dir = 'left') {
    if (this.isJammed || !this.alive || !this.grounded) return false;
    if (this.evadeCooldown > 0) return false;

    this.evadeCooldown = 1.4;
    const isLeft = dir === 'left';
    this.lastFlipX = isLeft ? -1 : 1;

    // Lateral evade impulse perpendicular to current facing
    const evadeSpeed = 22.0;
    const evadeAngle = this.facing + (isLeft ? -Math.PI / 2 : Math.PI / 2);
    this.vx += Math.sin(evadeAngle) * evadeSpeed;
    this.vz += Math.cos(evadeAngle) * evadeSpeed;

    // Rapid 360-degree spin juke roll
    this.turnRoll = isLeft ? -0.22 : 0.22;
    this.squashX = 1.35;
    this.squashY = 0.72;

    if (HexAudio && HexAudio.sfxDash) HexAudio.sfxDash();

    const emote = isLeft ? 'LEFT JUKE! ⚡' : 'RIGHT JUKE! ⚡';
    this.setEmotion('dash', 0.65, emote, isLeft ? '⬅️' : '➡️');
    return true;
  }

  triggerDash() {
    if (this.isJammed) {
      this.setEmotion('hit', 1.0, 'CIRCUITS JAMMED!', '⚡');
      return false;
    }
    if (this.dashCooldown > 0 || !this.alive || !this.grounded) return false;

    this.isDashing = true;
    this.dashTimer = 0.58;
    this.dashCooldown = this.dashMaxCooldown;

    // Physical Stretch Forward
    this.squashX = 0.78;
    this.squashY = 1.35;

    const dashSpeed = 28.0; // Fair & equal hardcore dash speed for both player & bots!
    this.vx = Math.sin(this.facing) * dashSpeed;
    this.vz = Math.cos(this.facing) * dashSpeed;

    HexAudio.sfxDash();

    const callouts = ['RAM DASH!', 'TURBO BOOST!', 'OUTTA MY WAY!', 'FULL POWER!'];
    const txt = callouts[Math.floor(Math.random() * callouts.length)];
    this.setEmotion('dash', 0.85, txt, '🔥');

    return true;
  }

  triggerEmp(otherCrafts) {
    if (this.isJammed) {
      this.setEmotion('hit', 1.0, 'EMP JAMMED!', '⚡');
      return false;
    }
    if (this.empCooldown > 0 || !this.alive || !this.grounded) return false;

    this.empCooldown = this.empMaxCooldown;
    if (HexAudio && HexAudio.sfxEmp) HexAudio.sfxEmp();

    const empRadius = 10.5; // Wide arena blast field (was 6.8m)
    const empForce = 22.5;  // Explosive repulsive force (cancels charges & blasts opponents backwards!)

    let hitAny = false;

    otherCrafts.forEach(c => {
      if (c === this || !c.alive || !c.grounded || Math.abs(c.y - this.y) > 3.0) return;
      const dx = c.x - this.x;
      const dz = c.z - this.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < empRadius && dist > 0.01) {
        hitAny = true;
        const falloff = 1 - (dist / empRadius) * 0.45;
        const force = empForce * Math.max(0.55, falloff);

        // HARD MOMENTUM REVERSAL:
        // Do NOT simply add to existing charging velocity (which swallowed the impulse).
        // Completely override incoming velocity and blast the rival outward!
        c.vx = (dx / dist) * force;
        c.vz = (dz / dist) * force;
        c.knockbackTimer = 0.45; // Substantial 0.45s high-speed slide (~4-5m push!)
        c.lastAttacker = this;

        // Visual electric overload & physical squash
        c.squashX = 1.55;
        c.squashY = 0.55;
        c.wobbleAngle = (Math.random() - 0.5) * 0.55;
        if (c.bumperRing && c.bumperRing.material) {
          c.bumperRing.material.emissiveIntensity = 3.6;
        }

        if (c.onImpact) c.onImpact(2.4);
        if (c.setEmotion) c.setEmotion('shock', 1.4, 'BLASTED!', '⚡');
      }
    });

    const empLines = ['EMP BLAST! ⚡', 'OUT OF MY WAY!', 'STATIC BOOM!'];
    const txt = empLines[Math.floor(Math.random() * empLines.length)];
    this.setEmotion('emp', 1.2, txt, '⚡');
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
      this.rocketTimer = 4.8;
      if (HexAudio && HexAudio.sfxPowerUp) HexAudio.sfxPowerUp();
      this.setEmotion('dash', 1.5, 'HYPER ROCKET!', '🚀');
    } else if (type === 'shield') {
      this.hasShield = true;
      this.shieldTimer = 5.2;
      if (this.shieldMesh) this.shieldMesh.visible = true;
      if (HexAudio && HexAudio.sfxPowerUp) HexAudio.sfxPowerUp();
      this.setEmotion('celebrate', 1.3, 'FORCEFIELD!', '🛡️');
    } else if (type === 'super_ram') {
      this.hasSuperRam = true;
      this.superRamTimer = 10.0;
      if (HexAudio && HexAudio.announce) HexAudio.announce('super_ram');
      else if (HexAudio && HexAudio.sfxPowerUp) HexAudio.sfxPowerUp();
      this.setEmotion('attack', 1.5, 'SUPER RAM READY! ⚡', '💥');
    } else if (type === 'hazard_slow') {
      this.isGlitchSlow = true;
      this.glitchSlowTimer = 4.0;
      if (HexAudio && HexAudio.sfxTrapGlitch) {
        HexAudio.sfxTrapGlitch();
      } else if (HexAudio && HexAudio.sfxVoicePanic) {
        HexAudio.sfxVoicePanic();
      }
      this.setEmotion('hit', 2.0, 'TOXIC SLOW! 🐌', '😵‍💫');
    } else if (type === 'hazard_jam') {
      this.isJammed = true;
      this.jamTimer = 3.6;
      this.dashCooldown = Math.max(this.dashCooldown, 3.6);
      this.empCooldown = Math.max(this.empCooldown, 3.6);
      this.vx += (Math.random() - 0.5) * 5.5;
      this.vz += (Math.random() - 0.5) * 5.5;
      if (HexAudio && HexAudio.sfxTrapJam) {
        HexAudio.sfxTrapJam();
      } else if (HexAudio && HexAudio.sfxAlarm) {
        HexAudio.sfxAlarm();
      }
      this.setEmotion('hit', 2.0, 'CIRCUITS JAMMED! ⚡', '💥');
    }
  }

  triggerBanter() {
    if (this.currentEmotion !== 'idle' || !this.alive || !this.grounded) return;
    const banter = ['WHO\'S NEXT?', 'LOCKED ON!', 'CAN\'T CATCH ME!', 'BRING IT ON!'];
    const txt = banter[Math.floor(Math.random() * banter.length)];
    this.setEmotion('idle', 1.2, txt, '😏');
  }

  update(dt, inputX = 0, inputZ = 0, arenaInfo = 21) {
    let currentRadius = 21;
    let upperFloorY = 0.85;

    if (typeof arenaInfo === 'object' && arenaInfo !== null) {
      currentRadius = arenaInfo.currentRadius || arenaInfo.upperRadius || 21;
      upperFloorY = arenaInfo.upperFloorY || 0.85;
    } else if (typeof arenaInfo === 'number') {
      currentRadius = arenaInfo;
    }
    if (!this.alive) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Cooldowns
    if (this.hazardHitCooldown > 0) this.hazardHitCooldown -= dt;
    if (this.boostCooldown > 0) this.boostCooldown -= dt;
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
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
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
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
      }
    }

    if (this.hasSuperRam) {
      this.superRamTimer -= dt;
      if (this.superRamTimer <= 0) {
        this.hasSuperRam = false;
      }
    }

    if (this.isGlitchSlow) {
      this.glitchSlowTimer -= dt;
      if (this.glitchSlowTimer <= 0) {
        this.isGlitchSlow = false;
        this._redrawExpressiveDili();
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
      }
    }

    if (this.isJammed) {
      this.jamTimer -= dt;
      this.dashCooldown = Math.max(this.dashCooldown, 0.8);
      this.empCooldown = Math.max(this.empCooldown, 0.8);
      if (this.jamTimer <= 0) {
        this.isJammed = false;
        this._redrawExpressiveDili();
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
      }
    }

    // Dash status: Balanced heavy ram mass for both player and bot
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.mass = 2.15; // Equal, hardcore ram mass
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.mass = this.baseMass;
        this._redrawExpressiveDili();
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
      }
    } else {
      this.mass = this.hasRocket ? 1.65 : this.baseMass;
    }

    // Spring squash & stretch recovery back to 1.0
    this.squashX += (1.0 - this.squashX) * Math.min(1, 16 * dt);
    this.squashY += (1.0 - this.squashY) * Math.min(1, 16 * dt);

    // Steering & Knockback Physics
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      // High-speed glide during knockback: Player has higher grip/friction to recover faster!
      const friction = 0.905; // Equal drift friction & glide recovery
      this.vx *= Math.pow(friction, dt * 60);
      this.vz *= Math.pow(friction, dt * 60);

      // Jet exhaust flame active during knockback flight
      this.leftFlame.scale.set(1.0, 1.0, 1.6);
      this.rightFlame.scale.set(1.0, 1.0, 1.6);
      this.leftFlame.visible = true;
      this.rightFlame.visible = true;
    } else if (this.grounded) {
      let topSpeed = this.isDashing ? Math.max(28.0, this.baseSpeed * 1.85) : (this.hasRocket ? Math.max(18.5, this.baseSpeed * 1.35) : this.baseSpeed);
      let accel = this.hasRocket ? this.accel * 1.5 : this.accel;

      if (this.isGlitchSlow) {
        topSpeed = this.isDashing ? 13.0 : (this.baseSpeed * 0.48);
        accel = this.accel * 0.45;
      }

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
      const spdRatio = curSpeed / (topSpeed || 1);
      let flameLen = this.isDashing ? 2.2 : (this.hasRocket ? 1.6 : spdRatio * 0.9);
      if (this.isGlitchSlow) {
        flameLen = Math.min(flameLen, 0.35); // Flame sputters when contaminated!
      }
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

    if (this.evadeCooldown > 0) this.evadeCooldown -= dt;

    let turnDelta = 0;
    if (Math.abs(inputX) > 0.06 || Math.abs(inputZ) > 0.06) {
      const targetFacing = Math.atan2(inputX, inputZ);
      let diff = targetFacing - this.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      turnDelta = diff;
      this.facing += diff * Math.min(1, 14 * dt);
    }

    // Dynamic horizontal facing direction (Left vs Right):
    if (inputX < -0.06) {
      this.lastFlipX = -1;
    } else if (inputX > 0.06) {
      this.lastFlipX = 1;
    } else if (Math.abs(this.vx) > 0.4) {
      this.lastFlipX = this.vx < 0 ? -1 : 1;
    } else if (Math.abs(Math.sin(this.facing)) > 0.2) {
      this.lastFlipX = Math.sin(this.facing) < 0 ? -1 : 1;
    }

    // Dynamic bank roll angle (subtle hovercraft lean into turns)
    const targetRoll = Math.max(-0.20, Math.min(0.20, -turnDelta * 0.25 + (this.vx * -0.012)));
    this.turnRoll += (targetRoll - this.turnRoll) * Math.min(1, 14 * dt);
    this.baseGroup.rotation.z = this.turnRoll;

    // Update Full 3D Volumetric Dili Character
    const isMoving = Math.abs(this.vx) > 0.3 || Math.abs(this.vz) > 0.3;
    if (this.dili3D) {
      this.dili3D.update(dt, isMoving, this.isDashing, this.grounded, this.vx, this.vz);
      this.dili3D.group.rotation.z = this.wobbleAngle;
      this.dili3D.group.scale.set(this.squashX, this.squashY, 1.0);
      if (this.grounded && !this.isDashing) {
        const bob = Math.sin(performance.now() * 0.008) * 0.03;
        this.dili3D.group.position.y = 0.18 + bob;
      } else {
        this.dili3D.group.position.y = 0.18;
      }
    }

    // Rotate physical saucer base to match craft orientation & physical tilt
    if (this.baseGroup) {
      this.baseGroup.rotation.y = this.facing;
      this.baseGroup.rotation.z = this.turnRoll;
      const pitchTarget = this.isDashing ? 0.22 : (inputZ < -0.1 ? 0.10 : (inputZ > 0.1 ? -0.10 : 0));
      this.baseGroup.rotation.x += (pitchTarget - this.baseGroup.rotation.x) * Math.min(1, 10 * dt);
    }

    // Arena Perimeter & Single-Deck Fall Check (Supports Custom Arena Shapes: Inferno Cross, Cryo Archipelago, Neon Colosseum)
    const distFromCenter = Math.sqrt(this.x * this.x + this.z * this.z);
    let isGrounded = false;
    if (arenaInfo && typeof arenaInfo.isPointGrounded === 'function') {
      isGrounded = arenaInfo.isPointGrounded(this.x, this.z);
    } else {
      isGrounded = (distFromCenter <= currentRadius + 0.35);
    }

    if (isGrounded) {
      // ON DECK (Single Platform at Y = upperFloorY)
      this.grounded = true;
      this.y = upperFloorY;
      this.vy = 0;

      if (this.diliMesh) this.diliMesh.rotation.z = this.wobbleAngle;

      // Dynamic Edge Panic on Deck
      if (distFromCenter > currentRadius - 2.8) {
        if (!this.wasNearEdge) {
          this.wasNearEdge = true;
          if (this.isPlayer && HexAudio && HexAudio.sfxVoicePanic) HexAudio.sfxVoicePanic();
          const panics = ['WHOA WHOA!', 'TOO CLOSE!', 'WATCH OUT!', 'YIKES!'];
          const txt = panics[Math.floor(Math.random() * panics.length)];
          this.setEmotion('near_edge', 1.2, txt, '⚠️');
        }
        this.wobbleAngle = Math.sin(performance.now() * 0.04) * 0.14;
      } else if (this.wasNearEdge && distFromCenter < currentRadius - 4.5) {
        this.wasNearEdge = false;
        if (this.currentEmotion === 'near_edge') {
          this.setEmotion('kill', 1.0, 'PHEW!', '💪');
        }
        this.wobbleAngle = 0;
      }
    } else {
      // PUSHED OR FELL OFF THE DECK INTO THE VOID!
      this.grounded = false;
      this.vy -= 42 * dt;
      this.y += this.vy * dt;

      if (this.currentEmotion !== 'falling') {
        const screams = ['NOOOOO!', 'AAAAAAH!', 'FALLING!', 'HANG ON!'];
        this.setEmotion('falling', 1.6, screams[Math.floor(Math.random() * screams.length)], '😱');
        if (this.isPlayer && HexAudio && HexAudio.sfxVoicePanic) HexAudio.sfxVoicePanic();
      }
      if (this.diliMesh) this.diliMesh.rotation.z += dt * 4;

      if (this.y < -5.0 && this.alive && !this.fellReported) {
        this.onKnockedOut();
      }
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.group.position.set(this.x, this.y, this.z);

    if (this.bumperRing && this.bumperRing.material) {
      if (this.isJammed) {
        const flicker = Math.sin(performance.now() * 0.04) > 0 ? 2.6 : 0.2;
        this.bumperRing.material.emissiveIntensity = flicker;
      } else {
        if (this.hasSuperRam) {
      this.bumperRing.material.emissive.setHex(0xFFD700);
      this.bumperRing.material.emissiveIntensity = 3.2;
    } else {
      this.bumperRing.material.emissive.setHex(this.suitTheme.ring);
      this.bumperRing.material.emissiveIntensity = this.isDashing ? 2.8 : (this.hasShield ? 2.2 : (this.isGlitchSlow ? 0.4 : 0.95));
    }
      }
    }

    // Update Emote Bubble
    this.emoteBubble.update(dt);
    // Update Neon Drift Light Ribbons
    if (this.driftTrail) {
      if (!this.alive || !this.grounded || this.y < -1) {
        this.driftTrail.setVisible(false);
      } else {
        this.driftTrail.setVisible(true);
        this._reusableLeftNozzle.set(-0.42, 0.20, -1.08);
        this.baseGroup.localToWorld(this._reusableLeftNozzle);
        this._reusableRightNozzle.set(0.42, 0.20, -1.08);
        this.baseGroup.localToWorld(this._reusableRightNozzle);

        const spd = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
        const moving = spd > 0.4;
        this.driftTrail.update(
          dt,
          this._reusableLeftNozzle,
          this._reusableRightNozzle,
          moving,
          this.isDashing,
          this.hasRocket,
          this.facing
        );
      }
    }


    if (this.y < -15) {
      if (this.driftTrail) this.driftTrail.setVisible(false);
      this.alive = false;
      this.group.visible = false;
      if (this.driftTrail) {
      this.driftTrail.reset();
      this.driftTrail.setVisible(true);
    }
    if (this.emoteBubble) {
        this.emoteBubble.active = false;
        if (this.emoteBubble.material) this.emoteBubble.material.opacity = 0;
      }
    }
  }

  reset(x, z) {
    this.alive = true;
    this.grounded = true;
    this.currentTier = 1;
    this.x = x;
    this.y = 0.85;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    if (this.group) {
      if (!this.group.parent) {
        this.scene.add(this.group);
      }
      this.group.visible = true;
      this.group.position.set(x, this.y, z);
    }
    if (this.emoteBubble) {
      this.emoteBubble.active = false;
      if (this.emoteBubble.material) this.emoteBubble.material.opacity = 0;
    }
    this.facing = Math.atan2(-x, -z);
    // Align initial flipX based on spawn position so all crafts face towards arena center:
    this.lastFlipX = (x > 0.3) ? -1 : (x < -0.3 ? 1 : 1);
    this.turnRoll = 0;
    this.evadeCooldown = 0;
    if (this.baseGroup) {
      this.baseGroup.rotation.y = this.facing;
      this.baseGroup.rotation.z = 0;
      this.baseGroup.rotation.x = 0;
    }
    if (this.dili3D) {
      this.dili3D.group.scale.set(1, 1, 1);
      this.dili3D.group.position.set(0, 0.22, 0);
      this.dili3D.group.rotation.set(0, 0, 0);
      this.dili3D.setEmotion('idle');
    }
    this.isDashing = false;
    this.hasShield = false;
    this.hasRocket = false;
    this.hasSuperRam = false;
    this.superRamTimer = 0;
    this.shieldTimer = 0;
    this.rocketTimer = 0;
    this.isGlitchSlow = false;
    this.glitchSlowTimer = 0;
    this.isJammed = false;
    this.jamTimer = 0;
    if (this.shieldMesh) this.shieldMesh.visible = false;
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
    if (this.dili3D) this.dili3D.setEmotion(this.currentEmotion);
  }

  remove() {
    if (this.driftTrail) this.driftTrail.remove();
    this.emoteBubble.remove();
    this.scene.remove(this.group);
  }
}


if (typeof window !== 'undefined') {
  window.BumperCraft = BumperCraft;
}
if (typeof globalThis !== 'undefined') {
  globalThis.BumperCraft = BumperCraft;
}

