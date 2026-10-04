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

// Comprehensive Known Bot Names and Identification
const KNOWN_BOT_NAMES = [
  'cyber-01', 'droid-02', 'cyber01', 'droid02',
  'vortex_hunter', 'decoded_titan', 'cyber_phantom', 'neon_striker',
  'dili_supreme', 'cyberghost_99', 'astrodecoded', 'vortex_rider',
  'novacadet', 'nova_cadet', 'astro_bot', 'ai_pilot', 'cyber_bot',
  'astro_smasher', 'hex_fury', 'void_stalker', 'pulse_breaker',
  'grid_reaper', 'flux_racer', 'photon_hammer', 'plasma_viper',
  'ion_crusher', 'data_wraith', 'core_blaster', 'byte_bomber',
  'arc_sentinel', 'auditpilot', 'tiepilot', 'testpilot', 'sim_ace', 'sim_blaze'
];

function isBotAccount(name) {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase().replace(/[\[\]\s\-_]+/g, '');
  if (n.startsWith('bot') || n.startsWith('ai') || n.endsWith('bot')) return true;
  if (n.includes('audit') || n.includes('tiepilot') || n.includes('test') || n.includes('championstar') || n.includes('dummy') || n.includes('mock')) return true;
  return KNOWN_BOT_NAMES.some(b => {
    const cleanB = b.replace(/[\[\]\s\-_]+/g, '');
    return n === cleanB || n.includes(cleanB);
  });
}

// In-memory caches: strictly human player scores separated into Solo vs Public Arena
let soloLeaderboardCache = [];
let publicLeaderboardCache = [];

async function getLeaderboardFromRedis(mode = 'solo') {
  const isPublic = mode === 'public' || mode === 'multiplayer';
  const redisKey = isPublic ? 'dlicom_hexfall_public_lb' : 'dlicom_hexfall_solo_lb';
  let targetCache = isPublic ? publicLeaderboardCache : soloLeaderboardCache;

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return targetCache.filter(e => !isBotAccount(e.pilot));
  }

  try {
    const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${redisKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const arr = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(arr)) {
          const sorted = arr
            .filter(e => e && e.pilot && !isBotAccount(e.pilot))
            .sort((a, b) => b.score - a.score);
          if (isPublic) {
            publicLeaderboardCache = sorted;
          } else {
            soloLeaderboardCache = sorted;
          }
          return sorted;
        }
      }
    }
  } catch (e) {
    console.warn(`[HexFall] Fallback to ${mode} cache:`, e.message);
  }
  return (isPublic ? publicLeaderboardCache : soloLeaderboardCache).filter(e => !isBotAccount(e.pilot));
}

