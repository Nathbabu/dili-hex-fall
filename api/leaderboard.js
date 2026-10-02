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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  async function fetchKey(k) {
    try {
      const getRes = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${k}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (Array.isArray(parsed)) {
            return parsed.filter(e => e && e.pilot && !isBotAccount(e.pilot));
          }
        }
      }
    } catch (e) {
      console.warn('Leaderboard fetch error for ' + k + ':', e.message);
    }
    return [];
  }

  try {
    const reqMode = String(req.query?.mode || 'all').toLowerCase();
    if (reqMode === 'solo') {
      const solo = await fetchKey('dlicom_hexfall_solo_lb');
      return res.status(200).json({ success: true, mode: 'solo', leaderboard: solo });
    } else if (reqMode === 'public' || reqMode === 'multiplayer') {
      const pub = await fetchKey('dlicom_hexfall_public_lb');
      return res.status(200).json({ success: true, mode: 'public', leaderboard: pub });
    }

    const [solo, pub] = await Promise.all([
      fetchKey('dlicom_hexfall_solo_lb'),
      fetchKey('dlicom_hexfall_public_lb')
    ]);

    return res.status(200).json({
      success: true,
      mode: 'all',
      solo,
      public: pub
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

