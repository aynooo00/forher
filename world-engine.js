// ===================================================================
// LE MONDE DES CINQ PLUMES : FLÂNERIE PARISIENNE & RPG TOP-DOWN 2D
// Moteur Canvas Haute Fidélité : Textures Procédurales, Caméra Fluide,
// Sprite Détaillé de Muscara, 5 Grands Quartiers, La Seine & Ponts,
// Éléments Animés, Boîte de Dialogue JRPG avec Machine à Écrire.
// ===================================================================

(function () {
  'use strict';

  window.createParisWorldEngine = function (options) {
    const { getState, navigateTo, showToast } = options;

    const canvas = document.getElementById('world-canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    let animFrameId = null;
    let isRunning = false;
    let isPaused = false;
    let lastTime = 0;
    let walkTime = 0;
    let globalTime = 0;

    // Dimensions
    const VIEWPORT_WIDTH = 800;
    const VIEWPORT_HEIGHT = 540;
    const MAP_WIDTH = 2000;
    const MAP_HEIGHT = 2000;

    // Position initiale : Quartier Latin (Rive Gauche), devant la rue Récamier
    const player = {
      x: 520,
      y: 1480,
      targetX: 520,
      targetY: 1480,
      speed: 3.2,
      dir: 'up', // 'down', 'up', 'left', 'right'
      isMoving: false,
      stepCount: 0
    };

    const camera = {
      x: player.x - VIEWPORT_WIDTH / 2,
      y: player.y - VIEWPORT_HEIGHT / 2
    };

    const keysDown = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // ===================================================
    // LES 5 QUARTIERS & POINTS D'INTÉRÊT PRINCIPAUX
    // ===================================================
    const QUEST_ZONES = [
      {
        id: 1,
        key: 'jeu1',
        name: 'Le Récamier (Milan Kundera)',
        district: 'Quartier Latin • Rive Gauche',
        tag: 'Épreuve I • Littérature',
        icon: '🪶',
        x: 480,
        y: 1380,
        radius: 70,
        unlocked: true,
        dialogue: [
          "Une petite ruelle pavée s'enfonce dans une cour discrète...",
          "Devant vous se dresse la façade emblématique du restaurant « Le Récamier », repaire littéraire feutré où Milan Kundera aimait s'attabler en toute discrétion.",
          "Une énigme est gravée sur la porte dorée : le mystère des 8 lettres vous attend !"
        ],
        actionText: "Entrer dans l'Énigme"
      },
      {
        id: 2,
        key: 'jeu2',
        name: "L'Apothicairerie du Marais",
        district: "Le Marais • Rive Droite",
        tag: 'Épreuve II • Botanique & Mycologie',
        icon: '🍄',
        x: 1560,
        y: 640,
        radius: 75,
        unlocked: false,
        dialogue: [
          "Une charmante boutique aux devantures en bois vert forêt et flacons d'ambre...",
          "Des bouquets de sauge, de lavande et de champignons rares sèchent sous les poutres anciennes. Une lueur bleutée danse dans l'arrière-cour.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Examiner la porte"
      },
      {
        id: 3,
        key: 'jeu3',
        name: "Le Bassin du Cygne Royal",
        district: "Les Grands Jardins Royaux",
        tag: 'Épreuve III • Les Jardins',
        icon: '🦢',
        x: 480,
        y: 560,
        radius: 80,
        unlocked: false,
        dialogue: [
          "Au milieu des allées de gravier ocre et des parterres fleuris, une immense fontaine en pierre reflète le ciel de fin d'après-midi.",
          "Trois cygnes au plumage soyeux glissent gracieusement sur l'eau limpide, traçant de douces ondulations argentées.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Admirer le bassin"
      },
      {
        id: 4,
        key: 'jeu4',
        name: "La Rose sous Cloche • Observatoire",
        district: "La Butte Montmartre",
        tag: 'Épreuve IV • Constellations',
        icon: '🌹',
        x: 1480,
        y: 240,
        radius: 75,
        unlocked: false,
        dialogue: [
          "Sur les hauteurs de la Butte, entre les chevalets des peintres et les escaliers de pierre, se trouve un dôme astronomique secret.",
          "Sous une cloche de verre cristallin, une rose écarlate et solitaire semble dialoguer avec l'astéroïde B-612.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Regarder l'astre"
      },
      {
        id: 5,
        key: 'jeu5',
        name: "La Grève Sablonneuse de la Seine",
        district: "Les Quais de Seine",
        tag: 'Épreuve V • Le Fleuve',
        icon: '📜',
        x: 1140,
        y: 1120,
        radius: 75,
        unlocked: false,
        dialogue: [
          "En descendant l'escalier en pierre des quais, vous atteignez une crique de sable doré léchée par les vaguelettes pastel de la Seine.",
          "Une vieille bouteille de verre soufflé repose à la limite des flots. À l'intérieur, un vélin roulé porte un sceau en cire royale.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Examiner la rive"
      }
    ];

    // Secrets et curiosités parisiennes (Easter Eggs)
    const EASTER_EGGS = [
      {
        id: 'boulangerie',
        name: 'Boulangerie Artisanale',
        x: 720,
        y: 1360,
        radius: 50,
        icon: '🥐',
        text: "L'odeur divine des croissants tièdes au beurre frais et des baguettes dorées embaume toute la rue pavée."
      },
      {
        id: 'bouquinistes',
        name: 'Boîtes des Bouquinistes',
        x: 880,
        y: 1220,
        radius: 55,
        icon: '📚',
        text: "Des boîtes vert wagon remplies de gravures de Paris, d'éditions jaunies de poésie et de vieilles cartes postales du siècle dernier."
      },
      {
        id: 'fleuriste',
        name: 'Le Chariot du Fleuriste',
        x: 720,
        y: 580,
        radius: 50,
        icon: '💐',
        text: "Des seaux en zinc débordent d'hortensias bleu pastel, de pivoines délicates et de branches d'eucalyptus odorantes."
      },
      {
        id: 'banc_amoureux',
        name: 'Banc des Confidences',
        x: 320,
        y: 680,
        radius: 45,
        icon: '💌',
        text: "Gravé discrètement dans le bois d'un banc en fonte : « Pour Muscara, voyageuse des cœurs et des songes »."
      },
      {
        id: 'fontaine_wallace',
        name: 'Fontaine Wallace en Fonte',
        x: 1360,
        y: 1400,
        radius: 45,
        icon: '⛲',
        text: "Les quatre cariatides vertes veillent sur un filet d'eau fraîche où les moineaux viennent s'abreuver."
      },
      {
        id: 'chats_montmartre',
        name: 'Le Chat Noir des Toits',
        x: 1320,
        y: 280,
        radius: 45,
        icon: '🐈‍⬛',
        text: "Un chat noir aux yeux d'ambre fait sa toilette sur un muret de pierre, indifférent à la foule des peintres."
      }
    ];

    // ===================================================
    // GÉNÉRATION PROCÉDURALE DES TEXTURES AU CHARGEMENT
    // (Pavés parisiens, Toits en zinc, Pelouses, Gravier, Sable, Eau)
    // ===================================================
    const textures = {};

    function initProceduralTextures() {
      // 1. Pavés parisiens irréguliers (Quartier Latin & Montmartre)
      textures.cobblestone = (function () {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const cx = c.getContext('2d');
        cx.fillStyle = '#9b9287';
        cx.fillRect(0, 0, 64, 64);
        const rows = 4;
        const rh = 16;
        const colors = ['#a89f94', '#91877c', '#9e958a', '#897f74', '#b3aba0'];
        for (let r = 0; r < rows; r++) {
          const shift = (r % 2) * 16;
          for (let x = -16; x < 64 + 16; x += 16) {
            const stoneX = x + shift;
            const col = colors[Math.abs(Math.floor(stoneX * 13 + r * 7)) % colors.length];
            cx.fillStyle = col;
            cx.beginPath();
            cx.roundRect(stoneX + 1.5, r * rh + 1.5, 13, rh - 3, 2);
            cx.fill();
            // Reflet supérieur
            cx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            cx.lineWidth = 1;
            cx.stroke();
            // Ombre inférieure
            cx.fillStyle = 'rgba(30, 20, 15, 0.22)';
            cx.fillRect(stoneX + 1.5, (r + 1) * rh - 2.5, 13, 1.5);
          }
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // 2. Pavés moussus du Marais
      textures.cobbleMoss = (function () {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const cx = c.getContext('2d');
        cx.fillStyle = '#7a7a6c';
        cx.fillRect(0, 0, 64, 64);
        const colors = ['#878978', '#737766', '#8e927e', '#666958'];
        for (let r = 0; r < 4; r++) {
          const shift = (r % 2) * 16;
          for (let x = -16; x < 64 + 16; x += 16) {
            const stoneX = x + shift;
            cx.fillStyle = colors[(x + r * 3) & 3];
            cx.beginPath();
            cx.roundRect(stoneX + 1.5, r * 16 + 1.5, 13, 13, 3);
            cx.fill();
            // Taches de mousse vert tendre
            if ((stoneX + r) % 3 === 0) {
              cx.fillStyle = 'rgba(100, 140, 70, 0.55)';
              cx.fillRect(stoneX + 2, r * 16 + 12, 10, 3);
            }
          }
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // 3. Trottoirs & Dalles en granit haussmannien
      textures.sidewalk = (function () {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cx = c.getContext('2d');
        cx.fillStyle = '#c7beaf';
        cx.fillRect(0, 0, 48, 48);
        cx.strokeStyle = '#b0a696';
        cx.lineWidth = 1.5;
        cx.strokeRect(1, 1, 46, 46);
        cx.strokeRect(1, 24, 46, 0.5);
        cx.strokeRect(24, 1, 0.5, 46);
        // Grain doux
        cx.fillStyle = 'rgba(0, 0, 0, 0.035)';
        for (let i = 0; i < 60; i++) {
          cx.fillRect((i * 17) % 48, (i * 29) % 48, 1.5, 1.5);
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // 4. Toits en zinc gris-bleu haussmanniens avec tasseaux
      textures.zincRoof = (function () {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const cx = c.getContext('2d');
        cx.fillStyle = '#5a6e78';
        cx.fillRect(0, 0, 32, 32);
        // Bandes de zinc
        const grad = cx.createLinearGradient(0, 0, 32, 0);
        grad.addColorStop(0, '#667c87');
        grad.addColorStop(0.4, '#556770');
        grad.addColorStop(0.8, '#708692');
        grad.addColorStop(1, '#53656e');
        cx.fillStyle = grad;
        cx.fillRect(1, 0, 30, 32);
        // Tasseau métallique saillant
        cx.fillStyle = '#3a4950';
        cx.fillRect(0, 0, 2, 32);
        cx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        cx.fillRect(2, 0, 1, 32);
        return ctx.createPattern(c, 'repeat');
      })();

      // 5. Herbe veloutée des Jardins Royaux
      textures.grass = (function () {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cx = c.getContext('2d');
        cx.fillStyle = '#658d4a';
        cx.fillRect(0, 0, 48, 48);
        const greens = ['#6f9953', '#5d8243', '#77a35a', '#54763c'];
        for (let i = 0; i < 40; i++) {
          const gx = (i * 19) % 48;
          const gy = (i * 31) % 48;
          cx.fillStyle = greens[i % greens.length];
          cx.fillRect(gx, gy, 2, 4);
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // 6. Gravier ocre des allées de jardin
      textures.gravel = (function () {
        const c = document.createElement('canvas');
        c.width = 40;
        c.height = 40;
        const cx = c.getContext('2d');
        cx.fillStyle = '#dfd1b8';
        cx.fillRect(0, 0, 40, 40);
        const dots = ['#d1be9e', '#ede2cf', '#c4b090', '#f5ecdc'];
        for (let i = 0; i < 70; i++) {
          const px = (i * 13) % 40;
          const py = (i * 27) % 40;
          cx.fillStyle = dots[i % dots.length];
          cx.fillRect(px, py, 1.5, 1.5);
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // 7. Sable fin des berges
      textures.sand = (function () {
        const c = document.createElement('canvas');
        c.width = 40;
        c.height = 40;
        const cx = c.getContext('2d');
        cx.fillStyle = '#dbc49e';
        cx.fillRect(0, 0, 40, 40);
        cx.fillStyle = 'rgba(170, 140, 95, 0.25)';
        for (let i = 0; i < 50; i++) {
          cx.fillRect((i * 11) % 40, (i * 23) % 40, 2, 2);
        }
        return ctx.createPattern(c, 'repeat');
      })();
    }

    initProceduralTextures();

    // ===================================================
    // GESTION DU FLEUVE PASTEL (LA SEINE) & PONTS EN PIERRE
    // ===================================================
    // Le fleuve coupe Paris d'est en ouest entre Y = 940 et Y = 1140
    const RIVER_Y = 940;
    const RIVER_HEIGHT = 200;

    // 3 Ponts en pierre avec balustrades et trottoirs
    const BRIDGES = [
      { id: 'pont_arts', name: 'Passerelle des Arts', x: 380, width: 140, y: RIVER_Y - 20, height: RIVER_HEIGHT + 40 },
      { id: 'pont_neuf', name: 'Pont Neuf', x: 920, width: 180, y: RIVER_Y - 20, height: RIVER_HEIGHT + 40 },
      { id: 'pont_royal', name: 'Pont Royal', x: 1500, width: 160, y: RIVER_Y - 20, height: RIVER_HEIGHT + 40 }
    ];

    // ===================================================
    // BOÎTE DE COLLISION (COLLIDERS)
    // ===================================================
    // Le fleuve est bloquant sauf sur les 3 ponts
    const COLLIDERS = [
      // Bordures de la carte du monde
      { x: 0, y: 0, w: 2000, h: 40 },
      { x: 0, y: 0, w: 40, h: 2000 },
      { x: 1960, y: 0, w: 40, h: 2000 },
      { x: 0, y: 1960, w: 2000, h: 40 },

      // Fleuve : Segment 1 (gauche du pont des arts)
      { x: 0, y: RIVER_Y + 15, w: 380, h: RIVER_HEIGHT - 30 },
      // Segment 2 (entre pont des arts et pont neuf)
      { x: 520, y: RIVER_Y + 15, w: 400, h: RIVER_HEIGHT - 30 },
      // Segment 3 (entre pont neuf et pont royal, laissant la plage de sable à Y:1100)
      { x: 1100, y: RIVER_Y + 15, w: 400, h: RIVER_HEIGHT - 55 },
      // Segment 4 (droite du pont royal)
      { x: 1660, y: RIVER_Y + 15, w: 340, h: RIVER_HEIGHT - 30 },

      // Bassin des Jardins Royaux (le contour de pierre de la fontaine)
      { x: 420, y: 500, w: 120, h: 110 },

      // Bâtiments majeurs Haussmanniens du Quartier Latin
      { x: 120, y: 1300, w: 240, h: 220 },
      { x: 600, y: 1320, w: 280, h: 240 },
      { x: 260, y: 1640, w: 340, h: 220 },
      { x: 740, y: 1660, w: 360, h: 200 },
      { x: 1220, y: 1360, w: 300, h: 240 },

      // Bâtiments Marais
      { x: 1320, y: 520, w: 180, h: 200 },
      { x: 1680, y: 520, w: 220, h: 220 },
      { x: 1420, y: 800, w: 320, h: 100 },

      // Butte Montmartre
      { x: 1280, y: 100, w: 140, h: 160 },
      { x: 1600, y: 100, w: 220, h: 160 }
    ];

    function checkCollision(nx, ny) {
      // Bounding box du joueur (pieds de Muscara : 22x14)
      const pw = 20;
      const ph = 12;
      const px = nx - pw / 2;
      const py = ny - ph / 2;

      // Vérifier les ponts : si sur un pont, pas de collision avec l'eau
      const onBridge = BRIDGES.some(b => 
        nx >= b.x + 10 && nx <= b.x + b.width - 10 &&
        ny >= b.y && ny <= b.y + b.height
      );

      for (let i = 0; i < COLLIDERS.length; i++) {
        const c = COLLIDERS[i];
        // Si c'est un collider d'eau et que le joueur est sur un pont, ignorer
        if (onBridge && c.y >= RIVER_Y && c.y <= RIVER_Y + RIVER_HEIGHT) {
          continue;
        }
        if (
          px < c.x + c.w &&
          px + pw > c.x &&
          py < c.y + c.h &&
          py + ph > c.y
        ) {
          return true;
        }
      }
      return false;
    }

    // ===================================================
    // ÉLÉMENTS ANIMÉS DU MONDE (CYGNES, ÉTOILES, PÉTALES)
    // ===================================================
    const SWANS = [
      { cx: 480, cy: 550, r: 42, speed: 0.0008, angle: 0 },
      { cx: 480, cy: 550, r: 26, speed: -0.0012, angle: Math.PI },
      { cx: 480, cy: 550, r: 52, speed: 0.0006, angle: Math.PI * 0.5 }
    ];

    const PETALS = Array.from({ length: 45 }, () => ({
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      size: 2.5 + Math.random() * 2.5,
      speedX: 0.4 + Math.random() * 0.6,
      speedY: 0.2 + Math.random() * 0.4,
      color: Math.random() > 0.4 ? 'rgba(255, 205, 215, 0.7)' : 'rgba(255, 235, 175, 0.75)',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04
    }));

    const STARS_MONTMARTRE = Array.from({ length: 25 }, () => ({
      x: 1380 + Math.random() * 320,
      y: 120 + Math.random() * 240,
      radius: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2
    }));

    const SPORES_MARAIS = Array.from({ length: 22 }, () => ({
      x: 1450 + Math.random() * 300,
      y: 560 + Math.random() * 240,
      speedY: 0.15 + Math.random() * 0.3,
      pulse: Math.random() * Math.PI * 2
    }));

    // ===================================================
    // GESTION DU DIALOGUE JRPG DANS L'ÉCRAN
    // ===================================================
    const dialogueBoxEl = document.getElementById('rpg-dialogue-box');
    const dialogueAvatarEl = document.getElementById('dialogue-avatar');
    const dialogueSpeakerNameEl = document.getElementById('dialogue-speaker-name');
    const dialogueSpeakerDistrictEl = document.getElementById('dialogue-speaker-district');
    const dialogueTextEl = document.getElementById('dialogue-text');
    const dialogueCursorEl = document.getElementById('dialogue-cursor');
    const dialogueActionLabelEl = document.getElementById('dialogue-action-label');
    const btnDialogueAction = document.getElementById('btn-dialogue-action');
    const mobileActionBtn = document.getElementById('btn-mobile-action-x');

    let currentDialogueSequence = [];
    let currentDialogueIndex = 0;
    let currentZoneInteraction = null;
    let isTyping = false;
    let typingTimer = null;
    let fullCurrentSentence = '';

    function openRpgDialogue(zone) {
      if (!dialogueBoxEl) return;
      currentZoneInteraction = zone;
      currentDialogueSequence = zone.dialogue || [zone.text || '...'];
      currentDialogueIndex = 0;
      isPaused = true;

      // Mettre à jour les informations de l'interlocuteur
      if (dialogueAvatarEl) dialogueAvatarEl.textContent = zone.icon || '💬';
      if (dialogueSpeakerNameEl) dialogueSpeakerNameEl.textContent = zone.name || 'Lieu';
      if (dialogueSpeakerDistrictEl) dialogueSpeakerDistrictEl.textContent = zone.district || zone.tag || 'Paris';

      dialogueBoxEl.classList.add('active');
      dialogueBoxEl.setAttribute('aria-hidden', 'false');

      playNextDialogueSentence();
    }

    function playNextDialogueSentence() {
      if (currentDialogueIndex >= currentDialogueSequence.length) {
        finishDialogue();
        return;
      }

      fullCurrentSentence = currentDialogueSequence[currentDialogueIndex];
      if (dialogueTextEl) dialogueTextEl.textContent = '';
      if (dialogueCursorEl) dialogueCursorEl.style.display = 'inline-block';
      isTyping = true;

      const isLastSentence = currentDialogueIndex === currentDialogueSequence.length - 1;
      if (dialogueActionLabelEl) {
        if (isLastSentence && currentZoneInteraction && currentZoneInteraction.actionText) {
          dialogueActionLabelEl.textContent = currentZoneInteraction.actionText;
        } else {
          dialogueActionLabelEl.textContent = 'Continuer';
        }
      }

      let charIndex = 0;
      clearInterval(typingTimer);
      typingTimer = setInterval(() => {
        if (charIndex < fullCurrentSentence.length) {
          if (dialogueTextEl) {
            dialogueTextEl.textContent += fullCurrentSentence.charAt(charIndex);
          }
          charIndex++;
        } else {
          clearInterval(typingTimer);
          isTyping = false;
        }
      }, 22);
    }

    function skipOrAdvanceDialogue() {
      if (!dialogueBoxEl || !dialogueBoxEl.classList.contains('active')) return;

      if (isTyping) {
        // Finir immédiatement d'écrire la phrase en cours
        clearInterval(typingTimer);
        isTyping = false;
        if (dialogueTextEl) dialogueTextEl.textContent = fullCurrentSentence;
      } else {
        // Passer à la phrase suivante
        currentDialogueIndex++;
        if (currentDialogueIndex < currentDialogueSequence.length) {
          playNextDialogueSentence();
        } else {
          finishDialogue();
        }
      }
    }

    function finishDialogue() {
      clearInterval(typingTimer);
      isTyping = false;
      if (dialogueBoxEl) {
        dialogueBoxEl.classList.remove('active');
        dialogueBoxEl.setAttribute('aria-hidden', 'true');
      }
      isPaused = false;

      // Si c'est la Zone 1 (Le Récamier), déclencher la transition vers le jeu 1 !
      if (currentZoneInteraction && currentZoneInteraction.id === 1 && currentZoneInteraction.unlocked) {
        setTimeout(() => {
          if (typeof navigateTo === 'function') {
            navigateTo('jeu1');
          }
        }, 150);
      }
      currentZoneInteraction = null;
    }

    if (btnDialogueAction) {
      btnDialogueAction.addEventListener('click', (e) => {
        e.stopPropagation();
        skipOrAdvanceDialogue();
      });
    }

    // ===================================================
    // CONTRÔLES CLAVIER & TACTILES
    // ===================================================
    window.addEventListener('keydown', (e) => {
      const key = e.key;

      // Si la boîte de dialogue est ouverte
      if (dialogueBoxEl && dialogueBoxEl.classList.contains('active')) {
        if (key === 'x' || key === 'X' || key === ' ' || key === 'Enter') {
          e.preventDefault();
          skipOrAdvanceDialogue();
          return;
        }
        if (key === 'Escape') {
          finishDialogue();
          return;
        }
      }

      // Mouvement du joueur
      if (key === 'ArrowUp' || key === 'z' || key === 'Z' || key === 'w' || key === 'W') {
        keysDown.up = true;
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        keysDown.down = true;
      } else if (key === 'ArrowLeft' || key === 'q' || key === 'Q' || key === 'a' || key === 'A') {
        keysDown.left = true;
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        keysDown.right = true;
      } else if (key === 'x' || key === 'X' || key === ' ' || key === 'Enter') {
        handleInteraction();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key;
      if (key === 'ArrowUp' || key === 'z' || key === 'Z' || key === 'w' || key === 'W') {
        keysDown.up = false;
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        keysDown.down = false;
      } else if (key === 'ArrowLeft' || key === 'q' || key === 'Q' || key === 'a' || key === 'A') {
        keysDown.left = false;
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        keysDown.right = false;
      }
    });

    // Contrôles tactiles D-Pad
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      const dir = btn.getAttribute('data-dir');
      const startDir = (e) => {
        e.preventDefault();
        keysDown[dir] = true;
        btn.classList.add('active');
      };
      const stopDir = (e) => {
        e.preventDefault();
        keysDown[dir] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('pointerdown', startDir);
      btn.addEventListener('pointerup', stopDir);
      btn.addEventListener('pointercancel', stopDir);
      btn.addEventListener('pointerleave', stopDir);
    });

    // Bouton d'action tactile X
    if (mobileActionBtn) {
      mobileActionBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileActionBtn.classList.add('active');
        if (dialogueBoxEl && dialogueBoxEl.classList.contains('active')) {
          skipOrAdvanceDialogue();
        } else {
          handleInteraction();
        }
      });
      mobileActionBtn.addEventListener('pointerup', () => mobileActionBtn.classList.remove('active'));
      mobileActionBtn.addEventListener('pointercancel', () => mobileActionBtn.classList.remove('active'));
    }

    // Détection des points d'interaction proches
    function getNearestInteraction() {
      // 1. Priorité aux 5 grandes épreuves
      for (let i = 0; i < QUEST_ZONES.length; i++) {
        const z = QUEST_ZONES[i];
        const dist = Math.hypot(player.x - z.x, player.y - z.y);
        if (dist <= z.radius) {
          return { type: 'quest', data: z };
        }
      }
      // 2. Curiosités et secrets parisiens
      for (let i = 0; i < EASTER_EGGS.length; i++) {
        const egg = EASTER_EGGS[i];
        const dist = Math.hypot(player.x - egg.x, player.y - egg.y);
        if (dist <= egg.radius) {
          return { type: 'egg', data: egg };
        }
      }
      return null;
    }

    function handleInteraction() {
      const target = getNearestInteraction();
      if (!target) return;
      openRpgDialogue(target.data);
    }

    // ===================================================
    // MISE À JOUR DE LA PHYSIQUE & DE LA CAMÉRA
    // ===================================================
    function update(dt) {
      if (isPaused) {
        player.isMoving = false;
        return;
      }

      let dx = 0;
      let dy = 0;

      if (keysDown.up) { dy -= 1; player.dir = 'up'; }
      if (keysDown.down) { dy += 1; player.dir = 'down'; }
      if (keysDown.left) { dx -= 1; player.dir = 'left'; }
      if (keysDown.right) { dx += 1; player.dir = 'right'; }

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      player.isMoving = (dx !== 0 || dy !== 0);

      if (player.isMoving) {
        walkTime += dt * 0.008;
        const step = player.speed;
        const nextX = player.x + dx * step;
        const nextY = player.y + dy * step;

        // Déplacement par axes séparés pour glissement contre les murs
        if (!checkCollision(nextX, player.y)) {
          player.x = nextX;
        }
        if (!checkCollision(player.x, nextY)) {
          player.y = nextY;
        }
      }

      // Caméra dynamique centrée sur Muscara avec lerp soyeux
      const targetCamX = player.x - VIEWPORT_WIDTH / 2;
      const targetCamY = player.y - VIEWPORT_HEIGHT / 2;
      const lerp = 0.08;
      camera.x += (targetCamX - camera.x) * lerp;
      camera.y += (targetCamY - camera.y) * lerp;

      // Clamping aux limites de Paris
      camera.x = Math.max(0, Math.min(MAP_WIDTH - VIEWPORT_WIDTH, camera.x));
      camera.y = Math.max(0, Math.min(MAP_HEIGHT - VIEWPORT_HEIGHT, camera.y));

      // Mise à jour de l'effet de pulsation du bouton tactile X si interaction proche
      const near = getNearestInteraction();
      if (mobileActionBtn) {
        if (near) {
          mobileActionBtn.classList.add('pulsing');
        } else {
          mobileActionBtn.classList.remove('pulsing');
        }
      }

      // Mise à jour des pétales et particules
      globalTime += dt * 0.001;
      PETALS.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rot += p.rotSpeed;
        if (p.x > MAP_WIDTH) p.x = 0;
        if (p.y > MAP_HEIGHT) p.y = 0;
      });
    }

    // ===================================================
    // DESSIN DU MONDE : DÉCOR PARIS ÉLABORÉ & TEXTURÉ
    // ===================================================
    function drawWorld() {
      // 1. Fond général du sol : pavés parisiens texturés
      if (textures.cobblestone) {
        ctx.fillStyle = textures.cobblestone;
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      } else {
        ctx.fillStyle = '#948a7f';
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      }

      // 2. Zone des Jardins Royaux (Haut Gauche : Y: 380 à 920, X: 40 à 900)
      ctx.save();
      // Pelouse
      ctx.fillStyle = textures.grass;
      ctx.fillRect(60, 420, 800, 480);
      // Allées en gravier ocre
      ctx.fillStyle = textures.gravel;
      // Allée centrale verticale
      ctx.fillRect(440, 420, 80, 480);
      // Allée horizontale
      ctx.fillRect(60, 620, 800, 70);
      // Bordures en pierre taillée des pelouses
      ctx.strokeStyle = '#baa68b';
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 420, 800, 480);

      // Bassin circulaire du Cygne Royal avec fontaine
      drawRoyalBasin(480, 560);
      ctx.restore();

      // 3. Zone du Marais & Herboristerie (Haut Droite : X: 1200 à 1960, Y: 460 à 920)
      ctx.save();
      ctx.fillStyle = textures.cobbleMoss;
      ctx.fillRect(1220, 480, 720, 440);
      // Chemins et places en dalles
      ctx.fillStyle = textures.sidewalk;
      ctx.fillRect(1380, 580, 400, 240);
      drawHerboristerieArea(1560, 640);
      ctx.restore();

      // 4. Butte Montmartre (Tout en haut : Y: 40 à 420, X: 1100 à 1960)
      drawMontmartreArea();

      // 5. Le Fleuve Pastel (La Seine) et ses quais de pierre
      drawRiverSeine();

      // 6. Quartier Latin (Rive Gauche : Y: 1140 à 1960)
      drawQuartierLatin();

      // 7. Bâtiments Haussmanniens & Façades
      drawHaussmannBuildings();

      // 8. Éléments animés (Cygnes, Flammes de réverbères, Particules)
      drawAnimatedProps();
    }

    // --- Dessin du Bassin Royal & Cygnes ---
    function drawRoyalBasin(bx, by) {
      // Ombre portée du bassin
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(bx + 3, by + 4, 64, 0, Math.PI * 2);
      ctx.fill();

      // Margelle de pierre sculptée
      ctx.fillStyle = '#dfd3c3';
      ctx.beginPath();
      ctx.arc(bx, by, 64, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a89883';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Eau bleu clair du bassin avec reflets
      const basinGrad = ctx.createRadialGradient(bx, by, 10, bx, by, 60);
      basinGrad.addColorStop(0, '#b8e3ea');
      basinGrad.addColorStop(0.7, '#8ac4d0');
      basinGrad.addColorStop(1, '#6ea3b0');
      ctx.fillStyle = basinGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 58, 0, Math.PI * 2);
      ctx.fill();

      // Jet d'eau central
      const waterPulse = Math.sin(globalTime * 3) * 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(bx, by - 6, 8 + waterPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx - 1.5, by - 16 - waterPulse, 3, 14);

      // Cygnes animés nageant en cercle
      SWANS.forEach(s => {
        s.angle += s.speed * 16;
        const sx = s.cx + Math.cos(s.angle) * s.r;
        const sy = s.cy + Math.sin(s.angle) * (s.r * 0.7);

        // Ondulation de l'eau derrière le cygne
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx - Math.cos(s.angle) * 8, sy - Math.sin(s.angle) * 6, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Corps du cygne
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 8, 5, s.angle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
        // Cou élancé & tête
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(s.angle) * 4, sy - 8, sx + Math.cos(s.angle) * 7, sy - 7);
        ctx.stroke();
        // Bec orangé
        ctx.fillStyle = '#f58a27';
        ctx.fillRect(sx + Math.cos(s.angle) * 8, sy - 8, 2, 2);
      });
    }

    // --- Dessin du Quartier Herboristerie & Marais ---
    function drawHerboristerieArea(hx, hy) {
      // Échoppe de l'apothicaire (bâtiment en colombages et auvent de verdure)
      ctx.fillStyle = '#3a4f41';
      ctx.fillRect(hx - 60, hy - 80, 120, 70);
      // Toit de chaume / tuiles anciennes
      ctx.fillStyle = '#5c432d';
      ctx.beginPath();
      ctx.moveTo(hx - 70, hy - 80);
      ctx.lineTo(hx, hy - 115);
      ctx.lineTo(hx + 70, hy - 80);
      ctx.closePath();
      ctx.fill();

      // Enseigne dorée sculptée
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx - 36, hy - 65, 72, 24);
      ctx.fillStyle = '#fef6e4';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APOTHICAIRE', hx, hy - 49);

      // Champignons féeriques et plantes médicinales tout autour
      const shrooms = [
        { x: hx - 85, y: hy + 15, r: 12, col: '#d9534f', spots: true },
        { x: hx - 72, y: hy + 28, r: 9, col: '#5bc0de', spots: false },
        { x: hx + 75, y: hy + 20, r: 14, col: '#9b59b6', spots: true },
        { x: hx + 92, y: hy + 35, r: 8, col: '#5cb85c', spots: false }
      ];

      shrooms.forEach(sh => {
        // Pied du champignon
        ctx.fillStyle = '#f7eedb';
        ctx.fillRect(sh.x - 2.5, sh.y, 5, 12);
        // Chapeau bombé
        ctx.fillStyle = sh.col;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.r, Math.PI, 0, false);
        ctx.fill();
        // Points blancs
        if (sh.spots) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sh.x - sh.r * 0.35, sh.y - sh.r * 0.45, 2, 0, Math.PI * 2);
          ctx.arc(sh.x + sh.r * 0.35, sh.y - sh.r * 0.45, 2, 0, Math.PI * 2);
          ctx.arc(sh.x, sh.y - sh.r * 0.7, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // --- Dessin de Montmartre ---
    function drawMontmartreArea() {
      // Escaliers de pierre et pavés clairs
      ctx.fillStyle = '#a69e92';
      ctx.fillRect(1100, 60, 840, 360);

      // Pavillons d'artistes & observatoire
      const ox = 1480;
      const oy = 240;

      // Dôme de l'observatoire
      ctx.fillStyle = '#4c5d67';
      ctx.beginPath();
      ctx.arc(ox, oy - 20, 48, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Cloche de verre de la Rose du Petit Prince
      const roseGlow = 0.5 + Math.sin(globalTime * 2) * 0.2;
      ctx.fillStyle = `rgba(255, 150, 180, ${roseGlow * 0.3})`;
      ctx.beginPath();
      ctx.arc(ox, oy + 28, 22, 0, Math.PI * 2);
      ctx.fill();

      // Socle en bois
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(ox - 14, oy + 42, 28, 6);

      // Verre cristallin
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy + 26, 15, Math.PI, 0);
      ctx.lineTo(ox + 15, oy + 42);
      ctx.lineTo(ox - 15, oy + 42);
      ctx.closePath();
      ctx.stroke();

      // Rose écarlate
      ctx.fillStyle = '#d92546';
      ctx.beginPath();
      ctx.arc(ox, oy + 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(ox - 1, oy + 32, 2, 9);
    }

    // --- Dessin de la Seine & des 3 Ponts ---
    function drawRiverSeine() {
      // Quai supérieur en pierre
      ctx.fillStyle = '#a1978a';
      ctx.fillRect(0, RIVER_Y - 14, MAP_WIDTH, 14);
      ctx.strokeStyle = '#5a5247';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, RIVER_Y);
      ctx.lineTo(MAP_WIDTH, RIVER_Y);
      ctx.stroke();

      // Eau pastel de la Seine avec dégradé doux et reflets
      const riverGrad = ctx.createLinearGradient(0, RIVER_Y, 0, RIVER_Y + RIVER_HEIGHT);
      riverGrad.addColorStop(0, '#7fa3b0');
      riverGrad.addColorStop(0.3, '#92bac7');
      riverGrad.addColorStop(0.7, '#83acba');
      riverGrad.addColorStop(1, '#6c95a3');
      ctx.fillStyle = riverGrad;
      ctx.fillRect(0, RIVER_Y, MAP_WIDTH, RIVER_HEIGHT);

      // Ondulations soyeuses animées à la surface
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.5;
      for (let y = RIVER_Y + 18; y < RIVER_Y + RIVER_HEIGHT - 10; y += 24) {
        ctx.beginPath();
        const waveOffset = Math.sin(globalTime * 1.5 + y * 0.05) * 8;
        ctx.moveTo(0, y + waveOffset);
        for (let x = 0; x < MAP_WIDTH; x += 120) {
          const dy = Math.sin(globalTime * 2 + x * 0.02 + y) * 4;
          ctx.quadraticCurveTo(x + 60, y + waveOffset + dy, x + 120, y + waveOffset);
        }
        ctx.stroke();
      }

      // Grève / Plage de sable doré sur la rive droite (Zone 5)
      ctx.fillStyle = textures.sand;
      ctx.beginPath();
      ctx.ellipse(1140, RIVER_Y + RIVER_HEIGHT - 20, 90, 36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bouteille à la mer échouée sur le sable
      ctx.save();
      ctx.translate(1140, RIVER_Y + RIVER_HEIGHT - 25);
      ctx.rotate(-0.3);
      ctx.fillStyle = 'rgba(180, 230, 210, 0.7)';
      ctx.fillRect(-4, -12, 8, 18);
      ctx.fillStyle = '#bfa15f'; // Parchemin intérieur
      ctx.fillRect(-2, -8, 4, 12);
      ctx.fillStyle = '#8b5a2b'; // Bouchon de liège
      ctx.fillRect(-3, -16, 6, 4);
      ctx.restore();

      // Quai inférieur en pierre
      ctx.fillStyle = '#8a8276';
      ctx.fillRect(0, RIVER_Y + RIVER_HEIGHT, MAP_WIDTH, 14);

      // Les 3 Ponts en pierre avec balustrades et arches
      BRIDGES.forEach((b, idx) => {
        // Ombre portée sous le pont
        ctx.fillStyle = 'rgba(15, 25, 30, 0.4)';
        ctx.fillRect(b.x - 4, b.y + 4, b.width + 8, b.height);

        // Tablier du pont
        ctx.fillStyle = '#c8bea8';
        ctx.fillRect(b.x, b.y, b.width, b.height);

        // Chaussée centrale texturée
        ctx.fillStyle = textures.cobblestone;
        ctx.fillRect(b.x + 20, b.y, b.width - 40, b.height);

        // Trottoirs latéraux
        ctx.fillStyle = '#dfd5c4';
        ctx.fillRect(b.x + 4, b.y, 16, b.height);
        ctx.fillRect(b.x + b.width - 20, b.y, 16, b.height);

        // Parapets en pierre et rambardes en fer forgé
        ctx.fillStyle = '#9e917e';
        ctx.fillRect(b.x, b.y, 6, b.height);
        ctx.fillRect(b.x + b.width - 6, b.y, 6, b.height);

        // Lampadaires classiques parisiens sur les piles du pont
        drawGasLamp(b.x + 8, b.y + 30);
        drawGasLamp(b.x + 8, b.y + b.height - 30);
        drawGasLamp(b.x + b.width - 8, b.y + 30);
        drawGasLamp(b.x + b.width - 8, b.y + b.height - 30);
      });
    }

    // --- Dessin du Quartier Latin (Rive Gauche) & Restaurant Le Récamier ---
    function drawQuartierLatin() {
      // Rues pavées et trottoirs en dalles claires
      ctx.fillStyle = textures.sidewalk;
      // Boulevard Saint-Germain style (grand axe horizontal)
      ctx.fillRect(40, 1240, 1920, 60);

      // Ruelle Récamier : petite impasse sinueuse menant au restaurant
      ctx.fillStyle = textures.cobblestone;
      ctx.fillRect(440, 1300, 140, 220);

      // Trottoirs bordant la ruelle
      ctx.fillStyle = '#bfb4a4';
      ctx.fillRect(426, 1300, 14, 220);
      ctx.fillRect(580, 1300, 14, 220);

      // Façade prestigieuse du Restaurant Le Récamier (Zone 1)
      drawRecamierFacade(480, 1380);
    }

    // --- Façade du Récamier (Épreuve 1 - Milan Kundera) ---
    function drawRecamierFacade(rx, ry) {
      // Devanture en bois laqué bordeaux et or
      ctx.fillStyle = '#4a151b';
      ctx.fillRect(rx - 65, ry - 75, 130, 65);

      // Boiseries moulurées et vitrines dorées
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 60, ry - 70, 120, 55);

      // Auvent à rayures chic crème et lie-de-vin
      ctx.fillStyle = '#f7eedb';
      ctx.fillRect(rx - 70, ry - 88, 140, 16);
      ctx.fillStyle = '#5c1921';
      for (let s = rx - 70; s < rx + 70; s += 20) {
        ctx.fillRect(s, ry - 88, 10, 16);
      }

      // Enseigne calligraphiée « LE RÉCAMIER »
      ctx.fillStyle = '#fce4a6';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.fillText('LE RÉCAMIER', rx, ry - 42);

      // Terrasse : Chaises en rotin tressé et petites tables rondes en marbre blanc
      const tables = [
        { x: rx - 40, y: ry + 12 },
        { x: rx + 40, y: ry + 12 },
        { x: rx, y: ry + 22 }
      ];

      tables.forEach(t => {
        // Ombre table
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.arc(t.x + 1, t.y + 2, 10, 0, Math.PI * 2);
        ctx.fill();
        // Table marbre
        ctx.fillStyle = '#f5f0eb';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bfa182';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Chaises en rotin (demi-cercles stylisés)
        ctx.strokeStyle = '#8c5936';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(t.x - 11, t.y, 5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x + 11, t.y, 5, Math.PI / 2, -Math.PI / 2);
        ctx.stroke();
      });

      // Balcon supérieur en fer forgé avec géraniums rouges
      ctx.fillStyle = '#222';
      ctx.fillRect(rx - 65, ry - 94, 130, 6);
      ctx.fillStyle = '#d92546';
      for (let f = rx - 60; f < rx + 60; f += 12) {
        ctx.beginPath();
        ctx.arc(f, ry - 95, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Bâtiments Haussmanniens (Toits zinc, fenêtres, pierres de taille) ---
    function drawHaussmannBuildings() {
      const buildings = [
        { x: 120, y: 1300, w: 240, h: 220, stories: 4 },
        { x: 600, y: 1320, w: 280, h: 240, stories: 5 },
        { x: 260, y: 1640, w: 340, h: 220, stories: 4 },
        { x: 740, y: 1660, w: 360, h: 200, stories: 4 },
        { x: 1220, y: 1360, w: 300, h: 240, stories: 5 },
        { x: 1320, y: 520, w: 180, h: 200, stories: 3 },
        { x: 1680, y: 520, w: 220, h: 220, stories: 4 }
      ];

      buildings.forEach(b => {
        // Ombre portée au sol
        ctx.fillStyle = 'rgba(10, 15, 20, 0.25)';
        ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);

        // Façade en pierre de taille blonde parisienne
        ctx.fillStyle = '#e4dacf';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Lignes de refend horizontales
        ctx.strokeStyle = '#c8bcad';
        ctx.lineWidth = 1;
        for (let ly = b.y + 30; ly < b.y + b.h; ly += 38) {
          ctx.beginPath();
          ctx.moveTo(b.x, ly);
          ctx.lineTo(b.x + b.w, ly);
          ctx.stroke();
        }

        // Toit Mansart en zinc gris-bleu
        ctx.fillStyle = textures.zincRoof;
        ctx.fillRect(b.x, b.y, b.w, 42);

        // Cheminées en terre cuite sur les toits
        ctx.fillStyle = '#ab5638';
        for (let ch = b.x + 20; ch < b.x + b.w - 15; ch += 55) {
          ctx.fillRect(ch, b.y - 12, 10, 14);
          ctx.fillStyle = '#7a3821';
          ctx.fillRect(ch - 1, b.y - 14, 12, 3);
          ctx.fillStyle = '#ab5638';
        }

        // Fenêtres rectangulaires avec volets et balconnets en fer forgé
        for (let r = 0; r < b.stories; r++) {
          const rowY = b.y + 50 + r * 38;
          if (rowY > b.y + b.h - 25) break;
          for (let colX = b.x + 25; colX < b.x + b.w - 25; colX += 45) {
            // Vitres avec reflets chaleureux du crépuscule
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(colX, rowY, 18, 26);
            ctx.fillStyle = 'rgba(255, 230, 150, 0.35)';
            ctx.fillRect(colX + 2, rowY + 2, 14, 12);
            // Croisillons
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(colX, rowY, 18, 26);

            // Balcon en fer forgé au 2e et 5e étage
            if (r === 1 || r === 3) {
              ctx.strokeStyle = '#1a242f';
              ctx.lineWidth = 2;
              ctx.strokeRect(colX - 3, rowY + 16, 24, 10);
            }
          }
        }
      });
    }

    // --- Lampadaire parisien Davioud en fonte ---
    function drawGasLamp(lx, ly) {
      // Ombre du mât
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(lx - 1, ly + 2, 3, 20);

      // Mât en fonte vert bouteille parisien
      ctx.fillStyle = '#1c3325';
      ctx.fillRect(lx - 2, ly - 26, 4, 30);
      // Socle mouluré
      ctx.fillRect(lx - 4, ly + 2, 8, 4);

      // Lanterne vitrée hexagonale
      ctx.fillStyle = '#112217';
      ctx.fillRect(lx - 5, ly - 36, 10, 3);
      ctx.strokeStyle = '#112217';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lx - 5, ly - 34, 10, 10);

      // Flamme douce et halo lumineux chaleureux (Golden Hour)
      const flicker = 0.85 + Math.sin(globalTime * 6 + lx) * 0.15;
      const glowGrad = ctx.createRadialGradient(lx, ly - 29, 2, lx, ly - 29, 32);
      glowGrad.addColorStop(0, `rgba(255, 235, 140, ${0.85 * flicker})`);
      glowGrad.addColorStop(0.4, `rgba(255, 200, 100, ${0.4 * flicker})`);
      glowGrad.addColorStop(1, 'rgba(255, 180, 80, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lx, ly - 29, 32, 0, Math.PI * 2);
      ctx.fill();

      // Cœur de la flamme
      ctx.fillStyle = '#fffdf0';
      ctx.fillRect(lx - 1.5, ly - 31, 3, 5);
    }

    // --- Props animés & éléments parisiens décoratifs ---
    function drawAnimatedProps() {
      // Lampadaires répartis dans Paris
      const lamps = [
        { x: 420, y: 1240 },
        { x: 590, y: 1240 },
        { x: 420, y: 1480 },
        { x: 590, y: 1480 },
        { x: 740, y: 1240 },
        { x: 1100, y: 1240 },
        { x: 1350, y: 1380 },
        { x: 440, y: 440 },
        { x: 520, y: 440 },
        { x: 1400, y: 640 },
        { x: 1720, y: 640 },
        { x: 1420, y: 220 }
      ];
      lamps.forEach(l => drawGasLamp(l.x, l.y));

      // Étoiles scintillantes au-dessus de Montmartre
      STARS_MONTMARTRE.forEach(st => {
        const starAlpha = 0.4 + Math.sin(globalTime * 3 + st.phase) * 0.45;
        ctx.fillStyle = `rgba(255, 245, 190, ${starAlpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Spores bioluminescentes dans le Marais
      SPORES_MARAIS.forEach(sp => {
        sp.y -= sp.speedY;
        if (sp.y < 520) sp.y = 760;
        const spAlpha = 0.4 + Math.sin(globalTime * 2 + sp.pulse) * 0.35;
        ctx.fillStyle = `rgba(130, 235, 180, ${spAlpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Arbres d'alignement avec ombres et feuillage dense
      const trees = [
        { x: 300, y: 1240, r: 24 },
        { x: 720, y: 1240, r: 26 },
        { x: 1280, y: 1240, r: 25 },
        { x: 180, y: 520, r: 32 },
        { x: 780, y: 520, r: 32 },
        { x: 180, y: 800, r: 30 },
        { x: 780, y: 800, r: 30 },
        { x: 1260, y: 640, r: 24 }
      ];

      trees.forEach(tr => {
        // Ombre de l'arbre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.ellipse(tr.x + 4, tr.y + 6, tr.r, tr.r * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tronc
        ctx.fillStyle = '#543b27';
        ctx.fillRect(tr.x - 3, tr.y - 4, 6, 12);

        // Feuillage étagé
        const leafGrad = ctx.createRadialGradient(tr.x - 4, tr.y - 18, 4, tr.x, tr.y - 14, tr.r);
        leafGrad.addColorStop(0, '#7bb85c');
        leafGrad.addColorStop(0.6, '#568a3f');
        leafGrad.addColorStop(1, '#3b612a');
        ctx.fillStyle = leafGrad;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - 14, tr.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Colonne Morris classique avec affiches de théâtre
      drawMorrisColumn(860, 1340);
    }

    function drawMorrisColumn(mx, my) {
      // Ombre
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(mx + 2, my + 3, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mât cylindrique vert foncé
      ctx.fillStyle = '#1c382b';
      ctx.fillRect(mx - 10, my - 34, 20, 36);

      // Affiches colorées stylisées
      ctx.fillStyle = '#fae1b8';
      ctx.fillRect(mx - 8, my - 28, 16, 24);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(mx - 7, my - 24, 14, 4);

      // Dôme à écailles caractéristique
      ctx.fillStyle = '#0f2219';
      ctx.beginPath();
      ctx.arc(mx, my - 34, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(mx - 2, my - 48, 4, 4);
    }

    // ===================================================
    // RENDU DÉTAILLÉ DU PERSONNAGE (MUSCARA)
    // - Cheveux longs marron foncé ondulés
    // - Bandana/foulard vert texturé avec nœud & rubans flottants
    // - Débardeur kaki / vert d'eau avec encolure
    // - Short en jean bleu avec poches & coutures visibles
    // - Baskets blanches avec semelles détaillées
    // - Tote bag marron en cuir souple avec sangle à l'épaule
    // - Animation de marche fluide (jambes, bras, balancement)
    // ===================================================
    function drawMuscara() {
      const px = player.x;
      const py = player.y;
      const dir = player.dir;
      const moving = player.isMoving;

      // Cycle de balancement
      const swing = moving ? Math.sin(walkTime * 14) : 0;
      const bounce = moving ? Math.abs(Math.sin(walkTime * 14)) * 2 : 0;
      const armSwing = moving ? Math.sin(walkTime * 14) * 6 : 0;

      ctx.save();
      ctx.translate(px, py - bounce);

      // 1. Ombre douce au sol
      ctx.fillStyle = 'rgba(15, 12, 10, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, bounce, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Baskets blanches & Jambes (skin tone #f0cfba)
      const skinColor = '#edd0be';
      const denimColor = '#3e5c80';
      const denimHem = '#2d435e';
      const tankColor = '#576f53';
      const hairColor = '#2b1810';
      const hairHighlight = '#42271c';
      const bandanaColor = '#246b3e';
      const bagColor = '#7a4a2b';

      const legL = swing * 4.5;
      const legR = -swing * 4.5;

      if (dir === 'down' || dir === 'up') {
        // Jambes
        ctx.fillStyle = skinColor;
        ctx.fillRect(-6, -11 + legL, 4, 11);
        ctx.fillRect(2, -11 + legR, 4, 11);

        // Baskets blanches avec lacet & semelle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-7, -2 + legL, 5.5, 4.5);
        ctx.fillRect(1.5, -2 + legR, 5.5, 4.5);
        // Semelle en caoutchouc
        ctx.fillStyle = '#c7c2be';
        ctx.fillRect(-7, 1.5 + legL, 5.5, 1.5);
        ctx.fillRect(1.5, 1.5 + legR, 5.5, 1.5);

        // Short en jean avec ourlets et coutures
        ctx.fillStyle = denimColor;
        ctx.fillRect(-7.5, -19, 15, 9);
        ctx.fillStyle = denimHem;
        ctx.fillRect(-7.5, -11, 6.5, 2);
        ctx.fillRect(1, -11, 6.5, 2);

        // Débardeur kaki / vert d'eau
        ctx.fillStyle = tankColor;
        ctx.fillRect(-6.5, -29, 13, 11);

        // Encolure & peau visible au décolleté
        if (dir === 'down') {
          ctx.fillStyle = skinColor;
          ctx.beginPath();
          ctx.arc(0, -29, 3.5, 0, Math.PI);
          ctx.fill();
        }

        // Bras
        ctx.fillStyle = skinColor;
        ctx.fillRect(-9, -28 + armSwing, 3, 11);
        ctx.fillRect(6, -28 - armSwing, 3, 11);

        // Tote bag marron sur l'épaule droite
        ctx.save();
        ctx.translate(6.5, -24 - armSwing * 0.4);
        ctx.rotate(-0.08 + armSwing * 0.02);
        // Sangle
        ctx.strokeStyle = '#5c3319';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-1, -6);
        ctx.lineTo(-0.5, 1);
        ctx.stroke();
        // Sac en toile/cuir
        ctx.fillStyle = bagColor;
        ctx.fillRect(-3, 0, 7, 9);
        ctx.fillStyle = '#5c3319';
        ctx.fillRect(-3, 8, 7, 1);
        ctx.restore();

        // Cheveux longs marron foncé
        if (dir === 'down') {
          // Cheveux en arrière-plan encadrant le visage
          ctx.fillStyle = hairColor;
          ctx.fillRect(-8.5, -39, 17, 16);
          // Visage
          ctx.fillStyle = skinColor;
          ctx.beginPath();
          ctx.arc(0, -34, 6.5, 0, Math.PI * 2);
          ctx.fill();
          // Yeux expressifs
          ctx.fillStyle = '#22140c';
          ctx.fillRect(-3.5, -34, 2, 2.5);
          ctx.fillRect(1.5, -34, 2, 2.5);
          // Joues rosées discrètes
          ctx.fillStyle = 'rgba(235, 130, 130, 0.45)';
          ctx.fillRect(-5, -32, 2.5, 1.5);
          ctx.fillRect(2.5, -32, 2.5, 1.5);
          // Mèches de cheveux retombant sur les épaules
          ctx.fillStyle = hairColor;
          ctx.fillRect(-8, -32, 2.5, 9);
          ctx.fillRect(5.5, -32, 2.5, 9);
        } else {
          // Vue de dos : longue chevelure descendant dans le dos
          ctx.fillStyle = hairColor;
          ctx.beginPath();
          ctx.moveTo(-8, -38);
          ctx.lineTo(8, -38);
          ctx.lineTo(6, -21 + Math.sin(walkTime * 12) * 1.5);
          ctx.lineTo(-6, -21 + Math.sin(walkTime * 12) * 1.5);
          ctx.closePath();
          ctx.fill();
          // Reflet doux
          ctx.fillStyle = hairHighlight;
          ctx.fillRect(-3, -34, 6, 8);
        }

        // Bandana / Foulard vert texturé dans les cheveux
        ctx.fillStyle = bandanaColor;
        ctx.fillRect(-7.5, -39, 15, 4.5);
        // Nœud du foulard et ruban flottant au vent
        ctx.fillStyle = '#1c5430';
        ctx.fillRect(5, -40, 3, 3);
        ctx.beginPath();
        const ribbonWiggle = Math.sin(walkTime * 10) * 3;
        ctx.moveTo(7, -39);
        ctx.quadraticCurveTo(11 + ribbonWiggle, -36, 12 + ribbonWiggle, -31);
        ctx.lineTo(10 + ribbonWiggle, -31);
        ctx.closePath();
        ctx.fill();

      } else {
        // Vue latérale (direction gauche ou droite)
        const flip = dir === 'left' ? -1 : 1;
        ctx.scale(flip, 1);

        // Jambes en ciseau
        ctx.fillStyle = skinColor;
        ctx.fillRect(-2 + legL, -11, 4, 11);
        ctx.fillRect(0 + legR, -11, 4, 11);

        // Baskets blanches
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1 + legL, -2, 7, 4.5);
        ctx.fillRect(1 + legR, -2, 7, 4.5);
        ctx.fillStyle = '#c7c2be';
        ctx.fillRect(-1 + legL, 1.5, 7, 1.5);
        ctx.fillRect(1 + legR, 1.5, 7, 1.5);

        // Short denim avec couture de poche visible
        ctx.fillStyle = denimColor;
        ctx.fillRect(-5, -19, 10, 9);
        ctx.fillStyle = denimHem;
        ctx.fillRect(-5, -11, 10, 2);
        // Rivet de poche en cuivre
        ctx.fillStyle = '#c67d3b';
        ctx.fillRect(0, -16, 1.5, 1.5);

        // Buste & Débardeur
        ctx.fillStyle = tankColor;
        ctx.fillRect(-4.5, -29, 9, 11);

        // Bras qui se balance
        ctx.fillStyle = skinColor;
        ctx.fillRect(-2 + armSwing, -28, 3.5, 10);

        // Tote bag
        ctx.fillStyle = bagColor;
        ctx.fillRect(-1 + armSwing * 0.5, -22, 6, 8);

        // Tête profil
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(1, -34, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Œil profil & nez fin
        ctx.fillStyle = '#22140c';
        ctx.fillRect(4, -34, 1.8, 2.5);

        // Cheveux longs flottant en arrière
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        const hairBlow = moving ? Math.sin(walkTime * 12) * 2.5 : 0;
        ctx.moveTo(3, -40);
        ctx.lineTo(-7, -40);
        ctx.lineTo(-10 + hairBlow, -22);
        ctx.lineTo(-2, -26);
        ctx.closePath();
        ctx.fill();

        // Bandana vert
        ctx.fillStyle = bandanaColor;
        ctx.fillRect(-5, -39, 10, 4);
        // Rubans du bandana qui flottent derrière
        ctx.fillStyle = '#1c5430';
        ctx.beginPath();
        const tailBlow = moving ? Math.sin(walkTime * 12 + 1) * 3.5 : 0;
        ctx.moveTo(-5, -39);
        ctx.quadraticCurveTo(-11 + tailBlow, -37, -13 + tailBlow, -32);
        ctx.lineTo(-11 + tailBlow, -32);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // 3. Bulle d'interaction stylisée JRPG au-dessus de Muscara si un lieu est proche
      const nearby = getNearestInteraction();
      if (nearby && !isPaused) {
        drawInteractionPrompt(px, py - 52, nearby);
      }
    }

    // --- Bulle d'interaction flottante au-dessus de Muscara ---
    function drawInteractionPrompt(ix, iy, interaction) {
      const bounce = Math.sin(globalTime * 4) * 3;
      ctx.save();
      ctx.translate(ix, iy + bounce);

      // Fond parchemin avec double contour doré
      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.roundRect(-24, -14, 48, 22, 7);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Petite flèche pointant vers Muscara
      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(0, 14);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gemme touche dorée "[X]"
      ctx.fillStyle = '#7a5223';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[X]', 0, -3);

      ctx.restore();
    }

    // --- Dessin de la lumière d'ambiance Golden Hour & Particules ---
    function drawAtmosphereOverlay() {
      // Teinte pastel de fin d'après-midi / Golden Hour parisienne
      ctx.fillStyle = 'rgba(255, 230, 190, 0.08)';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // Pétales de fleurs de cerisier et de roses qui volent doucement
      PETALS.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // ===================================================
    // BOUCLE DE RENDU PRINCIPALE (REQUEST ANIMATION FRAME)
    // ===================================================
    function render(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min(timestamp - lastTime, 60);
      lastTime = timestamp;

      update(dt);

      // Effacer l'écran
      ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

      // Appliquer la translation de caméra
      ctx.save();
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

      // 1. Décor de Paris & Quartiers
      drawWorld();

      // 2. Muscara & Bulle d'interaction
      drawMuscara();

      // 3. Atmosphère & Particules
      drawAtmosphereOverlay();

      ctx.restore();

      if (isRunning) {
        animFrameId = requestAnimationFrame(render);
      }
    }

    return {
      init: function () {
        player.x = 520;
        player.y = 1480;
        camera.x = player.x - VIEWPORT_WIDTH / 2;
        camera.y = player.y - VIEWPORT_HEIGHT / 2;
      },
      start: function () {
        if (!isRunning) {
          isRunning = true;
          isPaused = false;
          lastTime = performance.now();
          animFrameId = requestAnimationFrame(render);
        }
      },
      pause: function () {
        isRunning = false;
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      },
      spawnPlayerNearZone1: function () {
        player.x = 480;
        player.y = 1440;
        player.dir = 'up';
        camera.x = player.x - VIEWPORT_WIDTH / 2;
        camera.y = player.y - VIEWPORT_HEIGHT / 2;
      },
      getPlayerPos: function () {
        return { x: player.x, y: player.y };
      }
    };
  };

})();
