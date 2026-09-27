// =============================================
// DILI: CYBER BUMPERS — Authentic Dili Character
// =============================================
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
    this.radius = 1.1; // Bumper collision radius
    this.mass = 1.0;
    this.baseSpeed = 10.0;
    this.accel = 36.0;
    this.drag = 0.93;
    this.alive = true;
    this.grounded = true;
    this.kills = 0;
    this.lastAttacker = null;

    // Action Poses
    this.textures = {};
    this.currentPose = 'jump'; // jump, rocket, fall

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

    // Visual Mesh Refs
    this.diliSprite = null;
    this.bumperRing = null;
    this.energyField = null;
    this.shieldMesh = null;
    this.nameSprite = null;

    this._suitColors = {
      mint: 0x00FFC6,
      pink: 0xFF6EC7,
      gold: 0xFFD700,
      blue: 0x4DA6FF,
      cobalt: 0x4DA6FF,
      crimson: 0xFF3344
    };
    this.suitColor = this._suitColors[this.suitKey] || 0x00FFC6;

    this._loadDiliTextures();
    this._build();
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

  _loadDiliTextures() {
    const loader = new THREE.TextureLoader();
    const suit = this.suitKey;

    const loadTex = (pose) => {
      return loader.load(`/assets/characters/dili-${pose}-cutout-${suit}.png`, undefined, undefined, () => {
        // Fallback to mint if color missing
        return loader.load(`/assets/characters/dili-${pose}-cutout-mint.png`);
      });
    };

    this.textures.jump = loadTex('jump');
    this.textures.rocket = loadTex('rocket');
    this.textures.fall = loadTex('fall');
  }

  _build() {
    const suitCol = new THREE.Color(this.suitColor);

    // 1. Cyber Bumper Arena Base Platform (Glowing Energy Torus)
    const ringGeo = new THREE.TorusGeometry(1.05, 0.16, 14, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: suitCol,
      emissive: suitCol,
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.2
    });
    this.bumperRing = new THREE.Mesh(ringGeo, ringMat);
    this.bumperRing.rotation.x = Math.PI / 2;
    this.bumperRing.position.y = 0.1;
    this.group.add(this.bumperRing);

    // 2. Under-Glow Energy Disc
    const discGeo = new THREE.CylinderGeometry(0.9, 0.95, 0.15, 24);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      emissive: suitCol,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.3
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 0.08;
    this.group.add(disc);

    // 3. THE OFFICIAL DILI MASCOT (High-Res 3D Cutout Sprite)
    const diliMat = new THREE.SpriteMaterial({
      map: this.textures.jump,
      transparent: true,
      alphaTest: 0.05
    });
    this.diliSprite = new THREE.Sprite(diliMat);
    this.diliSprite.scale.set(1.9, 2.1, 1);
    this.diliSprite.position.set(0, 1.15, 0);
    this.group.add(this.diliSprite);

    // 4. Force Shield Bubble (Initially invisible)
    const shieldGeo = new THREE.SphereGeometry(1.35, 22, 18);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00E5FF,
      emissive: 0x00E5FF,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.0;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 5. Overhead 3D Nameplate
    this.nameSprite = this._createNameBadge(this.pilotName);
    this.nameSprite.position.set(0, 2.35, 0);
    this.group.add(this.nameSprite);

    this.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.group);
  }

  _createNameBadge(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(5, 8, 16, 0.82)';
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

  triggerDash() {
    if (this.dashCooldown > 0 || !this.alive || !this.grounded) return false;

    this.isDashing = true;
    this.dashTimer = 0.55;
    this.dashCooldown = this.dashMaxCooldown;

    const dashSpeed = 25.0;
    this.vx = Math.sin(this.facing) * dashSpeed;
    this.vz = Math.cos(this.facing) * dashSpeed;

    HexAudio.sfxDash();
    return true;
  }

  triggerEmp(otherCrafts) {
    if (this.empCooldown > 0 || !this.alive || !this.grounded) return false;

    this.empCooldown = this.empMaxCooldown;
    HexAudio.sfxEmp();

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
    }
  }

  update(dt, inputX = 0, inputZ = 0, arenaRadius = 21) {
    if (!this.alive) return;

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

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.mass = 3.0;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.mass = 1.0;
      }
    } else {
      this.mass = this.hasRocket ? 2.0 : 1.0;
    }

    // Steering
    if (this.grounded) {
      const topSpeed = this.isDashing ? 25 : (this.hasRocket ? 16 : this.baseSpeed);
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
    }

    if (Math.abs(inputX) > 0.1 || Math.abs(inputZ) > 0.1) {
      const targetFacing = Math.atan2(inputX, inputZ);
      let diff = targetFacing - this.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facing += diff * Math.min(1, 14 * dt);
    }

    // Arena boundary check
    const distFromCenter = Math.sqrt(this.x * this.x + this.z * this.z);

    if (distFromCenter > arenaRadius + 0.3) {
      this.grounded = false;
      this.vy -= 34 * dt;
      this.y += this.vy * dt;

      // Falling pose!
      this._setPose('fall');
      this.diliSprite.material.rotation += dt * 3;
    } else {
      this.grounded = true;
      this.y = 0.85;
      this.vy = 0;
      this.diliSprite.material.rotation = 0;

      // Rocket pose while dashing, else jump pose
      if (this.isDashing || this.hasRocket) {
        this._setPose('rocket');
      } else {
        this._setPose('jump');
      }
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.group.position.set(this.x, this.y, this.z);

    // Subtle breathing / tilting of Dili sprite based on velocity
    if (this.grounded) {
      const spd = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
      const bob = Math.sin(performance.now() * 0.008) * 0.08;
      this.diliSprite.position.y = 1.15 + bob;
      this.diliSprite.scale.x = (inputX < -0.1 ? -1.9 : 1.9); // flip horizontally when steering left
    }

    this.bumperRing.material.emissiveIntensity = this.isDashing ? 2.5 : (this.hasShield ? 2.0 : 0.9);

    if (this.y < -30) {
      this.alive = false;
      this.scene.remove(this.group);
    }
  }

  _setPose(pose) {
    if (this.currentPose === pose) return;
    this.currentPose = pose;
    if (this.textures[pose] && this.diliSprite) {
      this.diliSprite.material.map = this.textures[pose];
      this.diliSprite.material.needsUpdate = true;
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
    this._setPose('jump');
    this.group.position.set(x, 0.85, z);
  }

  remove() {
    this.scene.remove(this.group);
  }
}
