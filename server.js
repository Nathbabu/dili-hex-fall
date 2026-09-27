const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
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

// Default mock scores
const DEFAULT_SCORES = [
  { pilot: 'Dili_Supreme', score: 3240, survivalTime: 124, tier: 4, crystals: 12, suitColor: 'mint', win: true, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { pilot: 'CyberGhost_99', score: 2680, survivalTime: 98, tier: 3, crystals: 8, suitColor: 'pink', win: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { pilot: 'AstroDecoded', score: 2150, survivalTime: 85, tier: 3, crystals: 6, suitColor: 'cobalt', win: false, timestamp: new Date(Date.now() - 10800000).toISOString() },
  { pilot: 'Vortex_Rider', score: 1790, survivalTime: 72, tier: 2, crystals: 5, suitColor: 'gold', win: false, timestamp: new Date(Date.now() - 14400000).toISOString() },
  { pilot: 'NovaCadet', score: 1320, survivalTime: 54, tier: 2, crystals: 3, suitColor: 'crimson', win: false, timestamp: new Date(Date.now() - 18000000).toISOString() }
];

let leaderboardCache = [...DEFAULT_SCORES];

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
        if (Array.isArray(arr) && arr.length > 0) {
          leaderboardCache = arr.sort((a, b) => b.score - a.score);
          return leaderboardCache;
        }
      }
    }
  } catch (e) {
    console.warn('[HexFall] Fallback to cache:', e.message);
  }
  return leaderboardCache;
}

async function saveScoreToRedis(newEntry) {
  let current = await getLeaderboardFromRedis();
  
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
  res.json({ success: true, count: list.length, leaderboard: list });
});

app.post('/api/score/submit', async (req, res) => {
  try {
    const { pilot, score, survivalTime, tier, crystals, suitColor, win } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score' });
    }

    const cleanPilot = String(pilot).trim().slice(0, 25);
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

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [DILI: HEX-FALL] Server online at http://localhost:${PORT}`);
  });
}

module.exports = app;
