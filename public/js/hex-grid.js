// =============================================
// DILI: HEX-FALL — 4-Tier Instanced Hex Arena
// =============================================
class HexGrid {
  constructor(scene) {
    this.scene = scene;
    this.tiers = [];
    this.tierConfigs = [
      { y: 0,   radius: 8, color: new THREE.Color(0x00E5FF), label: 'ORBIT',    density: 1.0  },
      { y: -7,  radius: 7, color: new THREE.Color(0x00FFC6), label: 'VALIDATOR',density: 0.88 },
      { y: -14, radius: 6, color: new THREE.Color(0xFF6EC7), label: 'SYNAPSE',  density: 0.75 },
      { y: -21, radius: 5, color: new THREE.Color(0xFFD700), label: 'GENESIS',  density: 0.6  }
    ];
    this.hexSize = 1.05;
    this.hexGap = 0.12;
    this.powerUpPositions = [];
    this.crystalPositions = [];
    this.particles = [];
    this._dummy = new THREE.Object3D();
  }

  build() {
    const hexGeometry = new THREE.CylinderGeometry(
      this.hexSize * 0.94,
      this.hexSize * 0.94,
      0.35,
      6
    );

    this.tierConfigs.forEach((cfg, tierIdx) => {
      const positions = this._generateHexPositions(cfg.radius, cfg.density);
      const count = positions.length;

      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.35,
        metalness: 0.5,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.InstancedMesh(hexGeometry, mat, count);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const states = [];
      const colors = new Float32Array(count * 3);

      positions.forEach((pos, i) => {
        this._dummy.position.set(pos.x, cfg.y, pos.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);

        cfg.color.toArray(colors, i * 3);

        states.push({
          active: true,
          steppedOn: false,
          stepTimer: 0,
          fallSpeed: 0,
          warningTime: 0.65, // Seconds tile remains solid while flashing
          origY: cfg.y,
          x: pos.x,
          z: pos.z
        });
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

      this.scene.add(mesh);
      this.tiers.push({ mesh, positions, states, config: cfg, count });
    });

    this._spawnPowerUps();
    this._spawnCrystals();
  }

  _generateHexPositions(gridRadius, density) {
    const positions = [];
    const w = (this.hexSize + this.hexGap) * 2;
    const h = (this.hexSize + this.hexGap) * Math.sqrt(3);

    for (let q = -gridRadius; q <= gridRadius; q++) {
      for (let r = -gridRadius; r <= gridRadius; r++) {
        if (Math.abs(q + r) > gridRadius) continue;
        if (Math.random() > density) continue;

        const x = w * 0.75 * q;
        const z = h * (r + q / 2);
        positions.push({ x, z, col: q, row: r });
      }
    }
    return positions;
  }

  _spawnPowerUps() {
    this.powerUpPositions = [];
    const types = ['spring', 'glider', 'freeze'];

    this.tiers.forEach((tier, tierIdx) => {
      const numPowerUps = Math.max(1, Math.floor(tier.count * 0.035));
      for (let i = 0; i < numPowerUps; i++) {
        const idx = Math.floor(Math.random() * tier.count);
        if (!tier.states[idx].active) continue;

        const type = types[Math.floor(Math.random() * types.length)];
        const pos = tier.positions[idx];

        const colors = { spring: 0x00E5FF, glider: 0xFF6EC7, freeze: 0x4DA6FF };
        const geo = type === 'spring' ?
          new THREE.OctahedronGeometry(0.35) :
          type === 'glider' ?
            new THREE.TetrahedronGeometry(0.4) :
            new THREE.IcosahedronGeometry(0.3);

        const mat = new THREE.MeshStandardMaterial({
          color: colors[type],
          emissive: colors[type],
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.6
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, tier.config.y + 1.1, pos.z);
        this.scene.add(mesh);

        this.powerUpPositions.push({
          type, tierIdx, tileIdx: idx,
          mesh, collected: false,
          x: pos.x, z: pos.z, y: tier.config.y + 1.1
        });
      }
    });
  }

  _spawnCrystals() {
    this.crystalPositions = [];
    this.tiers.forEach((tier, tierIdx) => {
      const numCrystals = Math.max(2, Math.floor(tier.count * 0.06));
      for (let i = 0; i < numCrystals; i++) {
        const idx = Math.floor(Math.random() * tier.count);
        if (!tier.states[idx].active) continue;

        const pos = tier.positions[idx];
        const geo = new THREE.OctahedronGeometry(0.24);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xFFD700,
          emissive: 0xFFD700,
          emissiveIntensity: 1.0,
          metalness: 0.8,
          roughness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, tier.config.y + 0.8, pos.z);
        this.scene.add(mesh);

        this.crystalPositions.push({
          tierIdx, tileIdx: idx, mesh,
          collected: false,
          x: pos.x, z: pos.z, y: tier.config.y + 0.8
        });
      }
    });
  }

  stepOnTile(tierIdx, tileIdx) {
    const tier = this.tiers[tierIdx];
    if (!tier || tileIdx < 0 || tileIdx >= tier.count) return;
    const state = tier.states[tileIdx];
    if (!state.active || state.steppedOn) return;

    state.steppedOn = true;
    state.stepTimer = 0;

    // Warning flash color
    const crimson = new THREE.Color(0xFF2222);
    tier.mesh.instanceColor.setXYZ(tileIdx, crimson.r, crimson.g, crimson.b);
    tier.mesh.instanceColor.needsUpdate = true;
    HexAudio.sfxTileWarning();
  }

  // CRITICAL: A tile is solid if active AND either unstepped or still within warningTime!
  isTileSolid(tierIdx, tileIdx) {
    const tier = this.tiers[tierIdx];
    if (!tier || tileIdx < 0 || tileIdx >= tier.count) return false;
    const s = tier.states[tileIdx];
    return s.active && (!s.steppedOn || s.stepTimer < s.warningTime);
  }

  isTileActive(tierIdx, tileIdx) {
    return this.isTileSolid(tierIdx, tileIdx);
  }

  getTileAt(x, z, tierIdx) {
    const tier = this.tiers[tierIdx];
    if (!tier) return -1;

    let closest = -1;
    let closestDistSq = Infinity;
    const maxReachSq = (this.hexSize * 1.15) ** 2;

    for (let i = 0; i < tier.count; i++) {
      if (!tier.states[i].active) continue;
      const dx = tier.positions[i].x - x;
      const dz = tier.positions[i].z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < closestDistSq && distSq <= maxReachSq) {
        closestDistSq = distSq;
        closest = i;
      }
    }
    return closest;
  }

  update(dt) {
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();

    this.tiers.forEach((tier, tierIdx) => {
      let needsMatrixUpdate = false;
      let needsColorUpdate = false;

      tier.states.forEach((state, i) => {
        if (!state.active) return;

        if (state.steppedOn) {
          state.stepTimer += dt;

          if (state.stepTimer < state.warningTime) {
            // Rapid flashing warning
            const flash = Math.sin(state.stepTimer * 26) > 0;
            const c = flash ? new THREE.Color(0xFF2222) : tier.config.color;
            tier.mesh.instanceColor.setXYZ(i, c.r, c.g, c.b);
            needsColorUpdate = true;
          } else {
            // Drop tile down into void!
            if (state.fallSpeed === 0) {
              HexAudio.sfxTileDrop();
              this._spawnTileShardVFX(state.x, state.origY, state.z, tier.config.color);
            }

            state.fallSpeed += 18 * dt;
            tier.mesh.getMatrixAt(i, matrix);
            pos.setFromMatrixPosition(matrix);
            pos.y -= state.fallSpeed * dt;

            const shrink = Math.max(0, 1 - (state.stepTimer - state.warningTime) * 0.9);
            this._dummy.position.copy(pos);
            this._dummy.rotation.x += dt * 3;
            this._dummy.rotation.z += dt * 2;
            this._dummy.scale.setScalar(shrink);
            this._dummy.updateMatrix();
            tier.mesh.setMatrixAt(i, this._dummy.matrix);
            needsMatrixUpdate = true;

            if (pos.y < -45 || shrink <= 0.05) {
              state.active = false;
              this._dummy.scale.setScalar(0);
              this._dummy.updateMatrix();
              tier.mesh.setMatrixAt(i, this._dummy.matrix);
            }
          }
        }
      });

      if (needsMatrixUpdate) tier.mesh.instanceMatrix.needsUpdate = true;
      if (needsColorUpdate) tier.mesh.instanceColor.needsUpdate = true;
    });

    // Update floating Pickups
    const t = performance.now() * 0.002;
    this.powerUpPositions.forEach(pu => {
      if (pu.collected) return;
      pu.mesh.position.y = pu.y + Math.sin(t * 3 + pu.x) * 0.18;
      pu.mesh.rotation.y += dt * 2.2;
    });

    this.crystalPositions.forEach(cr => {
      if (cr.collected) return;
      cr.mesh.position.y = cr.y + Math.sin(t * 4 + cr.z) * 0.14;
      cr.mesh.rotation.y += dt * 3;
      cr.mesh.rotation.x += dt * 1.5;
    });

    // Update Shard Particles
    this._updateParticles(dt);
  }

  _spawnTileShardVFX(x, y, z, color) {
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = (i / 6) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.6
      });
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vy -= 9.8 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = p.life / 0.6;
      }
    }
  }

  getActiveTileCount(tierIdx) {
    const tier = this.tiers[tierIdx];
    if (!tier) return 0;
    return tier.states.filter(s => s.active && (!s.steppedOn || s.stepTimer < s.warningTime)).length;
  }

  getTierY(tierIdx) {
    return this.tierConfigs[tierIdx] ? this.tierConfigs[tierIdx].y : -999;
  }

  getTierLabel(tierIdx) {
    return this.tierConfigs[tierIdx] ? this.tierConfigs[tierIdx].label : 'VOID';
  }

  checkPowerUp(x, z, tierIdx) {
    for (const pu of this.powerUpPositions) {
      if (pu.collected || pu.tierIdx !== tierIdx) continue;
      const dx = pu.x - x;
      const dz = pu.z - z;
      if (dx * dx + dz * dz < 1.44) {
        pu.collected = true;
        this.scene.remove(pu.mesh);
        return pu.type;
      }
    }
    return null;
  }

  checkCrystal(x, z, tierIdx) {
    for (const cr of this.crystalPositions) {
      if (cr.collected || cr.tierIdx !== tierIdx) continue;
      const dx = cr.x - x;
      const dz = cr.z - z;
      if (dx * dx + dz * dz < 1.44) {
        cr.collected = true;
        this.scene.remove(cr.mesh);
        return true;
      }
    }
    return false;
  }

  reset() {
    this.tiers.forEach(tier => {
      this.scene.remove(tier.mesh);
      tier.mesh.geometry.dispose();
      tier.mesh.material.dispose();
    });
    this.powerUpPositions.forEach(pu => {
      if (pu.mesh.parent) this.scene.remove(pu.mesh);
    });
    this.crystalPositions.forEach(cr => {
      if (cr.mesh.parent) this.scene.remove(cr.mesh);
    });
    this.particles.forEach(p => {
      if (p.mesh.parent) this.scene.remove(p.mesh);
    });

    this.tiers = [];
    this.powerUpPositions = [];
    this.crystalPositions = [];
    this.particles = [];
    this.build();
  }
}
