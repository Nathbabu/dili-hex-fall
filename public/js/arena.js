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
    this.hazardAngularSpeed = 1.08; // ~1 full rotation every ~5.8s

    // 1. Central Stationary Hydraulic Pylon
    const pylonGroup = new THREE.Group();

    // Dark Carbon Base Pedestal (Diameter 3.6m, height 0.45m)
    const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.45, 20);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0xFF3300,
      emissiveIntensity: 0.25
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.22;
    pylonGroup.add(baseMesh);

    // Glowing Base Hazard Ring
    const baseRingGeo = new THREE.TorusGeometry(1.85, 0.08, 10, 32);
    const baseRingMat = new THREE.MeshStandardMaterial({
      color: 0xFF3300,
      emissive: 0xFF3300,
      emissiveIntensity: 1.8
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.42;
    pylonGroup.add(baseRing);

    // Hydraulic Heavy Column
    const colGeo = new THREE.CylinderGeometry(1.15, 1.35, 1.1, 16);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x141c2c,
      metalness: 0.9,
      roughness: 0.3
    });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 0.9;
    pylonGroup.add(colMesh);

    // Pulsing Plasma Reactor Core Dome
    const coreGeo = new THREE.SphereGeometry(0.72, 24, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xFF4400,
      emissive: 0xFF3300,
      emissiveIntensity: 2.2,
      metalness: 0.1,
      roughness: 0.1
    });
    this.reactorCore = new THREE.Mesh(coreGeo, coreMat);
    this.reactorCore.position.y = 1.55;
    pylonGroup.add(this.reactorCore);

    // Reactor Containment Cage
    const cageGeo = new THREE.TorusGeometry(0.85, 0.06, 8, 24);
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x050b14, metalness: 0.9, roughness: 0.2 });
    const cage1 = new THREE.Mesh(cageGeo, cageMat);
    cage1.rotation.x = Math.PI / 2;
    cage1.position.y = 1.55;
    pylonGroup.add(cage1);

    this.scene.add(pylonGroup);
    this.hazardPylonGroup = pylonGroup;

    // 2. The Heavy Rotating Dual Sweeper Bar (Mounted at exact Bumper Height y = 0.88!)
    // Total span: 10.6m (5.3m per side, thickness: 0.68m, height: 0.62m)
    this.sweeperBar = new THREE.Group();

    // Central Turret Collar Hub
    const turretGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.72, 18);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x121927,
      metalness: 0.95,
      roughness: 0.2
    });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.y = 0.88;
    this.sweeperBar.add(turretMesh);

    // Main Heavy Titanium Bumper Beam
    const beamGeo = new THREE.BoxGeometry(10.6, 0.60, 0.68);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x0e1522,
      metalness: 0.9,
      roughness: 0.28
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 0.88;
    this.sweeperBar.add(beamMesh);

    // Dual Forward & Rear Energy Impact Pads (Glowing neon hazard cushions!)
    for (let face of [-0.36, 0.36]) {
      const padGeo = new THREE.BoxGeometry(10.3, 0.36, 0.12);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0xFF3300,
        emissive: 0xFF3300,
        emissiveIntensity: 2.4,
        roughness: 0.2
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, 0.88, face);
      this.sweeperBar.add(pad);
    }

    // Heavy Reinforced Ram Tips (Both ends at x = -5.3 and x = +5.3)
    for (let side of [-5.3, 5.3]) {
      const ramCapGeo = new THREE.BoxGeometry(0.45, 0.72, 0.82);
      const ramCapMat = new THREE.MeshStandardMaterial({
        color: 0x1c2436,
        metalness: 0.95,
        roughness: 0.2
      });
      const ramCap = new THREE.Mesh(ramCapGeo, ramCapMat);
      ramCap.position.set(side, 0.88, 0);
      this.sweeperBar.add(ramCap);

      // Flashing Warning Beacon on tips
      const tipLightGeo = new THREE.SphereGeometry(0.20, 14, 10);
      const tipLightMat = new THREE.MeshStandardMaterial({
        color: 0xFFDD00,
        emissive: 0xFFCC00,
        emissiveIntensity: 2.8
      });
      const tipLight = new THREE.Mesh(tipLightGeo, tipLightMat);
      tipLight.position.set(side, 1.25, 0);
      this.sweeperBar.add(tipLight);
    }

    // Yellow Caution Accent Chevrons along top of beam
    for (let xPos of [-3.8, -2.4, -1.0, 1.0, 2.4, 3.8]) {
      const stripeGeo = new THREE.BoxGeometry(0.65, 0.03, 0.45);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(xPos, 1.19, 0);
      this.sweeperBar.add(stripe);
    }

    // Ground Laser Projection Line (Projected 0.95m ahead of the sweep on the hex floor)
    const lineGeo = new THREE.PlaneGeometry(10.6, 0.18);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xFF2200,
      transparent: true,
      opacity: 0.70,
      side: THREE.DoubleSide
    });
    this.groundLaser = new THREE.Mesh(lineGeo, lineMat);
    this.groundLaser.rotation.x = Math.PI / 2;
    this.groundLaser.position.set(0, 0.06, 0.95);
    this.sweeperBar.add(this.groundLaser);

    this.hazardLaser = beamMesh; // Reference for collision checks
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);
  }

  update(dt) {
    this.elapsedTime += dt;

    // Rotate center heavy cyber sweeper
    if (this.hazardGroup) {
      this.hazardGroup.rotation.y += dt * (this.hazardAngularSpeed || 1.08);
      if (this.reactorCore) {
        const pulse = 1.8 + Math.sin(this.elapsedTime * 6.0) * 0.6;
        this.reactorCore.material.emissiveIntensity = pulse;
      }
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
    if (!character.alive || !character.grounded || character.hazardHitCooldown > 0 || !this.hazardLaser) {
      return null;
    }

    const angle = this.hazardGroup.rotation.y;
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);

    // Transform character pos to sweeper local space
    const lx = character.x * cosA - character.z * sinA;
    const lz = character.x * sinA + character.z * cosA;

    // Arm length: 10.6m (half-span 5.3m). Thickness: 0.68m (half-thickness 0.34m).
    // Character radius is ~1.15. Total collision bounds in local space:
    const armHalfLength = 5.35;
    const armHalfThickness = 0.35 + (character.radius * 0.60); // ~1.04m

    if (Math.abs(lx) <= armHalfLength && Math.abs(lz) <= armHalfThickness && character.y <= 1.8) {
      const distFromCenter = Math.sqrt(character.x * character.x + character.z * character.z);

      // If right against the central hub (r < 1.3), push outward
      if (distFromCenter < 1.3) {
        const pushDirX = character.x / (distFromCenter || 1);
        const pushDirZ = character.z / (distFromCenter || 1);
        character.vx = pushDirX * 18.0;
        character.vz = pushDirZ * 18.0;
        character.hazardHitCooldown = 0.40;
        character.onImpact(1.8);
        return { x: character.x, z: character.z };
      }

      // ROTATIONAL KINETIC TANGENTIAL SMACK:
      // Rotation is counter-clockwise (positive around Y):
      // Tangent vector = (-z, x) / dist
      const rotSpeed = this.hazardAngularSpeed || 1.08;
      const tangentX = -character.z / distFromCenter;
      const tangentZ = character.x / distFromCenter;

      // Radial outward vector (centrifugal fling):
      const radialX = character.x / distFromCenter;
      const radialZ = character.z / distFromCenter;

      // Linear speed increases with radius from center (v = omega * r)
      const tipFactor = Math.min(1.0, distFromCenter / 5.35);
      const launchSpeed = 22.0 + (tipFactor * 10.0); // 22 to 32 m/s!

      // Launch direction: 78% tangential + 45% radial outward
      const smackVx = (tangentX * 0.78 + radialX * 0.45) * launchSpeed;
      const smackVz = (tangentZ * 0.78 + radialZ * 0.45) * launchSpeed;

      character.vx = smackVx;
      character.vz = smackVz;

      // Cooldown prevents getting multi-hit stuck in the bar
      character.hazardHitCooldown = 0.45;

      // Physical impact squash & hit reaction on character
      character.squashX = 1.55;
      character.squashY = 0.60;

      // Trigger reeling impact reaction with comic callout
      const smackLines = ['💥 SMACK!', '⚡ SLAMMED!', 'CLANG!', 'WHOAAA!'];
      const txt = smackLines[Math.floor(Math.random() * smackLines.length)];
      character.setEmotion('hit', 1.0, txt, '💥');

      if (HexAudio && HexAudio.sfxSweeperSmack) {
        HexAudio.sfxSweeperSmack();
      } else if (HexAudio && HexAudio.sfxBump) {
        HexAudio.sfxBump(2.2);
      }

      return {
        x: character.x,
        z: character.z,
        launchSpeed: launchSpeed
      };
    }
    return null;
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
    if (this.hazardPylonGroup && this.hazardPylonGroup.parent) {
      this.scene.remove(this.hazardPylonGroup);
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
