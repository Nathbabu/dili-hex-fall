// =============================================
// DILI: CYBER BUMPERS - ADVANCED ARENA ARCHITECTURE
// 3 Truly Unique Battlegrounds:
// 1. NEON COLOSSEUM (Classic Space Cyber Grid, 4 Kinetic Jump Pads, 2-Blade Hydraulic Sweeper)
// 2. INFERNO FORGE (Molten Cross Crucible & 4 Bastions, 4 Open Lava Chasms, Quad-Hammer Magma Rotor, 4 Erupting Lava Geysers)
// 3. CRYO GLACIER (Natural Glacial Ice Floe Archipelago with Crevasse Gaps, Sub-Zero Ice Drift Physics, Central Cryo Frost Spire with 3 Rotating Freeze Rays)
// =============================================

const ARENA_THEMES = {
  neon: {
    id: 'neon',
    name: 'NEON COLOSSEUM',
    icon: '🏟️',
    badgeText: 'NEON COLOSSEUM',
    subtitle: 'Classic Space Battleground & Kinetic Jump Pads',
    outerColor: 0x00E5FF,
    midColor: 0x00FFC6,
    coreColor: 0xFFD700,
    megaColor: 0xBF00FF,
    floorEmissive: 0.35,
    pillarBaseColor: 0x0a101d,
    pillarColColor: 0x141c2c,
    pillarRingColor: 0x00FFC6,
    coreColorReactor: 0x00FFC6,
    sweeperBarColor: 0x0d1522,
    sweeperBladeColor: 0x00E5FF,
    sweeperTipColor: 0xFF0055,
    ambientColor: 0x384a6b,
    spotColor: 0x00E5FF,
    voidGridMain: 0x00E5FF,
    drag: 0.93,
    particleColor: 0x00FFC6
  },
  inferno: {
    id: 'inferno',
    name: 'INFERNO FORGE',
    icon: '🌋',
    badgeText: 'INFERNO FORGE',
    subtitle: 'Molten Cross Crucible, Quad-Crusher & Erupting Lava Geysers',
    outerColor: 0xFF2200,
    midColor: 0xFF5500,
    coreColor: 0xFFAA00,
    megaColor: 0x990022,
    floorEmissive: 0.48,
    pillarBaseColor: 0x1f0803,
    pillarColColor: 0x2b0d06,
    pillarRingColor: 0xFF3300,
    coreColorReactor: 0xFF4400,
    sweeperBarColor: 0x220904,
    sweeperBladeColor: 0xFF5500,
    sweeperTipColor: 0xFFFF00,
    ambientColor: 0x4a1808,
    spotColor: 0xFF3300,
    voidGridMain: 0xFF3300,
    drag: 0.925,
    particleColor: 0xFF5500
  },
  cryo: {
    id: 'cryo',
    name: 'CRYO GLACIER',
    icon: '❄️',
    badgeText: 'CRYO GLACIER',
    subtitle: 'Frozen Ice Floe Archipelago & Tri-Blade Frost Rotor',
    outerColor: 0x0088FF,
    midColor: 0x00E5FF,
    coreColor: 0xDCF8FF,
    megaColor: 0x7B68EE,
    floorEmissive: 0.40,
    pillarBaseColor: 0x071526,
    pillarColColor: 0x0c213a,
    pillarRingColor: 0x00F0FF,
    coreColorReactor: 0x88EEFF,
    sweeperBarColor: 0x091c30,
    sweeperBladeColor: 0x00D0FF,
    sweeperTipColor: 0xFFFFFF,
    ambientColor: 0x163450,
    spotColor: 0x00F0FF,
    voidGridMain: 0x00D0FF,
    drag: 0.982,       // High-speed slick glacial drift!
    baseSpeed: 15.6,   // FAST & EXHILARATING GLACIAL SPEED (+35%)
    accel: 52.0,       // Instant responsive throttle
    particleColor: 0x88EEFF
  }
};

class ArenaColosseum {
  constructor(scene, totalPlayers = 5, theme = 'neon') {
    this.scene = scene;
    this.rings = [];
    this.totalPlayers = totalPlayers;
    this.theme = (typeof theme === 'string' && ARENA_THEMES[theme]) ? theme : 'neon';
    this.themeConfig = ARENA_THEMES[this.theme];

    // Single Arena Deck Heights:
    this.deckY = 0;           // Hex floor deck at Y = 0
    this.upperFloorY = 0.85;  // Craft standing height on deck

    this._setupRingStages(totalPlayers);
    this.upperRadius = this.currentRadius;

    this.elapsedTime = 0;
    this.hazardLaser = null;
    this.powerUps = [];
    this.jumpPads = [];
    this.infernoGeysers = [];
    this.cryoFreezeRays = [];
    this.particles = [];
    this.ambientParticlePoints = null;
    this.ambientParticleData = [];

    this._dummy = new THREE.Object3D();
    this._reusableMatrix = new THREE.Matrix4();
    this._reusablePos = new THREE.Vector3();
    this._reusableAlertCol = new THREE.Color(0xFF0033);
    this._reusableStageCol = new THREE.Color();

    this.onAlert = null;
    this.build();
  }