async function saveScoreToRedis(mode, newEntry) {
  if (isBotAccount(newEntry.pilot)) {
    throw new Error('Bot accounts are prohibited from the leaderboard.');
  }

  const isPublic = mode === 'public' || mode === 'multiplayer';
  const redisKey = isPublic ? 'dlicom_hexfall_public_lb' : 'dlicom_hexfall_solo_lb';

  let current = await getLeaderboardFromRedis(isPublic ? 'public' : 'solo');
  current = current.filter(e => !isBotAccount(e.pilot));

  const existingIdx = current.findIndex(e => e.pilot.toLowerCase() === newEntry.pilot.toLowerCase());
  const matchScore = Math.floor(newEntry.score || 0);

  if (existingIdx !== -1) {
    const prev = current[existingIdx];
    const prevTotal = Number(prev.totalScore !== undefined ? prev.totalScore : prev.score) || 0;
    const newTotal = prevTotal + matchScore;
    const bestScore = Math.max(Number(prev.bestScore !== undefined ? prev.bestScore : prev.score) || 0, matchScore);
    const matchesPlayed = (Number(prev.matchesPlayed) || 1) + 1;
    const totalWins = (Number(prev.wins) || (prev.win ? 1 : 0)) + (newEntry.win ? 1 : 0);
    const totalKills = (Number(prev.kills) || 0) + (Number(newEntry.kills) || 0);
    const totalSurvival = (Number(prev.survivalTime) || 0) + (Number(newEntry.survivalTime) || 0);

    current[existingIdx] = {
      ...prev,
      pilot: newEntry.pilot,
      mode: isPublic ? 'public' : 'solo',
      totalScore: newTotal,
      score: newTotal,
      bestScore: bestScore,
      lastMatchScore: matchScore,
      matchesPlayed: matchesPlayed,
      wins: totalWins,
      kills: totalKills,
      survivalTime: totalSurvival,
      difficulty: newEntry.difficulty || prev.difficulty || 'normal',
      suitColor: newEntry.suitColor || prev.suitColor || 'mint',
      win: totalWins > 0,
      matchRank: newEntry.matchRank || prev.matchRank || 1,
      updatedAt: new Date().toISOString()
    };
  } else {
    current.push({
      pilot: newEntry.pilot,
      mode: isPublic ? 'public' : 'solo',
      totalScore: matchScore,
      score: matchScore,
      bestScore: matchScore,
      lastMatchScore: matchScore,
      matchesPlayed: 1,
      wins: newEntry.win ? 1 : 0,
      kills: Number(newEntry.kills) || 0,
      survivalTime: Number(newEntry.survivalTime) || 0,
      difficulty: newEntry.difficulty || 'normal',
      suitColor: newEntry.suitColor || 'mint',
      win: !!newEntry.win,
      matchRank: newEntry.matchRank || 1,
      updatedAt: new Date().toISOString()
    });
  }

  // 5-Layer Foolproof Tie-Breaker Sorting
  current.sort((a, b) => {
    const scoreA = Number(a.totalScore !== undefined ? a.totalScore : a.score) || 0;
    const scoreB = Number(b.totalScore !== undefined ? b.totalScore : b.score) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA; // 1. Total Cumulative Score

    const winsA = Number(a.wins) || (a.win ? 1 : 0);
    const winsB = Number(b.wins) || (b.win ? 1 : 0);
    if (winsB !== winsA) return winsB - winsA; // 2. Total Wins

    const killsA = Number(a.kills) || 0;
    const killsB = Number(b.kills) || 0;
    if (killsB !== killsA) return killsB - killsA; // 3. Total Kills

    const bestA = Number(a.bestScore !== undefined ? a.bestScore : a.score) || 0;
    const bestB = Number(b.bestScore !== undefined ? b.bestScore : b.score) || 0;
    if (bestB !== bestA) return bestB - bestA; // 4. Best Single Match Record

    const timeA = new Date(a.updatedAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.updatedAt || b.timestamp || 0).getTime();
    return timeA - timeB; // 5. Earliest timestamp
  });

  current = current.slice(0, 100);
  if (isPublic) {
    publicLeaderboardCache = current;
  } else {
    soloLeaderboardCache = current;
  }

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/${redisKey}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(current),
        signal: AbortSignal.timeout(2500)
      });
    } catch (e) {
      console.warn(`[HexFall] Error saving ${mode} to Redis:`, e.message);
    }
  }
  return current;
}

// Global Leaderboards API: Separate Solo vs Public Arena
app.get('/api/leaderboard', async (req, res) => {
  const reqMode = String(req.query.mode || 'all').toLowerCase();
  
  if (reqMode === 'solo') {
    const solo = await getLeaderboardFromRedis('solo');
    return res.json({ success: true, mode: 'solo', leaderboard: solo });
  } else if (reqMode === 'public' || reqMode === 'multiplayer') {
    const pub = await getLeaderboardFromRedis('public');
    return res.json({ success: true, mode: 'public', leaderboard: pub });
  }

  const [solo, pub] = await Promise.all([
    getLeaderboardFromRedis('solo'),
    getLeaderboardFromRedis('public')
  ]);

  res.json({
    success: true,
    mode: 'all',
    solo,
    public: pub
  });
});

