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
        if (Array.isArray(list)) {
          // Strictly human player scores only
          const humanList = list
            .filter(e => e && e.pilot && !isBotAccount(e.pilot))
            .sort((a, b) => b.score - a.score);
          return res.status(200).json({ success: true, count: humanList.length, leaderboard: humanList });
        }
      }
    }
  } catch (e) {
    console.warn('Leaderboard fetch error:', e.message);
  }

  return res.status(200).json({ success: true, count: 0, leaderboard: [] });
};
