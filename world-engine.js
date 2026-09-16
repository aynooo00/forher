// ===================================================================
// LE MONDE DES CINQ PLUMES : FLÂNERIE PARISIENNE & RPG TOP-DOWN 2D
// 5 Grands Quartiers, le Grand Fleuve Pastel (La Seine), 3 Ponts,
// Bâtiments Haussmanniens, Boutiques, Terrasses, Secrets & Mots Doux
// ===================================================================

(function () {
  'use strict';

  window.createParisWorldEngine = function (options) {
    const { getState, navigateTo, showToast, screens } = options;

    const canvas = document.getElementById('world-canvas');
    let ctx = null;
    let animFrameId = null;
    let isRunning = false;
    let isPaused = false;
    let walkCycle = 0;
    let lastTimestamp = 0;

    // Dimensions du monde & viewport
    const VIEWPORT_WIDTH = 800;
    const VIEWPORT_HEIGHT = 540;
    const MAP_WIDTH = 2000;
    const MAP_HEIGHT = 1500;

    // Caméra centrée sur le joueur avec lerp fluide
    const camera = {
      x: 0,
      y: 0
    };

    // État du Joueur
    // Position de départ : Quartier Latin (Rive Gauche), juste devant la rue menant à Récamier
    const player = {
      x: 520,
      y: 1220,
      speed: 3.0,
      dir: 'down', // 'down', 'up', 'left', 'right'
      isMoving: false,
      spawnBurst: 0
    };

    const keysDown = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // 5 Grandes Épreuves / Points d'Intérêt de la Quête
    const QUEST_ZONES = [
      {
        id: 1,
        key: 'jeu1',
        name: 'Zone 1 • Le Quartier Latin',
        district: 'Le Quartier Latin (Rive Gauche)',
        shortTitle: 'L\'Énigme Littéraire',
        icon: '🪶',
        x: 460,
        y: 1340,
        radius: 56,
        accessible: true,
        desc: "Façade du restaurant littéraire Le Récamier (Milan Kundera), lampadaire parisien et livre mystère sur piédestal d'ivoire."
      },
      {
        id: 2,
        key: 'jeu2',
        name: 'Zone 2 • Le Marais (Herboristes)',
        district: 'Le Marais & l\'Officine Botanique',
        shortTitle: 'L\'Officine Botanique',
        icon: '🍄',
        x: 1540,
        y: 560,
        radius: 58,
        accessible: false,
        desc: "Cour secrète envahie de champignons géants aux tons pastel et de plantes bioluminescentes adossées à de vieilles briques."
      },
      {
        id: 3,
        key: 'jeu3',
        name: 'Zone 3 • Les Grands Jardins Royaux',
        district: 'Les Grands Jardins Royaux',
        shortTitle: 'L\'Étang des Cygnes',
        icon: '🦢',
        x: 480,
        y: 570,
        radius: 64,
        accessible: false,
        desc: "Grand lac azur clair, ponton cintré en bois, saules pleureurs et deux cygnes majestueux aux reflets d'argent."
      },
      {
        id: 4,
        key: 'jeu4',
        name: 'Zone 4 • La Butte aux Étoiles (Montmartre)',
        district: 'Montmartre • La Butte aux Étoiles',
        shortTitle: 'L\'Astre & la Rose',
        icon: '🌹',
        x: 1000,
        y: 160,
        radius: 56,
        accessible: false,
        desc: "Au sommet de la butte sous un ciel nocturne étoilé, observatoire céleste et rose écarlate protégée sous cloche de verre."
      },
      {
        id: 5,
        key: 'jeu5',
        name: 'Zone 5 • Les Quais Sablonneux',
        district: 'Les Quais Sablonneux & la Plage',
        shortTitle: 'La Bouteille à la Mer',
        icon: '🌊',
        x: 1000,
        y: 1045,
        radius: 56,
        accessible: false,
        desc: "Mélange onirique entre Paris et la mer : sable fin crème, cabines pastel rayées et bouteille à la mer échouée près d'un transat."
      }
    ];

    // Petits Mots Doux & Secrets cachés dans Paris (Easter Eggs)
    const EASTER_EGGS = [
      {
        id: 'theatre',
        name: 'Affiche de Théâtre Déchirée',
        icon: '🎭',
        tag: 'Secret du Quartier Latin',
        x: 320,
        y: 1210,
        radius: 36,
        message: "« L'insoutenable légèreté de t'aimer... »\nUne comédie romantique jouée chaque soir sur les planches parisiennes. Chaque mot d'amour semble avoir été écrit pour vous deux."
      },
      {
        id: 'cafe',
        name: 'Ardoise du Café des Poètes',
        icon: '☕',
        tag: 'Bistrot Parisien',
        x: 640,
        y: 1370,
        radius: 38,
        message: "Formule du jour à la craie dorée :\n« Deux tasses de douceur partagées en terrasse, une brioche tiède, et la certitude qu'avec toi, la vie a le goût du bonheur. »"
      },
      {
        id: 'banc',
        name: 'Banc de Marbre Blanc',
        icon: '💌',
        tag: 'Jardins Royaux',
        x: 230,
        y: 650,
        radius: 36,
        message: "Une inscription discrète gravée dans la pierre :\n« Pour toi qui marches ici sous l'ombre des saules, n'oublie jamais : la beauté du monde commence dans tes yeux. »"
      },
      {
        id: 'herboriste',
        name: 'Note de l\'Officine Secrète',
        icon: '🌿',
        tag: 'Remède Poétique du Marais',
        x: 1720,
        y: 610,
        radius: 38,
        message: "Une recette d'apothicaire glissée sous un pot en céramique :\n« Prenez une poignée de sauge sauvage, trois gouttes de pluie d'été, et tout l'amour du monde pour guérir n'importe quelle mélancolie. »"
      },
      {
        id: 'cabine',
        name: 'Cabine de Plage n°7',
        icon: '🏖️',
        tag: 'Les Quais Sablonneux',
        x: 1340,
        y: 1040,
        radius: 36,
        message: "Une carte postale aux rayures pastel (style Rice Copenhagen) posée sur la porte :\n« Même en plein cœur de Paris, dès que tu souris, j'entends le bruit des vagues et de l'océan. »"
      },
      {
        id: 'chevalet',
        name: 'Chevalet d\'Artiste sous les Étoiles',
        icon: '🎨',
        tag: 'Butte Montmartre',
        x: 810,
        y: 260,
        radius: 38,
        message: "Une esquisse au fusain laissée sur la toile :\n« La plus belle silhouette de tout Paris... c'est la tienne marchant sous les étoiles de la Butte. »"
      }
    ];

    // Définition des Boîtes de Collision (murs, bâtiments, berges du fleuve hors ponts)
    // Coordonnées en espace monde [x, y, w, h]
    const COLLIDERS = [
      // Bords de la carte
      [0, 0, MAP_WIDTH, 35],
      [0, MAP_HEIGHT - 35, MAP_WIDTH, 35],
      [0, 0, 35, MAP_HEIGHT],
      [MAP_WIDTH - 35, 0, 35, MAP_HEIGHT],

      // Le Grand Fleuve Pastel (y = 785 à 925), SAUF les 3 Ponts en Pierre :
      // Pont 1 (Ouest) : x 425 à 515
      // Pont 2 (Centre / Arts) : x 955 à 1045
      // Pont 3 (Est / Apothicaire) : x 1475 à 1565
      [35, 785, 390, 140],
      [515, 785, 440, 140],
      [1045, 785, 430, 140],
      [1565, 785, 400, 140],

      // Quartier Latin - Immeubles Haussmanniens (Rive Gauche)
      [70, 1140, 200, 260],
      [310, 1260, 90, 180],
      // Impasse Récamier : Murs qui entourent le fond de l'impasse
      [370, 1370, 60, 95],
      [520, 1370, 60, 95],
      // Grand pâté de maisons Café & Librairie
      [600, 1140, 220, 180],
      [860, 1160, 240, 260],
      [1140, 1150, 300, 280],
      [1490, 1150, 420, 280],

      // Le Marais - Bâtisses en brique & serres
      [1140, 440, 260, 220],
      // Enceinte de la cour secrète (laisse une ouverture au sud-ouest)
      [1460, 420, 180, 90],
      [1660, 470, 130, 210],
      [1460, 650, 190, 70],
      [1830, 440, 135, 280],

      // Montmartre - Bâtiments & Observatoire
      [580, 110, 110, 90], // Moulin
      [940, 60, 120, 70],  // Observatoire dôme nord
      [1220, 90, 160, 110]
    ];

    let activeInteraction = null;

    // Particules ambiantes (Pétales pastel et feuilles)
    const petals = [];
    for (let i = 0; i < 40; i++) {
      petals.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        r: 2.2 + Math.random() * 2.8,
        vx: 0.35 + Math.random() * 0.5,
        vy: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.025,
        color: ['#fce7e7', '#fde2e4', '#e2ece9', '#fff3da', '#e8f0fe'][Math.floor(Math.random() * 5)],
        alpha: 0.35 + Math.random() * 0.4
      });
    }

    // Étoiles de Montmartre
    const montmartreStars = [];
    for (let i = 0; i < 70; i++) {
      montmartreStars.push({
        x: 60 + Math.random() * (MAP_WIDTH - 120),
        y: 20 + Math.random() * 320,
        r: 0.8 + Math.random() * 1.8,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Étincelles magiques de la Zone 1 (Littérature)
    const sparks = [];
    for (let i = 0; i < 16; i++) {
      sparks.push({
        angle: Math.random() * Math.PI * 2,
        dist: 18 + Math.random() * 34,
        speed: 0.016 + Math.random() * 0.024,
        r: 1.2 + Math.random() * 1.6,
        alpha: 0.3 + Math.random() * 0.7
      });
    }

    // Spores bioluminescentes du Marais
    const spores = [];
    for (let i = 0; i < 20; i++) {
      spores.push({
        angle: Math.random() * Math.PI * 2,
        dist: 12 + Math.random() * 40,
        speed: 0.012 + Math.random() * 0.018,
        r: 1.4 + Math.random() * 1.8,
        color: ['#a8ffd8', '#d0bfff', '#ffe4a0'][Math.floor(Math.random() * 3)],
        alpha: 0.4 + Math.random() * 0.5
      });
    }

    function init() {
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      setupControls();
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = VIEWPORT_WIDTH;
      canvas.height = VIEWPORT_HEIGHT;
    }

    function setupControls() {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // D-Pad tactile Mobile
      const dpadButtons = document.querySelectorAll('.dpad-btn');
      dpadButtons.forEach(btn => {
        const dir = btn.getAttribute('data-dir');
        const onStart = (e) => {
          e.preventDefault();
          btn.classList.add('active');
          if (dir && keysDown.hasOwnProperty(dir)) keysDown[dir] = true;
        };
        const onEnd = (e) => {
          e.preventDefault();
          btn.classList.remove('active');
          if (dir && keysDown.hasOwnProperty(dir)) keysDown[dir] = false;
        };
        btn.addEventListener('pointerdown', onStart);
        btn.addEventListener('pointerup', onEnd);
        btn.addEventListener('pointerleave', onEnd);
        btn.addEventListener('pointercancel', onEnd);
      });

      // Bouton Action X tactile Mobile
      const btnActionX = document.getElementById('btn-mobile-action-x');
      if (btnActionX) {
        btnActionX.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          btnActionX.classList.add('active');
          interact();
        });
        const clearActive = () => btnActionX.classList.remove('active');
        btnActionX.addEventListener('pointerup', clearActive);
        btnActionX.addEventListener('pointerleave', clearActive);
        btnActionX.addEventListener('pointercancel', clearActive);
      }

      // Fermeture de la modal d'inspection
      const btnCloseModal = document.getElementById('btn-inspect-close');
      const inspectModal = document.getElementById('world-inspect-modal');
      if (btnCloseModal && inspectModal) {
        btnCloseModal.addEventListener('click', () => {
          inspectModal.classList.remove('active');
          isPaused = false;
        });
        inspectModal.addEventListener('click', (e) => {
          if (e.target === inspectModal) {
            inspectModal.classList.remove('active');
            isPaused = false;
          }
        });
      }
    }

    function handleKeyDown(e) {
      if (!screens.monde || !screens.monde.classList.contains('active')) return;

      const inspectModal = document.getElementById('world-inspect-modal');
      if (inspectModal && inspectModal.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inspectModal.classList.remove('active');
          isPaused = false;
        }
        return;
      }

      let captured = true;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ':
          keysDown.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysDown.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
        case 'KeyQ':
          keysDown.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysDown.right = true;
          break;
        case 'KeyX':
        case 'KeyE':
        case 'Space':
        case 'Enter':
          interact();
          break;
        default:
          captured = false;
      }

      if (captured && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
    }

    function handleKeyUp(e) {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ':
          keysDown.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysDown.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
        case 'KeyQ':
          keysDown.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysDown.right = false;
          break;
      }
    }

    function interact() {
      if (!activeInteraction) return;

      if (activeInteraction.type === 'zone') {
        const zone = activeInteraction.data;
        if (zone.id === 1) {
          isPaused = true;
          navigateTo('jeu1');
        } else {
          isPaused = true;
          openInspectModal(zone.name, 'Épreuve de la Quête', 'Le nom de la salle va être dévoilé bientôt.', zone.icon);
        }
      } else if (activeInteraction.type === 'easter_egg') {
        const egg = activeInteraction.data;
        isPaused = true;
        openInspectModal(egg.name, egg.tag, egg.message, egg.icon);
      }
    }

    function openInspectModal(title, tag, desc, icon) {
      const modal = document.getElementById('world-inspect-modal');
      const titleEl = document.getElementById('inspect-modal-title');
      const tagEl = document.getElementById('inspect-modal-tag');
      const descEl = document.getElementById('inspect-modal-desc');
      const iconEl = document.getElementById('inspect-modal-icon');

      if (modal) {
        if (titleEl) titleEl.textContent = title;
        if (tagEl) tagEl.textContent = tag || 'Découverte';
        if (descEl) descEl.textContent = desc;
        if (iconEl) iconEl.textContent = icon || '✨';
        modal.classList.add('active');
      }
    }

    function start() {
      isPaused = false;
      if (!isRunning) {
        isRunning = true;
        lastTimestamp = performance.now();
        animFrameId = requestAnimationFrame(loop);
      }
    }

    function pause() {
      isPaused = true;
      keysDown.up = false;
      keysDown.down = false;
      keysDown.left = false;
      keysDown.right = false;
      player.isMoving = false;
    }

    function spawnPlayerNearZone1() {
      player.x = 460;
      player.y = 1380;
      player.dir = 'up';
      player.isMoving = false;
      player.spawnBurst = 1.0;
      camera.x = Math.max(0, Math.min(MAP_WIDTH - VIEWPORT_WIDTH, player.x - VIEWPORT_WIDTH / 2));
      camera.y = Math.max(0, Math.min(MAP_HEIGHT - VIEWPORT_HEIGHT, player.y - VIEWPORT_HEIGHT / 2));
      start();
    }

    function checkCollision(px, py) {
      const pr = 9; // rayon joueur
      for (let i = 0; i < COLLIDERS.length; i++) {
        const [cx, cy, cw, ch] = COLLIDERS[i];
        if (
          px + pr > cx &&
          px - pr < cx + cw &&
          py + pr > cy &&
          py - pr < cy + ch
        ) {
          return true;
        }
      }

      // Collision avec le lac des cygnes (forme ovale), sauf sur le ponton en bois
      const lakeCenter = { x: 480, y: 570 };
      const dx = px - lakeCenter.x;
      const dy = py - lakeCenter.y;
      const distToLake = Math.hypot(dx, dy);
      // Le ponton de bois traverse le lac de x 460 à 500, y 520 à 620
      const onBridge = px >= 460 && px <= 500 && py >= 510 && py <= 630;
      if (!onBridge && distToLake < 52) {
        return true;
      }

      return false;
    }

    function update(delta) {
      if (isPaused) return;

      let vx = 0;
      let vy = 0;

      if (keysDown.up) vy -= 1;
      if (keysDown.down) vy += 1;
      if (keysDown.left) vx -= 1;
      if (keysDown.right) vx += 1;

      if (vx !== 0 && vy !== 0) {
        const factor = 0.7071;
        vx *= factor;
        vy *= factor;
      }

      player.isMoving = vx !== 0 || vy !== 0;

      if (player.isMoving) {
        walkCycle += delta * 0.013;

        if (Math.abs(vx) > Math.abs(vy)) {
          player.dir = vx > 0 ? 'right' : 'left';
        } else if (vy !== 0) {
          player.dir = vy > 0 ? 'down' : 'up';
        }

        const stepX = vx * player.speed;
        const stepY = vy * player.speed;

        // Déplacement avec glissement d'axe (évite les blocages)
        const tryX = player.x + stepX;
        if (!checkCollision(tryX, player.y)) {
          player.x = tryX;
        }

        const tryY = player.y + stepY;
        if (!checkCollision(player.x, tryY)) {
          player.y = tryY;
        }
      }

      // Mise à jour de la Caméra fluide
      const targetCamX = Math.max(0, Math.min(MAP_WIDTH - VIEWPORT_WIDTH, player.x - VIEWPORT_WIDTH / 2));
      const targetCamY = Math.max(0, Math.min(MAP_HEIGHT - VIEWPORT_HEIGHT, player.y - VIEWPORT_HEIGHT / 2));
      camera.x += (targetCamX - camera.x) * 0.14;
      camera.y += (targetCamY - camera.y) * 0.14;

      // Détection des interactions (Zones de Quête en priorité, puis Mots Doux)
      activeInteraction = null;
      let nearestDist = Infinity;

      // 1. Zones de quête
      for (const zone of QUEST_ZONES) {
        const d = Math.hypot(player.x - zone.x, player.y - zone.y);
        if (d <= zone.radius + 18 && d < nearestDist) {
          nearestDist = d;
          activeInteraction = { type: 'zone', data: zone };
        }
      }

      // 2. Easter Eggs (si aucune zone de quête n'est active)
      if (!activeInteraction) {
        for (const egg of EASTER_EGGS) {
          const d = Math.hypot(player.x - egg.x, player.y - egg.y);
          if (d <= egg.radius + 14 && d < nearestDist) {
            nearestDist = d;
            activeInteraction = { type: 'easter_egg', data: egg };
          }
        }
      }

      // Détermination du Quartier Actuel pour le HUD
      updateDistrictBadge(player.x, player.y);

      // Bouton mobile pulsant
      const btnActionX = document.getElementById('btn-mobile-action-x');
      if (btnActionX) {
        btnActionX.classList.toggle('pulsing', !!activeInteraction);
      }

      // Particules d'aura de retour
      if (player.spawnBurst > 0) {
        player.spawnBurst = Math.max(0, player.spawnBurst - delta * 0.0016);
      }

      // Animation des pétales
      for (const petal of petals) {
        petal.phase += petal.wobbleSpeed;
        petal.x += petal.vx;
        petal.y += petal.vy + Math.sin(petal.phase) * 0.25;
        if (petal.x > MAP_WIDTH + 10) petal.x = -10;
        if (petal.y > MAP_HEIGHT + 10) petal.y = -10;
      }

      // Étincelles de Zone 1
      for (const spark of sparks) {
        spark.angle += spark.speed;
      }

      // Spores du Marais
      for (const spore of spores) {
        spore.angle += spore.speed;
      }
    }

    function updateDistrictBadge(px, py) {
      const zoneTextEl = document.getElementById('world-zone-text');
      if (!zoneTextEl) return;

      if (activeInteraction) {
        if (activeInteraction.type === 'zone') {
          zoneTextEl.textContent = activeInteraction.data.name;
        } else {
          zoneTextEl.textContent = `✨ ${activeInteraction.data.name}`;
        }
        return;
      }

      let currentDistrict = 'Promenade dans Paris';
      if (py < 380) {
        currentDistrict = '✨ Montmartre • La Butte aux Étoiles';
      } else if (py >= 380 && py < 780 && px < 1000) {
        currentDistrict = '🕊️ Les Grands Jardins Royaux';
      } else if (py >= 380 && py < 780 && px >= 1000) {
        currentDistrict = '🌿 Le Marais • Quartier des Herboristes';
      } else if (py >= 780 && py <= 930) {
        if (px >= 420 && px <= 520) currentDistrict = '🌉 Pont des Jardins (La Seine)';
        else if (px >= 950 && px <= 1050) currentDistrict = '🌉 Pont des Arts (La Seine)';
        else if (px >= 1470 && px <= 1570) currentDistrict = '🌉 Pont des Apothicaires (La Seine)';
        else currentDistrict = '🌊 Le Grand Fleuve Pastel (La Seine)';
      } else if (py > 930 && py < 1110) {
        currentDistrict = '🏖️ Les Quais Sablonneux & la Plage';
      } else {
        currentDistrict = '📖 Le Quartier Latin (Rive Gauche)';
      }

      zoneTextEl.textContent = currentDistrict;
    }

    function loop(timestamp) {
      const delta = Math.min(timestamp - lastTimestamp, 40);
      lastTimestamp = timestamp;

      update(delta);
      render(timestamp);

      if (screens.monde && screens.monde.classList.contains('active')) {
        animFrameId = requestAnimationFrame(loop);
      } else {
        isRunning = false;
      }
    }

    function render(time) {
      if (!ctx) return;

      ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

      ctx.save();
      // Appliquer le décalage caméra
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

      // 1. Sol, fleuve, allées et ponts
      drawMapGround(ctx, time);

      // 2. Éléments de décor statiques & bâtiments
      drawBuildings(ctx, time);

      // 3. Mobilier urbain (bancs, réverbères, terrasses, cabines de plage)
      drawStreetFurniture(ctx, time);

      // 4. Points d'intérêt des 5 Épreuves
      drawQuestLocations(ctx, time);

      // 5. Secrets & Mots doux interactifs
      drawEasterEggsVisuals(ctx, time);

      // 6. Personnage
      drawPlayer(ctx, player.x, player.y, player.dir, walkCycle, player.isMoving);

      // 7. Aura d'apparition victorieuse
      if (player.spawnBurst > 0) {
        drawSpawnAura(ctx, player.x, player.y, player.spawnBurst);
      }

      // 8. Bulle d'interaction flottante
      if (activeInteraction) {
        drawInteractionPrompt(ctx, player.x, player.y, activeInteraction, time);
      }

      // 9. Atmosphère (pétales, lucioles)
      drawAtmosphere(ctx);

      ctx.restore();
    }

    // ===================================================
    // DESSIN DU SOL & QUARTIERS
    // ===================================================
    function drawMapGround(ctx, time) {
      // Fond général (Pavés parisiens clairs)
      ctx.fillStyle = '#f0e8de';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // --- 1. BUTTE MONTMARTRE (Ciel nocturne bleu marine profond & pavés sombres) ---
      const nightGrad = ctx.createLinearGradient(0, 0, 0, 380);
      nightGrad.addColorStop(0, '#151c2e');
      nightGrad.addColorStop(0.65, '#202d46');
      nightGrad.addColorStop(1, '#3b455c');
      ctx.fillStyle = nightGrad;
      ctx.fillRect(0, 0, MAP_WIDTH, 380);

      // Étoiles de Montmartre
      montmartreStars.forEach(s => {
        const tw = Math.abs(Math.sin(time * s.twinkleSpeed + s.phase));
        ctx.fillStyle = `rgba(255, 245, 210, ${0.3 + tw * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Escaliers de pierre descendant de Montmartre (x = 940 à 1060, y = 330 à 385)
      ctx.fillStyle = '#b5b2ad';
      for (let step = 0; step < 7; step++) {
        const sy = 330 + step * 8;
        ctx.fillRect(940, sy, 120, 6);
        ctx.fillStyle = step % 2 === 0 ? '#9c9893' : '#b5b2ad';
      }

      // --- 2. LES GRANDS JARDINS ROYAUX (y = 380 à 780, x = 0 à 1000) ---
      // Pelouses vert pastel tendre
      ctx.fillStyle = '#cfe6d4';
      ctx.fillRect(40, 390, 920, 380);

      // Allées géométriques de gravier blanc royal
      ctx.fillStyle = '#faf6f0';
      ctx.fillRect(80, 420, 840, 24);
      ctx.fillRect(80, 710, 840, 24);
      ctx.fillRect(455, 420, 50, 314);
      ctx.fillRect(160, 420, 30, 314);
      ctx.fillRect(780, 420, 30, 314);

      // Grilles dorées entourant les jardins
      ctx.strokeStyle = '#dfba58';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 390, 920, 380);
      // Pique doré stylisé
      for (let gx = 50; gx < 950; gx += 20) {
        if ((gx < 440 || gx > 520) && (gx < 940 || gx > 1020)) {
          ctx.beginPath();
          ctx.moveTo(gx, 386);
          ctx.lineTo(gx, 394);
          ctx.stroke();
        }
      }

      // --- 3. LE QUARTIER DES HERBORISTES (LE MARAIS) (y = 380 à 780, x = 1000 à 2000) ---
      // Sol envahi de mousse et de vert sauge
      ctx.fillStyle = '#d5e6dc';
      ctx.fillRect(1000, 390, 960, 380);

      // Chemins pavés avec lierre et terre humide
      ctx.fillStyle = '#c7dcd0';
      ctx.beginPath();
      ctx.roundRect(1030, 450, 900, 40, 12);
      ctx.roundRect(1030, 660, 900, 40, 12);
      ctx.roundRect(1490, 450, 80, 250, 14);
      ctx.fill();

      // Touches de mousse végétale
      ctx.fillStyle = '#9cbda8';
      const mossSpots = [
        [1060, 430], [1320, 500], [1720, 470], [1820, 680], [1200, 710], [1590, 640]
      ];
      mossSpots.forEach(([mx, my]) => {
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 4. LE GRAND FLEUVE PASTEL (LA SEINE) (y = 785 à 925) ---
      // Parapets en pierre des quais (Rive Droite et Rive Gauche)
      ctx.fillStyle = '#b8aa9c';
      ctx.fillRect(0, 780, MAP_WIDTH, 8);
      ctx.fillRect(0, 922, MAP_WIDTH, 8);

      // Eau turquoise/azur pastel
      const waterGrad = ctx.createLinearGradient(0, 785, 0, 925);
      waterGrad.addColorStop(0, '#9cd6e4');
      waterGrad.addColorStop(0.5, '#b4e1ed');
      waterGrad.addColorStop(1, '#98d2e2');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 788, MAP_WIDTH, 134);

      // Ondulations de l'eau pastel animées
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.6;
      for (let wy = 800; wy < 920; wy += 18) {
        ctx.beginPath();
        const waveOffset = Math.sin(time * 0.002 + wy) * 6;
        for (let wx = 0; wx < MAP_WIDTH; wx += 80) {
          ctx.moveTo(wx, wy + waveOffset);
          ctx.quadraticCurveTo(wx + 20, wy - 3 + waveOffset, wx + 40, wy + waveOffset);
        }
        ctx.stroke();
      }

      // --- LES 3 PONTS EN PIERRE ---
      const bridges = [
        { name: 'Pont Ouest (Jardins)', x: 430, w: 80 },
        { name: 'Pont Central (Pont des Arts)', x: 960, w: 80 },
        { name: 'Pont Est (Marais)', x: 1480, w: 80 }
      ];

      bridges.forEach(b => {
        // Tablier du pont en pierre et pavés
        ctx.fillStyle = '#e8dfd3';
        ctx.fillRect(b.x, 775, b.w, 160);

        // Arches en pierre (ombres d'arc sous le pont)
        ctx.fillStyle = '#7a9ea8';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, 792, 18, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, 918, 18, Math.PI, 0);
        ctx.fill();

        // Lignes de pavés sur le pont
        ctx.strokeStyle = '#d2c4b2';
        ctx.lineWidth = 1.2;
        for (let py = 780; py < 930; py += 12) {
          ctx.beginPath();
          ctx.moveTo(b.x + 8, py);
          ctx.lineTo(b.x + b.w - 8, py);
          ctx.stroke();
        }

        // Balustrades en pierre du pont
        ctx.fillStyle = '#9e8e7e';
        ctx.fillRect(b.x, 775, 7, 160);
        ctx.fillRect(b.x + b.w - 7, 775, 7, 160);

        // Petits piliers décoratifs
        ctx.fillStyle = '#7a6a5b';
        ctx.fillRect(b.x - 2, 775, 11, 12);
        ctx.fillRect(b.x + b.w - 9, 775, 11, 12);
        ctx.fillRect(b.x - 2, 923, 11, 12);
        ctx.fillRect(b.x + b.w - 9, 923, 11, 12);
      });

      // --- 5. LES QUAIS SABLONNEUX (y = 930 à 1110) ---
      // Transition progressive en sable fin crème
      const sandGrad = ctx.createLinearGradient(0, 930, 0, 1110);
      sandGrad.addColorStop(0, '#f9ecd9');
      sandGrad.addColorStop(0.5, '#fae5cb');
      sandGrad.addColorStop(1, '#f1ddc5');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 930, MAP_WIDTH, 180);

      // Touffes d'oyats / herbes de plage
      ctx.strokeStyle = '#c4b693';
      ctx.lineWidth = 1.4;
      const grassTufts = [
        [240, 980], [450, 1020], [680, 970], [890, 1040], [1200, 990], [1500, 1030], [1780, 980]
      ];
      grassTufts.forEach(([tx, ty]) => {
        ctx.beginPath();
        ctx.moveTo(tx - 4, ty);
        ctx.lineTo(tx - 2, ty - 8);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + 2, ty - 10);
        ctx.moveTo(tx + 4, ty);
        ctx.lineTo(tx + 6, ty - 7);
        ctx.stroke();
      });

      // --- 6. LE QUARTIER LATIN (y = 1110 à 1500) ---
      // Pavés parisiens soignés
      ctx.fillStyle = '#ded4c8';
      ctx.fillRect(0, 1110, MAP_WIDTH, 390);

      // Rues pavées principales et ruelles serrées
      ctx.fillStyle = '#ece4d8';
      // Boulevard rive gauche
      ctx.fillRect(40, 1115, MAP_WIDTH - 80, 30);
      // Ruelle nord-sud vers Récamier (x = 420 à 510)
      ctx.fillRect(425, 1140, 75, 280);
      // Ruelle est-ouest (y = 1220)
      ctx.fillRect(40, 1215, MAP_WIDTH - 80, 36);
      // Ruelle vers les cafés (x = 810)
      ctx.fillRect(815, 1140, 45, 300);

      // Trottoirs avec bordures en granit gris
      ctx.strokeStyle = '#b8aa98';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 1215, MAP_WIDTH - 80, 36);
    }

    // ===================================================
    // BÂTIMENTS HAUSSMANNIENS & ÉDIFICES
    // ===================================================
    function drawBuildings(ctx, time) {
      // 1. Quartier Latin - Immeubles Haussmanniens avec toits en zinc gris-bleu
      const haussmannBlocks = [
        { x: 70, y: 1140, w: 200, h: 260, type: 'fleuriste' },
        { x: 310, y: 1260, w: 90, h: 180, type: 'librairie' },
        { x: 600, y: 1140, w: 220, h: 180, type: 'cafe' },
        { x: 860, y: 1160, w: 240, h: 260, type: 'boulangerie' },
        { x: 1140, y: 1150, w: 300, h: 280, type: 'residentiel' },
        { x: 1490, y: 1150, w: 420, h: 280, type: 'residentiel' },
        // Impasse Récamier : Façades encadrant l'impasse
        { x: 370, y: 1370, w: 60, h: 95, type: 'impasse_gauche' },
        { x: 520, y: 1370, w: 60, h: 95, type: 'impasse_droite' }
      ];

      haussmannBlocks.forEach(b => {
        // Façade en pierre de taille parisienne (calcaire lutétien clair)
        ctx.fillStyle = '#f4ede2';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#d7c8b4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Toit en zinc gris-bleu typique parisien
        const roofH = Math.min(48, b.h * 0.25);
        ctx.fillStyle = '#687e8f';
        ctx.fillRect(b.x, b.y, b.w, roofH);

        // Liseré zinc & cheminées en terre cuite
        ctx.fillStyle = '#546877';
        ctx.fillRect(b.x, b.y + roofH - 4, b.w, 4);

        // Cheminées en brique
        ctx.fillStyle = '#ab5646';
        for (let cx = b.x + 14; cx < b.x + b.w - 14; cx += 32) {
          ctx.fillRect(cx, b.y - 8, 8, 9);
        }

        // Balcons en fer forgé noir & fenêtres
        for (let fy = b.y + roofH + 16; fy < b.y + b.h - 35; fy += 36) {
          for (let fx = b.x + 16; fx < b.x + b.w - 20; fx += 26) {
            // Fenêtre haute
            ctx.fillStyle = '#39424c';
            ctx.fillRect(fx, fy, 14, 20);
            ctx.fillStyle = '#8fa3b8';
            ctx.fillRect(fx + 2, fy + 2, 10, 16);

            // Balustrade fer forgé noir
            ctx.fillStyle = '#262422';
            ctx.fillRect(fx - 2, fy + 14, 18, 5);
          }
        }

        // Devantures de boutiques au rez-de-chaussée
        if (b.type === 'boulangerie') {
          // Auvent rayé crème et bordeaux
          ctx.fillStyle = '#9e2e38';
          ctx.fillRect(b.x + 10, b.y + b.h - 32, b.w - 20, 14);
          ctx.fillStyle = '#fff9ee';
          ctx.fillRect(b.x + 18, b.y + b.h - 32, 14, 14);
          ctx.fillRect(b.x + 48, b.y + b.h - 32, 14, 14);
          ctx.fillRect(b.x + 78, b.y + b.h - 32, 14, 14);

          // Enseigne dorée
          ctx.fillStyle = '#dfba58';
          ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
          ctx.fillText('BOULANGERIE', b.x + 16, b.y + b.h - 35);
        } else if (b.type === 'fleuriste') {
          // Auvent vert sauge
          ctx.fillStyle = '#4c785d';
          ctx.fillRect(b.x + 10, b.y + b.h - 32, b.w - 20, 14);
          ctx.fillStyle = '#dfba58';
          ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
          ctx.fillText('FLEURISTE', b.x + 16, b.y + b.h - 35);
        } else if (b.type === 'librairie') {
          // Auvent bleu nuit
          ctx.fillStyle = '#2b3f5c';
          ctx.fillRect(b.x + 8, b.y + b.h - 30, b.w - 16, 12);
          ctx.fillStyle = '#dfba58';
          ctx.font = 'bold 8px Plus Jakarta Sans, sans-serif';
          ctx.fillText('LIBRAIRIE', b.x + 12, b.y + b.h - 33);
        }
      });

      // 2. Le Marais - Bâtisses anciennes en brique rouge avec serres en verre adossées
      const maraisBlocks = [
        { x: 1140, y: 440, w: 260, h: 220 },
        { x: 1460, y: 420, w: 180, h: 90 },
        { x: 1660, y: 470, w: 130, h: 210 },
        { x: 1460, y: 650, w: 190, h: 70 },
        { x: 1830, y: 440, w: 135, h: 280 }
      ];

      maraisBlocks.forEach(b => {
        // Briques rouges chaudes
        ctx.fillStyle = '#a85b46';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#8d4532';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Toit d'ardoise foncée
        ctx.fillStyle = '#424853';
        ctx.fillRect(b.x, b.y, b.w, 24);

        // Lierre grimpant vert foncé sur les façades
        ctx.fillStyle = '#426c4f';
        for (let ly = b.y + 28; ly < b.y + b.h - 10; ly += 14) {
          ctx.beginPath();
          ctx.arc(b.x + 6, ly, 6, 0, Math.PI * 2);
          ctx.arc(b.x + b.w - 6, ly + 4, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Serres en verre adossées (verre pastel translucide)
        ctx.fillStyle = 'rgba(180, 230, 220, 0.4)';
        ctx.fillRect(b.x + 12, b.y + b.h - 28, b.w - 24, 26);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 12, b.y + b.h - 28, b.w - 24, 26);
        for (let gx = b.x + 22; gx < b.x + b.w - 20; gx += 16) {
          ctx.beginPath();
          ctx.moveTo(gx, b.y + b.h - 28);
          ctx.lineTo(gx, b.y + b.h - 2);
          ctx.stroke();
        }
      });

      // 3. Montmartre - Le Moulin stylisé & Maisons d'artistes
      // Moulin blanc à ailes (x = 640, y = 140)
      const mx = 640;
      const my = 150;
      ctx.fillStyle = '#f8f4ec';
      ctx.beginPath();
      ctx.moveTo(mx - 25, my + 45);
      ctx.lineTo(mx - 15, my - 35);
      ctx.lineTo(mx + 15, my - 35);
      ctx.lineTo(mx + 25, my + 45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c4b59f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dôme du moulin
      ctx.fillStyle = '#9c5a47';
      ctx.beginPath();
      ctx.arc(mx, my - 35, 16, Math.PI, 0);
      ctx.fill();

      // Ailes du moulin qui tournent lentement
      const bladeAngle = time * 0.0008;
      ctx.save();
      ctx.translate(mx, my - 35);
      ctx.rotate(bladeAngle);
      ctx.fillStyle = '#39291f';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e6ddd0';
      ctx.lineWidth = 2.5;
      for (let a = 0; a < 4; a++) {
        ctx.save();
        ctx.rotate((a * Math.PI) / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -42);
        ctx.stroke();
        // Grille de l'aile
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(2, -40, 10, 36);
        ctx.restore();
      }
      ctx.restore();

      // Chevalets d'artistes peintres disséminés à Montmartre
      const easels = [
        [540, 240], [720, 220], [890, 270], [1160, 230], [1320, 260]
      ];
      easels.forEach(([ex, ey]) => {
        // Trépied en bois
        ctx.strokeStyle = '#85583b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 20);
        ctx.lineTo(ex - 8, ey + 10);
        ctx.moveTo(ex, ey - 20);
        ctx.lineTo(ex + 8, ey + 10);
        ctx.moveTo(ex, ey - 20);
        ctx.lineTo(ex, ey + 10);
        ctx.stroke();

        // Toile blanche d'artiste
        ctx.fillStyle = '#fffdf9';
        ctx.fillRect(ex - 10, ey - 18, 20, 14);
        ctx.strokeStyle = '#6e4830';
        ctx.lineWidth = 1;
        ctx.strokeRect(ex - 10, ey - 18, 20, 14);
      });
    }

    // ===================================================
    // MOBILIER URBAIN (BANCS, RÉVERBÈRES, TERRASSES, CABINES)
    // ===================================================
    function drawStreetFurniture(ctx, time) {
      // Réverbères parisiens avec halos chauds dorés
      const lanterns = [
        [430, 1180], [670, 1200], [840, 1240], [1100, 1200], // Quartier Latin
        [430, 770], [510, 930], [960, 770], [1040, 930], [1480, 770], [1560, 930], // Ponts
        [720, 1020], [1280, 1020], // Quais
        [680, 300], [830, 220], [1000, 230], [1180, 260] // Montmartre
      ];

      lanterns.forEach(([lx, ly]) => {
        // Halo lumineux doux
        const glow = ctx.createRadialGradient(lx, ly - 20, 2, lx, ly - 20, 34);
        glow.addColorStop(0, 'rgba(255, 243, 190, 0.45)');
        glow.addColorStop(0.6, 'rgba(255, 230, 150, 0.12)');
        glow.addColorStop(1, 'rgba(255, 230, 150, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly - 20, 34, 0, Math.PI * 2);
        ctx.fill();

        // Mât en fonte noire parisienne
        ctx.fillStyle = '#2b231d';
        ctx.fillRect(lx - 1.5, ly - 22, 3, 22);

        // Lanterne dorée
        ctx.fillStyle = '#f5c64c';
        ctx.fillRect(lx - 4, ly - 24, 8, 6);
        ctx.fillStyle = '#2b231d';
        ctx.beginPath();
        ctx.moveTo(lx - 5, ly - 24);
        ctx.lineTo(lx, ly - 28);
        ctx.lineTo(lx + 5, ly - 24);
        ctx.closePath();
        ctx.fill();
      });

      // Terrasses de Café avec chaises en rotin et tables rondes (devant le bloc Café x=600, y=1140)
      const cafeTables = [
        [630, 1340], [670, 1340], [710, 1340], [750, 1340]
      ];
      cafeTables.forEach(([tx, ty]) => {
        // Table ronde bistrot
        ctx.fillStyle = '#fffdfa';
        ctx.beginPath();
        ctx.arc(tx, ty, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c4aa8b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Tasse à café
        ctx.fillStyle = '#8b5a3c';
        ctx.beginPath();
        ctx.arc(tx - 1, ty - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        // Deux chaises en rotin
        ctx.fillStyle = '#bfa588';
        ctx.fillRect(tx - 12, ty - 4, 3, 8);
        ctx.fillRect(tx + 9, ty - 4, 3, 8);
      });

      // Cabines de plage à rayures pastel (style tasses Rice Copenhagen) sur les Quais Sablonneux
      const cabanas = [
        { x: 580, y: 1020, c: '#f59aa8' }, // Rose pastel
        { x: 630, y: 1020, c: '#79c4a8' }, // Sauge pastel
        { x: 680, y: 1020, c: '#e8c468' }, // Beurre pastel
        { x: 1260, y: 1020, c: '#84bde6' }, // Ciel pastel
        { x: 1310, y: 1020, c: '#f59aa8' }, // Rose pastel
        { x: 1360, y: 1020, c: '#79c4a8' }  // Sauge pastel
      ];

      cabanas.forEach(cb => {
        // Corps de la cabine
        ctx.fillStyle = '#fffbf4';
        ctx.fillRect(cb.x, cb.y, 34, 48);

        // Rayures colorées verticales
        ctx.fillStyle = cb.c;
        ctx.fillRect(cb.x + 4, cb.y, 6, 48);
        ctx.fillRect(cb.x + 14, cb.y, 6, 48);
        ctx.fillRect(cb.x + 24, cb.y, 6, 48);

        // Toit triangulaire pointu
        ctx.fillStyle = cb.c;
        ctx.beginPath();
        ctx.moveTo(cb.x - 2, cb.y);
        ctx.lineTo(cb.x + 17, cb.y - 12);
        ctx.lineTo(cb.x + 36, cb.y);
        ctx.closePath();
        ctx.fill();
      });

      // Phare miniature décoratif sur les quais sablonneux (x = 760, y = 1010)
      const phX = 760;
      const phY = 1010;
      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.moveTo(phX - 10, phY + 45);
      ctx.lineTo(phX - 6, phY);
      ctx.lineTo(phX + 6, phY);
      ctx.lineTo(phX + 10, phY + 45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c4263';
      ctx.fillRect(phX - 8, phY + 14, 16, 8);
      ctx.fillRect(phX - 9, phY + 30, 18, 8);

      // Feu du phare qui tourne doucement
      const phBeamAngle = time * 0.0015;
      ctx.save();
      ctx.translate(phX, phY);
      ctx.rotate(phBeamAngle);
      const beamGrad = ctx.createLinearGradient(0, 0, 48, 0);
      beamGrad.addColorStop(0, 'rgba(255, 240, 180, 0.7)');
      beamGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(50, -14);
      ctx.lineTo(50, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Bancs publics parisiens (verts en fonte et bois)
      const benches = [
        [340, 1180], [760, 1250], [920, 1180], [1160, 1250], // Quartier Latin
        [230, 650], [700, 650], // Jardins Royaux (marbre blanc)
        [880, 1040], [1140, 1040] // Quais
      ];

      benches.forEach(([bx, by]) => {
        const isMarble = by < 780 && bx < 1000;
        ctx.fillStyle = isMarble ? '#ffffff' : '#324a3c';
        ctx.beginPath();
        ctx.roundRect(bx - 14, by - 4, 28, 8, 2);
        ctx.fill();
        ctx.strokeStyle = isMarble ? '#d4c5b2' : '#223328';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pieds en fonte
        ctx.fillStyle = isMarble ? '#baa894' : '#1e2820';
        ctx.fillRect(bx - 12, by + 4, 3, 5);
        ctx.fillRect(bx + 9, by + 4, 3, 5);
      });
    }

    // ===================================================
    // LES 5 ZONES DE QUÊTE (POINTS D'INTÉRÊT MAJEURS)
    // ===================================================
    function drawQuestLocations(ctx, time) {
      // ---------------------------------------------------
      // ZONE 1 : LE RESTAURANT LE RÉCAMIER (Milan Kundera)
      // ---------------------------------------------------
      const z1 = QUEST_ZONES[0];
      ctx.save();

      // Halo d'aura autour du livre
      const isWonZ1 = !!getState().feathers[1];
      const z1Glow = ctx.createRadialGradient(z1.x, z1.y, 4, z1.x, z1.y, 45);
      z1Glow.addColorStop(0, isWonZ1 ? 'rgba(235, 195, 100, 0.45)' : 'rgba(225, 205, 175, 0.35)');
      z1Glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = z1Glow;
      ctx.beginPath();
      ctx.arc(z1.x, z1.y, 45, 0, Math.PI * 2);
      ctx.fill();

      // Façade du restaurant Le Récamier
      ctx.fillStyle = '#6e1d28'; // Rouge bordeaux chic
      ctx.fillRect(z1.x - 38, z1.y - 45, 76, 32);
      ctx.strokeStyle = '#4a121a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(z1.x - 38, z1.y - 45, 76, 32);

      // Enseigne dorée en lettres serif
      ctx.fillStyle = '#f3d278';
      ctx.font = 'bold 8.5px Playfair Display, serif';
      ctx.textAlign = 'center';
      ctx.fillText('LE RÉCAMIER', z1.x, z1.y - 30);
      ctx.font = 'italic 6.5px Playfair Display, serif';
      ctx.fillText('Milan Kundera', z1.x, z1.y - 21);

      // Auvent élégant crème à festons bordeaux
      ctx.fillStyle = '#faf5ec';
      ctx.beginPath();
      ctx.roundRect(z1.x - 40, z1.y - 14, 80, 8, 2);
      ctx.fill();
      ctx.fillStyle = '#6e1d28';
      for (let fx = z1.x - 36; fx <= z1.x + 36; fx += 12) {
        ctx.fillRect(fx, z1.y - 14, 6, 8);
      }

      // Piédestal d'ivoire
      ctx.fillStyle = '#ede6dd';
      ctx.beginPath();
      ctx.roundRect(z1.x - 14, z1.y + 4, 28, 14, 3);
      ctx.fill();
      ctx.strokeStyle = '#d7cab8';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Livre ouvert
      ctx.fillStyle = '#782b34';
      ctx.beginPath();
      ctx.moveTo(z1.x, z1.y + 4);
      ctx.lineTo(z1.x - 12, z1.y);
      ctx.lineTo(z1.x - 11, z1.y - 9);
      ctx.lineTo(z1.x, z1.y - 6);
      ctx.lineTo(z1.x + 11, z1.y - 9);
      ctx.lineTo(z1.x + 12, z1.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#faf7ee';
      ctx.beginPath();
      ctx.moveTo(z1.x, z1.y + 2);
      ctx.lineTo(z1.x - 11, z1.y - 1);
      ctx.lineTo(z1.x - 10, z1.y - 8);
      ctx.lineTo(z1.x, z1.y - 5);
      ctx.lineTo(z1.x + 10, z1.y - 8);
      ctx.lineTo(z1.x + 11, z1.y - 1);
      ctx.closePath();
      ctx.fill();

      // Plume d'or flottante
      const featherBob = Math.sin(time * 0.0035) * 3;
      const featherX = z1.x;
      const featherY = z1.y - 18 + featherBob;

      ctx.save();
      ctx.translate(featherX, featherY);
      ctx.rotate(0.35 + Math.sin(time * 0.002) * 0.08);
      ctx.fillStyle = isWonZ1 ? '#dfa73b' : '#cfa862';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 11);
      ctx.stroke();
      ctx.restore();

      // Étincelles dorées qui tournoient
      sparks.forEach(s => {
        const sx = z1.x + Math.cos(s.angle) * s.dist;
        const sy = z1.y + Math.sin(s.angle) * s.dist * 0.65;
        const sa = Math.abs(Math.sin(time * 0.003 + s.angle)) * s.alpha;
        ctx.fillStyle = `rgba(225, 175, 75, ${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // ---------------------------------------------------
      // ZONE 2 : COUR DES HERBORISTES & CHAMPIGNONS GÉANTS (Le Marais)
      // ---------------------------------------------------
      const z2 = QUEST_ZONES[1];
      ctx.save();

      // Cour intérieure secrète
      ctx.fillStyle = '#bad4c5';
      ctx.beginPath();
      ctx.arc(z2.x, z2.y, z2.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92bba4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Champignons géants aux tons pastel (demandés par l'utilisateur)
      // Champignon 1 (Géant rose pastel à pois blancs)
      const ch1x = z2.x - 14;
      const ch1y = z2.y - 8;
      ctx.fillStyle = '#f7ede2';
      ctx.fillRect(ch1x - 3, ch1y, 6, 18);
      ctx.fillStyle = '#f2919d';
      ctx.beginPath();
      ctx.arc(ch1x, ch1y, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ch1x - 6, ch1y - 6, 2.5, 0, Math.PI * 2);
      ctx.arc(ch1x + 7, ch1y - 8, 2.8, 0, Math.PI * 2);
      ctx.arc(ch1x, ch1y - 11, 2, 0, Math.PI * 2);
      ctx.fill();

      // Champignon 2 (Lavande pastel)
      const ch2x = z2.x + 18;
      const ch2y = z2.y + 4;
      ctx.fillStyle = '#f7ede2';
      ctx.fillRect(ch2x - 2.5, ch2y, 5, 14);
      ctx.fillStyle = '#a692cf';
      ctx.beginPath();
      ctx.arc(ch2x, ch2y, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ch2x - 3, ch2y - 4, 1.8, 0, Math.PI * 2);
      ctx.arc(ch2x + 4, ch2y - 5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Champignon 3 (Vert menthe pastel)
      const ch3x = z2.x + 4;
      const ch3y = z2.y + 20;
      ctx.fillStyle = '#f7ede2';
      ctx.fillRect(ch3x - 2, ch3y, 4, 10);
      ctx.fillStyle = '#8ec9ab';
      ctx.beginPath();
      ctx.arc(ch3x, ch3y, 9, Math.PI, 0);
      ctx.fill();

      // Spores bioluminescentes flottantes
      spores.forEach(sp => {
        const sx = z2.x + Math.cos(sp.angle) * sp.dist;
        const sy = z2.y + Math.sin(sp.angle) * sp.dist;
        const sa = Math.abs(Math.sin(time * 0.003 + sp.angle)) * sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sa;
        ctx.beginPath();
        ctx.arc(sx, sy, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      ctx.restore();

      // ---------------------------------------------------
      // ZONE 3 : LE LAC DES CYGNES (Grands Jardins Royaux)
      // ---------------------------------------------------
      const z3 = QUEST_ZONES[2];
      ctx.save();

      // Grand lac azur
      const lakeR = z3.radius;
      ctx.fillStyle = '#a2d6eb';
      ctx.beginPath();
      ctx.arc(z3.x, z3.y, lakeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8bc3db';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Nénuphars & fleurs de lotus
      const pads = [
        [z3.x - 28, z3.y + 14], [z3.x + 24, z3.y + 20], [z3.x - 18, z3.y - 28]
      ];
      pads.forEach(([px, py]) => {
        ctx.fillStyle = '#629e71';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0.3, Math.PI * 2 - 0.3);
        ctx.lineTo(px, py);
        ctx.fill();
        ctx.fillStyle = '#f49ab4';
        ctx.beginPath();
        ctx.arc(px, py - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ponton / Pont cintré en bois traversant le lac
      ctx.fillStyle = '#c8a680';
      ctx.beginPath();
      ctx.roundRect(z3.x - 12, z3.y - 48, 24, 96, 6);
      ctx.fill();
      ctx.strokeStyle = '#9c7752';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Planches du pont
      for (let py = z3.y - 44; py <= z3.y + 44; py += 8) {
        ctx.beginPath();
        ctx.moveTo(z3.x - 10, py);
        ctx.lineTo(z3.x + 10, py);
        ctx.stroke();
      }

      // Cygnes majestueux glissant sur l'eau
      const swanBob = Math.sin(time * 0.003) * 2;
      const s1x = z3.x + 32;
      const s1y = z3.y - 10 + swanBob;

      // Corps du cygne 1
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(s1x, s1y, 9, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Cou et tête
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(s1x + 5, s1y - 1);
      ctx.quadraticCurveTo(s1x + 10, s1y - 11, s1x + 5, s1y - 12);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s1x + 5, s1y - 12, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Bec orange
      ctx.fillStyle = '#f08938';
      ctx.beginPath();
      ctx.moveTo(s1x + 4, s1y - 12);
      ctx.lineTo(s1x + 1, s1y - 11.5);
      ctx.lineTo(s1x + 4, s1y - 11);
      ctx.closePath();
      ctx.fill();

      // Cygne 2 (un peu plus petit)
      const s2x = z3.x - 34;
      const s2y = z3.y - 8 - swanBob * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(s2x, s2y, 7, 4.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s2x - 4, s2y);
      ctx.quadraticCurveTo(s2x - 8, s2y - 8, s2x - 4, s2y - 9);
      ctx.stroke();
      ctx.fillStyle = '#f08938';
      ctx.fillRect(s2x - 2, s2y - 9.5, 2.5, 1.4);

      ctx.restore();

      // ---------------------------------------------------
      // ZONE 4 : L'OBSERVATOIRE & LA ROSE (Montmartre)
      // ---------------------------------------------------
      const z4 = QUEST_ZONES[3];
      ctx.save();

      // Enclos circulaire de l'observatoire
      ctx.fillStyle = '#222f48';
      ctx.beginPath();
      ctx.arc(z4.x, z4.y, z4.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfba58';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dôme céleste en laiton
      ctx.fillStyle = '#c8a662';
      ctx.beginPath();
      ctx.arc(z4.x, z4.y - 16, 20, Math.PI, 0);
      ctx.fill();

      // Télescope de cuivre pointé vers les étoiles
      ctx.strokeStyle = '#e6c875';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(z4.x + 4, z4.y - 20);
      ctx.lineTo(z4.x + 22, z4.y - 36);
      ctx.stroke();

      // Cloche de verre avec la Rose du Petit Prince
      const roseX = z4.x;
      const roseY = z4.y + 12;

      // Socle en bois
      ctx.fillStyle = '#8f5e3b';
      ctx.beginPath();
      ctx.roundRect(roseX - 12, roseY + 8, 24, 4, 2);
      ctx.fill();

      // Tige et pétales
      ctx.strokeStyle = '#4e855c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(roseX, roseY + 8);
      ctx.quadraticCurveTo(roseX + 2, roseY + 2, roseX, roseY - 2);
      ctx.stroke();

      // Pétales rouges écarlates
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(roseX, roseY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Cloche de verre translucide
      ctx.fillStyle = 'rgba(210, 235, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(roseX, roseY - 2, 11, Math.PI, 0);
      ctx.lineTo(roseX + 11, roseY + 8);
      ctx.lineTo(roseX - 11, roseY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // ---------------------------------------------------
      // ZONE 5 : BOUTEILLE À LA MER (Quais Sablonneux)
      // ---------------------------------------------------
      const z5 = QUEST_ZONES[4];
      ctx.save();

      // Transat en toile rayée
      const trX = z5.x - 22;
      const trY = z5.y - 12;
      ctx.strokeStyle = '#85583b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(trX - 8, trY + 16);
      ctx.lineTo(trX + 14, trY - 10);
      ctx.moveTo(trX - 4, trY - 10);
      ctx.lineTo(trX + 10, trY + 16);
      ctx.stroke();

      // Toile rayée rose pastel et blanc
      ctx.fillStyle = '#f59aa8';
      ctx.beginPath();
      ctx.moveTo(trX - 6, trY - 8);
      ctx.lineTo(trX + 12, trY - 8);
      ctx.lineTo(trX + 8, trY + 12);
      ctx.lineTo(trX - 10, trY + 12);
      ctx.closePath();
      ctx.fill();

      // Parasol pastel
      const parX = z5.x + 22;
      const parY = z5.y - 18;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(parX, parY + 26);
      ctx.lineTo(parX, parY);
      ctx.stroke();
      ctx.fillStyle = '#79c4a8';
      ctx.beginPath();
      ctx.arc(parX, parY, 16, Math.PI, 0);
      ctx.fill();

      // Bouteille en verre échouée avec parchemin roulé
      const botX = z5.x;
      const botY = z5.y + 12;
      ctx.fillStyle = 'rgba(120, 200, 190, 0.65)';
      ctx.beginPath();
      ctx.roundRect(botX - 8, botY - 3, 16, 7, 2);
      ctx.fill();
      ctx.fillStyle = '#c48946'; // Bouchon de liège
      ctx.fillRect(botX + 8, botY - 1.5, 3, 4);

      // Parchemin roulé à l'intérieur
      ctx.fillStyle = '#faeed4';
      ctx.fillRect(botX - 5, botY - 1.5, 10, 4);

      // Étincelles marines dorées
      const seaSparkle = Math.abs(Math.sin(time * 0.003)) * 4;
      ctx.fillStyle = 'rgba(255, 235, 140, 0.8)';
      ctx.beginPath();
      ctx.arc(botX - 12, botY - 4, 1.5, 0, Math.PI * 2);
      ctx.arc(botX + 14, botY + 8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ===================================================
    // SECRETS & MOTS DOUX INTERACTIFS (EASTER EGGS)
    // ===================================================
    function drawEasterEggsVisuals(ctx, time) {
      EASTER_EGGS.forEach(egg => {
        ctx.save();
        const bob = Math.sin(time * 0.003 + egg.x) * 2;

        // Petite étincelle douce d'interactivité
        ctx.fillStyle = 'rgba(242, 145, 157, 0.75)';
        ctx.beginPath();
        ctx.arc(egg.x, egg.y - 12 + bob, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(egg.x, egg.y - 12 + bob, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    // ===================================================
    // DESSIN DU JOUEUR (AVATAR FIDÈLE AUX CONSIGNES)
    // ===================================================
    function drawPlayer(ctx, px, py, dir = 'down', cycle = 0, isMoving = false) {
      ctx.save();
      ctx.translate(px, py);

      const bob = isMoving ? Math.abs(Math.sin(cycle * 8)) * 1.8 : 0;
      const stride = isMoving ? Math.sin(cycle * 8) * 4 : 0;

      // Ombre douce sous les pieds
      ctx.beginPath();
      ctx.ellipse(0, 16, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(50, 40, 32, 0.18)';
      ctx.fill();

      ctx.translate(0, -bob);

      if (dir === 'down') {
        // --- VUE DE FACE ---
        // Cheveux longs marron foncé tombant derrière les épaules
        ctx.beginPath();
        ctx.roundRect(-8, -14, 16, 22, [6, 6, 8, 8]);
        ctx.fillStyle = '#301d14';
        ctx.fill();

        // Jambes
        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-5, 5 + stride, 3.5, 8);
        ctx.fillRect(1.5, 5 - stride, 3.5, 8);

        // Baskets blanches
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-6, 12 + stride, 4.5, 4.5, 2);
        ctx.roundRect(1, 12 - stride, 4.5, 4.5, 2);
        ctx.fill();
        ctx.fillStyle = '#d5d5d5';
        ctx.fillRect(-6, 15.5 + stride, 4.5, 1);
        ctx.fillRect(1, 15.5 - stride, 4.5, 1);

        // Short en jean bleu
        ctx.fillStyle = '#48729c';
        ctx.beginPath();
        ctx.roundRect(-6, 0, 12, 7.5, [2, 2, 2, 2]);
        ctx.fill();
        ctx.fillStyle = '#395c80';
        ctx.fillRect(-0.5, 4.5, 1, 3);

        // Bras
        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-8.5, -6, 2.5, 9);
        ctx.fillRect(6, -6, 2.5, 9);

        // Débardeur vert d'eau
        ctx.fillStyle = '#8caea0';
        ctx.beginPath();
        ctx.roundRect(-5.5, -8, 11, 10, [2, 2, 1, 1]);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -8, 2.5, 0, Math.PI);
        ctx.fillStyle = '#f8d5bb';
        ctx.fill();

        // Sac cabas marron (tote bag) à l'épaule
        ctx.strokeStyle = '#6e4326';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(5, -8);
        ctx.lineTo(8, -1);
        ctx.stroke();
        ctx.fillStyle = '#8f5b38';
        ctx.beginPath();
        ctx.roundRect(6, -1, 6.5, 8, 1.5);
        ctx.fill();
        ctx.fillStyle = '#7a4c2d';
        ctx.fillRect(6, -1, 6.5, 1.5);

        // Cou & visage
        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-2, -10, 4, 3);
        ctx.beginPath();
        ctx.arc(0, -14, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Yeux et joues
        ctx.fillStyle = '#301d14';
        ctx.fillRect(-2.5, -14, 1.2, 1.4);
        ctx.fillRect(1.3, -14, 1.2, 1.4);
        ctx.fillStyle = 'rgba(235, 130, 120, 0.45)';
        ctx.beginPath();
        ctx.arc(-3.2, -12, 1.2, 0, Math.PI * 2);
        ctx.arc(3.2, -12, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Mèches avant
        ctx.fillStyle = '#301d14';
        ctx.beginPath();
        ctx.arc(-4.5, -16, 3, 0, Math.PI * 2);
        ctx.arc(4.5, -16, 3, 0, Math.PI * 2);
        ctx.fill();

        // Bandana / foulard vert sur la tête
        ctx.fillStyle = '#4f8564';
        ctx.beginPath();
        ctx.roundRect(-6, -19.5, 12, 4.5, [3, 3, 1, 1]);
        ctx.fill();
        ctx.strokeStyle = '#3b674d';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-5, -17.5);
        ctx.lineTo(5, -17.5);
        ctx.stroke();
        ctx.fillStyle = '#3b674d';
        ctx.beginPath();
        ctx.arc(5.5, -17, 1.6, 0, Math.PI * 2);
        ctx.fill();

      } else if (dir === 'up') {
        // --- VUE DE DOS ---
        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-5, 5 - stride, 3.5, 8);
        ctx.fillRect(1.5, 5 + stride, 3.5, 8);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-6, 12 - stride, 4.5, 4.5, 2);
        ctx.roundRect(1, 12 + stride, 4.5, 4.5, 2);
        ctx.fill();

        ctx.fillStyle = '#48729c';
        ctx.beginPath();
        ctx.roundRect(-6, 0, 12, 7.5, [2, 2, 2, 2]);
        ctx.fill();

        ctx.fillStyle = '#8caea0';
        ctx.beginPath();
        ctx.roundRect(-5.5, -8, 11, 10, [2, 2, 1, 1]);
        ctx.fill();

        ctx.fillStyle = '#8f5b38';
        ctx.beginPath();
        ctx.roundRect(6, -1, 6.5, 8, 1.5);
        ctx.fill();

        // Cheveux longs tombant dans le dos
        ctx.fillStyle = '#301d14';
        ctx.beginPath();
        ctx.moveTo(-6, -15);
        ctx.quadraticCurveTo(-9, -2, -5, 4);
        ctx.lineTo(5, 4);
        ctx.quadraticCurveTo(9, -2, 6, -15);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -14, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4f8564';
        ctx.beginPath();
        ctx.roundRect(-6, -19.5, 12, 4.5, [3, 3, 1, 1]);
        ctx.fill();
        ctx.fillStyle = '#3b674d';
        ctx.beginPath();
        ctx.arc(0, -17, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (dir === 'right' || dir === 'left') {
        // --- VUE DE PROFIL ---
        if (dir === 'left') {
          ctx.scale(-1, 1);
        }

        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-2 - stride, 5, 3.5, 8);
        ctx.fillRect(-1 + stride, 5, 3.5, 8);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-3 - stride, 12, 5.5, 4.5, 2);
        ctx.roundRect(-2 + stride, 12, 5.5, 4.5, 2);
        ctx.fill();

        ctx.fillStyle = '#48729c';
        ctx.beginPath();
        ctx.roundRect(-4.5, 0, 9, 7.5, 2);
        ctx.fill();

        ctx.fillStyle = '#8caea0';
        ctx.beginPath();
        ctx.roundRect(-4, -8, 8, 10, [2, 2, 1, 1]);
        ctx.fill();

        ctx.fillStyle = '#8f5b38';
        ctx.beginPath();
        ctx.roundRect(-1, -1, 6, 8, 1.5);
        ctx.fill();

        ctx.fillStyle = '#f8d5bb';
        ctx.fillRect(-1.5, -6, 2.5, 9);

        ctx.beginPath();
        ctx.arc(0, -14, 5.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#301d14';
        ctx.fillRect(2.2, -14, 1.2, 1.2);
        ctx.fillStyle = 'rgba(235, 130, 120, 0.45)';
        ctx.beginPath();
        ctx.arc(2.5, -12, 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#301d14';
        ctx.beginPath();
        ctx.moveTo(-2, -17);
        ctx.quadraticCurveTo(-9, -8, -6, 4);
        ctx.lineTo(-2, 4);
        ctx.quadraticCurveTo(-4, -8, 1, -17);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4f8564';
        ctx.beginPath();
        ctx.roundRect(-5, -19.5, 10, 4.5, [3, 3, 1, 1]);
        ctx.fill();
      }

      ctx.restore();
    }

    // ===================================================
    // BULLE FLOTTANTE D'INTERACTION (RPG STYLE)
    // ===================================================
    function drawInteractionPrompt(ctx, px, py, target, time) {
      ctx.save();
      const promptY = py - 38 + Math.sin(time * 0.005) * 2;

      const isZone = target.type === 'zone';
      const text = isZone ? 'Appuyez sur X pour inspecter' : 'Appuyez sur X pour lire';
      const icon = target.data.icon || '✨';

      ctx.font = '600 11.5px Plus Jakarta Sans, system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const padX = 10;
      const bubbleW = textWidth + padX * 2 + 18;
      const bubbleH = 24;
      const bx = px - bubbleW / 2;
      const by = promptY - bubbleH;

      ctx.shadowColor = 'rgba(60, 40, 30, 0.18)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
      ctx.fill();

      // Petite flèche sous la bulle
      ctx.beginPath();
      ctx.moveTo(px - 5, by + bubbleH);
      ctx.lineTo(px, by + bubbleH + 5);
      ctx.lineTo(px + 5, by + bubbleH);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isZone && target.data.accessible ? '#dfa73b' : '#df6868';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
      ctx.stroke();

      ctx.fillStyle = '#423129';
      ctx.font = '12px serif';
      ctx.fillText(icon, bx + 7, by + 16);

      ctx.font = '600 11px Plus Jakarta Sans, system-ui, sans-serif';
      ctx.fillText(text, bx + 25, by + 16);

      ctx.restore();
    }

    function drawSpawnAura(ctx, px, py, factor) {
      ctx.save();
      const r = (1 - factor) * 45 + 12;
      ctx.strokeStyle = `rgba(224, 182, 90, ${factor * 0.8})`;
      ctx.lineWidth = 2.5 * factor;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();

      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + factor * 2;
        const sx = px + Math.cos(a) * r;
        const sy = py + Math.sin(a) * r * 0.7;
        ctx.fillStyle = `rgba(255, 230, 140, ${factor})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 * factor, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawAtmosphere(ctx) {
      ctx.save();
      petals.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, p.phase, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    return {
      init,
      start,
      pause,
      spawnPlayerNearZone1
    };
  };
})();
