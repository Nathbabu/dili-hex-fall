const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

const KNOWN_BOT_NAMES = [
  'vortex_hunter', 'decoded_titan', 'cyber_phantom', 'neon_striker',
  'dili_supreme', 'cyberghost_99', 'astrodecoded', 'vortex_rider',
  'novacadet', 'astro_bot', 'ai_pilot', 'cyber_bot'
];

function isBotAccount(name) {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase().replace(/[\s\-_]+/g, '');
  if (n.startsWith('bot') || n.startsWith('ai') || n.endsWith('bot')) return true;
  return KNOWN_BOT_NAMES.some(b => {
    const cleanB = b.replace(/[\s\-_]+/g, '');
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
    const { pilot, score, survivalTime, tier, crystals, suitColor, win } = req.body || {};
    if (!pilot || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid score submission' });
    }

    const cleanPilot = String(pilot).trim().slice(0, 25);

    // Defense: Disallow bot accounts
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

    let current = [];
    try {
      const getRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_hexfall_leaderboard`, {
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
    let isNewRecord = false;
    let prevScore = 0;

    if (idx !== -1) {
      prevScore = current[idx].score;
      if (entry.score > current[idx].score) {
        current[idx] = Object.assign({}, current[idx], entry);
        isNewRecord = true;
      }
    } else {
      current.push(entry);
      isNewRecord = true;
    }

    current = current.sort((a, b) => b.score - a.score).slice(0, 100);

    try {
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_hexfall_leaderboard`, {
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
      rank: rank > 0 ? rank : current.length,
      entry,
      isNewRecord,
      personalBest: Math.max(prevScore, entry.score),
      totalPilots: current.length
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
