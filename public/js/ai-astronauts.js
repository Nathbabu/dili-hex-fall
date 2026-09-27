// =============================================
// DILI: HEX-FALL — AI Astronaut Rivals
// =============================================
class AIAstronaut {
  constructor(scene, name, suitColor, hexGrid) {
    this.name = name;
    this.hexGrid = hexGrid;
    this.character = new Character3D(scene, suitColor, name);
    this.character.isPlayer = false;

    this.thinkInterval = 0.25 + Math.random() * 0.35;
    this.thinkTimer = 0;
    this.targetX = 0;
    this.targetZ = 0;
    this.skill = 0.6 + Math.random() * 0.38; // 0.6 to 0.98
    this.jumpCooldown = 0;
    this.panicMode = false;
  }

  spawn(x, z, tierY) {
    this.character.reset(x, tierY + 2, z);
    this.targetX = x;
    this.targetZ = z;
  }

  update(dt) {
    if (!this.character.alive) {
      if (this.character.group.visible) this.character.group.visible = false;
      return;
    }

    this.thinkTimer += dt;
    this.jumpCooldown -= dt;

    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think();
    }

    // Steer towards target
    const dx = this.targetX - this.character.x;
    const dz = this.targetZ - this.character.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    let ix = 0, iz = 0;
    if (dist > 0.4) {
      const spd = this.panicMode ? 1.0 : 0.75;
      ix = (dx / dist) * spd;
      iz = (dz / dist) * spd;
    }

    this.character.update(dt, ix, iz);
  }

  _think() {
    const tierIdx = this.character.currentTier;
    const tier = this.hexGrid.tiers[tierIdx];
    if (!tier) return;

    const myX = this.character.x;
    const myZ = this.character.z;

    // Check current tile status
    const currentTileIdx = this.hexGrid.getTileAt(myX, myZ, tierIdx);
    if (currentTileIdx >= 0) {
      const state = tier.states[currentTileIdx];
      if (state.steppedOn && state.stepTimer > 0.25) {
        this.panicMode = true;
        // Jump away!
        if (this.jumpCooldown <= 0 && this.character.grounded) {
          this.character.jump();
          this.jumpCooldown = 0.7;
        }
      } else {
        this.panicMode = false;
      }
    }

    // Pick best adjacent / near solid tile
    let bestPos = null;
    let bestScore = -Infinity;

    for (let i = 0; i < tier.count; i++) {
      const state = tier.states[i];
      if (!this.hexGrid.isTileSolid(tierIdx, i)) continue;

      const pos = tier.positions[i];
      const dx = pos.x - myX;
      const dz = pos.z - myZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 7) continue;

      let score = -dist * 1.2;

      // Prefer un-stepped tiles
      if (!state.steppedOn) score += 15;

      // Safety count: how many solid neighbors
      let safeNeighbors = 0;
      for (let j = 0; j < tier.count; j++) {
        if (j === i || !this.hexGrid.isTileSolid(tierIdx, j)) continue;
        const nx = tier.positions[j].x - pos.x;
        const nz = tier.positions[j].z - pos.z;
        if (nx * nx + nz * nz < 5.5) safeNeighbors++;
      }
      score += safeNeighbors * this.skill * 3;

      // Random exploration factor
      score += (Math.random() - 0.5) * (1 - this.skill) * 6;

      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    if (bestPos) {
      this.targetX = bestPos.x;
      this.targetZ = bestPos.z;
    }

    // If tier is collapsing and few tiles remain, look at lower tier
    const activeTiles = this.hexGrid.getActiveTileCount(tierIdx);
    if (activeTiles < 4 && tierIdx < 3) {
      const nextTier = this.hexGrid.tiers[tierIdx + 1];
      if (nextTier) {
        for (let k = 0; k < nextTier.count; k++) {
          if (this.hexGrid.isTileSolid(tierIdx + 1, k)) {
            this.targetX = nextTier.positions[k].x;
            this.targetZ = nextTier.positions[k].z;
            break;
          }
        }
      }
    }
  }

  remove() {
    this.character.remove();
  }
}

class AIManager {
  constructor(scene, hexGrid) {
    this.scene = scene;
    this.hexGrid = hexGrid;
    this.bots = [];

    this.botRoster = [
      { name: 'Cadet_Vortex', color: 0xFF6EC7 },
      { name: 'Decoded_Apex', color: 0x4DA6FF },
      { name: 'Cyber_Dili',   color: 0xFFD700 },
      { name: 'Neon_Specter', color: 0xFF4444 }
    ];
  }

  spawn() {
    this.clear();
    const tierY = this.hexGrid.getTierY(0);
    const radius = 4.8;

    this.botRoster.forEach((cfg, i) => {
      const angle = (i / this.botRoster.length) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const bot = new AIAstronaut(this.scene, cfg.name, cfg.color, this.hexGrid);
      bot.spawn(x, z, tierY);
      this.bots.push(bot);
    });
  }

  update(dt) {
    this.bots.forEach(b => b.update(dt));
  }

  getAliveCount() {
    return this.bots.filter(b => b.character.alive).length;
  }

  clear() {
    this.bots.forEach(b => b.remove());
    this.bots = [];
  }
}
