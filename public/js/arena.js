// =============================================
// DILI: CYBER BUMPERS — Shrinking Cyber Colosseum
// =============================================
class ArenaColosseum {
  constructor(scene) {
    this.scene = scene;
    this.rings = [];
    this.ringStages = [
      { id: 2, name: 'OUTER RING', radiusMin: 14.5, radiusMax: 21, collapseTime: 22, warningTime: 16, collapsed: false, warned: false, color: 0x00E5FF },
      { id: 1, name: 'MID RING',   radiusMin: 7.5,  radiusMax: 14.5, collapseTime: 46, warningTime: 39, collapsed: false, warned: false, color: 0x00FFC6 },
      { id: 0, name: 'CORE ARENA', radiusMin: 0,    radiusMax: 7.5,  collapseTime: Infinity, warningTime: Infinity, collapsed: false, warned: false, color: 0xFFD700 }
    ];

    this.currentRadius = 21;
    this.elapsedTime = 0;
    this.hazardLaser = null;
    this.powerUps = [];
    this.particles = [];
    this._dummy = new THREE.Object3D();

    this.onAlert = null; // callback for HUD warnings
    this.build();
  }

  build() {
    // Build the 3 concentric rings of the colosseum
    const hexRadius = 1.1;
    const hexGap = 0.12;
    const hexShape = new THREE.CylinderGeometry(hexRadius * 0.94, hexRadius * 0.94, 0.45, 6);

    this.ringStages.forEach(stage => {
      const positions = [];
      const w = (hexRadius + hexGap) * 2;
      const h = (hexRadius + hexGap) * Math.sqrt(3);
      const maxGrid = Math.ceil(stage.radiusMax / (w * 0.75));

      for (let q = -maxGrid; q <= maxGrid; q++) {
        for (let r = -maxGrid; r <= maxGrid; r++) {
          const x = w * 0.75 * q;
          const z = h * (r + q / 2);
          const dist = Math.sqrt(x * x + z * z);

          if (dist >= stage.radiusMin && dist <= stage.radiusMax) {
            positions.push({ x, z, origY: 0, dist });
          }
        }
      }

      const count = positions.length;
      const mat = new THREE.MeshStandardMaterial({
        color: stage.color,
        emissive: stage.color,
        emissiveIntensity: 0.35,
        metalness: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 0.92
      });

      const mesh = new THREE.InstancedMesh(hexShape, mat, count);
      const colors = new Float32Array(count * 3);
      const c = new THREE.Color(stage.color);

      positions.forEach((p, i) => {
        this._dummy.position.set(p.x, 0, p.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
        c.toArray(colors, i * 3);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      this.scene.add(mesh);

      stage.mesh = mesh;
      stage.positions = positions;
      stage.count = count;
      stage.dropping = false;
      stage.dropSpeed = 0;
      stage.states = positions.map(p => ({ x: p.x, z: p.z, y: 0, active: true }));

      this.rings.push(stage);
    });

    // Central Rotating Sweeper Hazard
    this._buildCenterHazard();

    // Spawning Initial Powerups
    this._spawnPowerUp('rocket', 0, 6);
    this._spawnPowerUp('shield', 6, 0);
    this._spawnPowerUp('mine', -6, 0);
    this._spawnPowerUp('crystal', 0, -6);
  }

  _buildCenterHazard() {
    this.hazardGroup = new THREE.Group();

    // Central Cyber Hub
    const hubGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.2, 12);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x111624,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x00E5FF,
      emissiveIntensity: 0.3
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.y = 0.6;
    this.hazardGroup.add(hub);

    // Glowing Core Orb
    const orbGeo = new THREE.SphereGeometry(0.45, 16, 12);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xFF3344,
      emissive: 0xFF3344,
      emissiveIntensity: 1.2,
      metalness: 0.2
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.4;
    this.hazardGroup.add(orb);

    // Twin Rotating Laser Sweepers
    const armGeo = new THREE.BoxGeometry(9.0, 0.2, 0.2);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xFF3344,
      emissive: 0xFF3344,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85
    });
    this.hazardLaser = new THREE.Mesh(armGeo, armMat);
    this.hazardLaser.position.y = 0.6;
    this.hazardGroup.add(this.hazardLaser);

    this.scene.add(this.hazardGroup);
  }