  _setupRingStages(totalPlayers) {
    const cfg = this.themeConfig || ARENA_THEMES.neon;

    if (this.theme === 'inferno') {
      // INFERNO FORGE: Cruciform Crucible Stages
      this.ringStages = [
        { id: 2, name: 'OUTER BASTIONS', radiusMin: 14.5, radiusMax: 21.5, collapseTime: 24, warningTime: 18, collapsed: false, warned: false, color: cfg.outerColor },
        { id: 1, name: 'THERMAL BRIDGES', radiusMin: 8.5,  radiusMax: 14.5, collapseTime: 50, warningTime: 43, collapsed: false, warned: false, color: cfg.midColor },
        { id: 0, name: 'MOLTEN CRUCIBLE', radiusMin: 0,    radiusMax: 8.5,  collapseTime: Infinity, warningTime: Infinity, collapsed: false, warned: false, color: cfg.coreColor }
      ];
      this.currentRadius = 21.5;
    } else if (this.theme === 'cryo') {
      // CRYO GLACIER: Glacial Ice Floe Archipelago Stages
      this.ringStages = [
        { id: 2, name: 'OUTER ICE OUTPOSTS', radiusMin: 13.8, radiusMax: 21.0, collapseTime: 24, warningTime: 18, collapsed: false, warned: false, color: cfg.outerColor },
        { id: 1, name: 'MID ICE ISTHMUS',   radiusMin: 8.2,  radiusMax: 13.8, collapseTime: 50, warningTime: 43, collapsed: false, warned: false, color: cfg.midColor },
        { id: 0, name: 'GLACIAL SPIRE CORE', radiusMin: 0,    radiusMax: 8.2,  collapseTime: Infinity, warningTime: Infinity, collapsed: false, warned: false, color: cfg.coreColor }
      ];
      this.currentRadius = 21.0;
    } else {
      // NEON COLOSSEUM: Classic Concentric Rings
      if (totalPlayers > 10) {
        this.ringStages = [
          { id: 3, name: 'MEGA RING',  radiusMin: 21,   radiusMax: 28, collapseTime: 18, warningTime: 12, collapsed: false, warned: false, color: cfg.megaColor },
          { id: 2, name: 'OUTER RING', radiusMin: 14.5, radiusMax: 21, collapseTime: 34, warningTime: 28, collapsed: false, warned: false, color: cfg.outerColor },
          { id: 1, name: 'MID RING',   radiusMin: 7.5,  radiusMax: 14.5, collapseTime: 58, warningTime: 51, collapsed: false, warned: false, color: cfg.midColor },
          { id: 0, name: 'CORE ARENA', radiusMin: 0,    radiusMax: 7.5,  collapseTime: Infinity, warningTime: Infinity, collapsed: false, warned: false, color: cfg.coreColor }
        ];
        this.currentRadius = 28;
      } else {
        this.ringStages = [
          { id: 2, name: 'OUTER RING', radiusMin: 14.5, radiusMax: 21, collapseTime: 24, warningTime: 18, collapsed: false, warned: false, color: cfg.outerColor },
          { id: 1, name: 'MID RING',   radiusMin: 7.5,  radiusMax: 14.5, collapseTime: 50, warningTime: 43, collapsed: false, warned: false, color: cfg.midColor },
          { id: 0, name: 'CORE ARENA', radiusMin: 0,    radiusMax: 7.5,  collapseTime: Infinity, warningTime: Infinity, collapsed: false, warned: false, color: cfg.coreColor }
        ];
        this.currentRadius = 21;
      }
    }
  }

  // Exact grounded collision check for any position (x, z)
  isPointGrounded(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    return dist <= (this.currentRadius + 0.35);
  }

