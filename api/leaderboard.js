const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://positive-cub-88368.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVkwAAIgcDE3ZWY3ZWM2YWVlYjE0NDNkYWQ1ZTRiZGQ5ZWRmZWY3OA';

const DEFAULT_SCORES = [
  { pilot: 'Dili_Supreme', score: 3240, survivalTime: 124, tier: 4, crystals: 12, suitColor: 'mint', win: true, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { pilot: 'CyberGhost_99', score: 2680, survivalTime: 98, tier: 3, crystals: 8, suitColor: 'pink', win: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { pilot: 'AstroDecoded', score: 2150, survivalTime: 85, tier: 3, crystals: 6, suitColor: 'cobalt', win: false, timestamp: new Date(Date.now() - 10800000).toISOString() },
  { pilot: 'Vortex_Rider', score: 1790, survivalTime: 72, tier: 2, crystals: 5, suitColor: 'gold', win: false, timestamp: new Date(Date.now() - 14400000).toISOString() },
  { pilot: 'NovaCadet', score: 1320, survivalTime: 54, tier: 2, crystals: 3, suitColor: 'crimson', win: false, timestamp: new Date(Date.now() - 18000000).toISOString() }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const redisRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/dlicom_hexfall_leaderboard`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });

    if (redisRes.ok) {
      const data = await redisRes.json();
      let list = [];
      if (data.result) {
        list = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(list) && list.length > 0) {
          list.sort((a, b) => b.score - a.score);
          return res.status(200).json({ success: true, count: list.length, leaderboard: list });
        }
      }
      // If redis is empty, seed defaults
      await fetch(`${UPSTASH_REDIS_REST_URL}/set/dlicom_hexfall_leaderboard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(DEFAULT_SCORES)
      });
      return res.status(200).json({ success: true, count: DEFAULT_SCORES.length, leaderboard: DEFAULT_SCORES });
    }
  } catch (e) {
    console.warn('Leaderboard fetch error:', e.message);
  }

  return res.status(200).json({ success: true, count: DEFAULT_SCORES.length, leaderboard: DEFAULT_SCORES });
};