  update(dt) {
    this.elapsedTime += dt;

    // Rotate center laser sweeper
    if (this.hazardGroup) {
      this.hazardGroup.rotation.y += dt * 0.65;
    }

    // Check Ring Collapse Schedule
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();

    this.rings.forEach(stage => {
      if (stage.collapsed) return;

      // 1. Warning Phase (flashing crimson red alarm)
      if (this.elapsedTime >= stage.warningTime && this.elapsedTime < stage.collapseTime) {
        if (!stage.warned) {
          stage.warned = true;
          HexAudio.sfxAlarm();
          if (this.onAlert) {
            this.onAlert(`⚠️ ${stage.name} COLLAPSING IN 5s!`);
          }
        }

        // Strobe flash
        const flash = Math.sin((this.elapsedTime - stage.warningTime) * 18) > 0;
        const col = flash ? new THREE.Color(0xFF2233) : new THREE.Color(stage.color);

        for (let i = 0; i < stage.count; i++) {
          stage.mesh.instanceColor.setXYZ(i, col.r, col.g, col.b);
        }
        stage.mesh.instanceColor.needsUpdate = true;
      }

      // 2. Collapse Trigger Phase
      if (this.elapsedTime >= stage.collapseTime) {
        if (!stage.dropping) {
          stage.dropping = true;
          stage.warned = false;
          HexAudio.sfxCollapse();
          if (this.onAlert) {
            this.onAlert(`🚨 ${stage.name} HAS COLLAPSED!`);
          }
          this.currentRadius = stage.radiusMin; // shrink safe arena boundary!
        }

        // Drop the ring tiles into the void
        stage.dropSpeed += 22 * dt;
        let needsUpdate = false;

        stage.states.forEach((s, idx) => {
          if (!s.active) return;
          s.y -= stage.dropSpeed * dt;

          stage.mesh.getMatrixAt(idx, matrix);
          pos.setFromMatrixPosition(matrix);
          pos.y = s.y;

          const shrink = Math.max(0, 1 - (stage.dropSpeed * 0.02));
          this._dummy.position.copy(pos);
          this._dummy.rotation.x += dt * 2;
          this._dummy.rotation.z += dt * 1.5;
          this._dummy.scale.setScalar(shrink);
          this._dummy.updateMatrix();
          stage.mesh.setMatrixAt(idx, this._dummy.matrix);
          needsUpdate = true;

          if (s.y < -40 || shrink <= 0.05) {
            s.active = false;
            this._dummy.scale.setScalar(0);
            this._dummy.updateMatrix();
            stage.mesh.setMatrixAt(idx, this._dummy.matrix);
          }
        });

        if (needsUpdate) stage.mesh.instanceMatrix.needsUpdate = true;

        // Complete collapse
        if (stage.states.every(s => !s.active)) {
          stage.collapsed = true;
          this.scene.remove(stage.mesh);
        }
      }
    });

    // Update floating powerups
    const t = performance.now() * 0.003;
    this.powerUps.forEach(pu => {
      if (pu.collected) return;
      pu.mesh.position.y = pu.baseY + Math.sin(t * 3 + pu.x) * 0.22;
      pu.mesh.rotation.y += dt * 2.5;
      pu.mesh.rotation.x += dt * 1.2;
    });

    // Periodically spawn new powerups if count is low
    if (this.powerUps.filter(p => !p.collected).length < 3 && Math.random() < dt * 0.3) {
      const types = ['rocket', 'shield', 'mine', 'crystal'];
      const tp = types[Math.floor(Math.random() * types.length)];
      const maxR = Math.max(4, this.currentRadius - 2);
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * (maxR - 2);
      this._spawnPowerUp(tp, Math.cos(angle) * r, Math.sin(angle) * r);
    }
  }

  _spawnPowerUp(type, x, z) {
    const colors = {
      rocket:  0xFFD700,
      shield:  0x00E5FF,
      mine:    0xFF3366,
      crystal: 0x00FFC6
    };

    let geo;
    if (type === 'rocket') geo = new THREE.ConeGeometry(0.35, 0.75, 8);
    else if (type === 'shield') geo = new THREE.IcosahedronGeometry(0.42);
    else if (type === 'mine') geo = new THREE.DodecahedronGeometry(0.38);
    else geo = new THREE.OctahedronGeometry(0.35);

    const mat = new THREE.MeshStandardMaterial({
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 1.0,
      metalness: 0.7,
      roughness: 0.15
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.9, z);
    this.scene.add(mesh);

    this.powerUps.push({
      type, x, z, baseY: 0.9, mesh, collected: false
    });
  }

  checkPickups(character) {
    if (!character || !character.alive) return null;

    for (const pu of this.powerUps) {
      if (pu.collected) continue;
      const dx = pu.x - character.x;
      const dz = pu.z - character.z;
      if (dx * dx + dz * dz < 2.4) {
        pu.collected = true;
        this.scene.remove(pu.mesh);
        if (pu.mesh.geometry) pu.mesh.geometry.dispose();
        if (pu.mesh.material) pu.mesh.material.dispose();
        return pu.type;
      }
    }
    return null;
  }

  checkHazardCollision(character) {
    if (!character.alive || !this.hazardLaser) return false;

    // Laser arm is in hazardGroup with rotation
    const angle = this.hazardGroup.rotation.y;
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);

    // Transform character pos to laser local space
    const lx = character.x * cosA - character.z * sinA;
    const lz = character.x * sinA + character.z * cosA;

    // Laser spans x from -4.5 to +4.5, thickness z ~ 0.5
    if (Math.abs(lx) <= 4.6 && Math.abs(lz) <= 0.65 && character.y <= 1.2) {
      // Impact! Push character outward along radial vector
      const dist = Math.sqrt(character.x * character.x + character.z * character.z) || 1;
      const pushX = (character.x / dist) * 16;
      const pushZ = (character.z / dist) * 16;
      character.vx = pushX;
      character.vz = pushZ;
      HexAudio.sfxBump(1.4);
      return true;
    }
    return false;
  }

  isPointOnPlatform(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    return dist <= this.currentRadius;
  }

  reset() {
    this.rings.forEach(r => {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    });
    this.powerUps.forEach(p => {
      if (p.mesh.parent) this.scene.remove(p.mesh);
    });
    if (this.hazardGroup && this.hazardGroup.parent) {
      this.scene.remove(this.hazardGroup);
    }
    this.rings = [];
    this.powerUps = [];
    this.elapsedTime = 0;
    this.currentRadius = 21;
    this.ringStages.forEach(s => {
      s.collapsed = false;
      s.warned = false;
      s.dropping = false;
    });
    this.build();
  }
}