// High Score Submission with Mode Segregation
app.post('/api/score/submit', async (req, res) => {
  try {
    const { mode, pilot, score, survivalTime, difficulty, kills, suitColor, win, matchRank } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score' });
    }

    const cleanPilot = String(pilot).trim().slice(0, 25);
    if (isBotAccount(cleanPilot)) {
      return res.status(403).json({ success: false, error: 'Bot accounts cannot submit to leaderboard' });
    }

    const isPublic = mode === 'public' || mode === 'multiplayer';
    const entryMode = isPublic ? 'public' : 'solo';

    const entry = {
      pilot: cleanPilot,
      mode: entryMode,
      score: Math.floor(score),
      survivalTime: Math.floor(survivalTime || 0),
      kills: kills || 0,
      difficulty: difficulty || (isPublic ? 'live' : 'normal'),
      suitColor: suitColor || 'mint',
      win: !!win,
      matchRank: matchRank || 1,
      timestamp: new Date().toISOString()
    };

    const updated = await saveScoreToRedis(entryMode, entry);
    const updatedEntry = updated.find(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) || entry;
    const rank = updated.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    res.json({
      success: true,
      mode: entryMode,
      rank: rank > 0 ? rank : updated.length,
      entry: updatedEntry,
      matchScore: Math.floor(score),
      totalScore: updatedEntry.totalScore || updatedEntry.score,
      bestScore: updatedEntry.bestScore || updatedEntry.score,
      matchesPlayed: updatedEntry.matchesPlayed || 1,
      wins: updatedEntry.wins || (updatedEntry.win ? 1 : 0),
      totalPilots: updated.length
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


// Admin wipe endpoint for fresh tests
app.post('/api/leaderboard/clear', async (req, res) => {
  soloLeaderboardCache = [];
  publicLeaderboardCache = [];
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      await Promise.all([
        fetch(`${UPSTASH_REDIS_REST_URL}/del/dlicom_hexfall_solo_lb`, {
          headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }),
        fetch(`${UPSTASH_REDIS_REST_URL}/del/dlicom_hexfall_public_lb`, {
          headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }),
        fetch(`${UPSTASH_REDIS_REST_URL}/del/dlicom_hexfall_leaderboard`, {
          headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        })
      ]);
    } catch (e) {
      console.warn('[Leaderboard] Clear Redis error:', e.message);
    }
  }
  res.json({ success: true, message: 'All Hex Fall leaderboards wiped clean.' });
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
  constructor(id = 'public_arena_1', roomNumber = 1) {
    this.id = id;
    this.roomNumber = roomNumber;
    this.maxHumans = 6;
    this.players = new Map(); // socket.id -> PlayerData
    this.bots = JSON.parse(JSON.stringify(PERMANENT_BOTS));
    this.aliveBotIds = new Set(this.bots.map(b => b.id));
    this.arenaSeed = Date.now();
    this.roundStartTime = Date.now();
    this.spawnAngles = [
      0,                    // 0 deg
      Math.PI * 0.25,       // 45 deg
      Math.PI * 0.5,        // 90 deg
      Math.PI * 0.75,       // 135 deg
      Math.PI,              // 180 deg
      Math.PI * 1.25,       // 225 deg
      Math.PI * 1.5,        // 270 deg
      Math.PI * 1.75        // 315 deg
    ];
    this.nextSpawnIdx = 0;
    this.currentThemeIndex = 0;
    this.currentTheme = ARENA_THEMES_LIST[0];
    this.resetTimer = null;
    this.matchEnded = false;
  }

  getNextSpawn(radius = 10.0) {
    const angle = this.spawnAngles[this.nextSpawnIdx % this.spawnAngles.length];
    this.nextSpawnIdx++;
    return {
      spawnX: Number((Math.sin(angle) * radius).toFixed(2)),
      spawnZ: Number((Math.cos(angle) * radius).toFixed(2)),
      spawnAngle: angle
    };
  }

  resetMatch(triggerPlayerId = null) {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.matchEnded = false;
    this.currentThemeIndex = (this.currentThemeIndex + 1) % ARENA_THEMES_LIST.length;
    this.currentTheme = ARENA_THEMES_LIST[this.currentThemeIndex];
    console.log(`[PublicArena:${this.id}] Resetting arena for a fresh round! Rotating to theme: ${this.currentTheme.toUpperCase()}`);
    this.arenaSeed = Date.now();
    this.roundStartTime = Date.now();
    this.bots = JSON.parse(JSON.stringify(PERMANENT_BOTS));
    this.aliveBotIds = new Set(this.bots.map(b => b.id));
    this.nextSpawnIdx = 0;

    // Only activate the player who explicitly triggered rematch!
    this.players.forEach(p => {
      if (triggerPlayerId && p.id === triggerPlayerId) {
        p.isAlive = true;
        p.lastActivity = Date.now();
      } else {
        p.isAlive = false;
      }

      if (p.isAlive) {
        const s = this.getNextSpawn(10.0);
        p.x = s.spawnX;
        p.z = s.spawnZ;
        p.vx = 0;
        p.vz = 0;
        p.spawnX = s.spawnX;
        p.spawnZ = s.spawnZ;
        p.spawnAngle = s.spawnAngle;
      }
    });

    const activePlayers = Array.from(this.players.values()).filter(p => p.isAlive);

    io.to(this.id).emit('arena_reset', {
      arenaTheme: this.currentTheme,
      arenaSeed: this.arenaSeed,
      roundElapsed: 0,
      bots: this.bots,
      players: activePlayers.map(p => ({
        id: p.id,
        pilotName: p.pilotName,
        suitColor: p.suitColor,
        spawnX: p.spawnX,
        spawnZ: p.spawnZ,
        spawnAngle: p.spawnAngle,
        isAlive: true
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

  checkWinConditions() {
    const aliveHumans = Array.from(this.players.values()).filter(p => p.isAlive);
    const aliveBots = this.aliveBotIds.size;
    const roundDuration = (Date.now() - this.roundStartTime) / 1000;

    // Prevent instant wins upon join/round restart: require at least 4 seconds of match duration
    if (roundDuration < 4.0) return;

    if (aliveHumans.length === 1 && aliveBots === 0) {
      const winner = aliveHumans[0];
      console.log(`[PublicArena:${this.id}] Real player won: ${winner.pilotName}! Match ended. Waiting for Rematch click.`);
      this.matchEnded = true;
      io.to(this.id).emit('player_won', {
        winnerId: winner.id,
        winnerName: winner.pilotName,
        winnerSuit: winner.suitColor,
        matchEnded: true
      });

      // Mark winner as inactive so match is complete and does NOT auto-restart
      winner.isAlive = false;

      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = null;
    } else if (aliveHumans.length === 0 && aliveBots > 0) {
      console.log(`[PublicArena:${this.id}] Bots won this round! Match ended. Waiting for Rematch click.`);
      this.matchEnded = true;
      io.to(this.id).emit('bots_won', {
        message: 'BOTS DOMINATED THE ARENA! CLICK REMATCH TO FIGHT BACK!',
        matchEnded: true
      });
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = null;
    } else if (aliveHumans.length === 0 && aliveBots === 0) {
      console.log(`[PublicArena:${this.id}] All players and bots eliminated! Match ended.`);
      this.matchEnded = true;
      io.to(this.id).emit('round_ended', {
        message: 'ALL COMBATANTS ELIMINATED! CLICK REMATCH FOR A NEW ROUND!',
        matchEnded: true
      });
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

// Dynamic Public Arena Manager (Max 6 Humans per Room + Auto Dynamic Rooms)
const publicArenas = new Map(); // roomId -> PersistentPublicArena
const socketToArena = new Map(); // socket.id -> roomId
let roomCounter = 1;

// Initialize primary persistent arena (Room #1)
const defaultArena = new PersistentPublicArena('public_arena_1', 1);
publicArenas.set('public_arena_1', defaultArena);

function getArenaForSocket(socketId) {
  const roomId = socketToArena.get(socketId);
  if (roomId && publicArenas.has(roomId)) {
    return publicArenas.get(roomId);
  }
  return null;
}

function findOrCreateAvailableArena() {
  // 1. Look for an arena with space (< 6 humans) where match is active and not ended
  for (const arena of publicArenas.values()) {
    if (arena.players.size < arena.maxHumans && !arena.matchEnded) {
      return arena;
    }
  }

  // 2. Look for any existing arena with open slots (< 6 humans)
  for (const arena of publicArenas.values()) {
    if (arena.players.size < arena.maxHumans) {
      return arena;
    }
  }

  // 3. All current arenas are at capacity (>= 6 humans each)!
  // Dynamically create a brand new room: Room #2, Room #3, etc.
  roomCounter++;
  const newRoomId = `public_arena_${roomCounter}`;
  const newArena = new PersistentPublicArena(newRoomId, roomCounter);
  publicArenas.set(newRoomId, newArena);
  console.log(`[PublicArenaManager] All existing rooms full. Spawned new Arena Room: ${newRoomId} (Room #${roomCounter})`);
  return newArena;
}

function removePlayerFromArena(socketId) {
  const arena = getArenaForSocket(socketId);
  socketToArena.delete(socketId);
  if (!arena) return;

  if (arena.players.has(socketId)) {
    const p = arena.players.get(socketId);
    arena.players.delete(socketId);
    console.log(`[PublicArena:${arena.id}] ${p.pilotName} left. Humans remaining: ${arena.players.size}`);
    io.to(arena.id).emit('remote_player_left', {
      id: socketId,
      pilotName: p.pilotName
    });

    if (arena.players.size === 0) {
      // Dynamic rooms (Room 2, 3...) get cleaned up when completely empty
      if (arena.id !== 'public_arena_1') {
        if (arena.resetTimer) clearTimeout(arena.resetTimer);
        publicArenas.delete(arena.id);
        console.log(`[PublicArenaManager] Cleaned up empty dynamic room: ${arena.id}`);
        return;
      } else {
        arena.resetBotsIfDead();
        if (arena.resetTimer) {
          clearTimeout(arena.resetTimer);
          arena.resetTimer = null;
        }
      }
    } else {
      arena.checkWinConditions();
    }
  }
}

// 45-Second Inactivity Heartbeat Check across all active arenas (Generous for cloud network jitter)
setInterval(() => {
  const now = Date.now();
  publicArenas.forEach(arena => {
    let changed = false;
    arena.players.forEach(p => {
      if (p.isAlive && (now - p.lastActivity > 45000)) {
        console.log(`[PublicArena:${arena.id}] ${p.pilotName} (${p.id}) timed out (45s AFK).`);
        p.isAlive = false;
        changed = true;
        io.to(arena.id).emit('player_eliminated', {
          victimId: p.id,
          victimName: p.pilotName,
          killerId: null,
          killerName: 'AFK Timeout (45s)'
        });
      }
    });

    if (changed) {
      arena.checkWinConditions();
    }
  });
}, 5000);

io.on('connection', (socket) => {
  // Join Persistent Public Arena (Dynamic Matchmaking: Max 6 Humans per Room)
  socket.on('join_public_room', ({ pilotName, suitColor }) => {
    // If socket was already registered in an arena, clean it up first
    removePlayerFromArena(socket.id);

    const cleanPilot = String(pilotName || 'Commander_Dili').trim().slice(0, 20);
    const arena = findOrCreateAvailableArena();

    socketToArena.set(socket.id, arena.id);
    socket.join(arena.id);

    // Check if other humans are actively alive in this round in this arena
    const activeHumans = Array.from(arena.players.values()).filter(p => p.id !== socket.id && p.isAlive);

    // If NO other humans are alive right now, reset the arena completely for a brand new, clean match!
    if (activeHumans.length === 0) {
      console.log(`[PublicArena:${arena.id}] Fresh match start for ${cleanPilot} (no active humans currently in battle).`);
      arena.resetMatch(socket.id);
      let player = arena.players.get(socket.id);
      if (!player) {
        const spawn = arena.getNextSpawn(10.0);
        player = {
          id: socket.id,
          pilotName: cleanPilot,
          suitColor: suitColor || 'mint',
          isAlive: true,
          lastActivity: Date.now(),
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
          spawnZ: spawn.spawnZ,
          spawnAngle: spawn.spawnAngle
        };
        arena.players.set(socket.id, player);
      } else {
        player.pilotName = cleanPilot;
        player.suitColor = suitColor || 'mint';
        player.isAlive = true;
        player.lastActivity = Date.now();
      }

      socket.emit('arena_joined_live', {
        yourId: socket.id,
        roomId: arena.id,
        roomNumber: arena.roomNumber,
        mySpawn: { spawnX: player.spawnX, spawnZ: player.spawnZ, spawnAngle: player.spawnAngle },
        existingPlayers: [],
        bots: arena.bots,
        arenaSeed: arena.arenaSeed,
        arenaTheme: arena.currentTheme,
        roundElapsed: 0,
        matchEnded: !!arena.matchEnded,
        totalHumansInRoom: 1,
        maxHumans: arena.maxHumans
      });
      return;
    }

    // Other humans ARE actively alive: drop this player into the live battle safely!
    const elapsed = Math.floor((Date.now() - arena.roundStartTime) / 1000);
    const safeRadius = elapsed > 45 ? 4.5 : (elapsed > 20 ? 7.5 : 10.0);
    const spawn = arena.getNextSpawn(safeRadius);

    const player = {
      id: socket.id,
      pilotName: cleanPilot,
      suitColor: suitColor || 'mint',
      isAlive: true,
      lastActivity: Date.now(),
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
      spawnZ: spawn.spawnZ,
      spawnAngle: spawn.spawnAngle
    };

    arena.players.set(socket.id, player);

    // Make sure bots are active if they were previously eliminated
    arena.resetBotsIfDead();

    console.log(`[PublicArena:${arena.id}] ${cleanPilot} (${socket.id}) dropped into live arena. Humans online in room: ${arena.players.size}`);

    socket.emit('arena_joined_live', {
      yourId: socket.id,
      roomId: arena.id,
      roomNumber: arena.roomNumber,
      mySpawn: spawn,
      existingPlayers: activeHumans.map(p => ({
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
      bots: arena.bots.filter(b => arena.aliveBotIds.has(b.id)),
      arenaSeed: arena.arenaSeed,
      arenaTheme: arena.currentTheme,
      roundElapsed: elapsed,
      matchEnded: !!arena.matchEnded,
      totalHumansInRoom: arena.players.size,
      maxHumans: arena.maxHumans
    });

    socket.to(arena.id).emit('player_spawned', {
      id: socket.id,
      pilotName: player.pilotName,
      suitColor: player.suitColor,
      spawnX: spawn.spawnX,
      spawnZ: spawn.spawnZ,
      spawnAngle: spawn.spawnAngle
    });
  });

  // Explicit leave room event
  socket.on('leave_room', () => {
    removePlayerFromArena(socket.id);
  });

  // Mobile screen lock / Tab hidden listener (informational only — no false kills!)
  socket.on('player_visibility', (data) => {
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    const p = arena.players.get(socket.id);
    if (p) {
      p.isTabHidden = !data.visible;
    }
  });

  // Player Respawn Request after getting eliminated
  const handleRespawn = () => {
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    let player = arena.players.get(socket.id);
    if (!player) {
      const spawn = arena.getNextSpawn(10.0);
      player = {
        id: socket.id,
        pilotName: 'Commander_Dili',
        suitColor: 'mint',
        isAlive: false,
        lastActivity: Date.now(),
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
        spawnZ: spawn.spawnZ,
        spawnAngle: spawn.spawnAngle
      };
      arena.players.set(socket.id, player);
    }

    player.lastActivity = Date.now();
    console.log(`[PublicArena:${arena.id}] Respawn request from ${player.pilotName} (${socket.id})`);

    const otherAliveHumans = Array.from(arena.players.values()).filter(p => p.isAlive && p.id !== socket.id);

    // If NO other humans are alive or bots dead: reset match ONLY for this player!
    if (otherAliveHumans.length === 0 || arena.aliveBotIds.size === 0) {
      arena.resetMatch(socket.id);
      return;
    }

    // Other humans are alive and playing: drop this player into live match safely!
    arena.resetBotsIfDead();

    const elapsed = Math.floor((Date.now() - arena.roundStartTime) / 1000);
    const safeRadius = elapsed > 45 ? 4.5 : (elapsed > 20 ? 7.5 : 10.0);
    const spawn = arena.getNextSpawn(safeRadius);
    player.isAlive = true;
    player.x = spawn.spawnX;
    player.z = spawn.spawnZ;
    player.vx = 0;
    player.vz = 0;
    player.spawnX = spawn.spawnX;
    player.spawnZ = spawn.spawnZ;
    player.spawnAngle = spawn.spawnAngle;

    socket.emit('respawn_success', {
      mySpawn: spawn,
      arenaTheme: arena.currentTheme,
      roundElapsed: elapsed
    });

    socket.to(arena.id).emit('player_spawned', {
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

  // Instant Verification if Spectating is allowed
  socket.on('check_spectate', (callback) => {
    const arena = getArenaForSocket(socket.id);
    if (!arena) {
      if (typeof callback === 'function') {
        callback({
          canSpectate: false,
          matchEnded: true,
          aliveHumansCount: 0
        });
      }
      return;
    }
    const activeHumans = Array.from(arena.players.values()).filter(p => p.isAlive && p.id !== socket.id);
    const canSpectate = !arena.matchEnded && activeHumans.length > 0;
    if (typeof callback === 'function') {
      callback({
        canSpectate,
        matchEnded: !!arena.matchEnded,
        aliveHumansCount: activeHumans.length
      });
    }
  });

  // High-Frequency Real-Time Movement Sync
  socket.on('player_update', (data) => {
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    const p = arena.players.get(socket.id);
    if (p && p.isAlive) {
      p.lastActivity = Date.now();
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

      socket.to(arena.id).emit('remote_player_update', {
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
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    socket.to(arena.id).emit('remote_player_action', {
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
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    const victim = arena.players.get(socket.id);
    if (victim && victim.isAlive) {
      victim.isAlive = false;

      let killerName = 'The Void';
      if (data.killerId) {
        const killerHuman = arena.players.get(data.killerId);
        const killerBot = arena.bots.find(b => b.id === data.killerId);
        if (killerHuman) {
          killerHuman.kills = (killerHuman.kills || 0) + 1;
          killerHuman.score = (killerHuman.score || 0) + 350;
          killerName = killerHuman.pilotName;
        } else if (killerBot) {
          killerName = killerBot.pilotName;
        }
      }

      console.log(`[PublicArena:${arena.id}] ${victim.pilotName} eliminated by ${killerName}`);

      io.to(arena.id).emit('player_eliminated', {
        victimId: socket.id,
        victimName: victim.pilotName,
        killerId: data.killerId,
        killerName: killerName
      });

      arena.checkWinConditions();
    }
  });

  // Bot Fell off arena
  socket.on('bot_fell', (data) => {
    const arena = getArenaForSocket(socket.id);
    if (!arena) return;

    if (arena.aliveBotIds.has(data.botId)) {
      arena.aliveBotIds.delete(data.botId);
      const botObj = arena.bots.find(b => b.id === data.botId);
      const botName = botObj ? botObj.pilotName : 'Bot';

      const killer = arena.players.get(socket.id);
      if (killer) {
        killer.kills = (killer.kills || 0) + 1;
        killer.score = (killer.score || 0) + 350;
      }

      io.to(arena.id).emit('player_eliminated', {
        victimId: data.botId,
        victimName: botName,
        killerId: socket.id,
        killerName: killer ? killer.pilotName : 'Player'
      });

      arena.checkWinConditions();
    }
  });

  socket.on('disconnect', () => {
    removePlayerFromArena(socket.id);
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
