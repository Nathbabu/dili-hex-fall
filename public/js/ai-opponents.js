// ============================================================
// DILI: CYBER BUMPERS — Tactical Combat & Survival Bot AI
// ============================================================
class AIBumperBot {
  constructor(scene, name, suitColor) {
    this.name = name;
    this.craft = new BumperCraft(scene, suitColor, name);
    this.craft.isPlayer = false;

    this.thinkTimer = 0;
    this.thinkInterval = 0.12 + Math.random() * 0.08; // Fast tactical reactions (8-12 Hz)
    this.personality = {
      aggression: 0.70 + Math.random() * 0.30, // Ramming & flank tendency
      survival: 0.85 + Math.random() * 0.15,   // Edge avoidance & zone retreat
      dashSkill: 0.35 + Math.random() * 0.25   // Smart dash timing
    };

    this.steerX = 0;
    this.steerZ = 0;
    this.isRetreating = false;
  }

  spawn(x, z) {
    this.craft.reset(x, z);
    this.isRetreating = false;
  }

  update(dt, allCrafts, arenaRadius, arena = null) {
    if (!this.craft.alive) return;

    // 1. Check Power-Up Pickups for this bot
    if (arena && arena.checkPickups) {
      const pu = arena.checkPickups(this.craft);
      if (pu) {
        if (pu === 'crystal') {
          if (this.craft.onCollectCrystal) this.craft.onCollectCrystal();
        } else {
          this.craft.activatePowerUp(pu);
        }
      }
    }

    // 2. Tactical AI Decision Cycle
    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think(allCrafts, arenaRadius, arena);
    }

