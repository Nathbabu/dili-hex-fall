// =============================================
// DILI: HEX-FALL — 3D Cyber Astronaut
// =============================================
class Character3D {
  constructor(scene, suitColor, pilotName = 'Dili') {
    this.scene = scene;
    this.suitColor = suitColor || 0x00FFC6;
    this.pilotName = pilotName;
    this.group = new THREE.Group();
    this.isPlayer = false;

    // Physics
    this.x = 0;
    this.y = 2;
    this.z = 0;
    this.prevY = 2;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.speed = 6.8;
    this.jumpForce = 8.5;
    this.gravity = -19;
    this.grounded = false;
    this.currentTier = 0;
    this.alive = true;
    this.facing = 0;
    this.animTime = 0;

    // Power-ups
    this.hasGlider = false;
    this.gliderTimer = 0;
    this.frozenTiles = false;
    this.freezeTimer = 0;

    // Parts
    this.head = null;
    this.visor = null;
    this.body = null;
    this.backpack = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.thrusterL = null;
    this.thrusterR = null;
    this.nameBadge = null;

    this._build();
  }

  _build() {
    const suit = new THREE.Color(this.suitColor);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111624, metalness: 0.6, roughness: 0.4 });
    const suitMat = new THREE.MeshStandardMaterial({ color: suit, metalness: 0.45, roughness: 0.35 });

    // Helmet (Sphere)
    const headGeo = new THREE.SphereGeometry(0.38, 14, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.4, roughness: 0.4 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.15;
    this.group.add(this.head);

    // Visor (Reflective dome)
    const visorGeo = new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const visorColor = new THREE.Color(0x00E5FF);
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 0.65,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    this.visor = new THREE.Mesh(visorGeo, visorMat);
    this.visor.position.set(0, 1.15, 0.16);
    this.visor.rotation.x = -Math.PI * 0.35;
    this.group.add(this.visor);

    // Torso (Armor Box)
    const bodyGeo = new THREE.BoxGeometry(0.56, 0.6, 0.36);
    this.body = new THREE.Mesh(bodyGeo, suitMat);
    this.body.position.y = 0.62;
    this.group.add(this.body);

    // Chest Plate
    const chestGeo = new THREE.BoxGeometry(0.42, 0.32, 0.38);
    const chest = new THREE.Mesh(chestGeo, darkMat);
    chest.position.set(0, 0.68, 0.02);
    this.group.add(chest);

    // Backpack / Life Support & Thruster Unit
    const bpGeo = new THREE.BoxGeometry(0.38, 0.46, 0.22);
    this.backpack = new THREE.Mesh(bpGeo, darkMat);
    this.backpack.position.set(0, 0.66, -0.26);
    this.group.add(this.backpack);

    // Twin Thruster Cones
    const thrGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.16, 8);
    const thrMat = new THREE.MeshStandardMaterial({
      color: 0xFF6600,
      emissive: 0xFF6600,
      emissiveIntensity: 0.8
    });
    this.thrusterL = new THREE.Mesh(thrGeo, thrMat);
    this.thrusterL.position.set(-0.11, 0.36, -0.32);
    this.group.add(this.thrusterL);

    this.thrusterR = new THREE.Mesh(thrGeo, thrMat.clone());
    this.thrusterR.position.set(0.11, 0.36, -0.32);
    this.group.add(this.thrusterR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.44, 0.14);
    this.leftArm = new THREE.Mesh(armGeo, suitMat);
    this.leftArm.position.set(-0.38, 0.58, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, suitMat.clone());
    this.rightArm.position.set(0.38, 0.58, 0);
    this.group.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.16, 0.42, 0.16);
    this.leftLeg = new THREE.Mesh(legGeo, darkMat);
    this.leftLeg.position.set(-0.14, 0.15, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, darkMat.clone());
    this.rightLeg.position.set(0.14, 0.15, 0);
    this.group.add(this.rightLeg);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.18, 0.12, 0.22);
    const bootL = new THREE.Mesh(bootGeo, suitMat);
    bootL.position.set(-0.14, -0.08, 0.03);
    this.group.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, suitMat.clone());
    bootR.position.set(0.14, -0.08, 0.03);
    this.group.add(bootR);

    // 3D Overhead Name Badge
    this.nameBadge = this._createNameBadge(this.pilotName);
    this.nameBadge.position.set(0, 1.85, 0);
    this.group.add(this.nameBadge);

    this.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.group);
  }

  _createNameBadge(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(5, 8, 16, 0.75)';
    ctx.roundRect ? ctx.roundRect(10, 10, 236, 44, 8) : ctx.rect(10, 10, 236, 44);
    ctx.fill();

    ctx.strokeStyle = '#' + new THREE.Color(this.suitColor).getHexString();
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
    sprite.scale.set(1.8, 0.45, 1);
    return sprite;
  }

  jump(force) {
    if (!this.alive) return;
    this.vy = force || this.jumpForce;
    this.grounded = false;
  }

  dive() {
    if (!this.alive || this.grounded) return;
    this.vy = -14;
  }

  activatePowerUp(type) {
    switch (type) {
      case 'spring':
        this.jump(13.5);
        break;
      case 'glider':
        this.hasGlider = true;
        this.gliderTimer = 5.0;
        break;
      case 'freeze':
        this.frozenTiles = true;
        this.freezeTimer = 3.5;
        break;
    }
  }

  update(dt, inputX = 0, inputZ = 0) {
    if (!this.alive) return;

    this.animTime += dt;
    this.prevY = this.y;

    // Movement velocity
    this.vx = inputX * this.speed;
    this.vz = inputZ * this.speed;

    // Gravity
    const grav = this.hasGlider ? this.gravity * 0.32 : this.gravity;
    this.vy += grav * dt;
    if (this.vy < -22) this.vy = -22;

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.y += this.vy * dt;

    // Smooth turning towards movement
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vz) > 0.1) {
      const targetFacing = Math.atan2(this.vx, this.vz);
      // Smooth interpolation for rotation
      let diff = targetFacing - this.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facing += diff * Math.min(1, 12 * dt);
    }

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing;

    // Power-up countdowns
    if (this.hasGlider) {
      this.gliderTimer -= dt;
      if (this.gliderTimer <= 0) this.hasGlider = false;
    }
    if (this.frozenTiles) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) this.frozenTiles = false;
    }

    // Thruster glow
    const thrusterGlow = this.grounded ? 0.2 : (this.hasGlider ? 2.0 : 0.85);
    this.thrusterL.material.emissiveIntensity = thrusterGlow;
    this.thrusterR.material.emissiveIntensity = thrusterGlow;

    // Limb animations
    this._animate(dt);

    // Void death check
    if (this.y < -32) {
      this.alive = false;
    }
  }

  _animate(dt) {
    const isMoving = Math.abs(this.vx) > 0.5 || Math.abs(this.vz) > 0.5;

    if (this.grounded && isMoving) {
      // Run animation
      const swing = Math.sin(this.animTime * 13) * 0.55;
      this.leftArm.rotation.x = swing;
      this.rightArm.rotation.x = -swing;
      this.leftLeg.rotation.x = -swing * 0.8;
      this.rightLeg.rotation.x = swing * 0.8;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.z = 0;
    } else if (!this.grounded) {
      // Mid-air jump / glide pose
      const flap = this.hasGlider ? Math.sin(this.animTime * 8) * 0.1 : 0;
      this.leftArm.rotation.x = -0.9 + flap;
      this.rightArm.rotation.x = -0.9 - flap;
      this.leftArm.rotation.z = -0.4;
      this.rightArm.rotation.z = 0.4;
      this.leftLeg.rotation.x = 0.25;
      this.rightLeg.rotation.x = 0.25;
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 2.2) * 0.05;
      this.leftArm.rotation.x = breath;
      this.rightArm.rotation.x = -breath;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.z = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }
  }

  reset(x, y, z) {
    this.alive = true;
    this.grounded = false;
    this.currentTier = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.prevY = y;
    this.hasGlider = false;
    this.frozenTiles = false;
    this.x = x || 0;
    this.y = y || 2;
    this.z = z || 0;
    this.group.position.set(this.x, this.y, this.z);
  }

  remove() {
    this.scene.remove(this.group);
  }
}
