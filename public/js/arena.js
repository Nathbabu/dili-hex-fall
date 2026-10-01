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
    baseSpeed: 13.0,
    accel: 48.0,
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
    baseSpeed: 13.0,
    accel: 48.0,
    particleColor: 0xFF5500
  },
  cryo: {
    id: 'cryo',
    name: 'CRYO GLACIER',
    icon: '❄️',
    badgeText: 'CRYO GLACIER',
    subtitle: 'Sub-Zero Glacial Ice Drifts, Crystal Spire & Tri-Blade Rotor',
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
    drag: 0.978, // High-speed glacial ice drift physics!
    baseSpeed: 15.0,
    accel: 54.0,
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

    // Theme-specific hazard tracking
    this.infernoGeysers = [];
    this.forgeTowers = [];
    this.lavaVeins = [];
    this.cryoBoostVents = [];
    this.cryoMonoliths = [];

    this._setupRingStages(totalPlayers);
    this.upperRadius = this.currentRadius;

    this.elapsedTime = 0;
    this.hazardLaser = null;
    this.powerUps = [];
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
    } else if (this.theme === 'inferno') {
      this._buildInfernoForgeHazard();
    } else {
      this._buildNeonCenterHazard();
    }

    // Ambient floating particles (volcanic embers, arctic frost, cyber sparks)
    this._buildAmbientParticles();

    // Spawning Initial Tactical Power-Ups
    if (this.theme === 'inferno') {
      this._spawnPowerUp('rocket', 0, 11.5);
      this._spawnPowerUp('shield', 11.5, 0);
      this._spawnPowerUp('crystal', 0, -11.5);
      this._spawnPowerUp('super_ram', 0, 8.5);
      this._spawnPowerUp('shield', -11.5, 0);
      this._spawnPowerUp('crystal', 4.5, -4.5);
    } else if (this.theme === 'cryo') {
      this._spawnPowerUp('rocket', 0, 6.2);
      this._spawnPowerUp('shield', 6.2, 0);
      this._spawnPowerUp('crystal', 0, -6.2);
      this._spawnPowerUp('super_ram', 0, 8.5);
      this._spawnPowerUp('shield', -6.2, 0);
      this._spawnPowerUp('crystal', 4.5, 4.5);
    } else {
      this._spawnPowerUp('rocket', 0, 6.2);
      this._spawnPowerUp('shield', 6.2, 0);
      this._spawnPowerUp('crystal', 0, -6.2);
      this._spawnPowerUp('super_ram', 0, 8.5);
      this._spawnPowerUp('shield', -6.2, 0);
      this._spawnPowerUp('crystal', 5.0, 5.0);
    }
  }

  // ============================================================
  // 1. NEON COLOSSEUM HAZARDS & JUMP PADS
  // ============================================================
  
  _createSweeperBar(themeCfg, defaultBladeColor, defaultTipColor) {
    const sweeper = new THREE.Group();

    // Central Turret Collar Hub
    const turretGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.72, 18);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x121927,
      metalness: 0.95,
      roughness: 0.2
    });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.y = 0.88;
    sweeper.add(turretMesh);

    // Main Heavy Bumper Beam (10.6m length, 0.60m height, 0.68m depth)
    const beamGeo = new THREE.BoxGeometry(10.6, 0.60, 0.68);
    const beamMat = new THREE.MeshStandardMaterial({
      color: themeCfg.sweeperBarColor || 0x0e1522,
      metalness: 0.9,
      roughness: 0.25
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 0.88;
    sweeper.add(beamMesh);

    // Dual Forward & Rear Energy Impact Pads (Glowing neon cushions)
    const bladeColor = themeCfg.sweeperBladeColor || defaultBladeColor;
    for (const face of [-0.36, 0.36]) {
      const padGeo = new THREE.BoxGeometry(10.3, 0.36, 0.12);
      const padMat = new THREE.MeshStandardMaterial({
        color: bladeColor,
        emissive: bladeColor,
        emissiveIntensity: 2.2,
        roughness: 0.2
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, 0.88, face);
      sweeper.add(pad);
    }

    // Reinforced Ram Tips on both ends (x = -5.3 and x = +5.3)
    const tipColor = themeCfg.sweeperTipColor || defaultTipColor;
    for (const side of [-5.3, 5.3]) {
      const ramCapGeo = new THREE.BoxGeometry(0.45, 0.72, 0.82);
      const ramCapMat = new THREE.MeshStandardMaterial({
        color: 0x1c2436,
        metalness: 0.95,
        roughness: 0.2
      });
      const ramCap = new THREE.Mesh(ramCapGeo, ramCapMat);
      ramCap.position.set(side, 0.88, 0);
      sweeper.add(ramCap);

      // Flashing Warning Beacon on tips
      const tipLightGeo = new THREE.SphereGeometry(0.20, 14, 10);
      const tipLightMat = new THREE.MeshStandardMaterial({
        color: tipColor,
        emissive: tipColor,
        emissiveIntensity: 2.8
      });
      const tipLight = new THREE.Mesh(tipLightGeo, tipLightMat);
      tipLight.position.set(side, 1.25, 0);
      sweeper.add(tipLight);
    }

    // Caution Accent Chevrons along top of beam
    for (const xPos of [-3.8, -2.4, -1.0, 1.0, 2.4, 3.8]) {
      const stripeGeo = new THREE.BoxGeometry(0.65, 0.03, 0.45);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(xPos, 1.19, 0);
      sweeper.add(stripe);
    }

    // Ground Laser Projection Line
    const lineGeo = new THREE.PlaneGeometry(10.6, 0.18);
    const lineMat = new THREE.MeshBasicMaterial({
      color: bladeColor,
      transparent: true,
      opacity: 0.70,
      side: THREE.DoubleSide
    });
    const groundLaser = new THREE.Mesh(lineGeo, lineMat);
    groundLaser.rotation.x = Math.PI / 2;
    groundLaser.position.set(0, 0.06, 0.95);
    sweeper.add(groundLaser);

    return { sweeper, beamMesh };
  }

  _buildNeonCenterHazard() {
    const cfg = ARENA_THEMES.neon;
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 1.08;
    this.hazardType = 'bar';
    this.hazardBladeAngles = [0];
    this.hazardHalfLength = 5.30;
    this.hazardHalfWidth = 0.34;

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

    // Rotating Dual Heavy Bumper Bar (Mounted at exact Bumper Height y = 0.88!)
    const { sweeper, beamMesh } = this._createSweeperBar(cfg, 0x00FFC6, 0xFFDD00);
    this.sweeperBar = sweeper;
    this.hazardLaser = beamMesh;
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);
  }

  // ============================================================
  // 2. INFERNO FORGE: QUAD-CRUSHER MAGMA CROSS & VOLCANIC CALDERAS
  // ============================================================
  _buildInfernoForgeHazard() {
    const cfg = ARENA_THEMES.inferno;
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 0.95; // Heavy industrial rotation
    this.hazardType = 'cross';
    this.hazardBladeAngles = [0, Math.PI / 2];
    this.hazardHalfLength = 5.30;
    this.hazardHalfWidth = 0.38;

    // Central Heavy Forged Crucible Pylon
    const pylonGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(1.9, 2.4, 0.55, 20);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f0602, metalness: 0.9, roughness: 0.3, emissive: 0xFF2200, emissiveIntensity: 0.45 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.27;
    pylonGroup.add(baseMesh);

    const colGeo = new THREE.CylinderGeometry(1.35, 1.55, 1.2, 16);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x2e0c05, metalness: 0.95, roughness: 0.2 });
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.y = 1.0;
    pylonGroup.add(colMesh);

    // Molten Lava Reactor Core
    const coreGeo = new THREE.SphereGeometry(0.85, 24, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xFFAA00, emissive: 0xFF4400, emissiveIntensity: 2.8, roughness: 0.1 });
    this.reactorCore = new THREE.Mesh(coreGeo, coreMat);
    this.reactorCore.position.y = 1.7;
    pylonGroup.add(this.reactorCore);

    this.hazardPylonGroup = pylonGroup;
    this.scene.add(pylonGroup);

    // Build Quad-Crusher Magma Cross (2 Crossed 10.6m Industrial Beams at 90°)
    const crossSweeper = new THREE.Group();

    // Central Heavy Iron Hub Collar
    const hubGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.76, 20);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x150502, metalness: 0.95, roughness: 0.2 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.position.y = 0.88;
    crossSweeper.add(hubMesh);

    // Build the 2 crossed beams (angle = 0 and angle = Math.PI / 2)
    for (const angle of [0, Math.PI / 2]) {
      const beamGroup = new THREE.Group();
      beamGroup.rotation.y = angle;

      // Dark Scorched Cast Iron Girder
      const beamGeo = new THREE.BoxGeometry(10.6, 0.62, 0.72);
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0x1a0603,
        metalness: 0.92,
        roughness: 0.28
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = 0.88;
      beamGroup.add(beamMesh);

      // Molten Orange Magma Channels on Front & Back faces
      for (const face of [-0.38, 0.38]) {
        const magmaPadGeo = new THREE.BoxGeometry(10.2, 0.36, 0.12);
        const magmaPadMat = new THREE.MeshStandardMaterial({
          color: 0xFF5500,
          emissive: 0xFF3300,
          emissiveIntensity: 2.6,
          roughness: 0.15
        });
        const pad = new THREE.Mesh(magmaPadGeo, magmaPadMat);
        pad.position.set(0, 0.88, face);
        beamGroup.add(pad);
      }

      // Heavy Industrial Crusher Hammer Head Caps at extremities
      for (const side of [-5.3, 5.3]) {
        const hammerGeo = new THREE.BoxGeometry(0.85, 0.78, 1.05);
        const hammerMat = new THREE.MeshStandardMaterial({
          color: 0x2b0d06,
          metalness: 0.95,
          roughness: 0.25
        });
        const hammer = new THREE.Mesh(hammerGeo, hammerMat);
        hammer.position.set(side, 0.88, 0);
        beamGroup.add(hammer);

        // Intense Molten Warning Beacons on tip
        const beaconGeo = new THREE.SphereGeometry(0.22, 14, 10);
        const beaconMat = new THREE.MeshStandardMaterial({
          color: 0xFFFF00,
          emissive: 0xFF5500,
          emissiveIntensity: 3.2
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(side, 1.32, 0);
        beamGroup.add(beacon);
      }

      // Yellow/Black Hazard Stripes on top
      for (const xPos of [-3.8, -2.4, -1.0, 1.0, 2.4, 3.8]) {
        const stripeGeo = new THREE.BoxGeometry(0.65, 0.03, 0.48);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(xPos, 1.20, 0);
        beamGroup.add(stripe);
      }

      // Ground Heat Projection Line
      const heatLineGeo = new THREE.PlaneGeometry(10.6, 0.22);
      const heatLineMat = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const heatLine = new THREE.Mesh(heatLineGeo, heatLineMat);
      heatLine.rotation.x = Math.PI / 2;
      heatLine.position.set(0, 0.06, 0.95);
      beamGroup.add(heatLine);

      crossSweeper.add(beamGroup);
    }

    this.sweeperBar = crossSweeper;
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);

    // Build Unique Inferno Forge Architecture:
    this._buildInfernoLavaVeins();
    this._buildInfernoGeysers();
    this._buildInfernoForgeTowers();
  }

  // ------------------------------------------------------------
  // INFERNO FORGE: MOLTEN MAGMA SURFACE VEINS
  // ------------------------------------------------------------
  _buildInfernoLavaVeins() {
    this.lavaVeins = [];
    // 4 radiating molten lava rivers along cardinal axes (+X, -X, +Z, -Z)
    const veinConfigs = [
      { x: 7.8, z: 0, rotY: 0, len: 11.0 },
      { x: -7.8, z: 0, rotY: 0, len: 11.0 },
      { x: 0, z: 7.8, rotY: Math.PI / 2, len: 11.0 },
      { x: 0, z: -7.8, rotY: Math.PI / 2, len: 11.0 }
    ];

    veinConfigs.forEach(vc => {
      const veinGroup = new THREE.Group();
      veinGroup.position.set(vc.x, 0.04, vc.z);
      veinGroup.rotation.y = vc.rotY;

      // Dark basalt trench border
      const trenchGeo = new THREE.PlaneGeometry(vc.len, 1.25);
      const trenchMat = new THREE.MeshStandardMaterial({ color: 0x120401, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide });
      const trench = new THREE.Mesh(trenchGeo, trenchMat);
      trench.rotation.x = Math.PI / 2;
      veinGroup.add(trench);

      // Glowing molten lava river stream
      const lavaStreamGeo = new THREE.PlaneGeometry(vc.len, 0.72);
      const lavaStreamMat = new THREE.MeshStandardMaterial({
        color: 0xFF4400,
        emissive: 0xFF2200,
        emissiveIntensity: 2.4,
        roughness: 0.15,
        side: THREE.DoubleSide
      });
      const stream = new THREE.Mesh(lavaStreamGeo, lavaStreamMat);
      stream.rotation.x = Math.PI / 2;
      stream.position.y = 0.01;
      veinGroup.add(stream);

      this.scene.add(veinGroup);
      this.lavaVeins.push({ group: veinGroup, material: lavaStreamMat });
    });
  }

  // ------------------------------------------------------------
  // INFERNO FORGE: 4 ERUPTING VOLCANIC LAVA GEYSERS (CALDERAS)
  // ------------------------------------------------------------
  _buildInfernoGeysers() {
    this.infernoGeysers = [];
    // 4 cardinal calderas on the outer bastion boundary
    const geyserCoords = [
      { x: 0, z: 14.2 },   // North
      { x: 14.2, z: 0 },   // East
      { x: 0, z: -14.2 },  // South
      { x: -14.2, z: 0 }   // West
    ];

    geyserCoords.forEach((p, idx) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.05, p.z);

      // Heavy Volcanic Basalt Crater Rim
      const rimGeo = new THREE.TorusGeometry(1.75, 0.38, 12, 24);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x1a0502,
        metalness: 0.92,
        roughness: 0.35,
        emissive: 0x550a00,
        emissiveIntensity: 0.5
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.15;
      group.add(rim);

      // Bubbling Molten Lava Core
      const lavaGeo = new THREE.CircleGeometry(1.60, 24);
      const lavaMat = new THREE.MeshStandardMaterial({
        color: 0xFF3300,
        emissive: 0xFFAA00,
        emissiveIntensity: 2.0,
        roughness: 0.15
      });
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = 0.08;
      group.add(lava);

      // Warning Strobe Beacon Ring around caldera
      const beaconRingGeo = new THREE.TorusGeometry(1.95, 0.06, 8, 24);
      const beaconRingMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0.9 });
      const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
      beaconRing.rotation.x = Math.PI / 2;
      beaconRing.position.y = 0.18;
      group.add(beaconRing);

      // Towering Molten Fire Eruption Column (Outer Heat Flame)
      const colGeo = new THREE.CylinderGeometry(1.3, 1.85, 9.2, 16, 1, true);
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const column = new THREE.Mesh(colGeo, colMat);
      column.position.y = 4.6;
      column.scale.set(0, 0, 0); // Initially dormant
      group.add(column);

      // Inner Core Flame Vortex (intense red-orange heart)
      const innerColGeo = new THREE.CylinderGeometry(0.75, 1.1, 9.5, 12, 1, true);
      const innerColMat = new THREE.MeshBasicMaterial({
        color: 0xFF2200,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const innerCol = new THREE.Mesh(innerColGeo, innerColMat);
      innerCol.position.y = 4.75;
      innerCol.scale.set(0, 0, 0);
      group.add(innerCol);

      this.scene.add(group);
      this.infernoGeysers.push({
        x: p.x,
        z: p.z,
        group,
        lava,
        column,
        innerCol,
        beaconRing,
        state: 'idle',
        timer: idx * 1.4 // Staggered clockwise volcanic rhythm (every 1.4s one erupts!)
      });
    });
  }

  // ------------------------------------------------------------
  // INFERNO FORGE: 4 INDUSTRIAL MAGMA SIPHON TOWERS
  // ------------------------------------------------------------
  _buildInfernoForgeTowers() {
    this.forgeTowers = [];
    // 4 Bastion Towers at diagonal bastions (+-12.5, +-12.5)
    const towerCoords = [
      { x: -12.5, z: -12.5 },
      { x: 12.5, z: -12.5 },
      { x: -12.5, z: 12.5 },
      { x: 12.5, z: 12.5 }
    ];

    towerCoords.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);

      // Heavy Scorched Iron Base Pedestal
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.6, 8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x160502, metalness: 0.95, roughness: 0.25 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.3;
      group.add(base);

      // Cast Iron Smelting Lattice Column (Height 3.6m)
      const colGeo = new THREE.CylinderGeometry(0.9, 1.25, 3.6, 8);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x240904,
        metalness: 0.92,
        roughness: 0.3,
        emissive: 0x440800,
        emissiveIntensity: 0.4
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 2.1;
      group.add(col);

      // Molten Smelting Cauldron on Summit
      const cauldronGeo = new THREE.CylinderGeometry(1.45, 1.05, 1.1, 8);
      const cauldronMat = new THREE.MeshStandardMaterial({ color: 0x1a0502, metalness: 0.95, roughness: 0.2 });
      const cauldron = new THREE.Mesh(cauldronGeo, cauldronMat);
      cauldron.position.y = 4.2;
      group.add(cauldron);

      // Boiling Magma Slag Overflow in Cauldron
      const slagGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.15, 16);
      const slagMat = new THREE.MeshStandardMaterial({
        color: 0xFFAA00,
        emissive: 0xFF4400,
        emissiveIntensity: 2.8,
        roughness: 0.1
      });
      const slag = new THREE.Mesh(slagGeo, slagMat);
      slag.position.y = 4.75;
      group.add(slag);

      // Strobe Warning Beacon on Top
      const beaconGeo = new THREE.SphereGeometry(0.24, 14, 10);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xFFFF00,
        emissive: 0xFF5500,
        emissiveIntensity: 3.5
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 5.1;
      group.add(beacon);

      this.scene.add(group);
      this.forgeTowers.push({
        x: p.x,
        z: p.z,
        radius: 1.45, // Solid physical collision radius
        group,
        slag,
        beacon
      });
    });
  }

  // ------------------------------------------------------------
  // INFERNO FORGE: GEYSER LOGIC & EXPLOSIVE VOLCANIC BLAST
  // ------------------------------------------------------------
  _updateInfernoGeysers(dt, allCrafts = []) {
    if (!this.infernoGeysers || !this.infernoGeysers.length) return;

    const crafts = Array.isArray(allCrafts) ? allCrafts : (allCrafts ? [allCrafts] : []);

    this.infernoGeysers.forEach(g => {
      g.timer += dt;
      const cycle = g.timer % 5.6;

      if (cycle < 3.0) {
        // 1. Idle Phase: Boiling magma pool
        g.state = 'idle';
        g.column.scale.set(0, 0, 0);
        g.innerCol.scale.set(0, 0, 0);
        g.lava.material.emissiveIntensity = 1.6 + Math.sin(g.timer * 3.0) * 0.4;
        if (g.beaconRing.material) g.beaconRing.material.opacity = 0.4;
      } else if (cycle < 4.2) {
        // 2. Warning Phase: Violent boiling & flashing alert
        g.state = 'warning';
        const warnProg = (cycle - 3.0) / 1.2;
        g.lava.material.emissiveIntensity = 3.2 + Math.sin(cycle * 32) * 1.8;
        if (g.beaconRing.material) g.beaconRing.material.opacity = 0.5 + Math.sin(cycle * 24) * 0.5;

        // Flame column begins spitting embers
        const sputter = 0.15 + warnProg * 0.15;
        g.column.scale.set(sputter, sputter * 0.4, sputter);
        g.innerCol.scale.set(sputter * 0.8, sputter * 0.35, sputter * 0.8);
      } else {
        // 3. Cataclysmic Fire Eruption Phase (1.4s of soaring flame!)
        g.state = 'erupting';
        const blastProg = (cycle - 4.2) / 1.4;
        const scaleY = Math.sin(blastProg * Math.PI);

        g.column.scale.set(1.0, scaleY, 1.0);
        g.column.rotation.y += dt * 4.8;
        g.innerCol.scale.set(1.0, scaleY * 1.05, 1.0);
        g.innerCol.rotation.y -= dt * 6.2;
        g.lava.material.emissiveIntensity = 4.8;

        // Interactive Volcanic Launch Physics on ANY craft within 2.8m!
        crafts.forEach(character => {
          if (!character || !character.alive || !character.grounded) return;
          const dx = character.x - g.x;
          const dz = character.z - g.z;
          const distSq = dx * dx + dz * dz;

          if (distSq < 7.8) {
            // Erupt craft high into the sky!
            character.grounded = false;
            character.vy = 24.0;
            const dist = Math.sqrt(distSq) || 1;
            const dirX = (distSq > 0.01) ? (dx / dist) : (Math.random() - 0.5);
            const dirZ = (distSq > 0.01) ? (dz / dist) : (Math.random() - 0.5);
            const len = Math.hypot(dirX, dirZ) || 1;
            character.vx = (dirX / len) * 15.0;
            character.vz = (dirZ / len) * 15.0;
            character.knockbackTimer = 0.45;
            character.squashX = 1.60;
            character.squashY = 0.55;
            character.wobbleAngle = (Math.random() - 0.5) * 0.70;

            if (character.onImpact) character.onImpact(2.5);
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('shock', 1.2, 'VOLCANO BLAST! 🔥', '🔥');
            }
            if (HexAudio && HexAudio.sfxJumpPad) HexAudio.sfxJumpPad();
            else if (HexAudio && HexAudio.sfxHeavyCrash) HexAudio.sfxHeavyCrash(2.0);
          }
        });
      }
    });
  }

  // ============================================================
  // 3. CRYO GLACIER: SUB-ZERO CRYO FROST SPIRE & TRI-BLADE ROTOR
  // ============================================================
  _buildCryoSpireHazard() {
    this.hazardGroup = new THREE.Group();
    this.hazardAngularSpeed = 1.25; // Dynamic, dangerous sweep velocity!
    this.hazardType = 'tri';
    this.hazardBladeAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    this.hazardArmLength = 5.30;
    this.hazardHalfWidth = 0.34;

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

    // 4. Tri-Blade Glacial Ice Sweeper (3 Radial Crystalline Blades at 120°)
    const triSweeper = new THREE.Group();

    // Central Frosted Ice Turret Hub
    const hubGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.72, 12);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x071b30,
      metalness: 0.4,
      roughness: 0.1,
      emissive: 0x00D0FF,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.92
    });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.position.y = 0.88;
    triSweeper.add(hubMesh);

    // 3 Frosted Crystal Arms radiating outward at 120°
    this.hazardBladeAngles.forEach(phi => {
      const armGroup = new THREE.Group();
      armGroup.rotation.y = phi;

      // Crystalline Ice Beam body (extends from x = 0 to x = 5.3m)
      const armGeo = new THREE.BoxGeometry(5.30, 0.58, 0.64);
      const armMat = new THREE.MeshStandardMaterial({
        color: 0x88EEFF,
        emissive: 0x00D0FF,
        emissiveIntensity: 1.6,
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.90
      });
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(2.65, 0.88, 0);
      armGroup.add(armMesh);

      // Cyan Cryogenic Freeze Rail on both sides
      for (const face of [-0.34, 0.34]) {
        const railGeo = new THREE.BoxGeometry(5.1, 0.32, 0.08);
        const railMat = new THREE.MeshStandardMaterial({
          color: 0x00F0FF,
          emissive: 0x00F0FF,
          emissiveIntensity: 2.4,
          roughness: 0.1
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(2.65, 0.88, face);
        armGroup.add(rail);
      }

      // Diamond-Faceted Crystalline Spike Tip at outer extremity (x = 5.3m)
      const spikeGeo = new THREE.ConeGeometry(0.55, 1.2, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0xDCF8FF,
        emissive: 0x00E5FF,
        emissiveIntensity: 2.6,
        metalness: 0.2,
        roughness: 0.05,
        transparent: true,
        opacity: 0.95
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.rotation.z = -Math.PI / 2; // Pointing outward along arm X
      spike.position.set(5.30, 0.88, 0);
      armGroup.add(spike);

      // Brilliant White Frost Warning Flare Beacon on tip
      const flareGeo = new THREE.SphereGeometry(0.22, 14, 10);
      const flareMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 3.5
      });
      const flare = new THREE.Mesh(flareGeo, flareMat);
      flare.position.set(5.30, 1.25, 0);
      armGroup.add(flare);

      // Radial Ground Frost Guide Line
      const frostLineGeo = new THREE.PlaneGeometry(5.30, 0.18);
      const frostLineMat = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        transparent: true,
        opacity: 0.70,
        side: THREE.DoubleSide
      });
      const frostLine = new THREE.Mesh(frostLineGeo, frostLineMat);
      frostLine.rotation.x = Math.PI / 2;
      frostLine.position.set(2.65, 0.06, 0.65);
      armGroup.add(frostLine);

      triSweeper.add(armGroup);
    });

    this.sweeperBar = triSweeper;
    this.hazardGroup.add(this.sweeperBar);
    this.scene.add(this.hazardGroup);

    // Build Unique Cryo Glacier Architecture:
    this._buildCryoBoostVents();
    this._buildCryoMonoliths();
  }

  // ------------------------------------------------------------
  // CRYO GLACIER: 4 SUB-ZERO GLACIAL NITROGEN BOOST VENTS
  // ------------------------------------------------------------
  _buildCryoBoostVents() {
    this.cryoBoostVents = [];
    // 4 diagonal drift boost pads in the mid-ring zone
    const ventCoords = [
      { x: 9.2, z: 9.2 },
      { x: -9.2, z: 9.2 },
      { x: 9.2, z: -9.2 },
      { x: -9.2, z: -9.2 }
    ];

    ventCoords.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.06, p.z);

      // Arctic frost base plate
      const baseGeo = new THREE.CylinderGeometry(1.35, 1.55, 0.16, 16);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x082138,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0x005577,
        emissiveIntensity: 0.3
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      group.add(base);

      // Glowing cryogenic turbine ring
      const ringGeo = new THREE.TorusGeometry(1.22, 0.08, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00F0FF });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.09;
      group.add(ring);

      // Pulsing cryogenic nitrogen core
      const coreGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.20, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xDCF8FF,
        emissive: 0x00E5FF,
        emissiveIntensity: 2.2,
        roughness: 0.1
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.12;
      group.add(core);

      // Subtle vertical frost particle beam
      const beamGeo = new THREE.CylinderGeometry(0.45, 0.75, 1.8, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x88EEFF,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 1.0;
      group.add(beam);

      this.scene.add(group);
      this.cryoBoostVents.push({
        x: p.x,
        z: p.z,
        group,
        core,
        ring,
        beam
      });
    });
  }

  // ------------------------------------------------------------
  // CRYO GLACIER: 4 TOWERING CRYSTALLINE ICE MONOLITHS
  // ------------------------------------------------------------
  _buildCryoMonoliths() {
    this.cryoMonoliths = [];
    // 4 cardinal ice crags on the outer glacier rim
    const monolithCoords = [
      { x: 0, z: 14.5 },
      { x: 14.5, z: 0 },
      { x: 0, z: -14.5 },
      { x: -14.5, z: 0 }
    ];

    monolithCoords.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);

      // Glacial ice pedestal base
      const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.55, 6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x071b30,
        metalness: 0.4,
        roughness: 0.1,
        emissive: 0x00D0FF,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.95
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.28;
      group.add(base);

      // Towering Hexagonal Crystalline Ice Obelisk (Height 4.2m)
      const colGeo = new THREE.CylinderGeometry(0.9, 1.35, 4.2, 6);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x88EEFF,
        emissive: 0x00A0E0,
        emissiveIntensity: 1.8,
        metalness: 0.15,
        roughness: 0.05,
        transparent: true,
        opacity: 0.92
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 2.4;
      group.add(col);

      // Crystalline Faceted Spire Peak
      const peakGeo = new THREE.ConeGeometry(0.88, 1.4, 6);
      const peakMat = new THREE.MeshStandardMaterial({
        color: 0xDCF8FF,
        emissive: 0x00F0FF,
        emissiveIntensity: 2.4,
        roughness: 0.05,
        transparent: true,
        opacity: 0.95
      });
      const peak = new THREE.Mesh(peakGeo, peakMat);
      peak.position.y = 5.0;
      group.add(peak);

      // Floating Mid-Level Frost Energy Ring
      const frostRingGeo = new THREE.TorusGeometry(1.4, 0.06, 8, 24);
      const frostRingMat = new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.85 });
      const frostRing = new THREE.Mesh(frostRingGeo, frostRingMat);
      frostRing.rotation.x = Math.PI / 2;
      frostRing.position.y = 2.6;
      group.add(frostRing);

      // Summit Frost Beacon
      const beaconGeo = new THREE.SphereGeometry(0.22, 14, 10);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 3.5
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 5.8;
      group.add(beacon);

      this.scene.add(group);
      this.cryoMonoliths.push({
        x: p.x,
        z: p.z,
        radius: 1.45, // Solid physical collision radius
        group,
        col,
        frostRing
      });
    });
  }

  // ------------------------------------------------------------
  // CRYO GLACIER: BOOST VENT INTERACTION & BOOST PHYSICS
  // ------------------------------------------------------------
  _checkCryoBoostVents(crafts) {
    if (!this.cryoBoostVents || !this.cryoBoostVents.length) return;
    const list = Array.isArray(crafts) ? crafts : (crafts ? [crafts] : []);

    list.forEach(character => {
      if (!character || !character.alive || !character.grounded) return;
      if (character.boostCooldown > 0) {
        character.boostCooldown -= 0.016;
        return;
      }

      for (const vent of this.cryoBoostVents) {
        const dx = character.x - vent.x;
        const dz = character.z - vent.z;
        if (dx * dx + dz * dz < 3.2) {
          character.boostCooldown = 0.85;

          // Rocket forward in drive heading at 24.0 m/s!
          const curSpd = Math.hypot(character.vx, character.vz);
          const boostSpd = Math.min(27.0, Math.max(20.0, curSpd * 1.65));
          const heading = (curSpd > 0.5) ? Math.atan2(character.vx, character.vz) : character.facing;

          character.vx = Math.sin(heading) * boostSpd;
          character.vz = Math.cos(heading) * boostSpd;
          character.squashX = 0.82;
          character.squashY = 1.38;

          // Vent reaction
          vent.core.material.emissiveIntensity = 4.5;
          if (HexAudio && HexAudio.sfxEmp) HexAudio.sfxEmp();
          if (typeof character.setEmotion === 'function') {
            character.setEmotion('celebrate', 1.0, 'GLACIAL SURGE! ⚡', '🚀');
          }
          break;
        }
      }
    });
  }

  // ============================================================
  // HAZARD COLLISION DISPATCHER (Stationary Pylon & Multi-Blade Sweepers)
  // ============================================================
  checkHazardCollision(character) {
    if (!character || !character.alive || !character.grounded || !this.hazardGroup) return null;

    const craftRadius = character.radius || 1.10;
    const distCenter = Math.sqrt(character.x * character.x + character.z * character.z);

    // 1. Central Stationary Hydraulic / Glacial / Magma Pillar Core Collision (100% Impenetrable!)
    let centerRadius = 1.70;
    if (this.theme === 'cryo') centerRadius = 2.40;     // Matches 2.35m Cryo glacial pedestal & spire base
    else if (this.theme === 'inferno') centerRadius = 2.15; // Matches 2.1m Inferno smelting crucible
    const pillarMinDist = centerRadius + craftRadius * 0.95;

    if (distCenter < pillarMinDist) {
      const nx = distCenter > 0.001 ? (character.x / distCenter) : 1;
      const nz = distCenter > 0.001 ? (character.z / distCenter) : 0;
      character.x = nx * (pillarMinDist + 0.10);
      character.z = nz * (pillarMinDist + 0.10);
      if (character.group) character.group.position.set(character.x, character.y, character.z);
      character.vx = nx * 12.5;
      character.vz = nz * 12.5;
      character.knockbackTimer = 0.22;
      if (character.hazardHitCooldown <= 0) {
        character.hazardHitCooldown = 0.32;
        character.squashX = 1.45;
        character.squashY = 0.65;
        if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(2.2);
        if (typeof character.setEmotion === 'function') {
          const callout = this.theme === 'cryo' ? 'GLACIAL CLANG! ❄️' : (this.theme === 'inferno' ? 'FORGE CLANG! 🔥' : 'CLANG! 💥');
          character.setEmotion('hit', 1.0, callout, this.theme === 'cryo' ? '❄️' : '💥');
        }
      }
      return { hit: true, x: character.x, z: character.z, type: 'pillar' };
    }

    // 1c. Cryo Glacier Crystalline Monoliths Collision
    if (this.theme === 'cryo' && this.cryoMonoliths && this.cryoMonoliths.length) {
      for (const m of this.cryoMonoliths) {
        const mdx = character.x - m.x;
        const mdz = character.z - m.z;
        const mdistSq = mdx * mdx + mdz * mdz;
        const monolithMinDist = m.radius + craftRadius * 0.95;
        if (mdistSq < monolithMinDist * monolithMinDist) {
          const mdist = Math.sqrt(mdistSq) || 1;
          const nx = mdx / mdist;
          const nz = mdz / mdist;
          character.x = m.x + nx * (monolithMinDist + 0.08);
          character.z = m.z + nz * (monolithMinDist + 0.08);
          if (character.group) character.group.position.set(character.x, character.y, character.z);
          character.vx = nx * 12.0;
          character.vz = nz * 12.0;
          character.knockbackTimer = 0.24;
          if (character.hazardHitCooldown <= 0) {
            character.hazardHitCooldown = 0.32;
            character.squashX = 1.50;
            character.squashY = 0.65;
            if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(2.2);
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('hit', 1.0, 'ICE CRAG! ❄️', '❄️');
            }
          }
          return { hit: true, x: character.x, z: character.z, type: 'monolith' };
        }
      }
    }

    // 1b. Inferno Forge Bastion Smelting Towers Collision
    if (this.theme === 'inferno' && this.forgeTowers && this.forgeTowers.length) {
      for (const t of this.forgeTowers) {
        const tdx = character.x - t.x;
        const tdz = character.z - t.z;
        const tdistSq = tdx * tdx + tdz * tdz;
        const towerMinDist = t.radius + craftRadius * 0.95;
        if (tdistSq < towerMinDist * towerMinDist) {
          const tdist = Math.sqrt(tdistSq) || 1;
          const nx = tdx / tdist;
          const nz = tdz / tdist;
          character.x = t.x + nx * (towerMinDist + 0.08);
          character.z = t.z + nz * (towerMinDist + 0.08);
          if (character.group) character.group.position.set(character.x, character.y, character.z);
          character.vx = nx * 12.0;
          character.vz = nz * 12.0;
          character.knockbackTimer = 0.24;
          if (character.hazardHitCooldown <= 0) {
            character.hazardHitCooldown = 0.32;
            character.squashX = 1.50;
            character.squashY = 0.65;
            if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(2.2);
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('hit', 1.0, 'FORGE CLANG! 💥', '💥');
            }
          }
          return { hit: true, x: character.x, z: character.z, type: 'tower' };
        }
      }
    }

    if (character.y > 1.85) return null; // Flying above bumper bar height

    const theta = this.hazardGroup.rotation.y;
    const omega = this.hazardAngularSpeed || 1.08;
    const effectiveRadius = craftRadius * 0.95;

    // 2. Multi-Blade Hazard Collision
    if (this.hazardType === 'tri') {
      // Cryo Tri-Blade: 3 radial blades at 120°
      const armLength = this.hazardArmLength || 5.30;
      const halfWidth = this.hazardHalfWidth || 0.34;
      const bladeAngles = this.hazardBladeAngles || [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

      for (const phi of bladeAngles) {
        const alpha = theta + phi;
        const ux = Math.cos(alpha);
        const uz = Math.sin(alpha);
        const vx = -uz;
        const vz = ux;

        const u = character.x * ux + character.z * uz;
        const v = character.x * vx + character.z * vz;

        const cu = Math.max(0, Math.min(armLength, u));
        const cv = Math.max(-halfWidth, Math.min(halfWidth, v));

        const du = u - cu;
        const dv = v - cv;
        const distSq = du * du + dv * dv;

        if (distSq < effectiveRadius * effectiveRadius || (du === 0 && dv === 0)) {
          let nu = 0, nv = 0, overlap = 0;
          if (du === 0 && dv === 0) {
            nv = v >= 0 ? 1 : -1;
            nu = 0;
            overlap = halfWidth + effectiveRadius - Math.abs(v);
          } else {
            const dist = Math.sqrt(distSq);
            nu = du / dist;
            nv = dv / dist;
            overlap = effectiveRadius - dist;
          }

          const exitBuffer = 0.08;
          const u_new = u + nu * (overlap + exitBuffer);
          const v_new = v + nv * (overlap + exitBuffer);

          character.x = u_new * ux + v_new * vx;
          character.z = u_new * uz + v_new * vz;
          if (character.group) character.group.position.set(character.x, character.y, character.z);

          const nx_world = nu * ux + nv * vx;
          const nz_world = nu * uz + nv * vz;

          // Sweeper rotational velocity at radius cu
          const tipFactor = Math.min(1.0, cu / armLength);
          const launchSpeed = 11.5 + (tipFactor * 4.5); // 11.5 to 16.0 m/s icy fling

          let launchDirX = vx * 0.70 + nx_world * 0.45;
          let launchDirZ = vz * 0.70 + nz_world * 0.45;
          const launchLen = Math.hypot(launchDirX, launchDirZ) || 1;
          launchDirX /= launchLen;
          launchDirZ /= launchLen;

          character.vx = launchDirX * launchSpeed;
          character.vz = launchDirZ * launchSpeed;
          character.knockbackTimer = 0.28;

          if (character.hazardHitCooldown <= 0) {
            character.hazardHitCooldown = 0.30;
            character.squashX = 1.55;
            character.squashY = 0.60;
            const smackLines = ['❄️ FROST SMACK!', '⚡ CHILL SLAM!', 'SHIVER!'];
            const txt = smackLines[Math.floor(Math.random() * smackLines.length)];
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('hit', 1.0, txt, '❄️');
            }
            if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(2.2);
          }
          return { hit: true, x: character.x, z: character.z, type: 'sweeper' };
        }
      }
    } else {
      // Neon 1 bar ([0]) or Inferno 2 crossed bars ([0, Math.PI / 2])
      const L_half = this.hazardHalfLength || 5.30;
      const W_half = this.hazardHalfWidth || 0.34;
      const bladeAngles = this.hazardBladeAngles || [0];

      for (const phi of bladeAngles) {
        const alpha = theta + phi;
        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);

        // Transform character pos into bar coordinates
        const lx = character.x * cosA - character.z * sinA;
        const lz = character.x * sinA + character.z * cosA;

        const cx = Math.max(-L_half, Math.min(L_half, lx));
        const cz = Math.max(-W_half, Math.min(W_half, lz));

        const dx = lx - cx;
        const dz = lz - cz;
        const distSq = dx * dx + dz * dz;

        if (distSq < effectiveRadius * effectiveRadius || (dx === 0 && dz === 0)) {
          let nx_loc = 0, nz_loc = 0, overlap = 0;
          if (dx === 0 && dz === 0) {
            nz_loc = lz >= 0 ? 1 : -1;
            nx_loc = 0;
            overlap = W_half + effectiveRadius - Math.abs(lz);
          } else {
            const dist = Math.sqrt(distSq);
            nx_loc = dx / dist;
            nz_loc = dz / dist;
            overlap = effectiveRadius - dist;
          }

          const exitBuffer = 0.08;
          const lx_new = lx + nx_loc * (overlap + exitBuffer);
          const lz_new = lz + nz_loc * (overlap + exitBuffer);

          character.x = lx_new * cosA + lz_new * sinA;
          character.z = -lx_new * sinA + lz_new * cosA;
          if (character.group) character.group.position.set(character.x, character.y, character.z);

          const nx_world = nx_loc * cosA + nz_loc * sinA;
          const nz_world = -nx_loc * sinA + nz_loc * cosA;

          const vBarX = omega * character.z;
          const vBarZ = -omega * character.x;
          const rCenter = Math.hypot(character.x, character.z);
          const tipFactor = Math.min(1.0, rCenter / L_half);

          const tangentX = (rCenter > 0.001) ? (vBarX / (omega * rCenter)) : 0;
          const tangentZ = (rCenter > 0.001) ? (vBarZ / (omega * rCenter)) : -1;

          const isInferno = this.theme === 'inferno';
          const launchSpeed = (isInferno ? 11.5 : 10.5) + (tipFactor * (isInferno ? 4.8 : 4.0));

          let launchDirX = tangentX * 0.65 + nx_world * 0.45;
          let launchDirZ = tangentZ * 0.65 + nz_world * 0.45;
          const launchLen = Math.hypot(launchDirX, launchDirZ) || 1;
          launchDirX /= launchLen;
          launchDirZ /= launchLen;

          character.vx = launchDirX * launchSpeed;
          character.vz = launchDirZ * launchSpeed;
          character.knockbackTimer = 0.24;

          if (character.hazardHitCooldown <= 0) {
            character.hazardHitCooldown = 0.30;
            character.squashX = 1.55;
            character.squashY = 0.60;

            const smackLines = isInferno 
              ? ['🔥 CRUSHED!', '💥 MAGMA SLAM!', 'HEAVY IMPACT!', 'FORGED!']
              : ['💥 SMACK!', '⚡ SLAMMED!', 'CLANG!', 'WHOAAA!'];
            const txt = smackLines[Math.floor(Math.random() * smackLines.length)];
            if (typeof character.setEmotion === 'function') {
              character.setEmotion('hit', 1.0, txt, isInferno ? '🔥' : '💥');
            }
            if (HexAudio && HexAudio.sfxBump) HexAudio.sfxBump(isInferno ? 2.4 : 2.0);
          }
          return { hit: true, x: character.x, z: character.z, type: 'sweeper' };
        }
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
    else if (type === 'super_ram') mesh = this._buildSuperRamMesh();
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

  _buildSuperRamMesh() {
    const group = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.38);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 2.2, metalness: 0.9, roughness: 0.15
    });
    const oct = new THREE.Mesh(geo, mat);
    group.add(oct);

    const ringGeo = new THREE.TorusGeometry(0.52, 0.05, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFEA00 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
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
  update(dt, playerCraft = null, allCrafts = null) {
    this.elapsedTime += dt;

    if (this.hazardGroup) {
      this.hazardGroup.rotation.y += dt * this.hazardAngularSpeed;
    }

    // Check hazard collisions on all active crafts (both player & AI bots)
    const activeCraftsList = Array.isArray(allCrafts) ? allCrafts : (playerCraft ? [playerCraft] : []);
    activeCraftsList.forEach(c => {
      if (c && c.alive) this.checkHazardCollision(c);
    });

    if (this.theme === 'cryo') {
      if (this.cryoSpireMesh) this.cryoSpireMesh.rotation.y -= dt * 0.45;
      if (this.cryoOrbitalRing1) this.cryoOrbitalRing1.rotation.z += dt * 0.75;
      if (this.cryoOrbitalRing2) this.cryoOrbitalRing2.rotation.z -= dt * 0.60;

      // Animate Glacial Boost Vents
      this._checkCryoBoostVents(activeCraftsList);
      if (this.cryoBoostVents) {
        this.cryoBoostVents.forEach(v => {
          v.core.material.emissiveIntensity += (2.2 - v.core.material.emissiveIntensity) * Math.min(1, dt * 4.0);
          if (v.beam) v.beam.rotation.y += dt * 2.0;
        });
      }

      // Rotate Monolith energy rings
      if (this.cryoMonoliths) {
        this.cryoMonoliths.forEach(m => {
          if (m.frostRing) m.frostRing.rotation.z += dt * 0.85;
        });
      }
    } else if (this.theme === 'inferno') {
      // Animate Erupting Volcanic Geysers
      this._updateInfernoGeysers(dt, activeCraftsList);

      // Pulse reactor core & molten lava veins
      if (this.reactorCore && this.reactorCore.material) {
        this.reactorCore.material.emissiveIntensity = 2.4 + Math.sin(this.elapsedTime * 4.5) * 0.8;
      }
      if (this.lavaVeins) {
        const veinPulse = 2.2 + Math.sin(this.elapsedTime * 4.0) * 0.6;
        this.lavaVeins.forEach(v => {
          if (v.material) v.material.emissiveIntensity = veinPulse;
        });
      }
      if (this.forgeTowers) {
        const towerPulse = 2.4 + Math.sin(this.elapsedTime * 3.5) * 0.7;
        this.forgeTowers.forEach(t => {
          if (t.slag && t.slag.material) t.slag.material.emissiveIntensity = towerPulse;
        });
      }
    }

    this._updateAmbientParticles(dt);

    const matrix = this._reusableMatrix;
    const pos = this._reusablePos;

    this.rings.forEach(stage => {
      if (stage.collapsed) return;

      // 1. Warning Phase: Accelerating Red Strobe Alarm & Earthquake Tremor
      if (this.elapsedTime >= stage.warningTime && this.elapsedTime < stage.collapseTime) {
        if (!stage.warned) {
          stage.warned = true;
          if (HexAudio) {
            if (HexAudio.announce) HexAudio.announce('warning');
            else if (HexAudio.sfxAlarm) HexAudio.sfxAlarm();
          }
          if (this.onAlert) {
            const secLeft = Math.max(1, Math.round(stage.collapseTime - this.elapsedTime));
            this.onAlert(`⚠️ ${stage.name} COLLAPSING IN ${secLeft}s! RETREAT TO CENTER!`);
          }
        }

        const warnProgress = Math.min(1.0, Math.max(0.0, (this.elapsedTime - stage.warningTime) / (stage.collapseTime - stage.warningTime)));
        const flashRate = 12 + warnProgress * 26; // Strobe gets faster and faster!
        const flash = Math.sin((this.elapsedTime - stage.warningTime) * flashRate) > 0;
        const col = flash ? this._reusableAlertCol : this._reusableStageCol.setHex(stage.color);
        for (let i = 0; i < stage.count; i++) {
          stage.mesh.instanceColor.setXYZ(i, col.r, col.g, col.b);
        }
        stage.mesh.instanceColor.needsUpdate = true;

        // Stable arena deck (no annoying high-frequency tremor)
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



    if (this.cryoBoostVents && this.cryoBoostVents.length) {
      this.cryoBoostVents.forEach(v => {
        if (v.group && v.group.parent) this.scene.remove(v.group);
      });
      this.cryoBoostVents = [];
    }
    if (this.cryoMonoliths && this.cryoMonoliths.length) {
      this.cryoMonoliths.forEach(m => {
        if (m.group && m.group.parent) this.scene.remove(m.group);
      });
      this.cryoMonoliths = [];
    }

    if (this.infernoGeysers && this.infernoGeysers.length) {
      this.infernoGeysers.forEach(g => {
        if (g.group && g.group.parent) this.scene.remove(g.group);
      });
      this.infernoGeysers = [];
    }
    if (this.forgeTowers && this.forgeTowers.length) {
      this.forgeTowers.forEach(t => {
        if (t.group && t.group.parent) this.scene.remove(t.group);
      });
      this.forgeTowers = [];
    }
    if (this.lavaVeins && this.lavaVeins.length) {
      this.lavaVeins.forEach(v => {
        if (v.group && v.group.parent) this.scene.remove(v.group);
      });
      this.lavaVeins = [];
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