  build() {
    const hexRadius = 1.1;
    const hexGap = 0.12;
    const hexShape = new THREE.CylinderGeometry(hexRadius * 0.94, hexRadius * 0.94, 0.45, 6);

    const w = (hexRadius + hexGap) * 2;
    const h = (hexRadius + hexGap) * Math.sqrt(3);

    this.ringStages.forEach(stage => {
      const positions = [];
      const maxGrid = Math.ceil(stage.radiusMax / (w * 0.75));

      for (let q = -maxGrid; q <= maxGrid; q++) {
        for (let r = -maxGrid; r <= maxGrid; r++) {
          const x = w * 0.75 * q;
          const z = h * (r + q / 2);
          const dist = Math.sqrt(x * x + z * z);

          // Check if point belongs to this stage radius interval (Guaranteed 100% solid floor across all 3 arenas)
          if (dist >= stage.radiusMin && dist <= stage.radiusMax) {
            positions.push({ x, z, origY: 0, dist });
          }
        }
      }

      const count = positions.length;
      const mat = new THREE.MeshStandardMaterial({
        color: stage.color,
        emissive: stage.color,
        emissiveIntensity: (this.themeConfig ? this.themeConfig.floorEmissive : 0.35),
        metalness: (this.theme === 'cryo' ? 0.25 : (this.theme === 'inferno' ? 0.75 : 0.6)),
        roughness: (this.theme === 'cryo' ? 0.10 : 0.25),
        transparent: true,
        opacity: (this.theme === 'cryo' ? 0.95 : 0.92)
      });

      const mesh = new THREE.InstancedMesh(hexShape, mat, Math.max(1, count));
      const colors = new Float32Array(Math.max(1, count) * 3);
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

    // Central & Interactive Hazards according to theme:
    if (this.theme === 'cryo') {
      this._buildCryoSpireHazard();
      this._buildCryoBoostVents();
    } else if (this.theme === 'inferno') {
      this._buildInfernoForgeHazard();
      this._buildInfernoGeysers();
    } else {
      this._buildNeonCenterHazard();
      this._buildNeonJumpPads();
    }

    // Ambient floating particles (volcanic embers, arctic frost, cyber sparks)
    this._buildAmbientParticles();

    // Spawning Initial Tactical Power-Ups
    if (this.theme === 'inferno') {
      this._spawnPowerUp('rocket', 0, 11.5);
      this._spawnPowerUp('shield', 11.5, 0);
      this._spawnPowerUp('crystal', 0, -11.5);
      this._spawnPowerUp('hazard_slow', -11.5, 0);
      this._spawnPowerUp('hazard_jam', 0, 0);
    } else if (this.theme === 'cryo') {
      this._spawnPowerUp('rocket', 0, 6.2);
      this._spawnPowerUp('shield', 6.2, 0);
      this._spawnPowerUp('crystal', 0, -6.2);
      this._spawnPowerUp('hazard_slow', -6.2, 0);
      this._spawnPowerUp('hazard_jam', 4.5, 4.5);
    } else {
      this._spawnPowerUp('rocket', 0, 6.2);
      this._spawnPowerUp('shield', 6.2, 0);
      this._spawnPowerUp('crystal', 0, -6.2);
      this._spawnPowerUp('hazard_slow', -6.2, 0);
      this._spawnPowerUp('hazard_jam', 5.0, 5.0);
    }
  }

  // ============================================================
  // 1. NEON COLOSSEUM HAZARDS & JUMP PADS
  // ============================================================
  _buildNeonCenterHazard() {
    const cfg = ARENA_THEMES.neon;
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 1.08;

    const pylonGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.45, 20);
    const baseMat = new THREE.MeshStandardMaterial({
      color: cfg.pillarBaseColor, metalness: 0.85, roughness: 0.25, emissive: cfg.pillarRingColor, emissiveIntensity: 0.25
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.22;
    pylonGroup.add(baseMesh);

    const baseRingGeo = new THREE.TorusGeometry(1.85, 0.08, 10, 32);
    const baseRingMat = new THREE.MeshStandardMaterial({ color: cfg.pillarRingColor, emissive: cfg.pillarRingColor, emissiveIntensity: 1.8 });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.42;
    pylonGroup.add(baseRing);

    const colGeo = new THREE.CylinderGeometry(1.15, 1.35, 1.1, 16);
    const colMat = new THREE.MeshStandardMaterial({ color: cfg.pillarColColor, metalness: 0.9, roughness: 0.3 });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 0.9;
    pylonGroup.add(colMesh);

    const coreGeo = new THREE.SphereGeometry(0.72, 24, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: cfg.coreColorReactor, emissive: cfg.coreColorReactor, emissiveIntensity: 2.2, metalness: 0.1, roughness: 0.1 });
    this.reactorCore = new THREE.Mesh(coreGeo, coreMat);
    this.reactorCore.position.y = 1.55;
    pylonGroup.add(this.reactorCore);

    this.hazardPylonGroup = pylonGroup;
    this.scene.add(pylonGroup);

    // 2-Blade Sweeper Bar
    this.sweeperBar = new THREE.Group();
    this.sweeperBar.position.y = 0.55;

    const armGeo = new THREE.BoxGeometry(10.6, 0.38, 0.68);
    const armMat = new THREE.MeshStandardMaterial({ color: cfg.sweeperBarColor, metalness: 0.95, roughness: 0.15 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    this.sweeperBar.add(armMesh);

    const beamGeo = new THREE.BoxGeometry(10.4, 0.14, 0.08);
    const beamMat = new THREE.MeshBasicMaterial({ color: cfg.sweeperBladeColor, transparent: true, opacity: 0.95 });
    const beam1 = new THREE.Mesh(beamGeo, beamMat); beam1.position.set(0, 0, 0.36); this.sweeperBar.add(beam1);
    const beam2 = new THREE.Mesh(beamGeo, beamMat); beam2.position.set(0, 0, -0.36); this.sweeperBar.add(beam2);

    [-5.3, 5.3].forEach(endX => {
      const capGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.42, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: cfg.sweeperTipColor, emissive: cfg.sweeperTipColor, emissiveIntensity: 1.2 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(endX, 0, 0);
      this.sweeperBar.add(cap);
    });

    this.hazardLaser = armMesh;
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);
  }

  _buildNeonJumpPads() {
    this.jumpPads = [];
    const padPositions = [
      { x: 0, z: 10.5 },
      { x: 0, z: -10.5 },
      { x: 10.5, z: 0 },
      { x: -10.5, z: 0 }
    ];

    padPositions.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.08, p.z);

      const baseGeo = new THREE.CylinderGeometry(1.3, 1.45, 0.18, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x0a1526, metalness: 0.8, roughness: 0.2 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      group.add(base);

      const padRingGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 24);
      const padRingMat = new THREE.MeshBasicMaterial({ color: 0x00FFC6 });
      const padRing = new THREE.Mesh(padRingGeo, padRingMat);
      padRing.rotation.x = Math.PI / 2;
      group.add(padRing);

      const padCoreGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.22, 16);
      const padCoreMat = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00FFC6, emissiveIntensity: 1.6 });
      const padCore = new THREE.Mesh(padCoreGeo, padCoreMat);
      group.add(padCore);

