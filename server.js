const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

app.use(cors());
app.use(express.json());

// Explicit Static Asset Handlers
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use(express.static(path.join(__dirname, 'public')));

// Known Bot Names and Identification
const KNOWN_BOT_NAMES = [
  'cyber-01', 'droid-02', 'vortex_hunter', 'decoded_titan',
  'cyber_phantom', 'neon_striker', 'dili_supreme', 'cyberghost_99',
  'astrodecoded', 'vortex_rider', 'novacadet', 'astro_bot', 'ai_pilot', 'cyber_bot'
];

function isBotAccount(name) {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase().replace(/[\[\]\s\-_]+/g, '');
  if (n.startsWith('bot') || n.startsWith('ai') || n.endsWith('bot')) return true;
  return KNOWN_BOT_NAMES.some(b => {
    const cleanB = b.replace(/[\[\]\s\-_]+/g, '');
    return n === cleanB || n.includes(cleanB);
  });
}

// In-memory cache of strictly human player scores
let leaderboardCache = [];

async function getLeaderboardFromRedis() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return leaderboardCache;
  try {
    const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_hexfall_leaderboard`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const arr = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(arr)) {
          leaderboardCache = arr
            .filter(e => e && e.pilot && !isBotAccount(e.pilot))
            .sort((a, b) => b.score - a.score);
          return leaderboardCache;
        }
      }
    }
  } catch (e) {
    console.warn('[HexFall] Fallback to cache:', e.message);
  }
  return leaderboardCache.filter(e => !isBotAccount(e.pilot));
}

async function saveScoreToRedis(newEntry) {
  if (isBotAccount(newEntry.pilot)) {
    throw new Error('Bot accounts are prohibited from the leaderboard.');
  }

  let current = await getLeaderboardFromRedis();
  current = current.filter(e => !isBotAccount(e.pilot));

  const existingIdx = current.findIndex(e => e.pilot.toLowerCase() === newEntry.pilot.toLowerCase());
  if (existingIdx !== -1) {
    if (newEntry.score > current[existingIdx].score) {
      current[existingIdx] = Object.assign({}, current[existingIdx], newEntry);
    }
  } else {
    current.push(newEntry);
  }

  current = current.sort((a, b) => b.score - a.score).slice(0, 100);
  leaderboardCache = current;

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_hexfall_leaderboard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(current),
        signal: AbortSignal.timeout(2500)
      });
    } catch (e) {
      console.warn('[HexFall] Error saving to Redis:', e.message);
    }
  }
  return current;
}

app.get('/api/leaderboard', async (req, res) => {
  const list = await getLeaderboardFromRedis();
  const cleanList = list.filter(e => !isBotAccount(e.pilot));
  res.json({ success: true, count: cleanList.length, leaderboard: cleanList });
});

app.post('/api/score/submit', async (req, res) => {
  try {
    const { pilot, score, survivalTime, tier, crystals, suitColor, win } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score' });
    }

    const cleanPilot = String(pilot).trim().slice(0, 25);
    if (isBotAccount(cleanPilot)) {
      return res.status(403).json({ success: false, error: 'Bot accounts cannot submit to leaderboard' });
    }

    const entry = {
      pilot: cleanPilot,
      score: Math.floor(score),
      survivalTime: Math.floor(survivalTime || 0),
      tier: tier || 1,
      crystals: crystals || 0,
      suitColor: suitColor || 'mint',
      win: !!win,
      timestamp: new Date().toISOString()
    };

    const updated = await saveScoreToRedis(entry);
    const rank = updated.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    res.json({
      success: true,
      rank: rank > 0 ? rank : updated.length,
      entry,
      totalPilots: updated.length
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===================================================================
// PERSISTENT LIVE PUBLIC ARENA (Always-Active Drop-in/Drop-out)
// Permanent 2 Bots ([BOT] Cyber-01, [BOT] Droid-02) + Instant Human Drop-In
// ===================================================================

const PERMANENT_BOTS = [
  { id: 'bot_cyber01', pilotName: '[BOT] Cyber-01', suitColor: 'crimson', spawnX: -6.0, spawnZ: -6.0, isBot: true },
  { id: 'bot_droid02', pilotName: '[BOT] Droid-02', suitColor: 'gold', spawnX: 6.0, spawnZ: -6.0, isBot: true }
];

const ARENA_THEMES_LIST = ['neon', 'inferno', 'cryo'];

class PersistentPublicArena {
  constructor() {
    this.id = 'public_arena_main';
    this.maxPlayers = 6;
    this.players = new Map(); // socket.id -> PlayerData
    this.bots = JSON.parse(JSON.stringify(PERMANENT_BOTS));
    this.aliveBotIds = new Set(this.bots.map(b => b.id));
    this.arenaSeed = Date.now();
    this.spawnAngles = [
      0,                    // bottom
      Math.PI,              // top
      Math.PI * 0.5,        // right
      Math.PI * 1.5,        // left
      Math.PI * 0.25,       // bottom-right
      Math.PI * 0.75        // top-right
    ];
    this.nextSpawnIdx = 0;
    this.currentThemeIndex = 0;
    this.currentTheme = ARENA_THEMES_LIST[0];
  }

  getNextSpawn() {
    const angle = this.spawnAngles[this.nextSpawnIdx % this.spawnAngles.length];
    this.nextSpawnIdx++;
    return {
      spawnX: Number((Math.sin(angle) * 10.0).toFixed(2)),
      spawnZ: Number((Math.cos(angle) * 10.0).toFixed(2)),
      spawnAngle: angle
    };
  }

  resetMatch() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % ARENA_THEMES_LIST.length;
    this.currentTheme = ARENA_THEMES_LIST[this.currentThemeIndex];
    console.log(`[PublicArena] Resetting arena for a fresh round! Rotating to theme: ${this.currentTheme.toUpperCase()}`);
    this.arenaSeed = Date.now();
    this.bots = JSON.parse(JSON.stringify(PERMANENT_BOTS));
    this.aliveBotIds = new Set(this.bots.map(b => b.id));

    this.players.forEach(p => {
      const s = this.getNextSpawn();
      p.x = s.spawnX;
      p.z = s.spawnZ;
      p.vx = 0;
      p.vz = 0;
      p.isAlive = true;
      p.spawnX = s.spawnX;
      p.spawnZ = s.spawnZ;
    });

    io.to(this.id).emit('arena_reset', {
      arenaTheme: this.currentTheme,
      arenaSeed: this.arenaSeed,
      bots: this.bots,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        pilotName: p.pilotName,
        suitColor: p.suitColor,
        spawnX: p.spawnX,
        spawnZ: p.spawnZ
      }))
    });
  }

  resetBotsIfDead() {
    if (this.aliveBotIds.size === 0) {
      this.bots = JSON.parse(JSON.stringify(PERMANENT_BOTS));
      this.aliveBotIds = new Set(this.bots.map(b => b.id));
      io.to(this.id).emit('bots_respawned', {
        bots: this.bots
      });
    }
  }
}

const publicArena = new PersistentPublicArena();

io.on('connection', (socket) => {
  // Join Persistent Public Arena (Instant Drop-in)
  socket.on('join_public_room', ({ pilotName, suitColor }) => {
    if (publicArena.players.has(socket.id)) {
      publicArena.players.delete(socket.id);
    }

    const cleanPilot = String(pilotName || 'Commander_Dili').trim().slice(0, 20);
    const spawn = publicArena.getNextSpawn();

    const player = {
      id: socket.id,
      pilotName: cleanPilot,
      suitColor: suitColor || 'mint',
      isAlive: true,
      kills: 0,
      score: 0,
      x: spawn.spawnX,
      z: spawn.spawnZ,
      vx: 0,
      vz: 0,
      rotY: spawn.spawnAngle,
      flipX: 1,
      pose: 'fight',
      isDashing: false,
      spawnX: spawn.spawnX,
      spawnZ: spawn.spawnZ
    };

    publicArena.players.set(socket.id, player);
    socket.join(publicArena.id);

    // Make sure bots are active if they were previously eliminated
    publicArena.resetBotsIfDead();

    console.log(`[PublicArena] ${cleanPilot} (${socket.id}) dropped into live arena. Humans online: ${publicArena.players.size}`);

    // 1. Send live state immediately to newly joined player
    socket.emit('arena_joined_live', {
      yourId: socket.id,
      mySpawn: spawn,
      existingPlayers: Array.from(publicArena.players.values())
        .filter(p => p.id !== socket.id && p.isAlive)
        .map(p => ({
          id: p.id,
          pilotName: p.pilotName,
          suitColor: p.suitColor,
          x: p.x,
          z: p.z,
          vx: p.vx,
          vz: p.vz,
          rotY: p.rotY,
          flipX: p.flipX,
          pose: p.pose,
          isDashing: p.isDashing
        })),
      bots: publicArena.bots,
      arenaSeed: publicArena.arenaSeed,
      arenaTheme: publicArena.currentTheme
    });

    // 2. Broadcast to all existing players in arena that a new player dropped in!
    socket.to(publicArena.id).emit('player_spawned', {
      id: socket.id,
      pilotName: player.pilotName,
      suitColor: player.suitColor,
      spawnX: spawn.spawnX,
      spawnZ: spawn.spawnZ,
      spawnAngle: spawn.spawnAngle
    });
  });

  // Player Respawn Request after getting eliminated
  const handleRespawn = () => {
    let player = publicArena.players.get(socket.id);
    if (!player) {
      const spawn = publicArena.getNextSpawn();
      player = {
        id: socket.id,
        pilotName: 'Commander_Dili',
        suitColor: 'mint',
        isAlive: true,
        kills: 0,
        score: 0,
        x: spawn.spawnX,
        z: spawn.spawnZ,
        vx: 0,
        vz: 0,
        rotY: spawn.spawnAngle,
        flipX: 1,
        pose: 'fight',
        isDashing: false,
        spawnX: spawn.spawnX,
        spawnZ: spawn.spawnZ
      };
      publicArena.players.set(socket.id, player);
    }

    console.log(`[PublicArena] Respawn request from ${player.pilotName} (${socket.id})`);

    // If bots or round completed, reset entire arena for a clean fresh match!
    const otherAliveHumans = Array.from(publicArena.players.values()).filter(p => p.isAlive && p.id !== socket.id);
    if (otherAliveHumans.length === 0 || publicArena.aliveBotIds.size === 0) {
      publicArena.resetMatch();
      return;
    }

    publicArena.resetBotsIfDead();

    const spawn = publicArena.getNextSpawn();
    player.isAlive = true;
    player.x = spawn.spawnX;
    player.z = spawn.spawnZ;
    player.vx = 0;
    player.vz = 0;
    player.spawnX = spawn.spawnX;
    player.spawnZ = spawn.spawnZ;

    socket.emit('respawn_success', {
      mySpawn: spawn,
      arenaTheme: publicArena.currentTheme
    });

    socket.to(publicArena.id).emit('player_spawned', {
      id: socket.id,
      pilotName: player.pilotName,
      suitColor: player.suitColor,
      spawnX: spawn.spawnX,
      spawnZ: spawn.spawnZ,
      spawnAngle: spawn.spawnAngle
    });
  };
  socket.on('respawn_request', handleRespawn);
  socket.on('request_respawn', handleRespawn);

  // High-Frequency Real-Time Movement Sync
  socket.on('player_update', (data) => {
    const p = publicArena.players.get(socket.id);
    if (p && p.isAlive) {
      p.x = data.x;
      if (data.y !== undefined) p.y = data.y;
      if (data.currentTier !== undefined) p.currentTier = data.currentTier;
      p.z = data.z;
      p.vx = data.vx;
      p.vz = data.vz;
      p.rotY = data.rotY;
      p.flipX = data.flipX;
      p.pose = data.pose;
      p.isDashing = data.isDashing;

      socket.to(publicArena.id).emit('remote_player_update', {
        id: socket.id,
        x: data.x,
        y: data.y,
        currentTier: data.currentTier,
        z: data.z,
        vx: data.vx,
        vz: data.vz,
        rotY: data.rotY,
        flipX: data.flipX,
        pose: data.pose,
        isDashing: data.isDashing
      });
    }
  });

  // Action Broadcast (Dash, EMP, Emote)
  socket.on('player_action', (data) => {
    socket.to(publicArena.id).emit('remote_player_action', {
      id: socket.id,
      action: data.action,
      payload: data.payload
    });
  });

  // Bumper Collision Impulse transmission
  socket.on('player_collision', (data) => {
    if (!data.targetId) return;
    io.to(data.targetId).emit('remote_collision', {
      attackerId: socket.id,
      impulseX: data.impulseX,
      impulseZ: data.impulseZ,
      hitForce: data.hitForce
    });
  });

  // Void Fall / Elimination
  socket.on('player_fell', (data) => {
    const victim = publicArena.players.get(socket.id);
    if (victim && victim.isAlive) {
      victim.isAlive = false;

      let killerName = 'The Void';
      if (data.killerId) {
        const killerHuman = publicArena.players.get(data.killerId);
        const killerBot = publicArena.bots.find(b => b.id === data.killerId);
        if (killerHuman) {
          killerHuman.kills = (killerHuman.kills || 0) + 1;
          killerHuman.score = (killerHuman.score || 0) + 350;
          killerName = killerHuman.pilotName;
        } else if (killerBot) {
          killerName = killerBot.pilotName;
        }
      }

      console.log(`[PublicArena] ${victim.pilotName} eliminated by ${killerName}`);

      io.to(publicArena.id).emit('player_eliminated', {
        victimId: socket.id,
        victimName: victim.pilotName,
        killerId: data.killerId,
        killerName: killerName
      });

      const aliveHumans = Array.from(publicArena.players.values()).filter(p => p.isAlive);
      const aliveBots = publicArena.aliveBotIds.size;

      // RULE 1: If 0 humans alive and bots are alive -> Bots win! Room remains active!
      if (aliveHumans.length === 0 && aliveBots > 0) {
        console.log('[PublicArena] Bots won this round! Room stays active.');
        io.to(publicArena.id).emit('bots_won', {
          message: 'BOTS DOMINATED THE ARENA! Respawn to fight back!'
        });
      }
      // RULE 2: If 1 human is alive and all bots are dead (and all other humans dead) -> Real Player Wins!
      else if (aliveHumans.length === 1 && aliveBots === 0) {
        const winner = aliveHumans[0];
        console.log(`[PublicArena] Real player won: ${winner.pilotName}! Resetting arena for next match.`);
        io.to(publicArena.id).emit('player_won', {
          winnerId: winner.id,
          winnerName: winner.pilotName,
          winnerSuit: winner.suitColor
        });

        setTimeout(() => {
          publicArena.resetMatch();
        }, 8000);
      }
    }
  });

  // Bot Fell off arena
  socket.on('bot_fell', (data) => {
    if (publicArena.aliveBotIds.has(data.botId)) {
      publicArena.aliveBotIds.delete(data.botId);
      const botObj = publicArena.bots.find(b => b.id === data.botId);
      const botName = botObj ? botObj.pilotName : 'Bot';

      const killer = publicArena.players.get(socket.id);
      if (killer) {
        killer.kills = (killer.kills || 0) + 1;
        killer.score = (killer.score || 0) + 350;
      }

      io.to(publicArena.id).emit('player_eliminated', {
        victimId: data.botId,
        victimName: botName,
        killerId: socket.id,
        killerName: killer ? killer.pilotName : 'Player'
      });

      const aliveHumans = Array.from(publicArena.players.values()).filter(p => p.isAlive);
      const aliveBots = publicArena.aliveBotIds.size;

      // Real player victory check
      if (aliveHumans.length === 1 && aliveBots === 0) {
        const winner = aliveHumans[0];
        console.log(`[PublicArena] Real player won: ${winner.pilotName}! Resetting arena for next match.`);
        io.to(publicArena.id).emit('player_won', {
          winnerId: winner.id,
          winnerName: winner.pilotName,
          winnerSuit: winner.suitColor
        });

        setTimeout(() => {
          publicArena.resetMatch();
        }, 8000);
      }
    }
  });

  socket.on('disconnect', () => {
    if (publicArena.players.has(socket.id)) {
      const p = publicArena.players.get(socket.id);
      publicArena.players.delete(socket.id);
      console.log(`[PublicArena] ${p.pilotName} left. Humans remaining: ${publicArena.players.size}`);
      io.to(publicArena.id).emit('remote_player_left', {
        id: socket.id,
        pilotName: p.pilotName
      });
      if (publicArena.players.size === 0) {
        publicArena.resetBotsIfDead();
      }
    }
  });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DILI: HEX-FALL] Persistent Public Arena online at http://localhost:${PORT}`);
  });
}

module.exports = { app, server };
