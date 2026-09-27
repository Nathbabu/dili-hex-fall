// =============================================
// DILI: CYBER BUMPERS — 3D Combat Gyro-Craft
// =============================================
class BumperCraft {
  constructor(scene, suitColor, pilotName = 'Pilot') {
    this.scene = scene;
    this.suitColor = suitColor || 0x00FFC6;
    this.pilotName = pilotName;
    this.group = new THREE.Group();
    this.isPlayer = false;

    // Physics
    this.x = 0;
    this.y = 0.85; // rests on arena surface y=0.45
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.facing = 0;
    this.radius = 1.05; // collision sphere radius
    this.mass = 1.0;
    this.baseSpeed = 9.5;
    this.accel = 34.0;
    this.drag = 0.93;
    this.alive = true;
    this.grounded = true;
    this.kills = 0;
    this.lastAttacker = null;

    // Combat & Abilities
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashMaxCooldown = 3.2;

    this.empCooldown = 0;
    this.empMaxCooldown = 5.5;

    // Power-up States
    this.hasShield = false;
    this.shieldTimer = 0;
    this.hasRocket = false;
    this.rocketTimer = 0;

    // Visual Mesh Refs
    this.hull = null;
    this.bumperRing = null;
    this.flameL = null;
    this.flameR = null;
    this.shieldMesh = null;
    this.nameSprite = null;

    this._build();
  }