    // 3. Apply Steer & Physics
    this.craft.update(dt, this.steerX, this.steerZ, arenaRadius);
  }

  _think(allCrafts, arenaRadius, arena = null) {
    const myDist = Math.sqrt(this.craft.x * this.craft.x + this.craft.z * this.craft.z);
    const elapsedTime = (arena && arena.elapsedTime) ? arena.elapsedTime : 0;

    // -------------------------------------------------------------
    // STEP 1: ARENA BASE COLLAPSE & SAFE ZONE ANTICIPATION
    // -------------------------------------------------------------
    let outerDanger = false;
    let midDanger = false;

    if (arena && arena.ringStages) {
      const outer = arena.ringStages.find(s => s.id === 2);
      const mid = arena.ringStages.find(s => s.id === 1);

      // Outer ring enters danger if warned, dropping, collapsed, or within 2.5s of warning
      if (outer && (outer.warned || outer.dropping || outer.collapsed || elapsedTime >= (outer.warningTime - 2.5))) {
        outerDanger = true;
      }
      // Mid ring enters danger if warned, dropping, collapsed, or within 3.0s of warning
      if (mid && (mid.warned || mid.dropping || mid.collapsed || elapsedTime >= (mid.warningTime - 3.0))) {
        midDanger = true;
      }
    } else {
      if (arenaRadius <= 15.0) outerDanger = true;
      if (arenaRadius <= 8.0) midDanger = true;
    }

    // Determine current guaranteed safe zone radius
    let safeZoneRadius = 18.5;
    if (midDanger) {
      safeZoneRadius = 6.2; // Must retreat inside Core Arena (radius <= 6.2)
    } else if (outerDanger) {
      safeZoneRadius = 12.8; // Must retreat inside Mid Ring (radius <= 12.8)
    } else {
      safeZoneRadius = Math.min(arenaRadius - 2.2, 18.5);
    }

    // -------------------------------------------------------------
    // STEP 2: EMERGENCY ZONE RETREAT (TOP SURVIVAL PRIORITY)
    // "Base gir raha hai — base ke andar aane ka koshish karo!"
    // -------------------------------------------------------------
    const isOutsideSafe = myDist > safeZoneRadius;
    const isImminentDrop = (outerDanger && myDist > 13.8) || (midDanger && myDist > 6.8);

    if (isOutsideSafe || isImminentDrop) {
      this.isRetreating = true;

      // Disengage completely from rival brawling!
      // Steer with urgency directly towards the origin (0, 0)
      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);

      this.steerX = toCenterX * 1.5;
      this.steerZ = toCenterZ * 1.5;

      // PANIC DASH INWARD TO SAFETY
      // If outside safe zone and dash is ready, rocket towards center!
      if (this.craft.dashCooldown <= 0 && this.craft.grounded) {
        const angleToCenter = Math.atan2(toCenterX, toCenterZ);
        let diff = Math.abs(angleToCenter - this.craft.facing);
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) < 0.95 || myDist > safeZoneRadius + 1.0) {
          this.craft.triggerDash();
          if (this.craft.setEmotion && Math.random() < 0.4) {
            this.craft.setEmotion('dash', 1.0, 'FALLBACK!', '⚠️');
          }
        }
      }

      // If an enemy craft is blocking our inward escape path within 2.8m, trigger EMP!
      if (this.craft.empCooldown <= 0) {
        const blockingRival = allCrafts.some(c => c !== this.craft && c.alive && Math.hypot(c.x - this.craft.x, c.z - this.craft.z) < 2.8);
        if (blockingRival) {
          this.craft.triggerEmp(allCrafts);
        }
      }

      return; // Do NOT look for fights while fleeing falling ground!
    }

    this.isRetreating = false;

    // -------------------------------------------------------------
    // STEP 3: CYBER SWEEPER HAZARD AVOIDANCE (CENTER BUMPER)
    // -------------------------------------------------------------
    if (arena && arena.hazardGroup && myDist < 5.8) {
      const theta = arena.hazardGroup.rotation.y;
      const cosA = Math.cos(theta);
      const sinA = Math.sin(theta);
      const lx = this.craft.x * cosA - this.craft.z * sinA;
      const lz = this.craft.x * sinA + this.craft.z * cosA;

      // If within swept danger sector
      if (Math.abs(lx) < 5.4 && lz > -0.6 && lz < 2.2) {
        const escapeX = -sinA * Math.sign(lz + 0.1);
        const escapeZ = cosA * Math.sign(lz + 0.1);

        this.steerX = escapeX * 1.4 - (this.craft.x / myDist) * 0.4;
        this.steerZ = escapeZ * 1.4 - (this.craft.z / myDist) * 0.4;

        if (Math.random() < 0.35 && this.craft.dashCooldown <= 0) {
          this.craft.triggerDash();
        }
        return;
      }
    }

    // -------------------------------------------------------------
    // STEP 4: POWER-UP HUNTING (STRATEGIC ADVANTAGE TO WIN)
    // -------------------------------------------------------------
    if (!this.craft.hasShield && !this.craft.hasRocket && arena && arena.powerUps) {
      let bestPU = null;
      let minPUDist = Infinity;

      for (const pu of arena.powerUps) {
        if (pu.collected) continue;
        const puDistCenter = Math.hypot(pu.x, pu.z);
        // Only target powerups that are safely inside our current stable zone!
        if (puDistCenter > safeZoneRadius - 1.2) continue;

        const distToMe = Math.hypot(pu.x - this.craft.x, pu.z - this.craft.z);
        if (distToMe < 8.5 && distToMe < minPUDist) {
          minPUDist = distToMe;
          bestPU = pu;
        }
      }

      // If a nearby powerup exists and we have a clear line, snatch it!
      if (bestPU && minPUDist < 8.0 && Math.random() < 0.70) {
        const puDx = bestPU.x - this.craft.x;
        const puDz = bestPU.z - this.craft.z;
        this.steerX = puDx / minPUDist;
        this.steerZ = puDz / minPUDist;
        return;
      }
    }

    // -------------------------------------------------------------
    // STEP 5: SMART TARGET SELECTION (TARGET PLAYER & VULNERABLE RIVALS)
    // -------------------------------------------------------------
    let bestTarget = null;
    let bestScore = -Infinity;

    allCrafts.forEach(c => {
      if (c === this.craft || !c.alive || !c.grounded) return;

      const dx = c.x - this.craft.x;
      const dz = c.z - this.craft.z;
      const dist = Math.hypot(dx, dz);
      const rivalDistFromCenter = Math.hypot(c.x, c.z);

      // Base score by proximity
      let score = 50.0 - dist * 2.2;

      // High priority to knockout the human player!
      if (c.isPlayer) {
        score += 6.0;
      }

      // Huge priority to eliminate rivals already wobbling near the edge!
      if (rivalDistFromCenter > safeZoneRadius - 3.2) {
        score += 42.0;
      }

      // Shielded rivals are dangerous — avoid charging head-on
      if (c.hasShield) {
        score -= 28.0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = c;
      }
    });

    if (!bestTarget) {
      // Patrol peacefully inside safe inner zone
      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);
      this.steerX = toCenterX * 0.3;
      this.steerZ = toCenterZ * 0.3;
      return;
    }

    // -------------------------------------------------------------
    // STEP 6: TACTICAL FLANKING & SAFE RAM ATTACK (PLAYING TO WIN)
    // -------------------------------------------------------------
    // Instead of naively running straight into the rival (which can cause
    // the bot to ram outward off the platform), the bot calculates an attack
    // that knocks the rival OUTWARD toward the abyss!
    const targetDistCenter = Math.hypot(bestTarget.x, bestTarget.z);
    const edgeDirX = bestTarget.x / (targetDistCenter || 1);
    const edgeDirZ = bestTarget.z / (targetDistCenter || 1);

    // Ideal ram position: slightly behind target from the inside, driving them outward
    const flankPosX = bestTarget.x - edgeDirX * 1.2;
    const flankPosZ = bestTarget.z - edgeDirZ * 1.2;

    const toTargetDx = bestTarget.x - this.craft.x;
    const toTargetDz = bestTarget.z - this.craft.z;
    const directDist = Math.hypot(toTargetDx, toTargetDz);

    // If within 2.5m, steer directly into them; otherwise position for the flank
    let steerDx, steerDz;
    if (directDist < 2.5) {
      steerDx = toTargetDx;
      steerDz = toTargetDz;
    } else {
      steerDx = flankPosX - this.craft.x;
      steerDz = flankPosZ - this.craft.z;
    }

    const steerDist = Math.hypot(steerDx, steerDz);
    if (steerDist > 0.05) {
      this.steerX = steerDx / steerDist;
      this.steerZ = steerDz / steerDist;
    }

    // -------------------------------------------------------------
    // STEP 7: PREDICTIVE ANTI-SUICIDE DASH & EMP EXECUTION
    // -------------------------------------------------------------
    // Calculate projected landing spot after a dash
    const dashSpeed = this.craft.hasRocket ? 24 : 17;
    const predX = this.craft.x + Math.cos(this.craft.facing) * (dashSpeed * 0.35);
    const predZ = this.craft.z + Math.sin(this.craft.facing) * (dashSpeed * 0.35);
    const predDist = Math.hypot(predX, predZ);

    // Safe to dash ONLY if the projected endpoint stays safely on the platform!
    const isDashSafe = predDist < (safeZoneRadius - 1.2);

    // Check alignment with target
    const angleToTarget = Math.atan2(toTargetDx, toTargetDz);
    let angleDiff = Math.abs(angleToTarget - this.craft.facing);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    // A) Tactical Dash Ram:
    if (directDist >= 2.0 && directDist <= 6.5 && this.craft.dashCooldown <= 0 && isDashSafe) {
      if (Math.abs(angleDiff) < 0.45 && Math.random() < this.personality.dashSkill) {
        this.craft.triggerDash();
        this.craft.dashCooldown = 3.8 + Math.random() * 1.5;
        if (Math.random() < 0.30 && this.craft.setEmotion) {
          const taunts = ['OUT OF MY WAY!', 'EAT BUMPER!', 'RAMMING SPEED!', 'FEEL THE FORCE!'];
          this.craft.setEmotion('dash', 1.2, taunts[Math.floor(Math.random() * taunts.length)], '💥');
        }
      }
    }

    // B) EMP Shockwave Blast:
    if (directDist < 3.2 && this.craft.empCooldown <= 0) {
      const rivalsNear = allCrafts.filter(c => c !== this.craft && c.alive && Math.hypot(c.x - this.craft.x, c.z - this.craft.z) < 3.4).length;
      if (rivalsNear >= 1) {
        // High chance if pushing someone near the edge
        if (targetDistCenter > safeZoneRadius - 3.5 || rivalsNear >= 2) {
          this.craft.triggerEmp(allCrafts);
          if (this.craft.setEmotion && Math.random() < 0.45) {
            this.craft.setEmotion('celebrate', 1.2, 'EMP BLAST!', '⚡');
          }
        }
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
      { name: 'Vortex_Hunter', color: 'pink' },
      { name: 'Decoded_Titan', color: 'blue' },
      { name: 'Cyber_Phantom', color: 'gold' },
      { name: 'Neon_Striker',  color: 'crimson' }
    ];
  }

  spawn(arenaRadius) {
    this.clear();
    // Spawn bots on safe mid-ring radius (well inside boundary)
    const spawnRadius = Math.min(arenaRadius * 0.58, 11.0);

    this.roster.forEach((cfg, i) => {
      const angle = (i / this.roster.length) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * spawnRadius;
      const z = Math.sin(angle) * spawnRadius;

      const bot = new AIBumperBot(this.scene, cfg.name, cfg.color);
      bot.spawn(x, z);
      this.bots.push(bot);
    });
  }

  update(dt, allCrafts, arenaRadius, arena = null) {
    this.bots.forEach(b => b.update(dt, allCrafts, arenaRadius, arena));
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
