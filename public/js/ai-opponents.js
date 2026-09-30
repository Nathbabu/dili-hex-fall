// ============================================================
// DILI: CYBER BUMPERS — Balanced Tactical Combat & Survival Bot AI
// ============================================================
class AIBumperBot {
  constructor(scene, name, suitColor) {
    this.name = name;
    this.craft = new BumperCraft(scene, suitColor, name);
    this.craft.isPlayer = false;

    this.thinkTimer = 0;
    this.thinkInterval = 0.11 + Math.random() * 0.05; // Snappy tactical reflexes (~8-10 Hz)
    this.personality = {
      aggression: 0.78 + Math.random() * 0.18, // Ruthless brawler drive
      survival: 0.80 + Math.random() * 0.14,   // Sharp perimeter & collapse awareness
      dashSkill: 0.60 + Math.random() * 0.20,  // Active tactical dash timing
      dodgeSkill: 0.65 + Math.random() * 0.22  // Evasive lateral juke when charged
    };

    this.steerX = 0;
    this.steerZ = 0;
    this.steerNoise = 0.08; // Tight, competitive steering control
    this.isRetreating = false;
  }

  spawn(x, z) {
    this.craft.reset(x, z);
    this.isRetreating = false;
  }



  update(dt, allCrafts, arenaRadius, arena = null) {
    if (!this.craft.alive) return;

    // 1. Check Power-Up Pickups & Jump Pads for this bot
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
    if (arena && typeof arena.checkJumpPads === 'function') {
      arena.checkJumpPads(this.craft);
    }

    // 2. Tactical AI Decision Cycle
    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think(allCrafts, arenaRadius, arena);
    }

