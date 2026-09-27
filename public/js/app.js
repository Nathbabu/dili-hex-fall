// =============================================
// DILI: CYBER BUMPERS — UI & Leaderboard Controller
// =============================================
(function() {
  'use strict';

  // Screens
  const titleScreen = document.getElementById('titleScreen');
  const hud = document.getElementById('hud');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const howToPlayModal = document.getElementById('howToPlayModal');

  // Title inputs
  const pilotNameInput = document.getElementById('pilotName');
  const suitButtons = document.querySelectorAll('.suit-btn');
  const btnPlay = document.getElementById('btnPlay');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnHowToPlay = document.getElementById('btnHowToPlay');
  const btnHelpClose = document.getElementById('btnHelpClose');

  // Audio Toggle
  const globalAudioBtn = document.getElementById('globalAudioBtn');
  const audioIcon = document.getElementById('audioIcon');

  // HUD Elements
  const hudTime = document.getElementById('hudTime');
  const hudAlive = document.getElementById('hudAlive');
  const hudKills = document.getElementById('hudKills');
  const hudScore = document.getElementById('hudScore');
  const btnPause = document.getElementById('btnPause');
  const killFeed = document.getElementById('killFeed');
  const arenaAlert = document.getElementById('arenaAlert');
  const alertText = document.getElementById('alertText');

  // Cooldown Overlays (Mobile & Desktop)
  const dashCooldownOverlay = document.getElementById('dashCooldownOverlay');
  const empCooldownOverlay = document.getElementById('empCooldownOverlay');
  const pcDashCooldown = document.getElementById('pcDashCooldown');
  const pcEmpCooldown = document.getElementById('pcEmpCooldown');

  // Powerup Banner
  const powerUpBanner = document.getElementById('powerUpBanner');
  const powerUpIcon = document.getElementById('powerUpIcon');
  const powerUpText = document.getElementById('powerUpText');
  const powerUpBar = document.getElementById('powerUpBar');

  // Pause
  const btnResume = document.getElementById('btnResume');
  const btnQuit = document.getElementById('btnQuit');

  // Game Over
  const goTitle = document.getElementById('goTitle');
  const goSubtitle = document.getElementById('goSubtitle');
  const goTime = document.getElementById('goTime');
  const goKills = document.getElementById('goKills');
  const goScore = document.getElementById('goScore');
  const goRank = document.getElementById('goRank');
  const newRecordBanner = document.getElementById('newRecordBanner');
  const btnRetry = document.getElementById('btnRetry');
  const btnGoLb = document.getElementById('btnGoLb');
  const btnGoMenu = document.getElementById('btnGoMenu');

  // Leaderboard
  const lbBody = document.getElementById('lbBody');
  const btnLbClose = document.getElementById('btnLbClose');

  // State
  let engine = null;
  let selectedSuit = 'mint';
  let personalBest = parseInt(localStorage.getItem('cyberbumpers_pb') || '0', 10);

  const suitColorMap = {
    mint:    0x00FFC6,
    pink:    0xFF6EC7,
    gold:    0xFFD700,
    cobalt:  0x4DA6FF,
    crimson: 0xFF3344
  };

  function showScreen(id) {
    [titleScreen, hud, pauseOverlay, gameOverScreen, leaderboardScreen, howToPlayModal].forEach(s => {
      s.classList.remove('active');
    });
    if (id) document.getElementById(id).classList.add('active');
  }

  // Audio Toggle
  globalAudioBtn.addEventListener('click', () => {
    HexAudio.init();
    HexAudio.resumeCtx();
    const isUnmuted = HexAudio.toggleMute();
    audioIcon.textContent = isUnmuted ? '🔊' : '🔇';
  });

  // Suit Selection
  suitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      suitButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSuit = btn.dataset.suit;
    });
  });

  // Engine Setup
  function getEngine() {
    if (!engine) {
      engine = new BumperGameEngine('gameCanvas');

      // Live HUD updates
      engine.onUpdate = (data) => {
        hudTime.textContent = formatTime(data.time);
        hudAlive.textContent = `${data.alive}/${data.total}`;
        hudKills.textContent = data.kills;
        hudScore.textContent = data.score;

        // Cooldown bars
        const dashCdPct = Math.floor(data.dashCooldown * 100);
        const empCdPct = Math.floor(data.empCooldown * 100);

        if (dashCooldownOverlay) dashCooldownOverlay.style.height = `${dashCdPct}%`;
        if (empCooldownOverlay) empCooldownOverlay.style.height = `${empCdPct}%`;
        if (pcDashCooldown) pcDashCooldown.style.width = `${100 - dashCdPct}%`;
        if (pcEmpCooldown) pcEmpCooldown.style.width = `${100 - empCdPct}%`;

        // Active Power-up banner
        if (data.hasRocket) {
          powerUpBanner.classList.remove('hidden');
          powerUpIcon.textContent = '🚀';
          powerUpText.textContent = 'MEGA ROCKET ACTIVE';
          powerUpBar.style.width = `${Math.max(0, data.rocketProgress)}%`;
        } else if (data.hasShield) {
          powerUpBanner.classList.remove('hidden');
          powerUpIcon.textContent = '🛡️';
          powerUpText.textContent = 'FORCE SHIELD ACTIVE';
          powerUpBar.style.width = `${Math.max(0, data.shieldProgress)}%`;
        } else {
          powerUpBanner.classList.add('hidden');
        }
      };

      // Kill Feed Event
      engine.onKillFeed = (data) => {
        const item = document.createElement('div');
        item.className = 'kill-item';
        if (data.isPlayerKill) {
          item.style.borderColor = '#00FFC6';
          item.innerHTML = `💥 <b>YOU</b> knocked out ${escapeHtml(data.victim)}! <span style="color:#FFD700">+350</span>`;
        } else {
          item.innerHTML = `💥 ${escapeHtml(data.killer)} eliminated ${escapeHtml(data.victim)}`;
        }
        killFeed.prepend(item);
        setTimeout(() => { item.remove(); }, 3500);
      };

      // Arena Alert Event
      engine.onAlert = (msg) => {
        alertText.textContent = msg;
        arenaAlert.classList.remove('hidden');
        setTimeout(() => { arenaAlert.classList.add('hidden'); }, 3000);
      };

      // Game Over / Victory
      engine.onGameOver = (data) => {
        showScreen('gameOverScreen');

        if (data.win) {
          goTitle.textContent = '🏆 ARENA CHAMPION! 🏆';
          goTitle.style.color = '#FFD700';
          goSubtitle.textContent = 'You knocked out every rival pilot!';
        } else {
          goTitle.textContent = 'KNOCKED OUT!';
          goTitle.style.color = '#FF3344';
          goSubtitle.textContent = 'Plunged into the cyber abyss!';
        }

        goTime.textContent = formatTime(data.time);
        goKills.textContent = data.kills;
        goScore.textContent = data.score;
        goRank.textContent = 'Submitting...';

        if (data.score > personalBest) {
          personalBest = data.score;
          localStorage.setItem('cyberbumpers_pb', String(personalBest));
          newRecordBanner.classList.remove('hidden');
          launchConfetti();
        } else {
          newRecordBanner.classList.add('hidden');
        }

        submitScore(data).then(res => {
          if (res && res.rank) {
            goRank.textContent = `#${res.rank} of ${res.totalPilots || 1}`;
          } else {
            goRank.textContent = 'Recorded';
          }
        });
      };
    }
    return engine;
  }

  function launchGame() {
    HexAudio.init();
    HexAudio.resumeCtx();

    const eg = getEngine();
    const pilot = pilotNameInput.value.trim() || ('Dili_' + Math.floor(Math.random() * 8999 + 1000));
    showScreen('hud');
    killFeed.innerHTML = '';
    arenaAlert.classList.add('hidden');
    eg.startGame(pilot, selectedSuit);
  }

  btnPlay.addEventListener('click', launchGame);
  btnRetry.addEventListener('click', launchGame);

  // How to play
  btnHowToPlay.addEventListener('click', () => { showScreen('howToPlayModal'); });
  btnHelpClose.addEventListener('click', () => { showScreen('titleScreen'); });

  // Pause
  btnPause.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (engine && engine.state === 'playing') {
      engine.pause();
      showScreen('pauseOverlay');
    }
  });

  btnResume.addEventListener('click', () => {
    if (engine) {
      engine.resume();
      showScreen('hud');
    }
  });

  btnQuit.addEventListener('click', () => {
    if (engine) engine.quit();
    showScreen('titleScreen');
  });

  btnGoMenu.addEventListener('click', () => {
    if (engine) engine.quit();
    showScreen('titleScreen');
  });

  btnGoLb.addEventListener('click', () => {
    showScreen('leaderboardScreen');
    fetchLeaderboard();
  });

  btnLeaderboard.addEventListener('click', () => {
    showScreen('leaderboardScreen');
    fetchLeaderboard();
  });

  btnLbClose.addEventListener('click', () => {
    showScreen('titleScreen');
  });

  // Leaderboard API
  async function fetchLeaderboard() {
    lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">Connecting to Dlicom Cloud...</td></tr>';
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success && data.leaderboard && data.leaderboard.length > 0) {
        lbBody.innerHTML = data.leaderboard.slice(0, 50).map((e, idx) => {
          const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          return `<tr>
            <td>${rankBadge}</td>
            <td><strong>${escapeHtml(e.pilot)}</strong></td>
            <td class="highlight-pink">${e.crystals || e.tier || 0}</td>
            <td class="highlight-gold">${e.score}</td>
          </tr>`;
        }).join('');
      } else {
        lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">No scores yet — claim #1 rank!</td></tr>';
      }
    } catch (err) {
      lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading" style="color:#FF4444">Failed to load leaderboard</td></tr>';
    }
  }

  async function submitScore(data) {
    try {
      const res = await fetch('/api/score/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilot: data.pilot,
          score: data.score,
          survivalTime: data.time,
          tier: data.kills, // store knockouts in tier/crystals field for display
          crystals: data.kills,
          suitColor: selectedSuit,
          win: data.win
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('Score submission error:', e);
      return null;
    }
  }

  // Celebratory Confetti
  function launchConfetti() {
    let canvas = document.getElementById('confettiCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confettiCanvas';
      document.body.appendChild(canvas);
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const colors = ['#00FFC6', '#00E5FF', '#FF6EC7', '#FFD700', '#FF3344'];

    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4 - canvas.height * 0.3,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0
      });
    }

    let frames = 0;
    function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.08;
        p.life -= 0.0035;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frames++;
      if (alive && frames < 280) {
        requestAnimationFrame(anim);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    anim();
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  const savedPilot = localStorage.getItem('cyberbumpers_pilot');
  if (savedPilot) pilotNameInput.value = savedPilot;
  pilotNameInput.addEventListener('change', () => {
    if (pilotNameInput.value.trim()) {
      localStorage.setItem('cyberbumpers_pilot', pilotNameInput.value.trim());
    }
  });

  showScreen('titleScreen');
})();
