const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

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
  if (n.includes('audit') || n.includes('tiepilot') || n.includes('testpilot')) return true;
  return KNOWN_BOT_NAMES.some(b => {
    const cleanB = b.replace(/[\[\]\s\-_]+/g, '');
    return n === cleanB || n.includes(cleanB);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mode, pilot, score, survivalTime, difficulty, kills, suitColor, win, matchRank } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score submission' });
    }

    const cleanPilot = String(pilot).trim().slice(0, 25);
    if (isBotAccount(cleanPilot)) {
      return res.status(403).json({ success: false, error: 'Bot accounts cannot submit to leaderboard' });
    }

    const isPublic = mode === 'public' || mode === 'multiplayer';
    const redisKey = isPublic ? 'dlicom_hexfall_public_lb' : 'dlicom_hexfall_solo_lb';
    const matchScore = Math.floor(score);

    let current = [];
    try {
      const getRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${redisKey}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (Array.isArray(parsed)) {
            current = parsed.filter(e => e && e.pilot && !isBotAccount(e.pilot));
          }
        }
      }
    } catch (e) {
      console.warn('Redis read error:', e.message);
    }

    const idx = current.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase());
    let updatedEntry;

    if (idx !== -1) {
      const prev = current[idx];
      const prevTotal = Number(prev.totalScore !== undefined ? prev.totalScore : prev.score) || 0;
      const newTotal = prevTotal + matchScore;
      const bestScore = Math.max(Number(prev.bestScore !== undefined ? prev.bestScore : prev.score) || 0, matchScore);
      const matchesPlayed = (Number(prev.matchesPlayed) || 1) + 1;
      const totalWins = (Number(prev.wins) || (prev.win ? 1 : 0)) + (win ? 1 : 0);
      const totalKills = (Number(prev.kills) || 0) + (Number(kills) || 0);
      const totalSurvival = (Number(prev.survivalTime) || 0) + (Number(survivalTime) || 0);

      updatedEntry = {
        ...prev,
        pilot: cleanPilot,
        mode: isPublic ? 'public' : 'solo',
        totalScore: newTotal,
        score: newTotal,
        bestScore: bestScore,
        lastMatchScore: matchScore,
        matchesPlayed: matchesPlayed,
        wins: totalWins,
        kills: totalKills,
        survivalTime: totalSurvival,
        difficulty: difficulty || prev.difficulty || 'normal',
        suitColor: suitColor || prev.suitColor || 'mint',
        win: totalWins > 0,
        matchRank: matchRank || prev.matchRank || 1,
        updatedAt: new Date().toISOString()
      };
      current[idx] = updatedEntry;
    } else {
      updatedEntry = {
        pilot: cleanPilot,
        mode: isPublic ? 'public' : 'solo',
        totalScore: matchScore,
        score: matchScore,
        bestScore: matchScore,
        lastMatchScore: matchScore,
        matchesPlayed: 1,
        wins: win ? 1 : 0,
        kills: Number(kills) || 0,
        survivalTime: Number(survivalTime) || 0,
        difficulty: difficulty || 'normal',
        suitColor: suitColor || 'mint',
        win: !!win,
        matchRank: matchRank || 1,
        updatedAt: new Date().toISOString()
      };
      current.push(updatedEntry);
    }

    // 5-Layer Tie-Breaker
    current.sort((a, b) => {
      const scoreA = Number(a.totalScore !== undefined ? a.totalScore : a.score) || 0;
      const scoreB = Number(b.totalScore !== undefined ? b.totalScore : b.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const winsA = Number(a.wins) || (a.win ? 1 : 0);
      const winsB = Number(b.wins) || (b.win ? 1 : 0);
      if (winsB !== winsA) return winsB - winsA;

      const killsA = Number(a.kills) || 0;
      const killsB = Number(b.kills) || 0;
      if (killsB !== killsA) return killsB - killsA;

      const bestA = Number(a.bestScore !== undefined ? a.bestScore : a.score) || 0;
      const bestB = Number(b.bestScore !== undefined ? b.bestScore : b.score) || 0;
      if (bestB !== bestA) return bestB - bestA;

      const timeA = new Date(a.updatedAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.updatedAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    current = current.slice(0, 100);

    try {
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/${redisKey}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(current)
      });
    } catch (e) {
      console.warn('Redis write error:', e.message);
    }

    const rank = current.findIndex(e => e.pilot.toLowerCase() === cleanPilot.toLowerCase()) + 1;

    return res.status(200).json({
      success: true,
      mode: isPublic ? 'public' : 'solo',
      rank: rank > 0 ? rank : current.length,
      entry: updatedEntry,
      matchScore: matchScore,
      totalScore: updatedEntry.totalScore || updatedEntry.score,
      bestScore: updatedEntry.bestScore || updatedEntry.score,
      matchesPlayed: updatedEntry.matchesPlayed || 1,
      wins: updatedEntry.wins || (updatedEntry.win ? 1 : 0),
      totalPilots: current.length
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