    // 3. Apply Steer & Physics
    this.craft.update(dt, this.steerX, this.steerZ, arena || arenaRadius);
  }

  _think(allCrafts, arenaRadius, arena = null) {
    const myDist = Math.sqrt(this.craft.x * this.craft.x + this.craft.z * this.craft.z);

    // -------------------------------------------------------------
    // STEP 1: MULTI-TIER ARENA COLLAPSE & SAFE ZONE DETECTION
    // Bots know whether they are fighting on Tier 1 (Sky Deck) or Tier 2 (Sub-Level Deck)
    // -------------------------------------------------------------
    const myTier = this.craft.currentTier || 1;
    let safeZoneRadius = 18.5;
    let isImminentDrop = false;

    if (myTier === 2) {
      // TIER 2: SUB-LEVEL CYBER DECK (Fast shrinking pit!)
      let currentLowerSafe = arena && arena.lowerRadius ? arena.lowerRadius : 25;
      if (arena && arena.lowerRingStages) {
        const activeDangerStage = arena.lowerRingStages.find(s => !s.collapsed && (s.warned || s.dropping));
        if (activeDangerStage) {
          currentLowerSafe = Math.min(currentLowerSafe, activeDangerStage.radiusMin);
        }
      }
      safeZoneRadius = Math.max(4.5, currentLowerSafe - 1.8);
      isImminentDrop = myDist > (safeZoneRadius + 0.5);
    } else {
      // TIER 1: UPPER SKY COLISEUM
      let megaDanger = false;
      let outerDanger = false;
      let midDanger = false;

      if (arena && arena.ringStages) {
        const mega = arena.ringStages.find(s => s.id === 3);
        const outer = arena.ringStages.find(s => s.id === 2);
        const mid = arena.ringStages.find(s => s.id === 1);

        if (mega && (mega.warned || mega.dropping || mega.collapsed)) {
          if (Math.random() < this.personality.survival + 0.15) megaDanger = true;
        }
        if (outer && (outer.warned || outer.dropping || outer.collapsed)) {
          if (Math.random() < this.personality.survival + 0.15) outerDanger = true;
        }
        if (mid && (mid.warned || mid.dropping || mid.collapsed)) {
          if (Math.random() < this.personality.survival + 0.15) midDanger = true;
        }
      } else {
        if (arenaRadius <= 15.0) outerDanger = true;
        if (arenaRadius <= 8.0) midDanger = true;
      }

      if (midDanger) {
        safeZoneRadius = 6.2; // Must retreat inside Core Arena
      } else if (outerDanger) {
        safeZoneRadius = 12.8; // Must retreat inside Mid Ring
      } else if (megaDanger) {
        safeZoneRadius = 18.5; // Must retreat inside Outer Ring
      } else {
        safeZoneRadius = Math.min(arenaRadius - 2.0, 25.5);
      }
      isImminentDrop = (outerDanger && myDist > 13.5) || (midDanger && myDist > 6.8);
    }

    // -------------------------------------------------------------
    // STEP 2: EMERGENCY ZONE RETREAT
    // When the ground drops, navigate safely inward
    // -------------------------------------------------------------
    const playerCraftRef = allCrafts.find(c => c.isPlayer && c.alive);
    const isHumanBelow = myTier === 1 && playerCraftRef && (playerCraftRef.currentTier === 2 || playerCraftRef.y < -1.5);
    const isOutsideSafe = myDist > safeZoneRadius;

    // Do NOT force retreat to center if intentionally diving to hunt human below!
    if (!isHumanBelow && (isOutsideSafe || isImminentDrop)) {
      this.isRetreating = true;

      // Disengage and steer steadily towards origin (0, 0)
      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);

      this.steerX = toCenterX * 1.05;
      this.steerZ = toCenterZ * 1.05;

      // Dash inward only if clearly stranded outside and dash is available
      if (this.craft.dashCooldown <= 0 && this.craft.grounded && myDist > safeZoneRadius + 1.8) {
        if (Math.random() < this.personality.survival * 0.5) {
          this.craft.triggerDash();
          this.craft.dashCooldown = 5.0 + Math.random() * 2.0;
          if (this.craft.setEmotion && Math.random() < 0.3) {
            this.craft.setEmotion('dash', 1.0, 'FALLBACK!', '⚠️');
          }
        }
      }



      return;
    }

    this.isRetreating = false;

    // -------------------------------------------------------------
    // STEP 2.5: ACTIVE THREAT EVASION & DASH JUKE (HARDCORE AI JUKE!)
    // If an opponent is in active dash charging directly at this bot, juke laterally!
    // -------------------------------------------------------------
    let incomingCharger = null;
    let chargerDist = Infinity;

    for (const other of allCrafts) {
      if (other === this.craft || !other.alive || !other.grounded) continue;
      if (!other.isDashing) continue;

      const cdx = this.craft.x - other.x;
      const cdz = this.craft.z - other.z;
      const d = Math.hypot(cdx, cdz);

      if (d < 5.5 && d > 0.1) {
        const chargerHeadingX = Math.sin(other.facing);
        const chargerHeadingZ = Math.cos(other.facing);
        const dot = (cdx / d) * chargerHeadingX + (cdz / d) * chargerHeadingZ;

        // dot > 0.62 means charger is aimed directly at this bot!
        if (dot > 0.62 && d < chargerDist) {
          chargerDist = d;
          incomingCharger = { craft: other, cdx, cdz, dist: d };
        }
      }
    }

    if (incomingCharger && Math.random() < this.personality.dodgeSkill) {
      // Lateral evasion perpendicular to incoming charge vector
      const perpX1 = -incomingCharger.cdz / incomingCharger.dist;
      const perpZ1 = incomingCharger.cdx / incomingCharger.dist;
      const perpX2 = incomingCharger.cdz / incomingCharger.dist;
      const perpZ2 = -incomingCharger.cdx / incomingCharger.dist;

      const dCenter1 = Math.hypot(this.craft.x + perpX1 * 2, this.craft.z + perpZ1 * 2);
      const dCenter2 = Math.hypot(this.craft.x + perpX2 * 2, this.craft.z + perpZ2 * 2);

      const bestPerpX = dCenter1 < dCenter2 ? perpX1 : perpX2;
      const bestPerpZ = dCenter1 < dCenter2 ? perpZ1 : perpZ2;

      this.steerX = bestPerpX * 1.35;
      this.steerZ = bestPerpZ * 1.35;



      return;
    }

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
      if (Math.abs(lx) < 5.2 && lz > -0.6 && lz < 2.0) {
        const escapeX = -sinA * Math.sign(lz + 0.1);
        const escapeZ = cosA * Math.sign(lz + 0.1);

        this.steerX = escapeX * 1.2 - (this.craft.x / myDist) * 0.3;
        this.steerZ = escapeZ * 1.2 - (this.craft.z / myDist) * 0.3;

        if (Math.random() < 0.25 && this.craft.dashCooldown <= 0) {
          this.craft.triggerDash();
          this.craft.dashCooldown = 4.5 + Math.random() * 2.0;
        }
        return;
      }
    }

    // -------------------------------------------------------------
    // STEP 4: HAZARD AVOIDANCE & BENEFICIAL POWER-UP HUNTING
    // Smart bots actively steer clear of cursed hazard traps, but hunt beneficial power-ups
    // -------------------------------------------------------------
    if (arena && arena.powerUps) {
      // 4A: Check for nearby hazardous traps (Toxic Sludge or EMP Jammer)
      if (this.personality.survival > 0.52) {
        for (const pu of arena.powerUps) {
          if (pu.collected) continue;
          // single deck power-up
          if (pu.type === 'hazard_slow' || pu.type === 'hazard_jam') {
            const hDist = Math.hypot(pu.x - this.craft.x, pu.z - this.craft.z);
            if (hDist < 3.2) {
              // Steer away from this hazard trap!
              const hDx = (this.craft.x - pu.x) / (hDist || 1);
              const hDz = (this.craft.z - pu.z) / (hDist || 1);
              this.steerX = hDx * 1.15;
              this.steerZ = hDz * 1.15;
              return;
            }
          }
        }
      }

      // 4B: Opportunistic grab of positive buffs (Rocket, Shield, Crystal)
      if (!this.craft.hasShield && !this.craft.hasRocket) {
        let bestPU = null;
        let minPUDist = Infinity;

        for (const pu of arena.powerUps) {
          if (pu.collected) continue;
          // Ignore hazard traps or other tiers
          // single deck power-up
          if (pu.type === 'hazard_slow' || pu.type === 'hazard_jam') continue;

          const puDistCenter = Math.hypot(pu.x, pu.z);
          if (puDistCenter > safeZoneRadius - 1.2) continue;

          const distToMe = Math.hypot(pu.x - this.craft.x, pu.z - this.craft.z);
          if (distToMe < 6.5 && distToMe < minPUDist) {
            minPUDist = distToMe;
            bestPU = pu;
          }
        }

        if (bestPU && minPUDist < 6.8 && Math.random() < 0.65) {
          const puDx = bestPU.x - this.craft.x;
          const puDz = bestPU.z - this.craft.z;
          this.steerX = puDx / minPUDist;
          this.steerZ = puDz / minPUDist;
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 5: PREDATOR TARGET SELECTION & VULNERABILITY EXPLOITATION
    // Bots aggressively prioritize vulnerable, trapped, or edge-stranded targets!
    // ANTI-SUICIDE: Never eliminate each other if the human is active!
    // -------------------------------------------------------------
    let bestTarget = null;
    let bestScore = -Infinity;

    allCrafts.forEach(c => {
      if (c === this.craft || !c.alive || !c.grounded) return;
      

      // If human is on Tier 2, bots on Tier 1 do not attack each other!
      

      const dx = c.x - this.craft.x;
      const dz = c.z - this.craft.z;
      const dist = Math.hypot(dx, dz);
      const rivalDistFromCenter = Math.hypot(c.x, c.z);

      // Human Player Detection
      const isHumanRival = c.isPlayer || (c.isRemote && !c.pilotName.startsWith('[BOT]'));

      let score = 50.0 - dist;

      // Heavy priority on Human Player
      if (isHumanRival) {
        score += 45.0 * this.personality.aggression;
      }

      // Predator opportunism
      if (c.isGlitchSlow) score += 18.0;
      if (c.isJammed) score += 15.0;
      if (c.knockbackTimer > 0) score += 12.0;
      if (rivalDistFromCenter > safeZoneRadius - 3.2) {
        score += 25.0 * this.personality.aggression;
      }
      if (c.hasShield) score -= 25.0;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = c;
      }
    });

    if (!bestTarget) {
      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);
      this.steerX = toCenterX * 0.35;
      this.steerZ = toCenterZ * 0.35;
      return;
    }

    // -------------------------------------------------------------
    // STEP 6: TACTICAL FLANKING & FULL-THROTTLE DRIVE
    // -------------------------------------------------------------
    const targetDistCenter = Math.hypot(bestTarget.x, bestTarget.z);
    const edgeDirX = bestTarget.x / (targetDistCenter || 1);
    const edgeDirZ = bestTarget.z / (targetDistCenter || 1);

    // Flank behind the opponent relative to arena center to push them outwards!
    const flankOffset = 1.0 * this.personality.aggression;
    const flankPosX = bestTarget.x - edgeDirX * flankOffset;
    const flankPosZ = bestTarget.z - edgeDirZ * flankOffset;

    const toTargetDx = bestTarget.x - this.craft.x;
    const toTargetDz = bestTarget.z - this.craft.z;
    const directDist = Math.hypot(toTargetDx, toTargetDz);

    let steerDx, steerDz;
    if (directDist < 1.8) {
      steerDx = toTargetDx;
      steerDz = toTargetDz;
    } else {
      steerDx = flankPosX - this.craft.x;
      steerDz = flankPosZ - this.craft.z;
    }

    const steerDist = Math.hypot(steerDx, steerDz);
    if (steerDist > 0.05) {
      let nx = steerDx / steerDist;
      let nz = steerDz / steerDist;

      // Slight natural steering wobble
      if (this.steerNoise > 0.02) {
        const noiseAngle = (Math.random() - 0.5) * this.steerNoise;
        const cosN = Math.cos(noiseAngle);
        const sinN = Math.sin(noiseAngle);
        nx = nx * cosN - nz * sinN;
        nz = nx * sinN + nz * cosN;
      }

      this.steerX = nx * 1.20; // Full throttle hardcore drive!
      this.steerZ = nz * 1.20;
    }

    // -------------------------------------------------------------
    // STEP 7: HARDCORE DASH RAM & DEFENSIVE EMP EXECUTION
    // -------------------------------------------------------------
    const predX = this.craft.x + Math.cos(this.craft.facing) * 6.5;
    const predZ = this.craft.z + Math.sin(this.craft.facing) * 6.5;
    const predDist = Math.hypot(predX, predZ);
    const isDashSafe = predDist < (safeZoneRadius - 1.0);

    const angleToTarget = Math.atan2(toTargetDx, toTargetDz);
    let angleDiff = Math.abs(angleToTarget - this.craft.facing);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    // A) Tactical Dash Ram (Snappy, punchy, equal dash chance)
    if (directDist >= 1.8 && directDist <= 5.8 && this.craft.dashCooldown <= 0 && isDashSafe) {
      if (Math.abs(angleDiff) < 0.42 && Math.random() < this.personality.dashSkill) {
        this.craft.triggerDash();
        this.craft.dashCooldown = 2.4 + Math.random() * 1.4; // Responsive ~2.4 - 3.8s cooldown
        if (Math.random() < 0.35 && this.craft.setEmotion) {
          const taunts = ['OUT OF MY WAY!', 'RAMMING SPEED!', 'FEEL THE IMPACT!', 'NO ESCAPE!', 'EAT BUMPER!'];
          this.craft.setEmotion('dash', 1.0, taunts[Math.floor(Math.random() * taunts.length)], '💥');
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
    // Extended roster for public rooms (up to 19 unique bots)
    this.extendedRoster = [
      { name: 'Vortex_Hunter',  color: 'pink' },
      { name: 'Decoded_Titan',  color: 'blue' },
      { name: 'Cyber_Phantom',  color: 'gold' },
      { name: 'Neon_Striker',   color: 'crimson' },
      { name: 'Dili_Supreme',   color: 'mint' },
      { name: 'Nova_Cadet',     color: 'cobalt' },
      { name: 'Astro_Smasher',  color: 'pink' },
      { name: 'Hex_Fury',       color: 'gold' },
      { name: 'Void_Stalker',   color: 'crimson' },
      { name: 'Pulse_Breaker',  color: 'mint' },
      { name: 'Grid_Reaper',    color: 'blue' },
      { name: 'Flux_Racer',     color: 'cobalt' },
      { name: 'Photon_Hammer',  color: 'gold' },
      { name: 'Plasma_Viper',   color: 'pink' },
      { name: 'Ion_Crusher',    color: 'crimson' },
      { name: 'Data_Wraith',    color: 'mint' },
      { name: 'Core_Blaster',   color: 'blue' },
      { name: 'Byte_Bomber',    color: 'cobalt' },
      { name: 'Arc_Sentinel',   color: 'gold' }
    ];
  }

  /**
   * Spawn bots with balanced difficulty scaling.
   * @param {number} arenaRadius - current arena radius for placement
   * @param {number} botCount - number of bots to spawn (default 4)
   * @param {string} difficulty - 'easy' | 'medium' | 'hard' | 'public' (default 'hard')
   */
  spawn(arenaRadius, botCount = 4, difficulty = 'hard') {
    this.clear();
    const count = Math.min(botCount, this.extendedRoster.length);
    const spawnRadius = Math.min(arenaRadius * 0.50, 10.0);

    // Shuffle extended roster for variety
    const shuffled = [...this.extendedRoster].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    selected.forEach((cfg, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * spawnRadius;
      const z = Math.sin(angle) * spawnRadius;

      const bot = new AIBumperBot(this.scene, cfg.name, cfg.color);

      // Apply difficulty scaling to personality & physics
      if (difficulty === 'easy') {
        // Active Brawlers (2 bots): Energetic clashing, accessible yet fun!
        bot.personality.aggression = 0.65 + Math.random() * 0.15;
        bot.personality.survival = 0.68 + Math.random() * 0.12;
        bot.personality.dashSkill = 0.42 + Math.random() * 0.15;
        bot.personality.dodgeSkill = 0.48 + Math.random() * 0.18;
        bot.thinkInterval = 0.15 + Math.random() * 0.05;
        bot.steerNoise = 0.12;
        bot.craft.baseSpeed = 10.8;
        bot.craft.mass = 1.0;
        bot.craft.baseMass = 1.0;
      } else if (difficulty === 'medium') {
        // Hardcore Brawlers (3 bots): Sharp reflexes, proactive dash attacks, jukes!
        bot.personality.aggression = 0.82 + Math.random() * 0.14;
        bot.personality.survival = 0.78 + Math.random() * 0.12;
        bot.personality.dashSkill = 0.62 + Math.random() * 0.16;
        bot.personality.dodgeSkill = 0.68 + Math.random() * 0.18;
        bot.thinkInterval = 0.11 + Math.random() * 0.04;
        bot.steerNoise = 0.08;
        bot.craft.baseSpeed = 11.2;
        bot.craft.mass = 1.0;
        bot.craft.baseMass = 1.0;
      } else if (difficulty === 'hard') {
        // Arena Champions (4 bots): Ruthless, lightning jukes, flawless edge punish!
        bot.personality.aggression = 0.94 + Math.random() * 0.06;
        bot.personality.survival = 0.86 + Math.random() * 0.10;
        bot.personality.dashSkill = 0.78 + Math.random() * 0.14;
        bot.personality.dodgeSkill = 0.82 + Math.random() * 0.14;
        bot.thinkInterval = 0.09 + Math.random() * 0.03;
        bot.steerNoise = 0.04;
        bot.craft.baseSpeed = 11.5;
        bot.craft.mass = 1.02;
        bot.craft.baseMass = 1.02;
      } else {
        // 'public' (Battle Royale): High-octane arena sumo!
        const roll = Math.random();
        if (roll < 0.25) {
          // Brawler bot
          bot.personality.aggression = 0.72 + Math.random() * 0.15;
          bot.personality.survival = 0.72 + Math.random() * 0.12;
          bot.personality.dashSkill = 0.48 + Math.random() * 0.14;
          bot.personality.dodgeSkill = 0.52 + Math.random() * 0.16;
          bot.thinkInterval = 0.13 + Math.random() * 0.04;
          bot.steerNoise = 0.10;
          bot.craft.baseSpeed = 11.0;
          bot.craft.mass = 1.0;
          bot.craft.baseMass = 1.0;
        } else if (roll < 0.70) {
          // Gladiator bot
          bot.personality.aggression = 0.84 + Math.random() * 0.12;
          bot.personality.survival = 0.80 + Math.random() * 0.10;
          bot.personality.dashSkill = 0.65 + Math.random() * 0.14;
          bot.personality.dodgeSkill = 0.70 + Math.random() * 0.15;
          bot.thinkInterval = 0.10 + Math.random() * 0.03;
          bot.steerNoise = 0.06;
          bot.craft.baseSpeed = 11.4;
          bot.craft.mass = 1.0;
          bot.craft.baseMass = 1.0;
        } else {
          // Veteran bot
          bot.personality.aggression = 0.95 + Math.random() * 0.05;
          bot.personality.survival = 0.86 + Math.random() * 0.10;
          bot.personality.dashSkill = 0.80 + Math.random() * 0.12;
          bot.personality.dodgeSkill = 0.84 + Math.random() * 0.12;
          bot.thinkInterval = 0.09 + Math.random() * 0.03;
          bot.steerNoise = 0.04;
          bot.craft.baseSpeed = 11.6;
          bot.craft.mass = 1.02;
          bot.craft.baseMass = 1.02;
        }
      }

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

  spawnBotList(botList, difficulty = 'hard') {
    this.clear();
    if (!botList || !botList.length) return;
    botList.forEach(b => {
      const bot = new AIBumperBot(this.scene, b.pilotName, b.suitColor);
      bot.id = b.id;
      bot.craft.id = b.id;
      bot.craft.pilotName = b.pilotName;
      bot.personality.aggression = 0.85;
      bot.personality.survival = 0.80;
      bot.personality.dashSkill = 0.65;
      bot.personality.dodgeSkill = 0.60;
      bot.craft.baseSpeed = 11.5;
      bot.craft.mass = 1.35;
      bot.craft.baseMass = 1.35;
      bot.spawn(b.spawnX, b.spawnZ);
      this.bots.push(bot);
    });
  }

  clear() {
    this.bots.forEach(b => b.remove());
    this.bots = [];
  }
}


if (typeof window !== 'undefined') {
  window.AIBumperManager = AIBumperManager;
}
if (typeof globalThis !== 'undefined') {
  globalThis.AIBumperManager = AIBumperManager;
}

