// =============================================
// DILI: CYBER BUMPERS — Aggressive Combat AI
// =============================================
class AIBumperBot {
  constructor(scene, name, suitColor) {
    this.name = name;
    this.craft = new BumperCraft(scene, suitColor, name);
    this.craft.isPlayer = false;

    this.thinkTimer = 0;
    this.thinkInterval = 0.15 + Math.random() * 0.15;
    this.personality = {
      aggression: 0.65 + Math.random() * 0.35, // ramming tendency
      survival: 0.75 + Math.random() * 0.25,   // edge avoidance
      dashSkill: 0.6 + Math.random() * 0.38
    };

    this.targetCraft = null;
    this.steerX = 0;
    this.steerZ = 0;
  }

  spawn(x, z) {
    this.craft.reset(x, z);
  }

  update(dt, allCrafts, arenaRadius) {
    if (!this.craft.alive) return;

    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think(allCrafts, arenaRadius);
    }

    this.craft.update(dt, this.steerX, this.steerZ, arenaRadius);
  }

  _think(allCrafts, arenaRadius) {
    const myDistFromCenter = Math.sqrt(this.craft.x * this.craft.x + this.craft.z * this.craft.z);

    // 1. SURVIVAL CHECK: If dangerously close to collapsing edge, steer toward center!
    const dangerEdge = arenaRadius - 2.5;
    if (myDistFromCenter > dangerEdge) {
      // Steer hard back to origin (0, 0)
      const toCenterX = -this.craft.x / (myDistFromCenter || 1);
      const toCenterZ = -this.craft.z / (myDistFromCenter || 1);
      this.steerX = toCenterX * 1.2;
      this.steerZ = toCenterZ * 1.2;

      // Panic Dash toward center if available
      if (myDistFromCenter > arenaRadius - 1.0 && Math.random() < 0.6) {
        this.craft.triggerDash();
      }
      return;
    }

    // 2. TARGET SELECTION: Find closest or weakest alive rival
    let bestTarget = null;
    let closestDistSq = Infinity;

    allCrafts.forEach(c => {
      if (c === this.craft || !c.alive) return;
      const dx = c.x - this.craft.x;
      const dz = c.z - this.craft.z;
      const distSq = dx * dx + dz * dz;

      // Bonus score if rival is near the edge (easier knockout!)
      const rivalEdgeDist = Math.sqrt(c.x * c.x + c.z * c.z);
      const edgeVulnerability = rivalEdgeDist / (arenaRadius || 1);

      const score = distSq - (edgeVulnerability * 25);
      if (score < closestDistSq) {
        closestDistSq = score;
        bestTarget = c;
      }
    });

    if (!bestTarget) {
      // Wander near center
      this.steerX = -this.craft.x * 0.1;
      this.steerZ = -this.craft.z * 0.1;
      return;
    }

    // 3. COMBAT VECTOR: Steer toward target to ram them!
    const dx = bestTarget.x - this.craft.x;
    const dz = bestTarget.z - this.craft.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      this.steerX = dx / dist;
      this.steerZ = dz / dist;

      // 4. ACTIVE COMBAT ABILITIES:
      // A) Ram Dash attack if aligned and in range (2.5m - 6.5m)
      if (dist >= 2.2 && dist <= 7.0 && this.craft.dashCooldown <= 0) {
        const angleToTarget = Math.atan2(dx, dz);
        let angleDiff = Math.abs(angleToTarget - this.craft.facing);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) < 0.4 && Math.random() < this.personality.dashSkill) {
          this.craft.triggerDash();
        }
      }

      // B) EMP Shockwave if surrounded or close (< 3.2m)
      if (dist < 3.2 && this.craft.empCooldown <= 0 && Math.random() < 0.5) {
        this.craft.triggerEmp(allCrafts);
      }
    }
  }

  remove() {
    this.craft.remove();
  }
}

class AIBumperManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];
    this.roster = [
      { name: 'Vortex_Hunter', color: 0xFF6EC7 },
      { name: 'Decoded_Titan', color: 0x4DA6FF },
      { name: 'Cyber_Phantom', color: 0xFFD700 },
      { name: 'Neon_Striker',  color: 0xFF3344 }
    ];
  }

  spawn(arenaRadius) {
    this.clear();
    const spawnRadius = arenaRadius * 0.65;

    this.roster.forEach((cfg, i) => {
      const angle = (i / this.roster.length) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * spawnRadius;
      const z = Math.sin(angle) * spawnRadius;

      const bot = new AIBumperBot(this.scene, cfg.name, cfg.color);
      bot.spawn(x, z);
      this.bots.push(bot);
    });
  }

  update(dt, allCrafts, arenaRadius) {
    this.bots.forEach(b => b.update(dt, allCrafts, arenaRadius));
  }

  getCrafts() {
    return this.bots.map(b => b.craft);
  }

  getAliveCount() {
    return this.bots.filter(b => b.craft.alive).length;
  }

  clear() {
    this.bots.forEach(b => b.remove());
    this.bots = [];
  }
}
