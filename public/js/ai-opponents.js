// ============================================================
// DILI: CYBER BUMPERS — Balanced Tactical Combat & Survival Bot AI
// Natural Free-For-All Arcade Sumo Brawlers
// ============================================================
class AIBumperBot {
  constructor(scene, name, suitColor) {
    this.name = name;
    this.craft = new BumperCraft(scene, suitColor, name);
    this.craft.isPlayer = false;

    this.thinkTimer = 0;
    this.thinkInterval = 0.10 + Math.random() * 0.03; // Fast 10 Hz reflexes
    this.personality = {
      aggression: 0.76 + Math.random() * 0.10, // Controlled tactical engagement
      survival: 0.86 + Math.random() * 0.08,   // High edge awareness (avoids self-suicide)
      dashSkill: 0.78 + Math.random() * 0.12,  // Precise, calculated outward ramming
      dodgeSkill: 0.70 + Math.random() * 0.12, // Smart lateral sidesteps & counter-jukes
      disruptSkill: 0.88 + Math.random() * 0.10, // High smarts for cutting off routes & gatekeeping
      empSkill: 0.80 + Math.random() * 0.12    // Tactical shockwave ring-out finisher
    };

    this.steerX = 0;
    this.steerZ = 0;
    this.targetSteerX = 0;
    this.targetSteerZ = 0;
    this.targetCraft = null;
    this.targetLockTimer = 0;
    this.isRetreating = false;
    this._cryoReduced = false;
    this.lifetime = 0;
  }

  spawn(x, z) {
    this.craft.reset(x, z);
    this.isRetreating = false;
    this.targetSteerX = 0;
    this.targetSteerZ = 0;
    this.steerX = 0;
    this.steerZ = 0;
    this.targetCraft = null;
    this.targetLockTimer = 0;
    this._cryoReduced = false;
    this.lifetime = 0;
  }

  update(dt, allCrafts, arenaRadius, arena = null) {
    if (!this.craft.alive) return;
    this.lifetime += dt;

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

    // Cryo Glacier: 5% reduced aggression (smoother control on sub-zero ice drift)
    if (arena && arena.theme === 'cryo' && !this._cryoReduced) {
      this._cryoReduced = true;
      this.personality.aggression = Math.max(0.40, this.personality.aggression - 0.05);
    }

    // 2. Tactical AI Decision Cycle
    this.thinkTimer += dt;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._think(allCrafts, arenaRadius, arena);
    }

    // 3. Smooth Steering Interpolation (eliminates jitter and erratic twitching)
    const steerLerpRate = Math.min(1.0, dt * 8.5);
    this.steerX += (this.targetSteerX - this.steerX) * steerLerpRate;
    this.steerZ += (this.targetSteerZ - this.steerZ) * steerLerpRate;