  _build() {
    const suitCol = new THREE.Color(this.suitColor);
    const darkCol = new THREE.Color(0x0a101d);

    // 1. Core Gyro-Hull (Metallic Sphere)
    const hullGeo = new THREE.SphereGeometry(0.78, 20, 16);
    const hullMat = new THREE.MeshStandardMaterial({
      color: darkCol,
      metalness: 0.85,
      roughness: 0.25,
      emissive: suitCol,
      emissiveIntensity: 0.15
    });
    this.hull = new THREE.Mesh(hullGeo, hullMat);
    this.hull.position.y = 0;
    this.group.add(this.hull);

    // 2. High-Voltage Glowing Bumper Ring
    const bumperGeo = new THREE.TorusGeometry(0.98, 0.18, 12, 28);
    const bumperMat = new THREE.MeshStandardMaterial({
      color: suitCol,
      emissive: suitCol,
      emissiveIntensity: 0.85,
      metalness: 0.5,
      roughness: 0.2
    });
    this.bumperRing = new THREE.Mesh(bumperGeo, bumperMat);
    this.bumperRing.rotation.x = Math.PI / 2;
    this.bumperRing.position.y = 0;
    this.group.add(this.bumperRing);

    // 3. Pilot Figure on Top (Cockpit & Helmet)
    const pilotGroup = new THREE.Group();
    pilotGroup.position.set(0, 0.45, 0.05);

    // Visor dome
    const visorGeo = new THREE.SphereGeometry(0.35, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const visorColor = new THREE.Color(0x00E5FF);
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = -Math.PI * 0.35;
    pilotGroup.add(visor);

    // Torso armor
    const armorGeo = new THREE.BoxGeometry(0.48, 0.38, 0.32);
    const armorMat = new THREE.MeshStandardMaterial({
      color: suitCol,
      metalness: 0.5,
      roughness: 0.4
    });
    const armor = new THREE.Mesh(armorGeo, armorMat);
    armor.position.y = -0.22;
    pilotGroup.add(armor);

    this.group.add(pilotGroup);

    // 4. Dual Exhaust Thrusters & Flame Jets
    const thrGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
    const thrMat = new THREE.MeshStandardMaterial({ color: 0x111624, metalness: 0.8 });

    const thrL = new THREE.Mesh(thrGeo, thrMat);
    thrL.rotation.x = Math.PI / 2;
    thrL.position.set(-0.35, 0.1, -0.7);
    this.group.add(thrL);

    const thrR = new THREE.Mesh(thrGeo, thrMat.clone());
    thrR.rotation.x = Math.PI / 2;
    thrR.position.set(0.35, 0.1, -0.7);
    this.group.add(thrR);

    // Exhaust flames
    const flameGeo = new THREE.ConeGeometry(0.12, 0.45, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0x00FFC6,
      emissive: 0x00FFC6,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85
    });

    this.flameL = new THREE.Mesh(flameGeo, flameMat);
    this.flameL.rotation.x = -Math.PI / 2;
    this.flameL.position.set(-0.35, 0.1, -0.95);
    this.group.add(this.flameL);

    this.flameR = new THREE.Mesh(flameGeo, flameMat.clone());
    this.flameR.rotation.x = -Math.PI / 2;
    this.flameR.position.set(0.35, 0.1, -0.95);
    this.group.add(this.flameR);

    // 5. Force Shield Bubble (Initially invisible)
    const shieldGeo = new THREE.SphereGeometry(1.25, 20, 16);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00E5FF,
      emissive: 0x00E5FF,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 6. Overhead 3D Nameplate
    this.nameSprite = this._createNameBadge(this.pilotName);
    this.nameSprite.position.set(0, 1.7, 0);
    this.group.add(this.nameSprite);

    this.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.group);
  }

  _createNameBadge(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(5, 8, 16, 0.8)';
    ctx.roundRect ? ctx.roundRect(8, 8, 240, 48, 10) : ctx.rect(8, 8, 240, 48);
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
    sprite.scale.set(1.9, 0.48, 1);
    return sprite;
  }

  // Trigger Turbo Ram Dash
  triggerDash() {
    if (this.dashCooldown > 0 || !this.alive || !this.grounded) return false;

    this.isDashing = true;
    this.dashTimer = 0.55; // 0.55s power burst
    this.dashCooldown = this.dashMaxCooldown;

    // Surge forward in current facing direction
    const dashSpeed = 24.0;
    this.vx = Math.sin(this.facing) * dashSpeed;
    this.vz = Math.cos(this.facing) * dashSpeed;

    HexAudio.sfxDash();
    return true;
  }

  // Trigger EMP Radial Shockwave
  triggerEmp(otherCrafts) {
    if (this.empCooldown > 0 || !this.alive || !this.grounded) return false;

    this.empCooldown = this.empMaxCooldown;
    HexAudio.sfxEmp();

    // Push all nearby crafts within 8m away with massive impulse
    const empRadius = 8.5;
    const empForce = 22.0;

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
      }
    });

    return true;
  }

  activatePowerUp(type) {
    if (type === 'rocket') {
      this.hasRocket = true;
      this.rocketTimer = 4.5;
      HexAudio.sfxPowerUp();
    } else if (type === 'shield') {
      this.hasShield = true;
      this.shieldTimer = 5.0;
      this.shieldMesh.visible = true;
      HexAudio.sfxPowerUp();
    } else if (type === 'mine') {
      HexAudio.sfxPowerUp();
    }
  }

  update(dt, inputX = 0, inputZ = 0, arenaRadius = 21) {
    if (!this.alive) return;

    // Cooldown updates
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.empCooldown > 0) this.empCooldown -= dt;

    if (this.hasShield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.hasShield = false;
        this.shieldMesh.visible = false;
      } else {
        this.shieldMesh.rotation.y += dt * 3;
      }
    }

    if (this.hasRocket) {
      this.rocketTimer -= dt;
      if (this.rocketTimer <= 0) this.hasRocket = false;
    }

    // Dash status
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.mass = 3.0; // heavy ramming mass!
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.mass = 1.0;
      }
    } else {
      this.mass = this.hasRocket ? 2.0 : 1.0;
    }

    // Steering & Acceleration
    if (this.grounded) {
      const topSpeed = this.isDashing ? 24 : (this.hasRocket ? 15 : this.baseSpeed);
      const accel = this.hasRocket ? this.accel * 1.5 : this.accel;

      this.vx += inputX * accel * dt;
      this.vz += inputZ * accel * dt;

      // Cap speed
      const curSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
      if (curSpeed > topSpeed) {
        this.vx = (this.vx / curSpeed) * topSpeed;
        this.vz = (this.vz / curSpeed) * topSpeed;
      }

      // Ground friction drag
      this.vx *= Math.pow(this.drag, dt * 60);
      this.vz *= Math.pow(this.drag, dt * 60);
    }

    // Facing direction
    if (Math.abs(inputX) > 0.1 || Math.abs(inputZ) > 0.1) {
      const targetFacing = Math.atan2(inputX, inputZ);
      let diff = targetFacing - this.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facing += diff * Math.min(1, 14 * dt);
    }

    // Check if on arena platform or falling into void
    const distFromCenter = Math.sqrt(this.x * this.x + this.z * this.z);

    if (distFromCenter > arenaRadius + 0.3) {
      // Off the platform edge! Falling into void
      this.grounded = false;
      this.vy -= 32 * dt; // strong falling gravity
      this.y += this.vy * dt;

      // Spin out as falling
      this.group.rotation.x += dt * 5;
      this.group.rotation.z += dt * 4;
    } else {
      // Safe on platform
      this.grounded = true;
      this.y = 0.85;
      this.vy = 0;
      this.group.rotation.x = 0;
      this.group.rotation.z = 0;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing;

    // Exhaust Flame FX
    const isMoving = Math.sqrt(this.vx * this.vx + this.vz * this.vz) > 1.0;
    const flameScale = this.isDashing ? 2.5 : (this.hasRocket ? 1.8 : (isMoving ? 1.0 : 0.2));
    this.flameL.scale.set(flameScale, flameScale, flameScale);
    this.flameR.scale.set(flameScale, flameScale, flameScale);

    if (this.isDashing || this.hasRocket) {
      this.flameL.material.color.setHex(0xFFD700);
      this.flameR.material.color.setHex(0xFFD700);
    } else {
      this.flameL.material.color.setHex(this.suitColor);
      this.flameR.material.color.setHex(this.suitColor);
    }

    // Bumper Ring Glow
    this.bumperRing.material.emissiveIntensity = this.isDashing ? 2.2 : (this.hasShield ? 1.8 : 0.85);

    // Death check
    if (this.y < -30) {
      this.alive = false;
      this.scene.remove(this.group);
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
    this.facing = Math.atan2(-x, -z); // face inward
    this.isDashing = false;
    this.hasShield = false;
    this.hasRocket = false;
    this.dashCooldown = 0;
    this.empCooldown = 0;
    this.lastAttacker = null;
    this.group.position.set(x, 0.85, z);
    this.group.rotation.set(0, this.facing, 0);
  }

  remove() {
    this.scene.remove(this.group);
  }
}
