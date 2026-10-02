// =============================================
// DILI: CYBER BUMPERS — UI & Leaderboard Controller
// =============================================
(function() {
  'use strict';

  // Screens
  const titleScreen = document.getElementById('titleScreen');
  const soloModeScreen = document.getElementById('soloModeScreen');
  const waitingRoomScreen = document.getElementById('waitingRoomScreen');
  const hud = document.getElementById('hud');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const howToPlayModal = document.getElementById('howToPlayModal');

  // Title inputs
  const pilotNameInput = document.getElementById('pilotName');
  const suitButtons = document.querySelectorAll('.suit-btn');
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

  // Ring Countdown HUD
  const ringCountdownHud = document.getElementById('ringCountdownHud');
  const rcRingName = document.getElementById('rcRingName');
  const rcTimer = document.getElementById('rcTimer');
  const rcProgressBar = document.getElementById('rcProgressBar');

  // Central Knockout Banner
  const knockoutBanner = document.getElementById('knockoutBanner');
  const koIcon = document.getElementById('koIcon');
  const koTitle = document.getElementById('koTitle');
  const koSub = document.getElementById('koSub');

  // Spectator Bar
  const spectatorBar = document.getElementById('spectatorBar');
  const btnSpecPrev = document.getElementById('btnSpecPrev');
  const btnSpecNext = document.getElementById('btnSpecNext');
  const specPilotName = document.getElementById('specPilotName');
  const btnSpecRespawn = document.getElementById('btnSpecRespawn');
  const btnGoSpectate = document.getElementById('btnGoSpectate');

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
  const goMatchRank = document.getElementById('goMatchRank');
  const goTotalScore = document.getElementById('goTotalScore');
  const goBonusRow = document.getElementById('goBonusRow');
  const goBonusPill = document.getElementById('goBonusPill');
  const goStreak = document.getElementById('goStreak');
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
    const allScreens = [titleScreen, soloModeScreen, waitingRoomScreen, hud, pauseOverlay, gameOverScreen, leaderboardScreen, howToPlayModal];
    allScreens.forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.style.display = 'none';
      }
    });
    if (id) {
      const target = document.getElementById(id);
      if (target) {
        target.classList.add('active');
        target.style.display = 'flex';
      }
    }

    // Toggle menu header controls (NEVER show during active gameplay in #hud)
    const topControls = document.querySelector('.top-header-controls');
    if (topControls) {
      topControls.style.display = (id === 'hud') ? 'none' : 'flex';
    }
    if (id === 'hud') {
      document.body.classList.add('in-game');
    } else {
      document.body.classList.remove('in-game');
    }
  }

  // Fullscreen Mode Toggle
  const btnFullscreen = document.getElementById('btnFullscreen');
  const fullscreenIcon = document.getElementById('fullscreenIcon');
  if (btnFullscreen) {
    const FS_ENTER_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    const FS_EXIT_SVG  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

    const updateFsState = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (fullscreenIcon) fullscreenIcon.innerHTML = isFs ? FS_EXIT_SVG : FS_ENTER_SVG;
      btnFullscreen.title = isFs ? 'Exit Fullscreen' : 'Toggle Fullscreen';
      btnFullscreen.classList.toggle('fullscreen-active', isFs);
    };

    const btnFullscreenToggle = document.getElementById('btnFullscreenToggle');
    if (btnFullscreenToggle) {
      btnFullscreenToggle.addEventListener('click', () => {
        if (btnFullscreen) btnFullscreen.click();
      });
    }

    btnFullscreen.addEventListener('click', () => {
      if (typeof HexAudio !== 'undefined' && HexAudio.haptic) HexAudio.haptic('bump');
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
  }

  // Audio Toggle with Crisp Vector SVGs
  const AUDIO_ON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  const AUDIO_OFF_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

  const syncSoundState = (isUnmuted) => {
    const audioIcon = document.getElementById('audioIcon');
    const hudSoundIcon = document.getElementById('hudSoundIcon');
    const hudSoundToggle = document.getElementById('hudSoundToggle');
    if (audioIcon) audioIcon.innerHTML = isUnmuted ? AUDIO_ON_SVG : AUDIO_OFF_SVG;
    if (hudSoundIcon) hudSoundIcon.innerHTML = isUnmuted ? AUDIO_ON_SVG : AUDIO_OFF_SVG;
    globalAudioBtn.classList.toggle('muted', !isUnmuted);
    if (hudSoundToggle) hudSoundToggle.classList.toggle('muted', !isUnmuted);
  };

  globalAudioBtn.addEventListener('click', () => {
    HexAudio.init();
    HexAudio.resumeCtx();
    const isUnmuted = HexAudio.toggleMute();
    syncSoundState(isUnmuted);
  });

  const hudSoundToggle = document.getElementById('hudSoundToggle');
  if (hudSoundToggle) {
    hudSoundToggle.addEventListener('click', () => {
      HexAudio.init();
      HexAudio.resumeCtx();
      const isUnmuted = HexAudio.toggleMute();
      syncSoundState(isUnmuted);
    });
  }

  // Authentic Dlicom Mascot Showcase Controls
  const mascotPreviewImg = document.getElementById('mascotPreviewImg');
  const mascotSpeech = document.getElementById('mascotSpeech');
  const mascotRing = document.getElementById('mascotRing');

  const suitQuotes = {
    mint:    { quote: '🚀 READY TO SMASH!', color: '#00FFC6' },
    pink:    { quote: 'HYPER SPEED ENGAGED! ⚡', color: '#FF6EC7' },
    gold:    { quote: '👑 SOVEREIGN TITAN POWER!', color: '#FFD700' },
    cobalt:  { quote: '🛡️ ENFORCER ONLINE!', color: '#4DA6FF' },
    crimson: { quote: '🔥 MAXIMUM IMPACT!', color: '#FF3344' }
  };

  const suitImgKeyMap = {
    mint: 'mint',
    pink: 'pink',
    gold: 'gold',
    cobalt: 'cobalt',
    crimson: 'crimson'
  };

  // Suit Selection
  suitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      suitButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSuit = btn.dataset.suit;
      const suitActiveTag = document.getElementById('suitActiveTag');
      if (suitActiveTag) {
        suitActiveTag.textContent = { mint: 'MINT CADET', pink: 'CYBER PINK', gold: 'SOVEREIGN TITAN', cobalt: 'COBALT ENFORCER', crimson: 'CRIMSON CRUSHER' }[selectedSuit] || 'MINT CADET';
        suitActiveTag.style.color = (suitQuotes[selectedSuit] || suitQuotes.mint).color;
      }

      const info = suitQuotes[selectedSuit] || suitQuotes.mint;
      const imgKey = suitImgKeyMap[selectedSuit] || selectedSuit;
      if (mascotPreviewImg) {
        mascotPreviewImg.onerror = function() {
          this.src = 'assets/characters/dili-fight-cutout-blue.png';
        };
        mascotPreviewImg.src = `assets/characters/dili-fight-cutout-${imgKey}.png`;
        mascotPreviewImg.style.filter = `drop-shadow(0 8px 18px ${info.color}66)`;
      }
      if (mascotRing) {
        mascotRing.style.borderColor = info.color;
        mascotRing.style.boxShadow = `0 0 20px ${info.color}99, inset 0 0 10px ${info.color}66`;
        mascotRing.style.background = `radial-gradient(ellipse at center, ${info.color}55 0%, transparent 70%)`;
      }
      if (mascotSpeech) {
        mascotSpeech.textContent = info.quote;
        mascotSpeech.style.borderColor = info.color;
        mascotSpeech.style.boxShadow = `0 0 16px ${info.color}66`;
      }
      if (typeof HexAudio !== 'undefined' && HexAudio && HexAudio.sfxVoiceHappy) {
        HexAudio.sfxVoiceHappy();
      }
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

        const hudArenaName = document.getElementById('hudArenaName');
        if (hudArenaName && data.arenaName) {
          hudArenaName.textContent = `${data.arenaIcon || '🏟️'} ${data.arenaName}`;
          if (data.arenaTheme === 'inferno') {
            hudArenaName.style.color = '#FFAA00';
            hudArenaName.style.textShadow = '0 0 10px rgba(255, 85, 0, 0.6)';
          } else if (data.arenaTheme === 'cryo') {
            hudArenaName.style.color = '#DCF8FF';
            hudArenaName.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.6)';
          } else {
            hudArenaName.style.color = '#00FFC6';
            hudArenaName.style.textShadow = '0 0 10px rgba(0, 255, 198, 0.6)';
          }
        }

        // Cooldown bars
        const dashCdPct = Math.floor(data.dashCooldown * 100);
        const empCdPct = Math.floor(data.empCooldown * 100);

        if (dashCooldownOverlay) dashCooldownOverlay.style.height = `${dashCdPct}%`;
        if (empCooldownOverlay) empCooldownOverlay.style.height = `${empCdPct}%`;
        if (pcDashCooldown) pcDashCooldown.style.width = `${100 - dashCdPct}%`;
        if (pcEmpCooldown) pcEmpCooldown.style.width = `${100 - empCdPct}%`;

        // Active Power-up & Cursed Hazard banner
        if (data.hasRocket) {
          powerUpBanner.classList.remove('hidden', 'shield', 'hazard-slow', 'hazard-jam');
          powerUpBanner.classList.add('rocket');
          powerUpIcon.innerHTML = '&#128640;';
          powerUpText.textContent = 'HYPER NITRO ACTIVE';
          powerUpBar.style.width = `${Math.max(0, data.rocketProgress)}%`;
        } else if (data.hasShield) {
          powerUpBanner.classList.remove('hidden', 'rocket', 'hazard-slow', 'hazard-jam');
          powerUpBanner.classList.add('shield');
          powerUpIcon.innerHTML = '&#128737;&#65039;';
          powerUpText.textContent = 'AEGIS FORCE SHIELD';
          powerUpBar.style.width = `${Math.max(0, data.shieldProgress)}%`;
        } else if (data.isGlitchSlow) {
          powerUpBanner.classList.remove('hidden', 'rocket', 'shield', 'hazard-jam');
          powerUpBanner.classList.add('hazard-slow');
          powerUpIcon.innerHTML = '&#9763;&#65039;';
          powerUpText.textContent = 'TOXIC SLUDGE! SLOWED!';
          powerUpBar.style.width = `${Math.max(0, data.slowProgress)}%`;
        } else if (data.isJammed) {
          powerUpBanner.classList.remove('hidden', 'rocket', 'shield', 'hazard-slow');
          powerUpBanner.classList.add('hazard-jam');
          powerUpIcon.innerHTML = '&#9889;';
          powerUpText.textContent = 'CIRCUITS JAMMED! NO ABILITIES!';
          powerUpBar.style.width = `${Math.max(0, data.jamProgress)}%`;
        } else {
          powerUpBanner.classList.add('hidden');
          powerUpBanner.classList.remove('rocket', 'shield', 'hazard-slow', 'hazard-jam');
        }
      };

      // Kill Feed Event
      engine.onKillFeed = (data) => {
        const item = document.createElement('div');
        item.className = 'kill-item';
        if (data.isPlayerKill) {
          item.style.borderColor = '#00FFC6';
          item.innerHTML = `&#128165; <b>YOU</b> knocked out ${escapeHtml(data.victim)}! <span style="color:#FFD700">+350</span>`;
        } else {
          item.innerHTML = `&#128165; ${escapeHtml(data.killer)} eliminated ${escapeHtml(data.victim)}`;
        }
        killFeed.prepend(item);
        setTimeout(() => { item.remove(); }, 3500);
      };

      // Real-Time Ring Collapse Countdown HUD
      engine.onRingCountdown = (data) => {
        if (ringCountdownHud) {
          if (data.isCore) {
            if (rcRingName) rcRingName.textContent = 'CORE DUEL PIT';
            if (rcTimer) rcTimer.textContent = 'FINAL';
            if (rcProgressBar) {
              rcProgressBar.style.width = '100%';
              rcProgressBar.style.background = 'linear-gradient(90deg, #FFD700, #FF3366)';
            }
            ringCountdownHud.classList.remove('warning');
          } else {
            if (rcRingName) rcRingName.textContent = data.name;
            if (rcTimer) rcTimer.textContent = `${data.secLeft}s`;
            if (rcProgressBar) {
              rcProgressBar.style.width = `${data.pct}%`;
              if (data.isWarning) {
                rcProgressBar.style.background = 'linear-gradient(90deg, #FF3344, #FF0055)';
              } else {
                rcProgressBar.style.background = 'linear-gradient(90deg, #00E5FF, #FF0077)';
              }
            }
            if (data.isWarning) {
              ringCountdownHud.classList.add('warning');
            } else {
              ringCountdownHud.classList.remove('warning');
            }
          }
        }
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
        if (spectatorBar) spectatorBar.classList.add('hidden');

        // Spectate button ONLY appears if there are actual real human players alive to spectate!
        const canSpec = data.canSpectate !== undefined ? data.canSpectate : (engine && engine.hasRealHumansToSpectate());
        if (btnGoSpectate) {
          btnGoSpectate.style.display = canSpec ? 'inline-flex' : 'none';
        }

        if (data.win) {
          goTitle.textContent = '🏆 ARENA CHAMPION! 🏆';
          goTitle.style.color = '#FFD700';
          goSubtitle.textContent = 'You knocked out every rival pilot!';
        } else {
          goTitle.textContent = 'KNOCKED OUT!';
          goTitle.style.color = '#FF3344';
          goSubtitle.textContent = data.winnerName ? (data.winnerName + ' won the match!') : 'Plunged into the cyber abyss!';
        }

        goTime.textContent = formatTime(data.time);
        goKills.textContent = data.kills;
        goScore.textContent = (data.score || 0).toLocaleString() + ' PTS';
        if (goTotalScore) goTotalScore.textContent = 'Syncing...';

        // Bonus and Multiplier Row
        if (goBonusRow && goBonusPill) {
          const parts = [];
          if (data.difficultyMultiplier && data.difficultyMultiplier > 1.0) {
            parts.push(`${data.difficultyMultiplier}x ${(data.difficulty || '').toUpperCase()}`);
          }
          if (data.placementBonus && data.placementBonus > 0) {
            parts.push(`+${data.placementBonus.toLocaleString()} PODIUM PTS`);
          }
          if (parts.length > 0) {
            goBonusPill.textContent = parts.join(' | ');
            goBonusRow.style.display = 'flex';
          } else {
            goBonusRow.style.display = 'none';
          }
        }

        if (goMatchRank) {
          const mRank = data.matchRank || 1;
          const mTotal = data.totalParticipants || 4;
          goMatchRank.textContent = `#${mRank} of ${mTotal}`;
          if (mRank === 1) {
            goMatchRank.className = 'highlight-gold';
          } else if (mRank === 2) {
            goMatchRank.className = 'highlight-cyan';
          } else if (mRank === 3) {
            goMatchRank.className = 'highlight-cyan';
          } else {
            goMatchRank.className = 'highlight-pink';
          }
        }
        goRank.textContent = 'Submitting...';
        if (goStreak) goStreak.textContent = (data.bestStreak && data.bestStreak >= 2) ? ('x' + data.bestStreak + ' STREAK') : 'NONE';

        const isMp = (data.mode === 'public') || (engine && engine.isMultiplayer) || (currentModeConfig && currentModeConfig.mode === 'multiplayer');
        const modeLabel = isMp ? 'PUBLIC ARENA' : 'SOLO SURVIVAL';
        const goRankLabel = document.getElementById('goRankLabel');
        if (goRankLabel) {
          goRankLabel.textContent = isMp ? 'ARENA GLOBAL RANK' : 'SOLO GLOBAL RANK';
        }

        // Separate Personal Bests for Solo vs Public Arena
        const pbKey = isMp ? 'hexfall_public_pb' : 'hexfall_solo_pb';
        const currentPB = parseInt(localStorage.getItem(pbKey) || '0', 10);
        if (data.score > currentPB) {
          localStorage.setItem(pbKey, String(data.score));
          newRecordBanner.textContent = `🏆 NEW ${modeLabel} MATCH BEST: ${data.score.toLocaleString()} PTS!`;
          newRecordBanner.classList.remove('hidden');
          launchConfetti();
        } else {
          newRecordBanner.classList.add('hidden');
        }

        submitScore(data).then(res => {
          if (res && res.rank) {
            goRank.textContent = `#${res.rank} of ${res.totalPilots || 1}`;
          } else {
            goRank.textContent = '#1';
          }
          if (res && goTotalScore) {
            const careerPts = res.totalScore || res.score || data.score;
            goTotalScore.textContent = careerPts.toLocaleString() + ' PTS';
          }
        });
      };

    }
          engine.onRespawnSuccess = () => {
        showScreen('hud');
        if (spectatorBar) spectatorBar.classList.add('hidden');
      };

      engine.onSpectatorEnded = () => {
        if (spectatorBar) spectatorBar.classList.add('hidden');
        showScreen('gameOverScreen');
        if (btnGoSpectate) btnGoSpectate.style.display = 'none';
      };

      return engine;
  }

  // ============================================================
  // MODE SELECTION SYSTEM
  // ============================================================
  let currentModeConfig = { mode: 'solo', difficulty: 'hard', botCount: 4, totalPlayers: 5, arenaTheme: 'neon' };
  let socket = null;

  
  // Mobile phone screen lock / tab hidden detection
  document.addEventListener('visibilitychange', () => {
    const s = getSocket();
    if (!s || !s.connected) return;
    if (document.hidden) {
      console.log('[Visibility] Screen locked or tab backgrounded.');
      s.emit('player_visibility', { visible: false });
    } else {
      console.log('[Visibility] Screen unlocked or tab restored.');
      s.emit('player_visibility', { visible: true });
    }
  });
  window.addEventListener('pagehide', () => {
    const s = getSocket();
    if (s && s.connected) s.emit('player_visibility', { visible: false });
  });

  function getSocket() {
    if (!socket && typeof io !== 'undefined') {
      socket = io();
    }
    return socket;
  }
  // Pre-connect socket in background so click to join is instantaneous
  if (typeof io !== 'undefined') {
    setTimeout(() => { getSocket(); }, 50);
  }
  let waitingInterval = null;

  function getOrInitPilotName() {
    let entered = pilotNameInput.value.trim().replace(/[^\w\s@\-\.]/g, '').trim();
    if (!entered) {
      entered = localStorage.getItem('dili_jump_pilot') || 
                localStorage.getItem('cyberbumpers_pilot') || 
                localStorage.getItem('dili_pilot_name') || 
                ('Dili_' + Math.floor(Math.random() * 8999 + 1000));
      entered = entered.replace(/[^\w\s@\-\.]/g, '').trim();
    }
    if (entered.startsWith('Pilot_')) {
      entered = entered.replace('Pilot_', 'Dili_');
    }
    pilotNameInput.value = entered;
    localStorage.setItem('dili_jump_pilot', entered);
    localStorage.setItem('cyberbumpers_pilot', entered);
    localStorage.setItem('dili_pilot_name', entered);
    return entered;
  }

  function launchGame(modeConfig) {
    HexAudio.init();
    HexAudio.resumeCtx();

    currentModeConfig = modeConfig || currentModeConfig;
    const eg = getEngine();
    const pilot = getOrInitPilotName();
    showScreen('hud');
    if (spectatorBar) spectatorBar.classList.add('hidden');
    if (knockoutBanner) knockoutBanner.classList.add('hidden');
    killFeed.innerHTML = '';
    arenaAlert.classList.add('hidden');
    eg.startGame(pilot, selectedSuit, currentModeConfig);
  }

  // Solo Play Button -> Show difficulty selection
  const btnSoloPlay = document.getElementById('btnSoloPlay');
  const btnPublicRoom = document.getElementById('btnPublicRoom');
  const btnSoloBack = document.getElementById('btnSoloBack');
  const btnWaitingBack = document.getElementById('btnWaitingBack');
  const btnEasy = document.getElementById('btnEasy');
  const btnMedium = document.getElementById('btnMedium');
  const btnHard = document.getElementById('btnHard');

  btnSoloPlay.addEventListener('click', () => {
    showScreen('soloModeScreen');
  });
  btnSoloPlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showScreen('soloModeScreen');
    }
  });
  btnPublicRoom.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btnPublicRoom.click();
    }
  });

  btnSoloBack.addEventListener('click', () => {
    showScreen('titleScreen');
  });

  // Arena Selection in Solo Screen
  let selectedArenaTheme = 'neon';
  const arenaPillBtns = document.querySelectorAll('.arena-pill');
  const arenaActiveTag = document.getElementById('arenaActiveTag');

  const ARENA_NAME_MAP = {
    neon: { name: 'NEON COLOSSEUM', color: '#00FFC6' },
    inferno: { name: 'INFERNO FORGE', color: '#FFAA00' },
    cryo: { name: 'CRYO GLACIER', color: '#DCF8FF' },
    random: { name: 'RANDOM COLOSSEUM', color: '#F0A3FF' }
  };

  arenaPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof HexAudio !== 'undefined' && HexAudio.sfxTap) HexAudio.sfxTap();
      arenaPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedArenaTheme = btn.dataset.theme;

      if (arenaActiveTag && ARENA_NAME_MAP[selectedArenaTheme]) {
        arenaActiveTag.textContent = ARENA_NAME_MAP[selectedArenaTheme].name;
        arenaActiveTag.style.color = ARENA_NAME_MAP[selectedArenaTheme].color;
      }
    });
  });

  // Difficulty buttons launch solo game with selected arena theme
  [btnEasy, btnMedium, btnHard].forEach(btn => {
    btn.addEventListener('click', () => {
      const botCount = parseInt(btn.dataset.bots);
      const difficulty = btn.dataset.diff;
      launchGame({
        mode: 'solo',
        difficulty: difficulty,
        botCount: botCount,
        totalPlayers: botCount + 1,
        arenaTheme: selectedArenaTheme
      });
    });
  });

  // ============================================================
    // ============================================================
  // REAL-TIME MULTIPLAYER WAITING LOBBY (Socket.io)
  // ============================================================
  btnPublicRoom.addEventListener('click', () => {
    HexAudio.init();
    HexAudio.resumeCtx();
    const playerName = getOrInitPilotName();
    const s = getSocket();

    // Immediate visual feedback: transition to HUD with drop-in alert
    showScreen('hud');
    if (spectatorBar) spectatorBar.classList.add('hidden');
    if (knockoutBanner) knockoutBanner.classList.add('hidden');
    killFeed.innerHTML = '';
    arenaAlert.classList.remove('hidden');
    if (alertText) alertText.textContent = '⚡ CONNECTING TO THE COLOSSEUM...';

    if (!s) {
      if (alertText) alertText.textContent = '⚠️ SERVER OFFLINE — STARTING SOLO TRAINING';
      setTimeout(() => {
        launchGame({ mode: 'solo', difficulty: 'hard', botCount: 3, totalPlayers: 4, arenaTheme: 'neon' });
      }, 700);
      return;
    }

    currentModeConfig = { mode: 'multiplayer' };
    let joined = false;

    // Register listeners BEFORE emitting
    s.off('arena_joined_live');
    s.on('arena_joined_live', (data) => {
      joined = true;
      currentModeConfig = { mode: 'multiplayer' };
      showScreen('hud');
      killFeed.innerHTML = '';
      arenaAlert.classList.add('hidden');
      try {
        const eg = getEngine();
        eg.startPersistentPublicGame(Object.assign({}, data, {
          myPilotName: playerName,
          mySuitKey: selectedSuit || 'mint'
        }), s);
      } catch (err) {
        console.error('Error starting multiplayer game:', err);
        launchGame({ mode: 'solo', difficulty: 'hard', botCount: 3, totalPlayers: 4, arenaTheme: data.arenaTheme || 'neon' });
      }
    });

    s.off('arena_reset');
    s.on('arena_reset', () => {
      showScreen('hud');
      if (killFeed) killFeed.innerHTML = '';
      if (arenaAlert) arenaAlert.classList.add('hidden');
    });

    s.off('respawn_success');
    s.on('respawn_success', () => {
      showScreen('hud');
      if (killFeed) killFeed.innerHTML = '';
      if (arenaAlert) arenaAlert.classList.add('hidden');
    });

    // Fallback if socket fails to reply within 4.5 seconds
    setTimeout(() => {
      if (!joined && document.getElementById('hud') && document.getElementById('hud').style.display === 'flex') {
        const eg = getEngine();
        if (eg && eg.state !== 'playing' && eg.state !== 'countdown') {
          console.warn('Socket join timeout. Falling back to solo colosseum.');
          if (alertText) alertText.textContent = '⚡ ENTERING SOLO BATTLEGROUND...';
          setTimeout(() => {
            launchGame({ mode: 'solo', difficulty: 'hard', botCount: 3, totalPlayers: 4, arenaTheme: 'neon' });
          }, 500);
        }
      }
    }, 4500);

    // Emit join event
    s.emit('join_public_room', {
      pilotName: playerName,
      suitColor: selectedSuit || 'mint'
    });
  });

  btnWaitingBack.addEventListener('click', () => {
    leaveRealPublicLobby();
    showScreen('titleScreen');
  });

  const btnForceStart = document.getElementById('btnForceStart');
  if (btnForceStart) {
    btnForceStart.addEventListener('click', () => {
      const s = getSocket();
      if (s) s.emit('force_start');
    });
  }

  function joinRealPublicLobby() {
    const waitingPilots = document.getElementById('waitingPilots');
    const waitingTimer = document.getElementById('waitingTimer');
    const waitingRoster = document.getElementById('waitingRoster');
    const waitingPulseText = document.querySelector('.pulse-text');
    const forceStartBtn = document.getElementById('btnForceStart');

    const playerName = getOrInitPilotName();
    const s = getSocket();

    if (!s) {
      console.warn('Socket.io not available, running fallback mode.');
      return;
    }

    waitingRoster.innerHTML = '<div class="roster-pilot you"><span class="roster-dot" style="background:#00FFC6;box-shadow:0 0 8px #00FFC6"></span> ' + escapeHtml(playerName) + ' (YOU)</div>';
    waitingPilots.textContent = '1 / 6';
    waitingTimer.textContent = 'WAITING';
    if (waitingPulseText) waitingPulseText.textContent = 'CONNECTING TO PUBLIC ARENA...';
    if (forceStartBtn) forceStartBtn.style.display = 'none';

    s.emit('join_public_room', {
      pilotName: playerName,
      suitColor: selectedSuit || 'mint'
    });

    s.off('lobby_update');
    s.off('match_start');

    s.on('lobby_update', (data) => {
      waitingPilots.textContent = (data.players ? data.players.length : 1) + ' / ' + (data.maxPlayers || 6);

      if (data.status === 'countdown') {
        waitingTimer.textContent = data.countdown;
        if (waitingPulseText) waitingPulseText.textContent = 'MATCH STARTING IN ' + data.countdown + 's...';
      } else {
        waitingTimer.textContent = 'WAITING';
        if (waitingPulseText) {
          waitingPulseText.textContent = (data.players && data.players.length >= 2) ? 'PILOTS ASSEMBLED! READY TO BATTLE' : 'SEARCHING FOR REAL OPPONENTS...';
        }
      }

      if (forceStartBtn) {
        forceStartBtn.style.display = (data.players && data.players.length >= 2) ? 'block' : 'none';
      }

      if (data.players) {
        const suitHexMap = {
          mint: '#00FFC6',
          pink: '#FF6EC7',
          gold: '#FFD700',
          cobalt: '#4DA6FF',
          crimson: '#FF3344',
          blue: '#3388FF'
        };

        waitingRoster.innerHTML = data.players.map(p => {
          const isYou = p.id === s.id;
          const dotColor = suitHexMap[p.suitColor] || '#00FFC6';
          return '<div class="roster-pilot ' + (isYou ? 'you' : '') + '">' +
            '<span class="roster-dot" style="background:' + dotColor + '; box-shadow:0 0 8px ' + dotColor + '"></span> ' +
            escapeHtml(p.pilotName) + (isYou ? ' (YOU)' : '') +
            '</div>';
        }).join('');
      }
    });

    s.on('match_start', (data) => {
      showScreen('hud');
      killFeed.innerHTML = '';
      arenaAlert.classList.add('hidden');
      const eg = getEngine();
      eg.startMultiplayerGame(data, s);
    });
  }

  function leaveRealPublicLobby() {
    const s = getSocket();
    if (s) {
      s.emit('leave_room');
      s.off('lobby_update');
      s.off('match_start');
    }
  }

  // Retry button - relaunch with same mode
  let rematchDebounce = 0;
  function handleRematch(e) {
    if (e) {
      try { e.preventDefault(); } catch(err) {}
      try { e.stopPropagation(); } catch(err) {}
    }
    const now = Date.now();
    if (now - rematchDebounce < 400) return;
    rematchDebounce = now;

    console.log('[Rematch] Triggered!');
    HexAudio.init();
    HexAudio.resumeCtx();
    showScreen('hud');
    if (killFeed) killFeed.innerHTML = '';
    if (arenaAlert) arenaAlert.classList.add('hidden');

    const eg = getEngine();
    const isMp = eg && (eg.isMultiplayer || (currentModeConfig && currentModeConfig.mode === 'multiplayer'));

    if (spectatorBar) spectatorBar.classList.add('hidden');
    if (eg) eg.stopSpectating();

    if (isMp) {
      console.log('[Rematch] Respawning in Persistent Arena...');
      eg.requestRespawn();
    } else {
      console.log('[Rematch] Restarting Solo match with config:', currentModeConfig);
      launchGame(currentModeConfig || { mode: 'solo', difficulty: 'hard', botCount: 4, totalPlayers: 5 });
    }
  }

  btnRetry.addEventListener('click', handleRematch);
  btnRetry.addEventListener('touchend', handleRematch);

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
    leaveRealPublicLobby();
    showScreen('titleScreen');
  });

  btnGoMenu.addEventListener('click', () => {
    if (engine) engine.quit();
    leaveRealPublicLobby();
    showScreen('titleScreen');
  });

  btnGoLb.addEventListener('click', () => {
    const eg = getEngine();
    const isMp = eg && (eg.isMultiplayer || (currentModeConfig && currentModeConfig.mode === 'multiplayer'));
    currentLbMode = isMp ? 'public' : 'solo';
    currentLbFilter = 'all';

    const btnSolo = document.getElementById('lbModeSolo');
    const btnPublic = document.getElementById('lbModePublic');
    if (btnSolo && btnPublic) {
      btnSolo.classList.toggle('active', !isMp);
      btnPublic.classList.toggle('active', isMp);
    }

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

    // Known Bot Names Filter
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

  // =========================================================================
  // DUAL LEADERBOARD SYSTEM (SOLO SURVIVAL & PUBLIC ARENA)
  // =========================================================================
  let cachedSoloLeaderboard = [];
  let cachedPublicLeaderboard = [];
  let currentLbMode = 'solo'; // 'solo' or 'public'
  let currentLbFilter = 'all';

  function setupLeaderboardTabs() {
    const btnSolo = document.getElementById('lbModeSolo');
    const btnPublic = document.getElementById('lbModePublic');

    if (btnSolo) {
      btnSolo.addEventListener('click', () => {
        HexAudio.init(); HexAudio.resumeCtx();
        HexAudio.playTone(600, 'triangle', 0.05);
        btnSolo.classList.add('active');
        if (btnPublic) btnPublic.classList.remove('active');
        currentLbMode = 'solo';
        currentLbFilter = 'all';
        renderSubFilterTabs();
        renderLeaderboardTable();
      });
    }

    if (btnPublic) {
      btnPublic.addEventListener('click', () => {
        HexAudio.init(); HexAudio.resumeCtx();
        HexAudio.playTone(700, 'triangle', 0.05);
        btnPublic.classList.add('active');
        if (btnSolo) btnSolo.classList.remove('active');
        currentLbMode = 'public';
        currentLbFilter = 'all';
        renderSubFilterTabs();
        renderLeaderboardTable();
      });
    }
  }

  function renderSubFilterTabs() {
    const subContainer = document.getElementById('lbSubFilterTabs');
    if (!subContainer) return;

    if (currentLbMode === 'solo') {
      subContainer.innerHTML = `
        <button class="lb-filter-btn ${currentLbFilter === 'all' ? 'active' : ''}" data-filter="all">ALL</button>
        <button class="lb-filter-btn ${currentLbFilter === 'normal' ? 'active' : ''}" data-filter="normal">NORMAL</button>
        <button class="lb-filter-btn ${currentLbFilter === 'medium' ? 'active' : ''}" data-filter="medium">MEDIUM</button>
        <button class="lb-filter-btn ${currentLbFilter === 'hard' ? 'active' : ''}" data-filter="hard">HARD</button>
      `;
    } else {
      subContainer.innerHTML = `
        <button class="lb-filter-btn ${currentLbFilter === 'all' ? 'active' : ''}" data-filter="all">ALL FIGHTERS</button>
        <button class="lb-filter-btn ${currentLbFilter === 'champions' ? 'active' : ''}" data-filter="champions">CHAMPIONS (WINS)</button>
      `;
    }

    subContainer.querySelectorAll('.lb-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        HexAudio.init(); HexAudio.resumeCtx();
        HexAudio.playTone(550, 'sine', 0.04);
        subContainer.querySelectorAll('.lb-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLbFilter = btn.dataset.filter || 'all';
        renderLeaderboardTable();
      });
    });
  }

  function sortLeaderboardEntries(arr) {
    return arr.sort((a, b) => {
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
  }

  function renderLeaderboardTable() {
    if (!lbBody) return;
    const isSolo = currentLbMode === 'solo';
    const list = isSolo ? cachedSoloLeaderboard : cachedPublicLeaderboard;

    let filtered = [];
    if (isSolo) {
      if (currentLbFilter === 'all') {
        filtered = sortLeaderboardEntries([...list]);
      } else {
        filtered = sortLeaderboardEntries(list.filter(e => (e.difficulty || 'normal').toLowerCase() === currentLbFilter));
      }
    } else {
      // Public Arena
      if (currentLbFilter === 'champions') {
        filtered = list.filter(e => (e.wins && e.wins > 0) || e.win)
                       .sort((a, b) => {
                         const winsA = Number(a.wins) || (a.win ? 1 : 0);
                         const winsB = Number(b.wins) || (b.win ? 1 : 0);
                         if (winsB !== winsA) return winsB - winsA;
                         return (Number(b.totalScore || b.score) || 0) - (Number(a.totalScore || a.score) || 0);
                       });
      } else {
        filtered = sortLeaderboardEntries([...list]);
      }
    }

    if (filtered.length === 0) {
      lbBody.innerHTML = `<tr><td colspan="5" class="lb-loading">No ${isSolo ? 'Solo' : 'Public Arena'} records yet &mdash; Be the first to claim #1!</td></tr>`;
      return;
    }

    lbBody.innerHTML = filtered.slice(0, 50).map((entry, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
      const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
      const suitColorHex = suitColorMap[entry.suitColor] ? ('#' + suitColorMap[entry.suitColor].toString(16).padStart(6, '0')) : '#00FFC6';

      let modeBadgeHtml = '';
      if (isSolo) {
        const diffKey = (entry.difficulty || 'normal').toLowerCase();
        const diffClass = diffKey === 'hard' ? 'diff-hard' : (diffKey === 'medium' ? 'diff-medium' : 'diff-normal');
        const diffLabel = diffKey.toUpperCase();
        modeBadgeHtml = `<span class="pilot-diff-pill ${diffClass}">${diffLabel}</span>`;
      } else {
        const totalWins = Number(entry.wins) || (entry.win ? 1 : 0);
        if (totalWins > 0) {
          modeBadgeHtml = `<span class="pilot-diff-pill diff-champion">👑 ${totalWins} WIN${totalWins > 1 ? 'S' : ''}</span>`;
        } else {
          modeBadgeHtml = `<span class="pilot-diff-pill diff-live">ARENA</span>`;
        }
      }

      const totalWins = Number(entry.wins) || (entry.win ? 1 : 0);
      const matchesPlayed = Number(entry.matchesPlayed) || 1;
      const bestScore = Number(entry.bestScore !== undefined ? entry.bestScore : entry.score) || 0;
      const totalScore = Number(entry.totalScore !== undefined ? entry.totalScore : entry.score) || 0;

      return `<tr>
        <td class="${rankClass}">${medal}#${idx + 1}</td>
        <td>
          <div class="pilot-cell">
            <span class="pilot-suit-dot" style="background:${suitColorHex}; box-shadow: 0 0 6px ${suitColorHex};"></span>
            <span class="pilot-name-text">${escapeHtml(entry.pilot)}</span>
            ${modeBadgeHtml}
          </div>
          <span class="pilot-stats-sub">${matchesPlayed} match${matchesPlayed > 1 ? 'es' : ''} • Best: ${bestScore.toLocaleString()} pts</span>
        </td>
        <td class="highlight-cyan" style="font-weight:700;">${totalWins}</td>
        <td class="highlight-pink">${entry.kills || 0}</td>
        <td class="highlight-gold" style="font-weight:800;">${totalScore.toLocaleString()} PTS</td>
      </tr>`;
    }).join('');
  }

  async function fetchLeaderboard() {
    lbBody.innerHTML = '<tr><td colspan="5" class="lb-loading">Connecting to Dlicom Cloud...</td></tr>';
    renderSubFilterTabs();
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success) {
        cachedSoloLeaderboard = (data.solo || []).filter(e => e && e.pilot && !isBotAccount(e.pilot));
        cachedPublicLeaderboard = (data.public || []).filter(e => e && e.pilot && !isBotAccount(e.pilot));
        renderLeaderboardTable();
      } else {
        lbBody.innerHTML = '<tr><td colspan="5" class="lb-loading">No scores yet &mdash; claim #1 rank!</td></tr>';
      }
    } catch (err) {
      lbBody.innerHTML = '<tr><td colspan="5" class="lb-loading" style="color:#FF4444">Failed to load leaderboard</td></tr>';
    }
  }


  async function submitScore(data) {
    try {
      const isMp = (data.mode === 'public') || (engine && engine.isMultiplayer) || (currentModeConfig && currentModeConfig.mode === 'multiplayer');
      const res = await fetch('/api/score/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isMp ? 'public' : 'solo',
          pilot: data.pilot,
          score: data.score,
          survivalTime: data.time,
          kills: data.kills,
          difficulty: data.difficulty || (currentModeConfig ? currentModeConfig.difficulty : 'normal'),
          suitColor: selectedSuit,
          win: data.win,
          matchRank: data.matchRank || 1
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('Score submission error:', e);
      return null;
    }
  }

  // Setup mode switcher listeners
  setupLeaderboardTabs();

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

  // Dili Jump Unified Pilot Name Persistence Scheme
  let savedPilot = localStorage.getItem('dili_jump_pilot') || 
                   localStorage.getItem('cyberbumpers_pilot') || 
                   localStorage.getItem('dili_pilot_name') || '';
  if (savedPilot) {
    // Sanitize any corrupted mojibake characters
    savedPilot = savedPilot.replace(/[^\w\s@\-\.]/g, '').trim();
    if (savedPilot.startsWith('Pilot_')) savedPilot = savedPilot.replace('Pilot_', 'Dili_');
    if (!savedPilot) savedPilot = 'Dili_' + Math.floor(Math.random() * 8999 + 1000);
    pilotNameInput.value = savedPilot;
    localStorage.setItem('dili_jump_pilot', savedPilot);
    localStorage.setItem('cyberbumpers_pilot', savedPilot);
  }

  const syncPilotName = () => {
    const val = pilotNameInput.value.trim();
    if (val) {
      localStorage.setItem('dili_jump_pilot', val);
      localStorage.setItem('cyberbumpers_pilot', val);
      localStorage.setItem('dili_pilot_name', val);
    }
  };
  pilotNameInput.addEventListener('input', syncPilotName);
  pilotNameInput.addEventListener('change', syncPilotName);

  showScreen('titleScreen');

  // =============================================
  // SPECTATOR CONTROLS
  // =============================================
  if (btnSpecPrev) {
    btnSpecPrev.addEventListener('click', () => {
      const eg = getEngine();
      if (eg) eg.spectatePrev();
    });
  }
  if (btnSpecNext) {
    btnSpecNext.addEventListener('click', () => {
      const eg = getEngine();
      if (eg) eg.spectateNext();
    });
  }
  if (btnSpecRespawn) {
    btnSpecRespawn.addEventListener('click', () => {
      if (spectatorBar) spectatorBar.classList.add('hidden');
      showScreen('hud');
      const eg = getEngine();
      if (eg) {
        eg.stopSpectating();
        eg.requestRespawn();
      } else {
        launchGame(currentModeConfig);
      }
    });
  }
  if (btnGoSpectate) {
    btnGoSpectate.addEventListener('click', () => {
      const eg = getEngine();
      if (eg && eg.hasRealHumansToSpectate()) {
        showScreen('hud');
        if (spectatorBar) spectatorBar.classList.remove('hidden');
        eg.startSpectating();
        if (specPilotName) specPilotName.textContent = eg.getSpectateName();
      }
    });
  }
})();