    // 4. Apply Steer & Physics
    this.craft.update(dt, this.steerX, this.steerZ, arena || arenaRadius, (window.engine ? window.engine.camera : null));
  }

  _think(allCrafts, arenaRadius, arena = null) {
    const myDist = Math.sqrt(this.craft.x * this.craft.x + this.craft.z * this.craft.z);

    // -------------------------------------------------------------
    // STEP 1: MULTI-TIER ARENA COLLAPSE & SAFE ZONE DETECTION
    // -------------------------------------------------------------
    const myTier = this.craft.currentTier || 1;
    let safeZoneRadius = 18.5;
    let isImminentDrop = false;
    let warningDropStage = null;

    if (myTier === 2) {
      // TIER 2: SUB-LEVEL CYBER DECK (Fast shrinking pit!)
      let currentLowerSafe = arena && arena.lowerRadius ? arena.lowerRadius : 25;
      if (arena && arena.lowerRingStages) {
        const activeDangerStage = arena.lowerRingStages.find(s => !s.collapsed && (s.warned || s.dropping));
        if (activeDangerStage) {
          currentLowerSafe = Math.min(currentLowerSafe, activeDangerStage.radiusMin);
          warningDropStage = activeDangerStage;
        }
      }
      safeZoneRadius = Math.max(4.5, currentLowerSafe - 1.8);
      isImminentDrop = myDist > (safeZoneRadius + 0.4);
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
          megaDanger = true;
          if (mega.warned || mega.dropping) warningDropStage = mega;
        }
        if (outer && (outer.warned || outer.dropping || outer.collapsed)) {
          outerDanger = true;
          if (outer.warned || outer.dropping) warningDropStage = outer;
        }
        if (mid && (mid.warned || mid.dropping || mid.collapsed)) {
          midDanger = true;
          if (mid.warned || mid.dropping) warningDropStage = mid;
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
    // When the ground drops, navigate safely inward towards origin (0, 0)
    // -------------------------------------------------------------
    const isOutsideSafe = myDist > safeZoneRadius;

    if (isOutsideSafe || isImminentDrop) {
      this.isRetreating = true;

      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);

      this.targetSteerX = toCenterX;
      this.targetSteerZ = toCenterZ;

      // Safe fallback dash if stranded far out AND facing towards center
      if (this.craft.dashCooldown <= 0 && this.craft.grounded && myDist > safeZoneRadius + 1.8) {
        const forwardX = Math.sin(this.craft.facing);
        const forwardZ = Math.cos(this.craft.facing);
        const facingCenterDot = forwardX * toCenterX + forwardZ * toCenterZ;

        if (facingCenterDot > 0.65 && Math.random() < this.personality.survival * 0.5) {
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
    // STEP 2.5: ACTIVE THREAT EVASION & COUNTER-EMP JUKE
    // If an opponent is in active dash charging directly at this bot:
    // Try smart defensive EMP first; otherwise juke laterally!
    // -------------------------------------------------------------
    let incomingCharger = null;
    let chargerDist = Infinity;

    for (const other of allCrafts) {
      if (other === this.craft || !other.alive || !other.grounded) continue;
      if (!other.isDashing) continue;

      const cdx = this.craft.x - other.x;
      const cdz = this.craft.z - other.z;
      const d = Math.hypot(cdx, cdz);

      if (d < 5.2 && d > 0.1) {
        const chargerHeadingX = Math.sin(other.facing);
        const chargerHeadingZ = Math.cos(other.facing);
        const dot = (cdx / d) * chargerHeadingX + (cdz / d) * chargerHeadingZ;

        // dot > 0.68 means charger is aimed directly at this bot!
        if (dot > 0.68 && d < chargerDist) {
          chargerDist = d;
          incomingCharger = { craft: other, cdx, cdz, dist: d };
        }
      }
    }

    if (incomingCharger) {
      // Smart Counter-Play: If attacker is within 3.8m and bot has EMP ready, blast them away!
      if (this.craft.empCooldown <= 0 && incomingCharger.dist < 3.8 && !this.craft.isJammed && Math.random() < this.personality.dodgeSkill) {
        if (this.craft.triggerEmp(allCrafts)) {
          if (this.craft.setEmotion) {
            this.craft.setEmotion('dash', 1.0, 'COUNTER BLAST! ⚡', '🛡️');
          }
          return;
        }
      }

      if (Math.random() < this.personality.dodgeSkill) {
        // Lateral evasion perpendicular to incoming charge vector
        const perpX1 = -incomingCharger.cdz / incomingCharger.dist;
        const perpZ1 = incomingCharger.cdx / incomingCharger.dist;
        const perpX2 = incomingCharger.cdz / incomingCharger.dist;
        const perpZ2 = -incomingCharger.cdx / incomingCharger.dist;

        const dCenter1 = Math.hypot(this.craft.x + perpX1 * 2, this.craft.z + perpZ1 * 2);
        const dCenter2 = Math.hypot(this.craft.x + perpX2 * 2, this.craft.z + perpZ2 * 2);

        const bestPerpX = dCenter1 < dCenter2 ? perpX1 : perpX2;
        const bestPerpZ = dCenter1 < dCenter2 ? perpZ1 : perpZ2;

        this.targetSteerX = bestPerpX * 1.1;
        this.targetSteerZ = bestPerpZ * 1.1;
        return;
      }
    }

    // -------------------------------------------------------------
    // STEP 3: CYBER SWEEPER HAZARD AVOIDANCE (CENTER BUMPER)
    // -------------------------------------------------------------
    if (arena && arena.hazardGroup && myDist < 5.2) {
      const theta = arena.hazardGroup.rotation.y;
      const cosA = Math.cos(theta);
      const sinA = Math.sin(theta);
      const lx = this.craft.x * cosA - this.craft.z * sinA;
      const lz = this.craft.x * sinA + this.craft.z * cosA;

      // If within swept danger sector
      if (Math.abs(lx) < 4.8 && lz > -0.6 && lz < 1.8) {
        const escapeX = -sinA * Math.sign(lz + 0.1);
        const escapeZ = cosA * Math.sign(lz + 0.1);

        this.targetSteerX = escapeX * 1.1 - (this.craft.x / myDist) * 0.25;
        this.targetSteerZ = escapeZ * 1.1 - (this.craft.z / myDist) * 0.25;

        if (Math.random() < 0.22 && this.craft.dashCooldown <= 0) {
          this.craft.triggerDash();
          this.craft.dashCooldown = 4.5 + Math.random() * 2.0;
        }
        return;
      }
    }

    // -------------------------------------------------------------
    // STEP 4: HAZARD TRAP AVOIDANCE & BENEFICIAL POWER-UP HUNTING
    // -------------------------------------------------------------
    if (arena && arena.powerUps) {
      // 4A: Check for nearby hazardous traps (Toxic Sludge or EMP Jammer)
      if (this.personality.survival > 0.52) {
        for (const pu of arena.powerUps) {
          if (pu.collected) continue;
          if (pu.type === 'hazard_slow' || pu.type === 'hazard_jam') {
            const hDist = Math.hypot(pu.x - this.craft.x, pu.z - this.craft.z);
            if (hDist < 3.0) {
              const hDx = (this.craft.x - pu.x) / (hDist || 1);
              const hDz = (this.craft.z - pu.z) / (hDist || 1);
              this.targetSteerX = hDx * 1.05;
              this.targetSteerZ = hDz * 1.05;
              return;
            }
          }
        }
      }

      // 4B: Opportunistic grab of positive buffs (Rocket, Shield, Crystal, Super Ram)
      if (!this.craft.hasShield && !this.craft.hasRocket && !this.craft.hasSuperRam) {
        let bestPU = null;
        let minPUDist = Infinity;

        for (const pu of arena.powerUps) {
          if (pu.collected) continue;
          if (pu.type === 'hazard_slow' || pu.type === 'hazard_jam') continue;

          const puDistCenter = Math.hypot(pu.x, pu.z);
          if (puDistCenter > safeZoneRadius - 1.2) continue;

          const distToMe = Math.hypot(pu.x - this.craft.x, pu.z - this.craft.z);
          if (distToMe < 5.5 && distToMe < minPUDist) {
            minPUDist = distToMe;
            bestPU = pu;
          }
        }

        if (bestPU && minPUDist < 5.5 && Math.random() < 0.55) {
          const puDx = bestPU.x - this.craft.x;
          const puDz = bestPU.z - this.craft.z;
          this.targetSteerX = puDx / minPUDist;
          this.targetSteerZ = puDz / minPUDist;
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 5: SMART DISRUPTOR TARGET SELECTION
    // Prime focus: Human players! Goal: Disrupt their path, push them,
    // and launch them off the arena.
    // -------------------------------------------------------------
    this.targetLockTimer -= this.thinkInterval;

    let bestTarget = null;
    let bestScore = -Infinity;

    // Check if previous target is still alive, grounded, and within reasonable range
    const isCurrentTargetValid = this.targetCraft &&
      this.targetCraft.alive &&
      this.targetCraft.grounded &&
      (Math.hypot(this.targetCraft.x - this.craft.x, this.targetCraft.z - this.craft.z) < 16.0) &&
      this.targetLockTimer > 0;

    allCrafts.forEach(c => {
      if (c === this.craft || !c.alive || !c.grounded) return;

      const dx = c.x - this.craft.x;
      const dz = c.z - this.craft.z;
      const dist = Math.hypot(dx, dz);
      const rivalDistCenter = Math.hypot(c.x, c.z);

      // Distance scoring: closer targets are easier to disrupt
      let score = 32.0 - dist * 1.3;

      // HUMAN DISRUPTOR FOCUS:
      const isHumanRival = c.isPlayer || (c.isRemote && !c.pilotName.startsWith('[BOT]'));
      if (isHumanRival) {
        // Base priority for human disruption (ramps smoothly from early exploration to intense battle)
        const isEarlyMatch = this.lifetime < 7.0;
        score += isEarlyMatch ? 12.0 : 38.0;

        // SMART DISRUPTION OPPORTUNITY BONUSES:
        // 1. Edge Vulnerability: If human is near the boundary, prime target to shove off!
        if (rivalDistCenter > safeZoneRadius - 3.2) {
          score += 26.0 * (this.personality.disruptSkill || 0.85);
        }

        // 2. Trapped in collapsing ring: Gatekeep them and don't let them back in!
        if (warningDropStage && rivalDistCenter >= warningDropStage.radiusMin) {
          score += 22.0 * (this.personality.disruptSkill || 0.85);
        }

        // 3. Vulnerability states: in knockback, slowed, or jammed
        if (c.knockbackTimer > 0) score += 14.0;
        if (c.isGlitchSlow) score += 12.0;
        if (c.isJammed) score += 10.0;
      } else {
        // Other bots: only target if very close or already teetering on edge
        if (rivalDistCenter > safeZoneRadius - 2.0) score += 12.0;
        if (c.knockbackTimer > 0) score += 8.0;
      }

      // Target persistence bonus: stick to current duel rather than whipping around every tick
      if (c === this.targetCraft && isCurrentTargetValid) {
        score += 6.0;
      }

      if (c.hasShield) score -= 14.0;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = c;
      }
    });

    if (bestTarget !== this.targetCraft) {
      this.targetCraft = bestTarget;
      this.targetLockTimer = 1.0 + Math.random() * 0.7; // Lock onto target for 1.0s - 1.7s
    }

    if (!bestTarget) {
      const toCenterX = -this.craft.x / (myDist || 1);
      const toCenterZ = -this.craft.z / (myDist || 1);
      this.targetSteerX = toCenterX * 0.35;
      this.targetSteerZ = toCenterZ * 0.35;
      return;
    }

    // -------------------------------------------------------------
    // STEP 6: PREDICTIVE INTERCEPTION & OUTWARD RING-OUT PUSH
    // Don't just chase behind; calculate lead time, angle, and shove!
    // -------------------------------------------------------------
    const targetVx = bestTarget.vx || 0;
    const targetVz = bestTarget.vz || 0;
    const toTargetDx = bestTarget.x - this.craft.x;
    const toTargetDz = bestTarget.z - this.craft.z;
    const directDist = Math.hypot(toTargetDx, toTargetDz);

    // Target outward radial vector from arena center (points straight into the void!)
    const targetCenterDist = Math.hypot(bestTarget.x, bestTarget.z) || 1;
    const outDirX = bestTarget.x / targetCenterDist;
    const outDirZ = bestTarget.z / targetCenterDist;

    // Smart lead time prediction based on distance and relative velocity
    const leadTime = Math.min(0.55, directDist / (this.craft.baseSpeed || 12.0));
    const predTargetX = bestTarget.x + targetVx * leadTime;
    const predTargetZ = bestTarget.z + targetVz * leadTime;

    const isHuman = bestTarget.isPlayer || (bestTarget.isRemote && !bestTarget.pilotName.startsWith('[BOT]'));

    // -------------------------------------------------------------
    // GATEKEEPER TACTIC:
    // If the human is trapped outside safeZoneRadius or on a dropping ring,
    // position at the boundary border to body-block their return to safety!
    // -------------------------------------------------------------
    let isGatekeeping = false;
    if (isHuman && (targetCenterDist > safeZoneRadius || (warningDropStage && targetCenterDist >= warningDropStage.radiusMin))) {
      const blockPointX = outDirX * (safeZoneRadius - 0.7);
      const blockPointZ = outDirZ * (safeZoneRadius - 0.7);
      const toBlockDx = blockPointX - this.craft.x;
      const toBlockDz = blockPointZ - this.craft.z;
      const blockDist = Math.hypot(toBlockDx, toBlockDz);

      if (blockDist > 0.4) {
        this.targetSteerX = toBlockDx / blockDist;
        this.targetSteerZ = toBlockDz / blockDist;
      } else {
        // At the gate! Face the human and push outward against them with fair 1.0x engine force!
        this.targetSteerX = outDirX * 1.0;
        this.targetSteerZ = outDirZ * 1.0;
      }
      isGatekeeping = true;
    }

    if (!isGatekeeping) {
      // -------------------------------------------------------------
      // OUTWARD SHOVE GEOMETRY:
      // Attack from the center-side of the target so collision momentum
      // blows the target outward toward the void!
      // -------------------------------------------------------------
      const shoveOffset = Math.min(1.8, Math.max(0.75, directDist * 0.28));
      const attackX = predTargetX - outDirX * shoveOffset;
      const attackZ = predTargetZ - outDirZ * shoveOffset;

      const steerDx = attackX - this.craft.x;
      const steerDz = attackZ - this.craft.z;
      const steerDist = Math.hypot(steerDx, steerDz);

      if (steerDist > 0.05) {
        this.targetSteerX = steerDx / steerDist;
        this.targetSteerZ = steerDz / steerDist;
      }

      // CLOSE-RANGE BUMPER SHOVE:
      // When close to target (< 2.3m) and positioned center-side:
      if (directDist < 2.3 && (targetCenterDist >= myDist - 0.35)) {
        // Drive towards target and press outward, fair 1.0x engine force (human-equivalent power)
        const pushDx = outDirX * 0.7 + (toTargetDx / (directDist || 1)) * 0.3;
        const pushDz = outDirZ * 0.7 + (toTargetDz / (directDist || 1)) * 0.3;
        const pushLen = Math.hypot(pushDx, pushDz) || 1;
        this.targetSteerX = pushDx / pushLen;
        this.targetSteerZ = pushDz / pushLen;
      }
    }

    // -------------------------------------------------------------
    // EDGE-BRAKING SELF-CONTROL:
    // Don't commit suicide! If the bot gets dangerously close to edge,
    // apply counter-steer inward so it stops safely while rival falls!
    // -------------------------------------------------------------
    if (myDist > safeZoneRadius - 0.55) {
      const inX = -this.craft.x / myDist;
      const inZ = -this.craft.z / myDist;
      this.targetSteerX = this.targetSteerX * 0.35 + inX * 1.15;
      this.targetSteerZ = this.targetSteerZ * 0.35 + inZ * 1.15;
      const len = Math.hypot(this.targetSteerX, this.targetSteerZ);
      if (len > 1.0) {
        this.targetSteerX /= len;
        this.targetSteerZ /= len;
      }
    }

    // -------------------------------------------------------------
    // STEP 7: TACTICAL ABILITIES (EMP SHOCKWAVE & CONTROLLED DASH)
    // -------------------------------------------------------------
    const forwardX = Math.sin(this.craft.facing);
    const forwardZ = Math.cos(this.craft.facing);

    // 1. TACTICAL EMP SHOCKWAVE FINISHER:
    // When human is in blast range (< 7.0m) and near the edge, blast them outward!
    if (this.craft.empCooldown <= 0 && this.craft.grounded && !this.craft.isJammed) {
      if (isHuman && directDist < 7.0 && targetCenterDist > (safeZoneRadius - 4.2)) {
        const blastDx = (bestTarget.x - this.craft.x) / (directDist || 1);
        const blastDz = (bestTarget.z - this.craft.z) / (directDist || 1);
        const blastOutwardDot = blastDx * outDirX + blastDz * outDirZ;

        // Ensure shockwave knocks them towards the void
        if (blastOutwardDot > 0.35 && Math.random() < (this.personality.empSkill || 0.80)) {
          if (this.craft.triggerEmp(allCrafts)) {
            if (this.craft.setEmotion) {
              this.craft.setEmotion('dash', 1.2, 'BLAST OFF! ⚡', '💥');
            }
          }
        }
      }
    }

    // 2. CONTROLLED TACTICAL DASH RAM:
    // Only dash when it knocks the rival OUTWARD and the bot won't slide into the void!
    const predStopDist = Math.hypot(this.craft.x + forwardX * 4.2, this.craft.z + forwardZ * 4.2);
    const isDashSafeForBot = predStopDist < (safeZoneRadius - 0.4);
    const dashTowardsVoid = (forwardX * outDirX + forwardZ * outDirZ) > 0.38;

    const angleToTarget = Math.atan2(toTargetDx, toTargetDz);
    let angleDiff = angleToTarget - this.craft.facing;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (directDist >= 1.6 && directDist <= 5.2 && this.craft.dashCooldown <= 0 && isDashSafeForBot && dashTowardsVoid) {
      if (Math.abs(angleDiff) < 0.42 && Math.random() < this.personality.dashSkill) {
        this.craft.triggerDash();
        this.craft.dashCooldown = 3.6 + Math.random() * 1.5;
        if (Math.random() < 0.45 && this.craft.setEmotion) {
          const taunts = ['OUT OF THE RING!', 'OVER THE EDGE!', 'NOT ON MY WATCH!', 'TAKE A DIVE!', 'NO ESCAPE!'];
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
   * Spawn bots with smart disruptor difficulty scaling.
   * @param {number} arenaRadius - current arena radius for placement
   * @param {number} botCount - number of bots to spawn (default 4)
   * @param {string} difficulty - 'easy' | 'medium' | 'hard' | 'public' (default 'hard')
   * @param {string} theme - 'neon' | 'inferno' | 'cryo'
   */
  spawn(arenaRadius, botCount = 4, difficulty = 'hard', theme = 'neon') {
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

      // Fair arcade tuning (mass = 1.0 same as player!)
      bot.craft.mass = 1.0;
      bot.craft.baseMass = 1.0;

      if (difficulty === 'easy') {
        // Room 1 Easy: Moderate disruption with lenient reaction window
        bot.personality.aggression = 0.68 + Math.random() * 0.10;
        bot.personality.survival = 0.80 + Math.random() * 0.08;
        bot.personality.dashSkill = 0.52 + Math.random() * 0.10;
        bot.personality.dodgeSkill = 0.52 + Math.random() * 0.12;
        bot.personality.disruptSkill = 0.62 + Math.random() * 0.10;
        bot.personality.empSkill = 0.55 + Math.random() * 0.10;
        bot.thinkInterval = 0.13 + Math.random() * 0.03;
        bot.craft.baseSpeed = 11.4;
      } else if (difficulty === 'medium') {
        // Room 2 Medium: Focused smart disruption and route cutoffs
        bot.personality.aggression = 0.74 + Math.random() * 0.08;
        bot.personality.survival = 0.84 + Math.random() * 0.06;
        bot.personality.dashSkill = 0.68 + Math.random() * 0.10;
        bot.personality.dodgeSkill = 0.64 + Math.random() * 0.10;
        bot.personality.disruptSkill = 0.78 + Math.random() * 0.10;
        bot.personality.empSkill = 0.72 + Math.random() * 0.10;
        bot.thinkInterval = 0.11 + Math.random() * 0.02;
        bot.craft.baseSpeed = 12.0;
      } else if (difficulty === 'hard') {
        // Room 3 Hard: Master Gatekeeper & Ring-Out Hunter
        bot.personality.aggression = 0.78 + Math.random() * 0.08;
        bot.personality.survival = 0.88 + Math.random() * 0.05;
        bot.personality.dashSkill = 0.80 + Math.random() * 0.08;
        bot.personality.dodgeSkill = 0.72 + Math.random() * 0.08;
        bot.personality.disruptSkill = 0.92 + Math.random() * 0.06;
        bot.personality.empSkill = 0.85 + Math.random() * 0.08;
        bot.thinkInterval = 0.09 + Math.random() * 0.02;
        bot.craft.baseSpeed = 12.6;
      } else {
        // 'public' (Battle Royale Colosseum)
        bot.personality.aggression = 0.76 + Math.random() * 0.08;
        bot.personality.survival = 0.87 + Math.random() * 0.06;
        bot.personality.dashSkill = 0.78 + Math.random() * 0.10;
        bot.personality.dodgeSkill = 0.70 + Math.random() * 0.10;
        bot.personality.disruptSkill = 0.90 + Math.random() * 0.08;
        bot.personality.empSkill = 0.82 + Math.random() * 0.08;
        bot.thinkInterval = 0.09 + Math.random() * 0.02;
        bot.craft.baseSpeed = 12.4;
      }

      // Cryo Glacier: ice physics compensation (smooth controlled grip)
      if (theme === 'cryo') {
        bot.personality.aggression = Math.max(0.40, bot.personality.aggression - 0.05);
        bot._cryoReduced = true;
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

  spawnBotList(botList, difficulty = 'hard', theme = 'neon') {
    this.clear();
    if (!botList || !botList.length) return;
    botList.forEach(b => {
      const bot = new AIBumperBot(this.scene, b.pilotName, b.suitColor);
      bot.id = b.id;
      bot.craft.id = b.id;
      bot.craft.pilotName = b.pilotName;
      // Master Smart Disruptor tuning for Public Arena & Multiplayer
      bot.personality.aggression = 0.78 + Math.random() * 0.08;
      bot.personality.survival = 0.88 + Math.random() * 0.05;
      bot.personality.dashSkill = 0.80 + Math.random() * 0.08;
      bot.personality.dodgeSkill = 0.72 + Math.random() * 0.08;
      bot.personality.disruptSkill = 0.92 + Math.random() * 0.06;
      bot.personality.empSkill = 0.85 + Math.random() * 0.08;
      bot.thinkInterval = 0.09 + Math.random() * 0.02;
      bot.craft.baseSpeed = 12.4;
      bot.craft.mass = 1.0;
      bot.craft.baseMass = 1.0;

      // Cryo Glacier: ice physics compensation
      if (theme === 'cryo') {
        bot.personality.aggression = Math.max(0.40, bot.personality.aggression - 0.05);
        bot._cryoReduced = true;
      }

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