      this.scene.add(group);
      this.jumpPads.push({ x: p.x, z: p.z, group, core: padCore });
    });
  }

  checkJumpPads(character) {
    if (!character || !character.alive || !character.grounded || !this.jumpPads.length) return null;
    for (const pad of this.jumpPads) {
      const dx = pad.x - character.x;
      const dz = pad.z - character.z;
      if (dx * dx + dz * dz < 2.2) {
        character.grounded = false;
        character.vy = 24.0;
        const angle = Math.atan2(-pad.x, -pad.z);
        character.vx = Math.sin(angle) * 11.5;
        character.vz = Math.cos(angle) * 11.5;
        character.knockbackTimer = 0.45;
        if (HexAudio && HexAudio.sfxJump) HexAudio.sfxJump();
        return pad;
      }
    }
    return null;
  }

  // ============================================================
  // 2. INFERNO FORGE: QUAD-CRUSHER & VOLCANIC LAVA GEYSERS
  // ============================================================
  _buildInfernoForgeHazard() {
    const cfg = ARENA_THEMES.inferno;
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 0.95; // Heavy industrial rotation

    const pylonGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(1.8, 2.3, 0.55, 20);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f0602, metalness: 0.9, roughness: 0.3, emissive: 0xFF2200, emissiveIntensity: 0.4 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.27;
    pylonGroup.add(baseMesh);

    const colGeo = new THREE.CylinderGeometry(1.3, 1.5, 1.2, 16);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x2e0c05, metalness: 0.95, roughness: 0.2 });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 1.0;
    pylonGroup.add(colMesh);

    const coreGeo = new THREE.SphereGeometry(0.85, 24, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xFFAA00, emissive: 0xFF4400, emissiveIntensity: 2.8, roughness: 0.1 });
    this.reactorCore = new THREE.Mesh(coreGeo, coreMat);
    this.reactorCore.position.y = 1.7;
    pylonGroup.add(this.reactorCore);

    this.hazardPylonGroup = pylonGroup;
    this.scene.add(pylonGroup);

    // Quad-Crusher Bar (Cross of 4 Blades!)
    this.sweeperBar = new THREE.Group();
    this.sweeperBar.position.y = 0.55;

    // Cross Arms 1 & 2
    [0, Math.PI / 2].forEach(angle => {
      const arm = new THREE.Group();
      arm.rotation.y = angle;

      const armGeo = new THREE.BoxGeometry(10.6, 0.42, 0.72);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x220904, metalness: 0.95, roughness: 0.2 });
      const armMesh = new THREE.Mesh(armGeo, armMat);
      arm.add(armMesh);

      const bladeGeo = new THREE.BoxGeometry(10.4, 0.16, 0.08);
      const bladeMat = new THREE.MeshBasicMaterial({ color: 0xFF5500, transparent: true, opacity: 0.95 });
      const b1 = new THREE.Mesh(bladeGeo, bladeMat); b1.position.set(0, 0, 0.38); arm.add(b1);
      const b2 = new THREE.Mesh(bladeGeo, bladeMat); b2.position.set(0, 0, -0.38); arm.add(b2);

      [-5.3, 5.3].forEach(ex => {
        const capGeo = new THREE.BoxGeometry(0.65, 0.55, 0.65);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xFFAA00, emissiveIntensity: 1.4 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(ex, 0, 0);
        arm.add(cap);
      });

      this.sweeperBar.add(arm);
    });

    this.hazardLaser = this.sweeperBar;
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);
  }

  _buildInfernoGeysers() {
    this.infernoGeysers = [];
    const geyserCoords = [
      { x: 0, z: 15.0 },
      { x: 0, z: -15.0 },
      { x: 15.0, z: 0 },
      { x: -15.0, z: 0 }
    ];

    geyserCoords.forEach((p, idx) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.05, p.z);

      // Basalt Caldera Crater Rim
      const rimGeo = new THREE.TorusGeometry(1.6, 0.35, 12, 24);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x220703, metalness: 0.8, roughness: 0.4 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      group.add(rim);

      // Bubbling Lava Core
      const lavaGeo = new THREE.CircleGeometry(1.5, 20);
      const lavaMat = new THREE.MeshStandardMaterial({ color: 0xFF3300, emissive: 0xFFAA00, emissiveIntensity: 1.8 });
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = 0.04;
      group.add(lava);

      // Erupting Flame Geyser Column (starts hidden/scaled to 0)
      const colGeo = new THREE.CylinderGeometry(1.2, 1.6, 9.0, 16);
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xFFAA00, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
      });
      const column = new THREE.Mesh(colGeo, colMat);
      column.position.y = 4.5;
      column.scale.set(0, 0, 0);
      group.add(column);

      this.scene.add(group);
      this.infernoGeysers.push({
        x: p.x,
        z: p.z,
        group,
        lava,
        column,
        state: 'idle', // 'idle' | 'warning' | 'erupting'
        timer: idx * 1.3 // Staggered start
      });
    });
  }

  _updateInfernoGeysers(dt, character) {
    if (!this.infernoGeysers.length) return;

    this.infernoGeysers.forEach(g => {
      g.timer += dt;
      const cycle = g.timer % 5.5;

      if (cycle < 2.8) {
        // Idle
        g.state = 'idle';
        g.column.scale.set(0, 0, 0);
        g.lava.material.emissiveIntensity = 1.2;
      } else if (cycle < 4.0) {
        // Warning (pulsing orange heat)
        g.state = 'warning';
        g.column.scale.set(0.15, 0.1, 0.15);
        g.lava.material.emissiveIntensity = 2.5 + Math.sin(cycle * 25) * 1.5;
      } else {
        // Active Eruption (blast!)
        g.state = 'erupting';
        const blastProgress = (cycle - 4.0) / 1.5;
        const scaleY = Math.sin(blastProgress * Math.PI);
        g.column.scale.set(1.0, scaleY, 1.0);
        g.column.rotation.y += dt * 4.0;
        g.lava.material.emissiveIntensity = 4.0;

        // Blast collision with character
        if (character && character.alive && character.grounded) {
          const dx = character.x - g.x;
          const dz = character.z - g.z;
          if (dx * dx + dz * dz < 7.5) {
            character.grounded = false;
            character.vy = 26.0;
            const dirX = dx || (Math.random() - 0.5);
            const dirZ = dz || (Math.random() - 0.5);
            const len = Math.hypot(dirX, dirZ) || 1;
            character.vx = (dirX / len) * 14.0;
            character.vz = (dirZ / len) * 14.0;
            character.knockbackTimer = 0.5;
            if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(1.8);
          }
        }
      }
    });
  }

  // ============================================================
  // 3. CRYO GLACIER: SUB-ZERO CRYO FROST SPIRE & TRI-BLADE ROTOR
  // ============================================================
  _buildCryoSpireHazard() {
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 1.25; // Dynamic, dangerous sweep velocity!

    const pylonGroup = new THREE.Group();

    // 1. Glacial Ice Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(2.2, 2.8, 0.7, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x071b30, metalness: 0.4, roughness: 0.1, emissive: 0x00D0FF, emissiveIntensity: 0.6, transparent: true, opacity: 0.95
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.35;
    pylonGroup.add(baseMesh);

    // 2. Towering 7.5-Meter Crystalline Ice Spire
    const spireGeo = new THREE.CylinderGeometry(0.65, 1.8, 7.5, 6);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x88EEFF, emissive: 0x00A0E0, emissiveIntensity: 1.8, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.92
    });
    this.cryoSpireMesh = new THREE.Mesh(spireGeo, spireMat);
    this.cryoSpireMesh.position.y = 4.1;
    pylonGroup.add(this.cryoSpireMesh);

    // 3. Floating Orbital Frost Rings
    const ring1Geo = new THREE.TorusGeometry(2.2, 0.07, 10, 32);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.85 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 1.6;
    pylonGroup.add(ring1);
    this.cryoOrbitalRing1 = ring1;

    const ring2Geo = new THREE.TorusGeometry(1.5, 0.05, 10, 24);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x88EEFF, transparent: true, opacity: 0.75 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 3.2;
    pylonGroup.add(ring2);
    this.cryoOrbitalRing2 = ring2;

    this.hazardPylonGroup = pylonGroup;
    this.scene.add(pylonGroup);

    // 4. TRI-BLADE GLACIAL ICE SWEEPER ROTOR (3 Massive 3D Crystalline Ice Blades at 120°)
    const bladeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    const rotorBar = new THREE.Group();
    rotorBar.position.y = 0.58;

    bladeAngles.forEach(bAngle => {
      const bladeSub = new THREE.Group();
      bladeSub.rotation.y = bAngle;

      // Heavy Crystalline Ice Bar
      const armGeo = new THREE.BoxGeometry(10.6, 0.44, 0.72);
      const armMat = new THREE.MeshStandardMaterial({
        color: 0x88EEFF, emissive: 0x00D0FF, emissiveIntensity: 0.85, metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.90
      });
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(5.3, 0, 0);
      bladeSub.add(armMesh);

      // Leading Razor Frost Edge (Glowing Cyan / White)
      const edgeGeo = new THREE.BoxGeometry(10.5, 0.14, 0.12);
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 });
      const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
      edgeMesh.position.set(5.3, 0, 0.38);
      bladeSub.add(edgeMesh);

      // Trailing Cyan Frost Edge
      const backEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.85 });
      const backEdgeMesh = new THREE.Mesh(edgeGeo, backEdgeMat);
      backEdgeMesh.position.set(5.3, 0, -0.38);
      bladeSub.add(backEdgeMesh);

      // Faceted Glacial Diamond Spike Cap at the Tip
      const capGeo = new THREE.OctahedronGeometry(0.68);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xDCF8FF, emissive: 0x00FFFF, emissiveIntensity: 2.2, metalness: 0.1, roughness: 0.05
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(10.6, 0, 0);
      bladeSub.add(cap);

      rotorBar.add(bladeSub);
    });

    this.hazardLaser = rotorBar;
    this.hazardGroup.add(rotorBar);
    this.scene.add(this.hazardGroup);
  }

  _buildCryoBoostVents() {
    this.cryoBoostVents = [];
    const ventPositions = [
      { x: 8.5, z: 8.5 },
      { x: -8.5, z: 8.5 },
      { x: 8.5, z: -8.5 },
      { x: -8.5, z: -8.5 }
    ];

    ventPositions.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.08, p.z);

      const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.16, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x082138, metalness: 0.8, roughness: 0.2 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      group.add(base);

      const ringGeo = new THREE.TorusGeometry(1.1, 0.06, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const coreGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.20, 16);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x88EEFF, emissive: 0x00E5FF, emissiveIntensity: 1.8 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      this.scene.add(group);
      this.cryoBoostVents.push({ x: p.x, z: p.z, group, core });
    });
  }

  checkCryoBoostVents(character) {
    if (!character || !character.alive || !character.grounded || !this.cryoBoostVents || !this.cryoBoostVents.length) return null;
    for (const vent of this.cryoBoostVents) {
      const dx = vent.x - character.x;
      const dz = vent.z - character.z;
      if (dx * dx + dz * dz < 2.2) {
        if (character.boostCooldown > 0) return null;
        character.boostCooldown = 0.8;
        const curSpd = Math.sqrt(character.vx * character.vx + character.vz * character.vz);
        const boostSpd = Math.min(26.0, Math.max(18.0, curSpd * 1.55));
        const heading = character.rotY || Math.atan2(character.vx, character.vz);
        character.vx = Math.sin(heading) * boostSpd;
        character.vz = Math.cos(heading) * boostSpd;
        character.squashX = 0.85; character.squashY = 1.35;
        if (HexAudio && HexAudio.sfxEmp) HexAudio.sfxEmp();
        if (typeof character.setEmotion === 'function') {
          character.setEmotion('celebrate', 1.0, 'GLACIAL SURGE! ⚡', '🚀');
        }
        return vent;
      }
    }
    return null;
  }

  // ============================================================
  // HAZARD COLLISION DISPATCHER
  // ============================================================
  checkHazardCollision(character) {
    if (!character || !character.alive || !character.grounded || !this.hazardGroup) return null;

    const craftRadius = character.radius || 1.10;
    const distCenter = Math.sqrt(character.x * character.x + character.z * character.z);

    // Central Pillar / Spire Solid Core Collision
    const pillarMinDist = this.theme === 'cryo' ? 2.1 : 1.75;
    if (distCenter < pillarMinDist) {
      const nx = distCenter > 0.001 ? (character.x / distCenter) : 1;
      const nz = distCenter > 0.001 ? (character.z / distCenter) : 0;
      character.x = nx * (pillarMinDist + 0.08);
      character.z = nz * (pillarMinDist + 0.08);
      if (character.group) character.group.position.set(character.x, character.y, character.z);
      character.vx = nx * 8.5;
      character.vz = nz * 8.5;
      character.knockbackTimer = 0.15;
      if (character.hazardHitCooldown <= 0) {
        character.hazardHitCooldown = 0.35;
        character.squashX = 1.35; character.squashY = 0.70;
        if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(1.6);
      }
      return { hit: true, x: character.x, z: character.z, type: 'pillar' };
    }

    // CRYO TRI-BLADE GLACIAL ROTOR: Massive Ice Bump Knockback!
    if (this.theme === 'cryo') {
      const bladeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
      const theta = this.hazardGroup.rotation.y;

      for (const bAngle of bladeAngles) {
        const rot = theta + bAngle;
        const cosA = Math.cos(rot);
        const sinA = Math.sin(rot);

        const lx = character.x * cosA - character.z * sinA;
        const lz = character.x * sinA + character.z * cosA;

        const W_half = 0.44;

        // Blade extends from x=1.6 to x=11.2 (centered at x=6.4), half-width 0.44
        const cx = Math.max(1.6, Math.min(11.2, lx));
        const cz = Math.max(-W_half, Math.min(W_half, lz));

        const dx = lx - cx;
        const dz = lz - cz;
        const distSq = dx * dx + dz * dz;

        if (distSq < (craftRadius * 0.95) * (craftRadius * 0.95) || (dx === 0 && dz === 0)) {
          let nx_loc = distSq > 0.0001 ? dx / Math.sqrt(distSq) : (lz >= 0 ? 1 : -1);
          let nz_loc = distSq > 0.0001 ? dz / Math.sqrt(distSq) : 0;

          const nx_world = nx_loc * cosA + nz_loc * sinA;
          const nz_world = -nx_loc * sinA + nz_loc * cosA;

          // Tangential angular sweep velocity
          const r_hit = Math.max(2.0, Math.min(11.2, lx));
          const armSpeed = r_hit * this.hazardAngularSpeed;
          const sweepVx = -sinA * armSpeed * 1.65;
          const sweepVz = -cosA * armSpeed * 1.65;

          // MASSIVE SATISFYING ICE BUMP KNOCKBACK!
          character.vx = sweepVx + nx_world * 17.5;
          character.vz = sweepVz + nz_world * 17.5;
          character.knockbackTimer = 0.38;

          if (character.hazardHitCooldown <= 0) {
            character.hazardHitCooldown = 0.40;
            character.squashX = 1.50; character.squashY = 0.60;
            if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(1.8);
            if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(2.0);
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('hit', 1.8, 'GLACIAL SMACK! ❄️', '🥶');
            }
          }
          return { hit: true, x: character.x, z: character.z, type: 'sweeper' };
        }
      }
      return null;
    }

    // INFERNO QUAD-CRUSHER (4 blades) or NEON SWEEPER (2 blades)
    const bladeAngles = (this.theme === 'inferno') ? [0, Math.PI / 2] : [0];
    const theta = this.hazardGroup.rotation.y;

    for (const bAngle of bladeAngles) {
      const rot = theta + bAngle;
      const cosA = Math.cos(rot);
      const sinA = Math.sin(rot);

      const lx = character.x * cosA - character.z * sinA;
      const lz = character.x * sinA + character.z * cosA;

      const L_half = 5.30;
      const W_half = 0.36;

      const cx = Math.max(-L_half, Math.min(L_half, lx));
      const cz = Math.max(-W_half, Math.min(W_half, lz));

      const dx = lx - cx;
      const dz = lz - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < (craftRadius * 0.95) * (craftRadius * 0.95) || (dx === 0 && dz === 0)) {
        let nx_loc = distSq > 0.0001 ? dx / Math.sqrt(distSq) : (lz >= 0 ? 1 : -1);
        let nz_loc = distSq > 0.0001 ? dz / Math.sqrt(distSq) : 0;

        const nx_world = nx_loc * cosA + nz_loc * sinA;
        const nz_world = -nx_loc * sinA + nz_loc * cosA;

        // Tangential angular sweep velocity
        const r_hit = Math.max(1.8, Math.min(L_half, Math.abs(lx)));
        const armSpeed = r_hit * this.hazardAngularSpeed;
        const sweepVx = -sinA * (lx >= 0 ? 1 : -1) * armSpeed * 1.5;
        const sweepVz = -cosA * (lx >= 0 ? 1 : -1) * armSpeed * 1.5;

        character.vx = sweepVx + nx_world * (this.theme === 'inferno' ? 16.0 : 13.5);
        character.vz = sweepVz + nz_world * (this.theme === 'inferno' ? 16.0 : 13.5);
        character.knockbackTimer = 0.35;

        if (character.hazardHitCooldown <= 0) {
          character.hazardHitCooldown = 0.40;
          character.squashX = 1.45; character.squashY = 0.65;
          if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(1.6);
        }
        return { hit: true, x: character.x, z: character.z, type: 'sweeper' };
      }
    }

    return null;
  }

  // ============================================================
  // AMBIENT PARTICLES (Embers, Snowflakes, Cyber Sparks)
  // ============================================================
  _buildAmbientParticles() {
    if (this.ambientParticlePoints && this.ambientParticlePoints.parent) {
      this.scene.remove(this.ambientParticlePoints);
      this.ambientParticlePoints.geometry.dispose();
      this.ambientParticlePoints.material.dispose();
      this.ambientParticlePoints = null;
    }

    const count = 50;
    const posArr = new Float32Array(count * 3);
    const colArr = new Float32Array(count * 3);
    this.ambientParticleData = [];

    const cfg = this.themeConfig || ARENA_THEMES.neon;
    const baseCol = new THREE.Color(cfg.particleColor);
    const rad = this.currentRadius || 21;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (rad + 3);
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.2) * 8;
      const z = Math.sin(angle) * r;

      posArr[i * 3] = x;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = z;
      baseCol.toArray(colArr, i * 3);

      this.ambientParticleData.push({
        speedY: (this.theme === 'inferno') ? (0.8 + Math.random() * 1.5) : (this.theme === 'cryo' ? (-0.5 - Math.random() * 0.9) : (0.2 + Math.random() * 0.4)),
        wobbleSpeed: 1.2 + Math.random() * 2.0,
        wobbleAmp: 0.2 + Math.random() * 0.3,
        wobbleOffset: Math.random() * Math.PI * 2,
        x,
        z
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

    const mat = new THREE.PointsMaterial({
      size: this.theme === 'inferno' ? 0.42 : (this.theme === 'cryo' ? 0.48 : 0.32),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticlePoints = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticlePoints);
  }

  _updateAmbientParticles(dt) {
    if (!this.ambientParticlePoints || !this.ambientParticleData) return;
    const positions = this.ambientParticlePoints.geometry.attributes.position.array;
    const len = this.ambientParticleData.length;

    for (let i = 0; i < len; i++) {
      const p = this.ambientParticleData[i];
      let y = positions[i * 3 + 1] + p.speedY * dt;

      if (this.theme === 'inferno' && y > 10.0) y = -2.0;
      else if (this.theme === 'cryo' && y < -2.0) y = 9.0;
      else if (y > 8.0) y = -1.0;

      positions[i * 3 + 1] = y;
      positions[i * 3] = p.x + Math.sin(this.elapsedTime * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp;
    }
    this.ambientParticlePoints.geometry.attributes.position.needsUpdate = true;
  }

  // ============================================================
  // POWER-UPS & PICKUPS
  // ============================================================
  _spawnPowerUp(type, x, z) {
    let mesh;
    if (type === 'rocket') mesh = this._buildRocketMesh();
    else if (type === 'shield') mesh = this._buildShieldMesh();
    else if (type === 'crystal') mesh = this._buildCrystalMesh();
    else if (type === 'hazard_slow') mesh = this._buildHazardSlowMesh();
    else if (type === 'hazard_jam') mesh = this._buildHazardJamMesh();

    mesh.position.set(x, 1.1, z);
    this.scene.add(mesh);

    this.powerUps.push({
      type,
      x,
      z,
      baseY: 1.1,
      mesh,
      collected: false
    });
  }

  _buildRocketMesh() {
    const group = new THREE.Group();
    const geo = new THREE.ConeGeometry(0.28, 0.72, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFFAA00, emissive: 0xFF5500, emissiveIntensity: 1.4, metalness: 0.8 });
    const cone = new THREE.Mesh(geo, mat);
    cone.rotation.x = Math.PI;
    group.add(cone);
    return group;
  }

  _buildShieldMesh() {
    const group = new THREE.Group();
    const geo = new THREE.TorusGeometry(0.42, 0.12, 8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00A0E0, emissiveIntensity: 1.5 });
    const ring = new THREE.Mesh(geo, mat);
    group.add(ring);
    return group;
  }

  _buildCrystalMesh() {
    const group = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.35);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00FFC6, emissive: 0x00E5FF, emissiveIntensity: 1.6 });
    const oct = new THREE.Mesh(geo, mat);
    group.add(oct);
    return group;
  }

  _buildHazardSlowMesh() {
    const group = new THREE.Group();
    const geo = new THREE.TetrahedronGeometry(0.40);
    const mat = new THREE.MeshStandardMaterial({ color: 0xBF00FF, emissive: 0x9900FF, emissiveIntensity: 1.8 });
    const tet = new THREE.Mesh(geo, mat);
    group.add(tet);
    return group;
  }

  _buildHazardJamMesh() {
    const group = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.38);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFF0033, emissive: 0xFF0033, emissiveIntensity: 2.0 });
    const ico = new THREE.Mesh(geo, mat);
    group.add(ico);
    return group;
  }

  checkPickups(character) {
    if (!character || !character.alive) return null;
    for (const pu of this.powerUps) {
      if (pu.collected) continue;
      const dx = pu.x - character.x;
      const dz = pu.z - character.z;
      if (dx * dx + dz * dz < 2.5) {
        pu.collected = true;
        pu.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        this.scene.remove(pu.mesh);
        return pu.type;
      }
    }
    return null;
  }

  // ============================================================
  // UPDATE LOOP (Ring collapse, hazards, particles)
  // ============================================================
  update(dt, playerCraft = null) {
    this.elapsedTime += dt;

    if (this.hazardGroup) {
      this.hazardGroup.rotation.y += dt * this.hazardAngularSpeed;
    }

    if (this.theme === 'inferno') {
      this._updateInfernoGeysers(dt, playerCraft);
    } else if (this.theme === 'neon' && playerCraft) {
      this.checkJumpPads(playerCraft);
    } else if (this.theme === 'cryo' && playerCraft) {
      this.checkCryoBoostVents(playerCraft);
    }

    if (this.theme === 'cryo') {
      if (this.cryoSpireMesh) this.cryoSpireMesh.rotation.y -= dt * 0.45;
      if (this.cryoOrbitalRing1) this.cryoOrbitalRing1.rotation.z += dt * 0.75;
      if (this.cryoOrbitalRing2) this.cryoOrbitalRing2.rotation.z -= dt * 0.60;
    }

    this._updateAmbientParticles(dt);

    const matrix = this._reusableMatrix;
    const pos = this._reusablePos;

    this.rings.forEach(stage => {
      if (stage.collapsed) return;

      // 1. Warning Phase: Pulsing Red Strobe Alarm
      if (this.elapsedTime >= stage.warningTime && this.elapsedTime < stage.collapseTime) {
        if (!stage.warned) {
          stage.warned = true;
          if (HexAudio && HexAudio.sfxAlarm) HexAudio.sfxAlarm();
          if (this.onAlert) {
            const secLeft = Math.max(1, Math.round(stage.collapseTime - this.elapsedTime));
            this.onAlert(`⚠️ ${stage.name} COLLAPSING IN ${secLeft}s! RETREAT TO CENTER!`);
          }
        }

        const flash = Math.sin((this.elapsedTime - stage.warningTime) * 16) > 0;
        const col = flash ? this._reusableAlertCol : this._reusableStageCol.setHex(stage.color);
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
          if (HexAudio && HexAudio.sfxCollapse) HexAudio.sfxCollapse();
          if (this.onAlert) {
            this.onAlert(`💥 ${stage.name} HAS COLLAPSED! RETREAT TO SAFE ZONE!`);
          }
          this.currentRadius = stage.radiusMin;
          this.upperRadius = this.currentRadius;
        }

        stage.dropSpeed += 24 * dt;
        let needsUpdate = false;

        stage.states.forEach((s, idx) => {
          if (!s.active) return;
          s.y -= stage.dropSpeed * dt;

          stage.mesh.getMatrixAt(idx, matrix);
          pos.setFromMatrixPosition(matrix);
          pos.y = s.y;

          const shrink = Math.max(0, 1 - (stage.dropSpeed * 0.02));
          this._dummy.position.copy(pos);
          this._dummy.rotation.x += dt * 2.2;
          this._dummy.rotation.z += dt * 1.6;
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

        if (stage.states.every(s => !s.active)) {
          stage.collapsed = true;
          this.scene.remove(stage.mesh);
        }
      }
    });

    // Animate Power-Ups
    const t = performance.now() * 0.003;
    this.powerUps.forEach(pu => {
      if (pu.mesh && !pu.collected) {
        pu.mesh.position.y = pu.baseY + Math.sin(t * 3 + pu.x) * 0.15;
        pu.mesh.rotation.y += dt * 2.0;
      }
    });
  }

  // ============================================================
  // CLEAN RESET
  // ============================================================
  reset() {
    this.rings.forEach(r => {
      if (r.mesh && r.mesh.parent) this.scene.remove(r.mesh);
      if (r.mesh && r.mesh.geometry) r.mesh.geometry.dispose();
      if (r.mesh && r.mesh.material) r.mesh.material.dispose();
    });

    this.powerUps.forEach(p => {
      if (p.mesh) {
        p.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        if (p.mesh.parent) this.scene.remove(p.mesh);
      }
    });

    if (this.jumpPads && this.jumpPads.length) {
      this.jumpPads.forEach(jp => {
        if (jp.group && jp.group.parent) this.scene.remove(jp.group);
      });
      this.jumpPads = [];
    }

    if (this.cryoBoostVents && this.cryoBoostVents.length) {
      this.cryoBoostVents.forEach(v => {
        if (v.group && v.group.parent) this.scene.remove(v.group);
      });
      this.cryoBoostVents = [];
    }

    if (this.infernoGeysers && this.infernoGeysers.length) {
      this.infernoGeysers.forEach(g => {
        if (g.group && g.group.parent) this.scene.remove(g.group);
      });
      this.infernoGeysers = [];
    }

    if (this.hazardGroup && this.hazardGroup.parent) {
      this.scene.remove(this.hazardGroup);
    }
    if (this.hazardPylonGroup && this.hazardPylonGroup.parent) {
      this.scene.remove(this.hazardPylonGroup);
    }

    if (this.ambientParticlePoints && this.ambientParticlePoints.parent) {
      this.scene.remove(this.ambientParticlePoints);
      this.ambientParticlePoints.geometry.dispose();
      this.ambientParticlePoints.material.dispose();
      this.ambientParticlePoints = null;
    }

    this.rings = [];
    this.powerUps = [];
    this.elapsedTime = 0;

    let newTotal = this.totalPlayers;
    let newTheme = null;
    if (arguments.length > 0 && typeof arguments[0] === 'number') newTotal = arguments[0];
    if (arguments.length > 1 && typeof arguments[1] === 'string') newTheme = arguments[1];
    else if (arguments.length === 1 && typeof arguments[0] === 'string') newTheme = arguments[0];

    if (newTheme && ARENA_THEMES[newTheme]) {
      this.theme = newTheme;
      this.themeConfig = ARENA_THEMES[newTheme];
    }

    this.totalPlayers = newTotal || this.totalPlayers;
    this._setupRingStages(this.totalPlayers);
    this.upperRadius = this.currentRadius;

    this.build();
  }
}


if (typeof window !== 'undefined') {
  window.ARENA_THEMES = ARENA_THEMES;
  window.ArenaColosseum = ArenaColosseum;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ARENA_THEMES = ARENA_THEMES;
  globalThis.ArenaColosseum = ArenaColosseum;
}

