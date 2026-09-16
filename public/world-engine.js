// ===================================================================
// LE MONDE DES CINQ PLUMES : RPG URBAIN TOP-DOWN 2D PARISIEN
// Moteur Canvas Réaliste : Tracé Urbain Asymétrique, Rues & Trottoirs,
// Voitures Garées, Immeubles Haussmanniens Inaccessibles avec Collisions,
// 5 Lieux d'Épreuves Ultra-Détaillés, Sprite Détaillé de Muscara,
// Bulle d'Interaction In-Game "X pour inspecter", Caméra Fluide Plein Écran.
// ===================================================================

(function () {
  'use strict';

  window.createParisWorldEngine = function (options) {
    options = options || {};
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

    // Dimensions dynamiques de la vue (mises à jour par resizeCanvas)
    let viewportWidth = 800;
    let viewportHeight = 540;
    const MAP_WIDTH = 2400;
    const MAP_HEIGHT = 2400;

    // Muscara : Position initiale au cœur du Quartier Littéraire dans l'impasse pavée
    const player = {
      x: 480,
      y: 1470,
      speed: 3.4,
      dir: 'up', // 'down', 'up', 'left', 'right'
      isMoving: false,
      stepCount: 0
    };

    const camera = {
      x: player.x - viewportWidth / 2,
      y: player.y - viewportHeight / 2
    };

    const keysDown = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Bulle d'interaction flottante in-game
    let activePrompt = null; // { text: 'X pour inspecter', x, y, alpha }
    let promptAlpha = 0;

    // ===================================================
    // LES 5 LIEUX D'ÉPREUVES DÉTAILLÉS (SANS LE MOT MYSTÈRE)
    // ===================================================
    const QUEST_ZONES = [
      {
        id: 1,
        key: 'jeu1',
        name: 'Le Repaire Littéraire (Milan Kundera)',
        district: 'Impasse Secrète • 7e Arrondissement',
        tag: 'Épreuve I • Littérature',
        icon: '🪶',
        x: 480,
        y: 1540,
        radius: 75,
        unlocked: true,
        dialogue: [
          "Une petite impasse pavée et silencieuse débouche sur une cour feutrée du 7e arrondissement...",
          "Devant vous se dresse la devanture d'un bistrot littéraire discret, aux boiseries bordeaux et dorées, où Milan Kundera aimait s'attabler en toute intimité.",
          "Une énigme poétique est gravée sur la porte : le mystère des 8 lettres vous attend !"
        ],
        actionText: "Entrer dans l'Énigme"
      },
      {
        id: 2,
        key: 'jeu2',
        name: "L'Officine Botanique & Mycologique",
        district: 'Passage des Artisans • Le Marais',
        tag: 'Épreuve II • Botanique & Mycologie',
        icon: '🍄',
        x: 1720,
        y: 720,
        radius: 75,
        unlocked: false,
        dialogue: [
          "Une charmante officine aux vitrines d'ambre et boiseries vert forêt, nichée dans un passage pavé ancien.",
          "Des bouquets de sauge, de lavande et des caisses d'élixirs végétaux bordent l'entrée. Des champignons bioluminescents miroitent doucement sous le porche.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Examiner l'officine"
      },
      {
        id: 3,
        key: 'jeu3',
        name: 'Le Square des Marronniers & Bassin aux Cygnes',
        district: 'Square Intime • Faubourg Saint-Germain',
        tag: 'Épreuve III • Les Jardins',
        icon: '🦢',
        x: 460,
        y: 560,
        radius: 80,
        unlocked: false,
        dialogue: [
          "Au cœur d'un square discret ceinturé de grilles en fer forgé doré, de vieux marronniers filtrent les rayons du soleil.",
          "Trois cygnes majestueux glissent sur un bassin circulaire en pierre sculptée, traçant des sillons d'argent sur l'eau limpide.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Admirer le bassin"
      },
      {
        id: 4,
        key: 'jeu4',
        name: 'Le Belvédère & la Rose sous Cloche',
        district: 'Hauteurs Secrètes • Montagne Sainte-Geneviève',
        tag: 'Épreuve IV • Constellations',
        icon: '🌹',
        x: 1800,
        y: 260,
        radius: 75,
        unlocked: false,
        dialogue: [
          "Sur une terrasse pavée surélevée offrant une vue imprenable sur la mer des toits de zinc parisiens, un télescope de cuivre scrute les étoiles.",
          "Sous une cloche de verre étincelante sur un socle de pierre sculpté, une rose écarlate et solitaire pulse d'un éclat céleste.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Regarder l'astre"
      },
      {
        id: 5,
        key: 'jeu5',
        name: "L'Anse des Bouquinistes & Rive Pavée",
        district: 'Berge Basse • Quai Intime',
        tag: 'Épreuve V • La Rive des Songes',
        icon: '📜',
        x: 2020,
        y: 1920,
        radius: 75,
        unlocked: false,
        dialogue: [
          "Un escalier de pierre mène à une charmante berge pavée en contrebas, ponctuée d'anneaux d'amarrage anciens.",
          "Une vieille bouteille de verre vert soufflé repose au ras des vaguelettes claires. À l'intérieur, un vélin roulé porte un cachet de cire royale scellé.",
          "🔒 Le nom de cette salle sera dévoilé prochainement dans votre carnet."
        ],
        actionText: "Examiner la rive"
      }
    ];

    // Curiosités & Secrets parisiens
    const EASTER_EGGS = [
      {
        id: 'boulangerie',
        name: 'Boulangerie au Fournil d’Antan',
        x: 740,
        y: 1140,
        radius: 45,
        icon: '🥐',
        text: "L'odeur divine des croissants tièdes au beurre frais et des baguettes dorées embaume tout le trottoir."
      },
      {
        id: 'kiosque',
        name: 'Kiosque Parisien & Journaux',
        x: 940,
        y: 1140,
        radius: 45,
        icon: '📰',
        text: "Un kiosque d'époque en fonte verte arborant revues d'art, guides parisiens et cartes illustrées."
      },
      {
        id: 'cafe_trottoir',
        name: 'Terrasse du Café des Amis',
        x: 1220,
        y: 1330,
        radius: 50,
        icon: '☕',
        text: "Les soucoupes s'entrechoquent, un serveur en tablier blanc dépose un café fumant sur une table en émail."
      },
      {
        id: 'fontaine_wallace',
        name: 'Fontaine Wallace en Fonte',
        x: 360,
        y: 470,
        radius: 45,
        icon: '⛲',
        text: "Quatre cariatides gracieuses soutiennent le dôme où coule une eau pure et glacée."
      },
      {
        id: 'banc_poete',
        name: 'Banc des Confidences',
        x: 580,
        y: 650,
        radius: 45,
        icon: '💌',
        text: "Gravé discrètement dans le bois vert d'un banc : « Pour Muscara, voyageuse des cœurs et des songes »."
      }
    ];

    // ===================================================
    // VOITURES GARÉES LE LONG DES TROTTOIRS
    // ===================================================
    const PARKED_CARS = [
      { id: 'car1', x: 260, y: 1185, w: 72, h: 36, color: '#2b4c7e', roofColor: '#1d365a', type: 'hatchback' },
      { id: 'car2', x: 700, y: 1185, w: 76, h: 38, color: '#68242c', roofColor: '#4f1a20', type: 'sedan' },
      { id: 'car3', x: 880, y: 1295, w: 74, h: 38, color: '#1a1917', roofColor: '#242320', isTaxi: true, type: 'taxi' },
      { id: 'car4', x: 1360, y: 1185, w: 68, h: 34, color: '#ded7c5', roofColor: '#7c5a3c', type: '2cv' },
      { id: 'car5', x: 1540, y: 1295, w: 76, h: 38, color: '#294e3e', roofColor: '#1a3328', type: 'sedan' },
      { id: 'car6', x: 1045, y: 880, w: 38, h: 84, color: '#f0ede6', roofColor: '#d6d1c7', type: 'van', vertical: true },
      { id: 'car7', x: 1135, y: 1540, w: 38, h: 72, color: '#566270', roofColor: '#3e4854', type: 'compact', vertical: true },
      { id: 'car8', x: 1045, y: 1720, w: 38, h: 70, color: '#a03b3b', roofColor: '#772727', type: 'vintage', vertical: true },
      { id: 'car9', x: 1480, y: 555, w: 74, h: 36, color: '#1f2e4d', roofColor: '#131e33', type: 'sedan' }
    ];

    // ===================================================
    // COLLIDERS : MURS, IMMEUBLES DENSES, VOITURES, BASSIN
    // ===================================================
    const COLLIDERS = [
      // 1. Bordures extérieures de la carte
      { x: 0, y: 0, w: MAP_WIDTH, h: 40 },
      { x: 0, y: 0, w: 40, h: MAP_HEIGHT },
      { x: MAP_WIDTH - 40, y: 0, w: 40, h: MAP_HEIGHT },
      { x: 0, y: MAP_HEIGHT - 40, w: MAP_WIDTH, h: 40 },

      // 2. Grille d'immeubles Haussmanniens denses inaccessibles
      // Bloc Nord-Ouest (entre bordure ouest et square)
      { x: 60, y: 60, w: 220, h: 680 },
      // Immeuble au nord du square
      { x: 280, y: 60, w: 400, h: 280 },
      // Immeuble entre square et rue marchande Nord
      { x: 680, y: 60, w: 300, h: 1020 },

      // Bloc Nord-Est 1 (Haut)
      { x: 1220, y: 60, w: 480, h: 380 },
      // Bloc Nord-Est 2 (Centre-Est)
      { x: 1220, y: 500, w: 420, h: 580 },
      // Bloc Bordure Est (sauf belvédère)
      { x: 1920, y: 60, w: 420, h: 800 },
      { x: 1840, y: 60, w: 80, h: 160 },

      // Bloc Sud-Ouest 1 (Ouest de l'impasse du bistrot littéraire)
      { x: 60, y: 1370, w: 340, h: 970 },
      // Bloc Sud-Ouest 2 (Est de l'impasse du bistrot littéraire)
      { x: 560, y: 1370, w: 420, h: 970 },

      // Bloc Sud-Est 1 (Bordant le boulevard Sud)
      { x: 1220, y: 1370, w: 660, h: 420 },
      // Bloc Sud-Est 2 (Au sud de la ruelle)
      { x: 1220, y: 1870, w: 660, h: 470 },
      // Bloc Extrême Sud-Est (Bordant la rive)
      { x: 1960, y: 1370, w: 380, h: 460 },

      // 3. Clôtures du Square (laissant une ouverture d'accès au sud à x: 440 - 480, y: 710)
      { x: 280, y: 380, w: 400, h: 14 },
      { x: 280, y: 380, w: 14, h: 340 },
      { x: 666, y: 380, w: 14, h: 340 },
      { x: 280, y: 706, w: 150, h: 14 },
      { x: 490, y: 706, w: 190, h: 14 },

      // 4. Contour en pierre sculptée du bassin aux cygnes
      { x: 400, y: 500, w: 120, h: 120 },

      // 5. Socle de la Rose et observatoire
      { x: 1760, y: 220, w: 80, h: 70 }
    ];

    // Ajouter les colliders des voitures garées
    PARKED_CARS.forEach(c => {
      COLLIDERS.push({ x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4 });
    });

    // ===================================================
    // SYSTÈME DE TEXTURES PROCÉDURALES
    // ===================================================
    const textures = {};

    function initTextures() {
      // Bitume urbain (Asphalte réaliste façon Google Maps)
      textures.asphalt = (function () {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const cx = c.getContext('2d');
        cx.fillStyle = '#3c4146';
        cx.fillRect(0, 0, 64, 64);
        cx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        for (let i = 0; i < 90; i++) {
          cx.fillRect((i * 17) % 64, (i * 31) % 64, 1.5, 1.5);
        }
        cx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        for (let i = 0; i < 80; i++) {
          cx.fillRect((i * 23) % 64, (i * 37) % 64, 2, 2);
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // Trottoirs en granit parisien
      textures.sidewalk = (function () {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cx = c.getContext('2d');
        cx.fillStyle = '#cfc6b8';
        cx.fillRect(0, 0, 48, 48);
        cx.strokeStyle = '#b8ad9e';
        cx.lineWidth = 1;
        cx.strokeRect(0.5, 0.5, 47, 47);
        cx.strokeRect(0.5, 23.5, 47, 1);
        cx.strokeRect(23.5, 0.5, 1, 47);
        cx.fillStyle = 'rgba(0, 0, 0, 0.025)';
        for (let i = 0; i < 40; i++) {
          cx.fillRect((i * 13) % 48, (i * 29) % 48, 1.5, 1.5);
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // Pavés parisiens anciens (Impasses & Passages)
      textures.cobblestone = (function () {
        const c = document.createElement('canvas');
        c.width = 36;
        c.height = 36;
        const cx = c.getContext('2d');
        cx.fillStyle = '#6e6962';
        cx.fillRect(0, 0, 36, 36);
        const shades = ['#827b72', '#767067', '#8c857b', '#6b665e'];
        for (let r = 0; r < 3; r++) {
          const shift = (r % 2) * 9;
          for (let x = -9; x < 36 + 9; x += 12) {
            const px = x + shift;
            cx.fillStyle = shades[(x + r * 5) & 3];
            cx.beginPath();
            cx.roundRect(px + 1, r * 12 + 1, 10, 10, 2);
            cx.fill();
            cx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            cx.fillRect(px + 1.5, r * 12 + 1.5, 8, 1);
          }
        }
        return ctx.createPattern(c, 'repeat');
      })();

      // Toits en zinc haussmanniens avec tasseaux
      textures.zincRoof = (function () {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const cx = c.getContext('2d');
        cx.fillStyle = '#576770';
        cx.fillRect(0, 0, 32, 32);
        const grad = cx.createLinearGradient(0, 0, 32, 0);
        grad.addColorStop(0, '#667882');
        grad.addColorStop(0.5, '#52616a');
        grad.addColorStop(1, '#62737d');
        cx.fillStyle = grad;
        cx.fillRect(1, 0, 30, 32);
        cx.fillStyle = '#374349';
        cx.fillRect(0, 0, 2, 32);
        cx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        cx.fillRect(2, 0, 1, 32);
        return ctx.createPattern(c, 'repeat');
      })();

      // Gravier ocre du square
      textures.gravel = (function () {
        const c = document.createElement('canvas');
        c.width = 40;
        c.height = 40;
        const cx = c.getContext('2d');
        cx.fillStyle = '#decbb1';
        cx.fillRect(0, 0, 40, 40);
        const dots = ['#caa987', '#ebdcc5', '#bf9f7d', '#f3e8d7'];
        for (let i = 0; i < 60; i++) {
          cx.fillStyle = dots[i % dots.length];
          cx.fillRect((i * 17) % 40, (i * 29) % 40, 1.5, 1.5);
        }
        return ctx.createPattern(c, 'repeat');
      })();
    }

    initTextures();

    // ===================================================
    // GESTION DU PLEIN ÉCRAN & DU RESIZE ADAPTATIF
    // ===================================================
    function resizeCanvas() {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetW = Math.max(rect.width, 320);
      const targetH = Math.max(rect.height, 320);

      if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
        canvas.width = targetW * dpr;
        canvas.height = targetH * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewportWidth = targetW;
      viewportHeight = targetH;
    }

    window.addEventListener('resize', resizeCanvas);

    // ===================================================
    // VÉRIFICATION DES COLLISIONS
    // ===================================================
    function checkCollision(nx, ny) {
      const pw = 18;
      const ph = 12;
      const px = nx - pw / 2;
      const py = ny - ph / 2;

      for (let i = 0; i < COLLIDERS.length; i++) {
        const c = COLLIDERS[i];
        if (
          px < c.x + c.w &&
          px + pw > c.x &&
          py < c.y + c.h &&
          py + ph > c.y
        ) {
          return true; // Collision détectée
        }
      }
      return false;
    }

    // ===================================================
    // CONTRÔLES CLAVIER & TACTILES (HUD SANS TEXTE)
    // ===================================================
    function handleKeyDown(e) {
      if (isPaused) {
        if (e.key === 'x' || e.key === 'X' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          advanceDialogue();
        }
        return;
      }

      let handled = true;
      switch (e.key) {
        case 'ArrowUp':
        case 'z':
        case 'Z':
        case 'w':
        case 'W':
          keysDown.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          keysDown.down = true;
          break;
        case 'ArrowLeft':
        case 'q':
        case 'Q':
        case 'a':
        case 'A':
          keysDown.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysDown.right = true;
          break;
        case 'x':
        case 'X':
        case ' ':
        case 'Enter':
          e.preventDefault();
          triggerInspectAction();
          break;
        default:
          handled = false;
      }

      if (handled && e.key.startsWith('Arrow')) {
        e.preventDefault();
      }
    }

    function handleKeyUp(e) {
      switch (e.key) {
        case 'ArrowUp':
        case 'z':
        case 'Z':
        case 'w':
        case 'W':
          keysDown.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          keysDown.down = false;
          break;
        case 'ArrowLeft':
        case 'q':
        case 'Q':
        case 'a':
        case 'A':
          keysDown.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysDown.right = false;
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initialisation des boutons tactiles mobiles
    function setupMobileControls() {
      const dpadBtns = document.querySelectorAll('.dpad-btn');
      dpadBtns.forEach(btn => {
        const dir = btn.getAttribute('data-dir');
        if (!dir) return;

        const press = (e) => {
          e.preventDefault();
          keysDown[dir] = true;
          btn.classList.add('active');
        };

        const release = (e) => {
          e.preventDefault();
          keysDown[dir] = false;
          btn.classList.remove('active');
        };

        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
      });

      // Bouton d'action tactile X
      const btnAction = document.getElementById('btn-mobile-action-x');
      if (btnAction) {
        const doAction = (e) => {
          e.preventDefault();
          btnAction.classList.add('active');
          if (isPaused) {
            advanceDialogue();
          } else {
            triggerInspectAction();
          }
          setTimeout(() => btnAction.classList.remove('active'), 120);
        };
        btnAction.addEventListener('touchstart', doAction, { passive: false });
        btnAction.addEventListener('click', doAction);
      }
    }

    setupMobileControls();

    // ===================================================
    // DÉTECTION DE PROXIMITÉ & BULLE D'INTERACTION IN-GAME
    // ===================================================
    function getNearestInteractable() {
      for (let i = 0; i < QUEST_ZONES.length; i++) {
        const q = QUEST_ZONES[i];
        const dist = Math.hypot(player.x - q.x, player.y - q.y);
        if (dist <= q.radius) {
          return { type: 'quest', data: q, dist };
        }
      }

      for (let i = 0; i < EASTER_EGGS.length; i++) {
        const eg = EASTER_EGGS[i];
        const dist = Math.hypot(player.x - eg.x, player.y - eg.y);
        if (dist <= eg.radius) {
          return { type: 'egg', data: eg, dist };
        }
      }
      return null;
    }

    function triggerInspectAction() {
      const near = getNearestInteractable();
      if (!near) {
        if (showToast) showToast('Flânez encore un peu pour découvrir un lieu...');
        return;
      }

      if (near.type === 'quest') {
        openQuestDialogue(near.data);
      } else if (near.type === 'egg') {
        openEggDialogue(near.data);
      }
    }

    // ===================================================
    // BOÎTE DE DIALOGUE JRPG AVEC EFFET MACHINE À ÉCRIRE
    // ===================================================
    const dialogueBox = document.getElementById('rpg-dialogue-box');
    const dialogueAvatar = document.getElementById('dialogue-avatar');
    const dialogueAvatarLabel = document.getElementById('dialogue-avatar-label');
    const dialogueSpeaker = document.getElementById('dialogue-speaker-name');
    const dialogueDistrict = document.getElementById('dialogue-speaker-district');
    const dialogueText = document.getElementById('dialogue-text');
    const dialogueActionBtn = document.getElementById('btn-dialogue-action');
    const dialogueActionLabel = document.getElementById('dialogue-action-label');

    let currentDialogueQueue = [];
    let currentDialogueIndex = 0;
    let typeWriterInterval = null;
    let isTyping = false;
    let currentFullLine = '';
    let currentQuestTarget = null;

    function openQuestDialogue(quest) {
      isPaused = true;
      currentQuestTarget = quest;
      currentDialogueQueue = [...quest.dialogue];
      currentDialogueIndex = 0;

      if (dialogueSpeaker) dialogueSpeaker.textContent = quest.name;
      if (dialogueDistrict) dialogueDistrict.textContent = quest.district;
      if (dialogueAvatar) dialogueAvatar.textContent = quest.icon;
      if (dialogueAvatarLabel) dialogueAvatarLabel.textContent = quest.tag;

      if (dialogueBox) {
        dialogueBox.classList.add('open');
        dialogueBox.setAttribute('aria-hidden', 'false');
      }

      showNextDialogueLine();
    }

    function openEggDialogue(egg) {
      isPaused = true;
      currentQuestTarget = null;
      currentDialogueQueue = [egg.text];
      currentDialogueIndex = 0;

      if (dialogueSpeaker) dialogueSpeaker.textContent = egg.name;
      if (dialogueDistrict) dialogueDistrict.textContent = 'Secret Parisien';
      if (dialogueAvatar) dialogueAvatar.textContent = egg.icon;
      if (dialogueAvatarLabel) dialogueAvatarLabel.textContent = 'Curiosité';

      if (dialogueBox) {
        dialogueBox.classList.add('open');
        dialogueBox.setAttribute('aria-hidden', 'false');
      }

      showNextDialogueLine();
    }

    function showNextDialogueLine() {
      if (currentDialogueIndex >= currentDialogueQueue.length) {
        closeDialogue();
        return;
      }

      const line = currentDialogueQueue[currentDialogueIndex];
      currentFullLine = line;
      startTypeWriter(line);

      const isLast = currentDialogueIndex === currentDialogueQueue.length - 1;
      if (dialogueActionLabel) {
        if (isLast && currentQuestTarget && currentQuestTarget.id === 1) {
          dialogueActionLabel.textContent = currentQuestTarget.actionText;
        } else if (isLast) {
          dialogueActionLabel.textContent = 'Terminer';
        } else {
          dialogueActionLabel.textContent = 'Suite';
        }
      }
    }

    function startTypeWriter(text) {
      if (typeWriterInterval) clearInterval(typeWriterInterval);
      if (!dialogueText) return;

      isTyping = true;
      dialogueText.textContent = '';
      let charIdx = 0;

      typeWriterInterval = setInterval(() => {
        if (charIdx < text.length) {
          dialogueText.textContent += text[charIdx];
          charIdx++;
        } else {
          clearInterval(typeWriterInterval);
          isTyping = false;
        }
      }, 16);
    }

    function advanceDialogue() {
      if (isTyping) {
        clearInterval(typeWriterInterval);
        isTyping = false;
        if (dialogueText) dialogueText.textContent = currentFullLine;
        return;
      }

      currentDialogueIndex++;
      if (currentDialogueIndex < currentDialogueQueue.length) {
        showNextDialogueLine();
      } else {
        const target = currentQuestTarget;
        closeDialogue();
        if (target && target.id === 1) {
          triggerTrialEntranceTransition(1);
        }
      }
    }

    function closeDialogue() {
      isPaused = false;
      currentQuestTarget = null;
      if (typeWriterInterval) clearInterval(typeWriterInterval);
      isTyping = false;

      if (dialogueBox) {
        dialogueBox.classList.remove('open');
        dialogueBox.setAttribute('aria-hidden', 'true');
      }
    }

    if (dialogueActionBtn) {
      dialogueActionBtn.addEventListener('click', () => {
        advanceDialogue();
      });
    }

    // Transition cinématique vers l'Épreuve 1
    function triggerTrialEntranceTransition(trialId) {
      const curtain = document.getElementById('trial-entrance-curtain');
      if (curtain) {
        curtain.classList.add('active');
        curtain.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          if (navigateTo) navigateTo(`jeu-${trialId}`);
          setTimeout(() => {
            curtain.classList.remove('active');
            curtain.setAttribute('aria-hidden', 'true');
          }, 450);
        }, 800);
      } else {
        if (navigateTo) navigateTo(`jeu-${trialId}`);
      }
    }

    // ===================================================
    // BOUCLE DE JEU & MISE À JOUR PHYSIQUE
    // ===================================================
    function update(dt) {
      globalTime += dt;

      // Bouton d'action tactile : pulsation dorée si proche d'un lieu
      const near = getNearestInteractable();
      const btnAction = document.getElementById('btn-mobile-action-x');
      if (btnAction) {
        if (near && !isPaused) {
          btnAction.classList.add('pulsing');
        } else {
          btnAction.classList.remove('pulsing');
        }
      }

      // Mise à jour de la bulle d'interaction flottante in-game
      if (near && !isPaused) {
        promptAlpha = Math.min(promptAlpha + dt * 5, 1);
        activePrompt = {
          text: 'X pour inspecter',
          x: player.x,
          y: player.y - 48,
          alpha: promptAlpha
        };
      } else {
        promptAlpha = Math.max(promptAlpha - dt * 5, 0);
        if (promptAlpha <= 0) {
          activePrompt = null;
        } else if (activePrompt) {
          activePrompt.alpha = promptAlpha;
        }
      }

      // Mise à jour du badge de quartier dans le header
      const badgeText = document.getElementById('world-zone-text');
      if (badgeText) {
        if (near) {
          badgeText.textContent = `${near.data.icon} ${near.data.name}`;
        } else {
          badgeText.textContent = getDistrictNameAt(player.x, player.y);
        }
      }

      if (isPaused) {
        player.isMoving = false;
        return;
      }

      // Déplacement dans les 4 directions avec glissement orthogonal sur collision
      let dx = 0;
      let dy = 0;

      if (keysDown.up) dy -= 1;
      if (keysDown.down) dy += 1;
      if (keysDown.left) dx -= 1;
      if (keysDown.right) dx += 1;

      if (dx !== 0 && dy !== 0) {
        // Normalisation diagonale
        dx *= 0.7071;
        dy *= 0.7071;
      }

      player.isMoving = dx !== 0 || dy !== 0;

      if (player.isMoving) {
        walkTime += dt * 8.5;
        player.stepCount++;

        // Orientation
        if (Math.abs(dx) > Math.abs(dy)) {
          player.dir = dx > 0 ? 'right' : 'left';
        } else {
          player.dir = dy > 0 ? 'down' : 'up';
        }

        const moveDist = player.speed * (dt * 60);
        const newX = player.x + dx * moveDist;
        const newY = player.y + dy * moveDist;

        // Test collision avec glissement (slide X puis slide Y)
        const canMoveFull = !checkCollision(newX, newY);
        if (canMoveFull) {
          player.x = newX;
          player.y = newY;
        } else {
          const canMoveX = !checkCollision(newX, player.y);
          const canMoveY = !checkCollision(player.x, newY);
          if (canMoveX) player.x = newX;
          if (canMoveY) player.y = newY;
        }

        // Confinement aux frontières de la carte
        player.x = Math.max(50, Math.min(MAP_WIDTH - 50, player.x));
        player.y = Math.max(50, Math.min(MAP_HEIGHT - 50, player.y));
      }

      // Caméra fluide centrée sur Muscara
      const targetCamX = player.x - viewportWidth / 2;
      const targetCamY = player.y - viewportHeight / 2;

      // Délimitation de la caméra
      const maxCamX = Math.max(0, MAP_WIDTH - viewportWidth);
      const maxCamY = Math.max(0, MAP_HEIGHT - viewportHeight);

      const clampedCamX = Math.max(0, Math.min(maxCamX, targetCamX));
      const clampedCamY = Math.max(0, Math.min(maxCamY, targetCamY));

      camera.x += (clampedCamX - camera.x) * 0.12;
      camera.y += (clampedCamY - camera.y) * 0.12;
    }

    function getDistrictNameAt(x, y) {
      if (y < 800 && x < 800) return 'Square des Marronniers';
      if (y < 800 && x > 1400) return 'Belvédère & Observatoire';
      if (y > 1150 && y < 1320) return 'Boulevard Saint-Germain';
      if (y > 1320 && x < 700) return 'Impasse Littéraire • 7e';
      if (y > 1320 && x > 1800) return 'Berge Basse & Rive';
      if (x > 1000 && x < 1200) return 'Rue Marchande de Seine';
      return 'Quartier Latin • Paris';
    }

    // ===================================================
    // DESSIN DU MONDE & ENVIRONNEMENT URBAIN RÉALISTE
    // ===================================================
    function draw() {
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      ctx.save();
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

      // 1. Fond de carte urbaine
      drawUrbanGround();

      // 2. Rues, Boulevards, Trottoirs et Passages Piétons
      drawRoadsAndSidewalks();

      // 3. Squares, Bassins et Espaces Végétalisés
      drawSpecialParks();

      // 4. Voitures Garées le long des trottoirs
      drawParkedCars();

      // 5. Mobilier Urbain (Arbres, Réverbères Haussmanniens, Bancs)
      drawStreetFurniture();

      // 6. Les 5 Lieux d'Épreuves Ultra-Détaillés
      drawAllQuestLocations();

      // 7. Immeubles Haussmanniens Inaccessibles (Toits en zinc, cheminées, cours)
      drawHaussmannianBlocks();

      // 8. Sprite de Muscara avec Ombre et Animations
      drawMuscara();

      // 9. Bulle Flottante In-Game "X pour inspecter"
      if (activePrompt && activePrompt.alpha > 0) {
        drawInGameFloatingPrompt(activePrompt);
      }

      ctx.restore();
    }

    // --- 1. Sol urbain de base ---
    function drawUrbanGround() {
      ctx.fillStyle = '#b5aca0';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    }

    // --- 2. Tracé réaliste des rues, boulevards et trottoirs ---
    function drawRoadsAndSidewalks() {
      // GRAND BOULEVARD HORIZONTAL (y = 1180 à y = 1300)
      // Trottoirs Nord et Sud
      ctx.fillStyle = textures.sidewalk;
      ctx.fillRect(40, 1130, MAP_WIDTH - 80, 190);

      // Chaussée d'asphalte (120px de large)
      ctx.fillStyle = textures.asphalt;
      ctx.fillRect(40, 1180, MAP_WIDTH - 80, 120);

      // Bordures en granit biseauté du boulevard
      ctx.fillStyle = '#9e9485';
      ctx.fillRect(40, 1178, MAP_WIDTH - 80, 2);
      ctx.fillRect(40, 1300, MAP_WIDTH - 80, 3);

      // Ligne médiane discontinue blanche
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 16]);
      ctx.beginPath();
      ctx.moveTo(40, 1240);
      ctx.lineTo(MAP_WIDTH - 40, 1240);
      ctx.stroke();
      ctx.setLineDash([]);

      // RUE TRANSVERSALE MARCHANDE NORD-SUD (x = 1040 à x = 1140)
      ctx.fillStyle = textures.sidewalk;
      ctx.fillRect(990, 40, 200, MAP_HEIGHT - 80);

      ctx.fillStyle = textures.asphalt;
      ctx.fillRect(1040, 40, 100, MAP_HEIGHT - 80);

      // Bordures granit
      ctx.fillStyle = '#9e9485';
      ctx.fillRect(1038, 40, 2, MAP_HEIGHT - 80);
      ctx.fillRect(1140, 40, 3, MAP_HEIGHT - 80);

      // Ligne médiane Nord-Sud
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.moveTo(1090, 40);
      ctx.lineTo(1090, MAP_HEIGHT - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // PASSAGES PIÉTONS ZÉBRÉS AUX CARREFOURS
      drawCrosswalk(420, 1180, 40, 120, 'vertical');
      drawCrosswalk(1040, 1180, 100, 120, 'intersection');
      drawCrosswalk(1680, 1180, 40, 120, 'vertical');
      drawCrosswalk(1040, 720, 100, 36, 'horizontal');
      drawCrosswalk(1040, 1680, 100, 36, 'horizontal');

      // IMPASSE PAVÉE DU 7e ARRONDISSEMENT (Épreuve I - Kundera)
      ctx.fillStyle = textures.cobblestone;
      ctx.fillRect(410, 1300, 140, 320);

      // Trottoirs d'encadrement de l'impasse
      ctx.fillStyle = '#b0a696';
      ctx.fillRect(396, 1300, 14, 320);
      ctx.fillRect(550, 1300, 14, 320);

      // Cour pavée au fond de l'impasse devant le bistrot
      ctx.fillRect(380, 1500, 200, 130);

      // RUELLE PAVÉE DU MARAIS (Épreuve II - Apothicairerie)
      ctx.fillStyle = textures.cobblestone;
      ctx.fillRect(1640, 640, 160, 200);

      // CHEMIN DE PIERRE DU BELVÉDÈRE (Épreuve IV)
      ctx.fillStyle = textures.cobblestone;
      ctx.fillRect(1740, 200, 140, 140);

      // BERGE PAVÉE DU QUAI (Épreuve V)
      ctx.fillStyle = textures.cobblestone;
      ctx.fillRect(1940, 1840, 240, 180);
      // Bord d'eau pastel avec reflets
      ctx.fillStyle = '#94c2c7';
      ctx.fillRect(2180, 1840, 180, 180);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(2180, 1840, 4, 180);
    }

    function drawCrosswalk(x, y, w, h, type) {
      ctx.fillStyle = '#f5f3eb';
      if (type === 'vertical') {
        const stripeW = 8;
        const gap = 6;
        for (let sx = x; sx < x + w - stripeW; sx += stripeW + gap) {
          ctx.fillRect(sx, y + 4, stripeW, h - 8);
        }
      } else if (type === 'horizontal') {
        const stripeH = 8;
        const gap = 6;
        for (let sy = y; sy < y + h - stripeH; sy += stripeH + gap) {
          ctx.fillRect(x + 4, sy, w - 8, stripeH);
        }
      } else if (type === 'intersection') {
        // Carrefour central : bandes zébrées aux 4 entrées
        drawCrosswalk(x - 36, y, 32, h, 'vertical');
        drawCrosswalk(x + w + 4, y, 32, h, 'vertical');
        drawCrosswalk(x, y - 36, w, 32, 'horizontal');
        drawCrosswalk(x, y + h + 4, w, 32, 'horizontal');
      }
    }

    // --- 3. Square Public, Bassins & Parcs ---
    function drawSpecialParks() {
      // SQUARE DES MARRONNIERS (x: 280, y: 380, w: 400, h: 340)
      ctx.fillStyle = textures.gravel;
      ctx.fillRect(280, 380, 400, 340);

      // Parterres de pelouse géométrique
      ctx.fillStyle = '#618844';
      ctx.beginPath();
      ctx.roundRect(300, 400, 100, 80, 8);
      ctx.roundRect(560, 400, 100, 80, 8);
      ctx.roundRect(300, 620, 100, 80, 8);
      ctx.roundRect(560, 620, 100, 80, 8);
      ctx.fill();

      // Bordures fleuries des parterres
      const flowerColors = ['#f79d9d', '#ffd480', '#e3a6ff', '#ffffff'];
      for (let f = 0; f < 32; f++) {
        ctx.fillStyle = flowerColors[f % flowerColors.length];
        const fx = 304 + (f * 11) % 92;
        const fy = 404 + (f * 7) % 72;
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Grille en fer forgé du square
      ctx.strokeStyle = '#1e2c24';
      ctx.lineWidth = 4;
      ctx.strokeRect(280, 380, 400, 340);

      // Piliers de grille dorés aux 4 coins
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(276, 376, 8, 8);
      ctx.fillRect(676, 376, 8, 8);
      ctx.fillRect(276, 716, 8, 8);
      ctx.fillRect(676, 716, 8, 8);

      // Ouverture de la grille au sud
      ctx.clearRect(440, 716, 50, 6);
      ctx.fillStyle = textures.gravel;
      ctx.fillRect(440, 716, 50, 6);

      // Bassin aux cygnes majestueux au centre du square (x: 460, y: 560)
      drawSwansPond(460, 560);
    }

    // Bassin avec eau animée et 3 cygnes blancs
    function drawSwansPond(px, py) {
      // Ombre portée
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(px + 3, py + 4, 56, 0, Math.PI * 2);
      ctx.fill();

      // Marguerite de pierre sculptée
      ctx.fillStyle = '#dcd4c6';
      ctx.beginPath();
      ctx.arc(px, py, 54, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#baad9c';
      ctx.beginPath();
      ctx.arc(px, py, 49, 0, Math.PI * 2);
      ctx.fill();

      // Eau bleu clair cristalline
      const waterGrad = ctx.createRadialGradient(px, py, 5, px, py, 46);
      waterGrad.addColorStop(0, '#a5dbe2');
      waterGrad.addColorStop(0.7, '#7ebdc5');
      waterGrad.addColorStop(1, '#5a9ca5');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(px, py, 46, 0, Math.PI * 2);
      ctx.fill();

      // Ondulations concentriques douces
      const waveOffset = (globalTime * 1.5) % 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 14 + waveOffset * 28, 0, Math.PI * 2);
      ctx.stroke();

      // Jet d'eau central
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 3 Cygnes blancs glissant sur l'eau
      const swans = [
        { angle: globalTime * 0.4, r: 24 },
        { angle: globalTime * 0.4 + 2.1, r: 22 },
        { angle: globalTime * 0.4 + 4.2, r: 26 }
      ];

      swans.forEach(s => {
        const sx = px + Math.cos(s.angle) * s.r;
        const sy = py + Math.sin(s.angle) * s.r;

        // Vaguelette de sillage
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx - Math.cos(s.angle) * 3, sy - Math.sin(s.angle) * 3, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Corps du cygne
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 5, 3.2, s.angle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();

        // Bec orangé
        ctx.fillStyle = '#e86a24';
        const beakX = sx + Math.cos(s.angle + Math.PI / 2) * 5.5;
        const beakY = sy + Math.sin(s.angle + Math.PI / 2) * 5.5;
        ctx.beginPath();
        ctx.arc(beakX, beakY, 1.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // --- 4. Voitures Garées le long des trottoirs ---
    function drawParkedCars() {
      PARKED_CARS.forEach(car => {
        ctx.save();
        ctx.translate(car.x, car.y);

        // Ombre sous la voiture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.roundRect(2, 3, car.w, car.h, 6);
        ctx.fill();

        // Carrosserie
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(0, 0, car.w, car.h, 5);
        ctx.fill();

        // Bordure fine
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (car.vertical) {
          // Voiture orientée verticalement
          // Pare-brise avant (vitre teintée avec reflet)
          ctx.fillStyle = '#2b3940';
          ctx.fillRect(4, 16, car.w - 8, 12);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(6, 17, 3, 10);

          // Toit
          ctx.fillStyle = car.roofColor;
          ctx.fillRect(4, 28, car.w - 8, car.h - 44);

          // Lunette arrière
          ctx.fillStyle = '#2b3940';
          ctx.fillRect(5, car.h - 14, car.w - 10, 8);

          // Phares avant
          ctx.fillStyle = '#fceabb';
          ctx.fillRect(3, 1, 6, 2);
          ctx.fillRect(car.w - 9, 1, 6, 2);

          // Feux arrière rouges
          ctx.fillStyle = '#c92a2a';
          ctx.fillRect(3, car.h - 3, 6, 2);
          ctx.fillRect(car.w - 9, car.h - 3, 6, 2);
        } else {
          // Voiture orientée horizontalement
          // Pare-brise avant
          ctx.fillStyle = '#2b3940';
          ctx.fillRect(14, 4, 12, car.h - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(15, 6, 10, 3);

          // Toit
          ctx.fillStyle = car.roofColor;
          ctx.fillRect(26, 4, car.w - 42, car.h - 8);

          // Lunette arrière
          ctx.fillStyle = '#2b3940';
          ctx.fillRect(car.w - 16, 5, 8, car.h - 10);

          // Phares avant
          ctx.fillStyle = '#fceabb';
          ctx.fillRect(1, 3, 2, 6);
          ctx.fillRect(1, car.h - 9, 2, 6);

          // Feux arrière rouges
          ctx.fillStyle = '#c92a2a';
          ctx.fillRect(car.w - 3, 3, 2, 6);
          ctx.fillRect(car.w - 3, car.h - 9, 2, 6);

          // Signe lumineux TAXI PARISIEN sur le toit si taxi
          if (car.isTaxi) {
            ctx.fillStyle = '#4ade80'; // Vert lumineux taxi
            ctx.fillRect(car.w / 2 - 8, car.h / 2 - 3, 16, 6);
            ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
            ctx.fillRect(car.w / 2 - 10, car.h / 2 - 5, 20, 10);
          }
        }

        ctx.restore();
      });
    }

    // --- 5. Mobilier Urbain (Arbres, Lampadaires haussmanniens, Bancs) ---
    function drawStreetFurniture() {
      // Arbres de Paris avec grilles circulaires en fonte
      const treePositions = [
        { x: 180, y: 1155 },
        { x: 380, y: 1155 },
        { x: 580, y: 1155 },
        { x: 800, y: 1155 },
        { x: 1280, y: 1155 },
        { x: 1480, y: 1155 },
        { x: 1680, y: 1155 },
        { x: 1015, y: 640 },
        { x: 1015, y: 840 },
        { x: 1165, y: 640 },
        { x: 1165, y: 840 },
        { x: 340, y: 440 },
        { x: 580, y: 440 },
        { x: 340, y: 660 },
        { x: 580, y: 660 }
      ];

      treePositions.forEach(t => {
        // Grille d'arbre au sol
        ctx.strokeStyle = '#3e3a35';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 11, 0, Math.PI * 2);
        ctx.stroke();

        // Troncs et feuillage ombragé
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(t.x + 4, t.y + 4, 18, 0, Math.PI * 2);
        ctx.fill();

        // Feuillage vert tendre dégradé
        const grad = ctx.createRadialGradient(t.x - 3, t.y - 3, 2, t.x, t.y, 22);
        grad.addColorStop(0, '#669c4f');
        grad.addColorStop(0.7, '#487535');
        grad.addColorStop(1, '#325424');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
        ctx.fill();
      });

      // Lampadaires Haussmanniens vert bronze avec lueur chaude
      const lanterns = [
        { x: 440, y: 1320 },
        { x: 540, y: 1320 },
        { x: 440, y: 1480 },
        { x: 540, y: 1480 },
        { x: 1015, y: 1155 },
        { x: 1165, y: 1155 },
        { x: 1640, y: 720 },
        { x: 1980, y: 1880 }
      ];

      lanterns.forEach(l => {
        // Lueur dorée au sol
        const lightGrad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 32);
        lightGrad.addColorStop(0, 'rgba(255, 235, 160, 0.45)');
        lightGrad.addColorStop(1, 'rgba(255, 235, 160, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 32, 0, Math.PI * 2);
        ctx.fill();

        // Potelet en fonte
        ctx.fillStyle = '#232d27';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Lanterne centrale lumineuse
        ctx.fillStyle = '#fff4cc';
        ctx.beginPath();
        ctx.arc(l.x, l.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Potelets métalliques parisiens anti-stationnement le long des passages piétons
      const bollards = [
        { x: 405, y: 1175 }, { x: 405, y: 1303 },
        { x: 470, y: 1175 }, { x: 470, y: 1303 },
        { x: 1030, y: 1175 }, { x: 1030, y: 1303 },
        { x: 1150, y: 1175 }, { x: 1150, y: 1303 }
      ];

      ctx.fillStyle = '#222625';
      bollards.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x - 1, b.y - 2, 2, 1);
        ctx.fillStyle = '#222625';
      });
    }

    // --- 6. Les 5 Lieux d'Épreuves Ultra-Détaillés ---
    function drawAllQuestLocations() {
      // 1. LE REPAIRE LITTÉRAIRE DE KUNDERA (Épreuve I - rx: 480, ry: 1540)
      drawLiteraryBistroFacade(480, 1540);

      // 2. L'OFFICINE BOTANIQUE (Épreuve II - ox: 1720, oy: 720)
      drawBotanicalApothecary(1720, 720);

      // 3. LE BELVÉDÈRE & LA ROSE (Épreuve IV - bx: 1800, by: 260)
      drawObservatoryRose(1800, 260);

      // 4. L'ANSE DES QUAYS & BOUTEILLE (Épreuve V - qx: 2020, qy: 1920)
      drawSealedBottleRive(2020, 1920);
    }

    // Épreuve 1 : Façade somptueuse du Bistrot Littéraire (Kundera)
    // SANS ÉCRIRE LE MOT MYSTÈRE
    function drawLiteraryBistroFacade(rx, ry) {
      // Devanture en bois laqué bordeaux profond et boiseries dorées
      ctx.fillStyle = '#421217';
      ctx.fillRect(rx - 70, ry - 80, 140, 70);

      // Boiseries moulurées et vitrines à carreaux
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 64, ry - 74, 128, 58);

      // Auvent chic rayé bordeaux et crème
      ctx.fillStyle = '#f7eedb';
      ctx.fillRect(rx - 74, ry - 94, 148, 16);
      ctx.fillStyle = '#5c1921';
      for (let s = rx - 74; s < rx + 74; s += 20) {
        ctx.fillRect(s, ry - 94, 10, 16);
      }

      // Enseigne dorée mystérieuse : "BISTROT LITTÉRAIRE" (sans révéler le mot secret)
      ctx.fillStyle = '#fce4a6';
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('BISTROT LITTÉRAIRE', rx, ry - 44);

      // Terrasse : Tables en marbre rondes et chaises en rotin
      const tables = [
        { x: rx - 42, y: ry + 16 },
        { x: rx + 42, y: ry + 16 },
        { x: rx, y: ry + 28 }
      ];

      tables.forEach(t => {
        // Ombre table
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(t.x + 2, t.y + 2, 13, 0, Math.PI * 2);
        ctx.fill();

        // Plateau marbre blanc
        ctx.fillStyle = '#fdfdfd';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#cca870';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Carafe à eau et verre
        ctx.fillStyle = 'rgba(100, 180, 220, 0.7)';
        ctx.fillRect(t.x - 2, t.y - 3, 4, 6);

        // Chaises Thonet en rotin
        ctx.strokeStyle = '#8a4b22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x - 14, t.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x + 14, t.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Ardoise de menu sur trépied en bois
      ctx.fillStyle = '#222';
      ctx.fillRect(rx - 65, ry - 2, 14, 20);
      ctx.strokeStyle = '#8a5024';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx - 65, ry - 2, 14, 20);
      ctx.fillStyle = '#f0ede6';
      ctx.font = '6px sans-serif';
      ctx.fillText('MENU', rx - 58, ry + 6);

      // Jardinières de géraniums rouges
      ctx.fillStyle = '#9e342a';
      ctx.fillRect(rx - 70, ry - 14, 20, 6);
      ctx.fillRect(rx + 50, ry - 14, 20, 6);
      ctx.fillStyle = '#e82525';
      for (let g = 0; g < 6; g++) {
        ctx.beginPath();
        ctx.arc(rx - 68 + g * 3.5, ry - 15, 2, 0, Math.PI * 2);
        ctx.arc(rx + 52 + g * 3.5, ry - 15, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Épreuve 2 : L'Officine Botanique & Champignons
    function drawBotanicalApothecary(ox, oy) {
      // Façade vert forêt sombre
      ctx.fillStyle = '#1c382b';
      ctx.fillRect(ox - 60, oy - 70, 120, 60);

      // Vitrines illuminées d'ambre chaud
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(ox - 48, oy - 55, 36, 30);
      ctx.fillRect(ox + 12, oy - 55, 36, 30);

      // Flacons d'ambre alignés
      ctx.fillStyle = '#8b4513';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(ox - 45 + i * 8, oy - 48, 5, 10);
        ctx.fillRect(ox + 15 + i * 8, oy - 48, 5, 10);
      }

      // Enseigne sculptée en bois
      ctx.fillStyle = '#e8d4a2';
      ctx.font = 'bold 10px serif';
      ctx.textAlign = 'center';
      ctx.fillText('HERBORISTERIE', ox, oy - 60);

      // Parterre de champignons mystiques scintillants
      const mushrooms = [
        { x: ox - 35, y: oy + 18, color: '#f43f5e', r: 5 },
        { x: ox - 20, y: oy + 26, color: '#06b6d4', r: 4 },
        { x: ox + 25, y: oy + 20, color: '#a855f7', r: 6 },
        { x: ox + 40, y: oy + 28, color: '#38bdf8', r: 4.5 }
      ];

      mushrooms.forEach(m => {
        // Halo bioluminescent
        const glow = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, 12);
        glow.addColorStop(0, m.color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Chapeau du champignon
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, Math.PI, 0);
        ctx.fill();

        // Pied
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(m.x - 1, m.y, 2, 4);
      });
    }

    // Épreuve 4 : L'Observatoire & la Rose sous Cloche
    function drawObservatoryRose(bx, by) {
      // Dôme astronomique en cuivre patiné
      ctx.fillStyle = '#3b7a66';
      ctx.beginPath();
      ctx.arc(bx - 36, by - 40, 28, Math.PI, 0);
      ctx.fill();

      // Fente d'observation
      ctx.fillStyle = '#1c362d';
      ctx.fillRect(bx - 40, by - 68, 8, 28);

      // Grand télescope en cuivre sur trépied
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 36, by - 55);
      ctx.lineTo(bx - 22, by - 75);
      ctx.stroke();

      // Socle de pierre de la Rose
      ctx.fillStyle = '#d6cbba';
      ctx.fillRect(bx + 18, by - 24, 28, 20);
      ctx.strokeStyle = '#b3a490';
      ctx.strokeRect(bx + 18, by - 24, 28, 20);

      // Cloche de verre étincelante
      const glassGrad = ctx.createLinearGradient(bx + 20, by - 50, bx + 44, by - 24);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      glassGrad.addColorStop(0.5, 'rgba(200, 235, 255, 0.45)');
      glassGrad.addColorStop(1, 'rgba(180, 220, 255, 0.65)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(bx + 32, by - 36, 12, Math.PI, 0);
      ctx.lineTo(bx + 44, by - 24);
      ctx.lineTo(bx + 20, by - 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Rose écarlate lumineuse
      const rosePulse = Math.sin(globalTime * 3) * 0.15;
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(bx + 32, by - 32, 4.5 + rosePulse, 0, Math.PI * 2);
      ctx.fill();

      // Étoiles scintillantes autour
      for (let s = 0; s < 4; s++) {
        const starAlpha = (Math.sin(globalTime * 4 + s * 1.6) + 1) / 2;
        ctx.fillStyle = `rgba(255, 240, 180, ${starAlpha})`;
        const sx = bx + 16 + (s * 11) % 32;
        const sy = by - 54 + (s * 9) % 24;
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Épreuve 5 : Bouteille à la mer sur la rive pavée
    function drawSealedBottleRive(qx, qy) {
      // Anneaux d'amarrage anciens dans la pierre
      ctx.strokeStyle = '#4a443b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(qx - 30, qy - 20, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Galets de rivière
      ctx.fillStyle = '#8f887d';
      for (let p = 0; p < 8; p++) {
        ctx.beginPath();
        ctx.ellipse(qx - 10 + p * 8, qy + (p % 2) * 6, 6, 4, p, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bouteille de verre vert soufflé
      ctx.fillStyle = 'rgba(46, 117, 89, 0.85)';
      ctx.beginPath();
      ctx.ellipse(qx + 12, qy, 11, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Goulot et bouchon en liège avec cire rouge
      ctx.fillStyle = '#225c44';
      ctx.fillRect(qx + 20, qy - 4, 6, 4);
      ctx.fillStyle = '#b91c1c'; // Cire rouge
      ctx.fillRect(qx + 24, qy - 5, 3, 5);

      // Reflet étincelant sur le verre
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(qx + 7, qy - 2, 7, 2);
    }

    // --- 7. Immeubles Haussmanniens Inaccessibles (Toits en zinc, cheminées) ---
    function drawHaussmannianBlocks() {
      // Dessin de chaque îlot inaccessible avec texture de zinc, bordures et cheminées
      const blocks = [
        { x: 60, y: 60, w: 220, h: 680 },
        { x: 280, y: 60, w: 400, h: 280 },
        { x: 680, y: 60, w: 300, h: 1020 },
        { x: 1220, y: 60, w: 480, h: 380 },
        { x: 1220, y: 500, w: 420, h: 580 },
        { x: 1920, y: 60, w: 420, h: 800 },
        { x: 60, y: 1370, w: 340, h: 970 },
        { x: 560, y: 1370, w: 420, h: 970 },
        { x: 1220, y: 1370, w: 660, h: 420 },
        { x: 1220, y: 1870, w: 660, h: 470 },
        { x: 1960, y: 1370, w: 380, h: 460 }
      ];

      blocks.forEach(b => {
        // Ombre portée de l'immeuble
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(b.x + 8, b.y + 8, b.w, b.h);

        // Façade de base en pierre de taille haussmannienne
        ctx.fillStyle = '#ded5c5';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Toit en zinc texturé avec tasseaux métalliques
        ctx.fillStyle = textures.zincRoof;
        ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);

        // Corniche sculptée en pierre
        ctx.strokeStyle = '#c4b8a5';
        ctx.lineWidth = 4;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);

        // Fenêtres de toit mansardées / lucarnes
        ctx.fillStyle = '#3a4b54';
        const numWindows = Math.floor(b.w / 44);
        for (let w = 1; w < numWindows; w++) {
          ctx.fillRect(b.x + w * 44 - 6, b.y + 10, 12, 14);
          ctx.fillRect(b.x + w * 44 - 6, b.y + b.h - 24, 12, 14);
        }

        // Cheminées parisiennes en terre cuite rouge
        const numChimneys = Math.floor(b.w / 65);
        ctx.fillStyle = '#b9473b';
        for (let c = 1; c < numChimneys; c++) {
          ctx.fillRect(b.x + c * 65 - 8, b.y + 28, 16, 12);
          ctx.fillStyle = '#8e3227';
          ctx.fillRect(b.x + c * 65 - 10, b.y + 26, 20, 3);
          ctx.fillStyle = '#b9473b';
        }
      });
    }

    // --- 8. Sprite Haute Définition de Muscara ---
    function drawMuscara() {
      const px = Math.round(player.x);
      const py = Math.round(player.y);

      // Ombre portée au sol
      ctx.fillStyle = 'rgba(25, 20, 18, 0.32)';
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      const isWalking = player.isMoving;
      const walkCycle = isWalking ? Math.sin(walkTime) : 0;
      const bob = isWalking ? Math.abs(Math.sin(walkTime * 2)) * 2 : 0;
      const legSwing = walkCycle * 4.5;
      const armSwing = walkCycle * 4;

      ctx.save();
      ctx.translate(px, py - bob);

      // JAMBES & BASKETS BLANCHES
      // Jambe gauche
      ctx.fillStyle = '#e8be99'; // Teint chair
      ctx.fillRect(-6, 2 + legSwing, 4, 7);
      // Chaussure gauche (basket blanche à semelle gomme)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-7, 9 + legSwing, 6, 4, 1.5);
      ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-7, 12 + legSwing, 6, 1);

      // Jambe droite
      ctx.fillStyle = '#e8be99';
      ctx.fillRect(2, 2 - legSwing, 4, 7);
      // Chaussure droite
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(1, 9 - legSwing, 6, 4, 1.5);
      ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(1, 12 - legSwing, 6, 1);

      // SHORT EN DENIM BLEU
      ctx.fillStyle = '#2d5a88';
      ctx.beginPath();
      ctx.roundRect(-7, -4, 14, 8, 2);
      ctx.fill();
      // Rivets et couture
      ctx.strokeStyle = '#e0a050';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-6.5, -3.5, 13, 7);

      // DÉBARDEUR KAKI / VERT D'EAU
      ctx.fillStyle = '#4e6d54';
      ctx.beginPath();
      ctx.roundRect(-6, -15, 12, 12, 2.5);
      ctx.fill();

      // BRAS & TOTE BAG EN CUIR
      // Bras gauche
      ctx.fillStyle = '#e8be99';
      ctx.fillRect(-8, -13 - armSwing, 3, 9);

      // Bras droit + Sac en bandoulière marron
      ctx.fillStyle = '#e8be99';
      ctx.fillRect(5, -13 + armSwing, 3, 9);
      // Tote bag marron
      ctx.fillStyle = '#7a4220';
      ctx.beginPath();
      ctx.roundRect(4, -8 + armSwing, 6, 8, 1.5);
      ctx.fill();
      // Lanière en diagonale sur le buste
      ctx.strokeStyle = '#5a2d12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.lineTo(6, -6);
      ctx.stroke();

      // TÊTE & COU
      ctx.fillStyle = '#e8be99';
      ctx.fillRect(-2, -18, 4, 4); // Cou
      ctx.beginPath();
      ctx.arc(0, -22, 6.5, 0, Math.PI * 2); // Tête
      ctx.fill();

      // CHEVEUX LONGS MARRON & ONDULATIONS
      ctx.fillStyle = '#3c2415';
      if (player.dir === 'up') {
        // Vue de dos : cheveux longs ondulés descendant sur les épaules
        ctx.beginPath();
        ctx.arc(0, -23, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-7, -23, 14, 12);
        ctx.beginPath();
        ctx.arc(-4, -11, 3.5, 0, Math.PI);
        ctx.arc(4, -11, 3.5, 0, Math.PI);
        ctx.fill();
      } else {
        // Vue de face ou de profil
        ctx.beginPath();
        ctx.arc(0, -24, 7.5, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
        // Mèches tombantes sur les côtés
        ctx.fillRect(-7, -23, 3.5, 12);
        ctx.fillRect(3.5, -23, 3.5, 12);

        // Yeux expressifs si de face
        if (player.dir === 'down') {
          ctx.fillStyle = '#2b1b17';
          ctx.fillRect(-3, -22, 1.5, 2);
          ctx.fillRect(1.5, -22, 1.5, 2);
        }
      }

      // BANDANA VERT ÉMERAUDE AVEC RUBANS FLOTTANTS
      ctx.fillStyle = '#15803d'; // Vert émeraude profond
      ctx.fillRect(-7, -26, 14, 3);
      // Noeud et rubans
      ctx.beginPath();
      ctx.arc(5, -25, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(5, -25, 4, 6);

      ctx.restore();
    }

    // --- 9. Bulle d'interaction flottante in-game ---
    // Affiche directement dans le monde 2D au-dessus de Muscara : "X pour inspecter"
    function drawInGameFloatingPrompt(prompt) {
      const px = Math.round(prompt.x);
      const py = Math.round(prompt.y + Math.sin(globalTime * 4.5) * 2.5);

      ctx.save();
      ctx.globalAlpha = prompt.alpha;

      const text = prompt.text; // 'X pour inspecter'
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const bubbleW = textWidth + 30;
      const bubbleH = 26;
      const bx = px - bubbleW / 2;
      const by = py - bubbleH - 6;

      // Ombre portée de la bulle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(bx + 1, by + 2, bubbleW, bubbleH, 13);
      ctx.fill();

      // Corps de la bulle (verre fumé très sombre et élégant)
      ctx.fillStyle = 'rgba(18, 14, 12, 0.88)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 13);
      ctx.fill();

      // Bordure dorée subtile
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Petite flèche pointant vers le bas (la tête de Muscara)
      ctx.fillStyle = 'rgba(18, 14, 12, 0.88)';
      ctx.beginPath();
      ctx.moveTo(px - 5, by + bubbleH);
      ctx.lineTo(px + 5, by + bubbleH);
      ctx.lineTo(px, by + bubbleH + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px - 5, by + bubbleH);
      ctx.lineTo(px, by + bubbleH + 6);
      ctx.lineTo(px + 5, by + bubbleH);
      ctx.stroke();

      // Badge doré de la touche [X]
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.roundRect(bx + 6, by + 4.5, 17, 17, 4);
      ctx.fill();

      ctx.fillStyle = '#1a110a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('X', bx + 14.5, by + 17);

      // Texte d'action "X pour inspecter"
      ctx.fillStyle = '#fbf7ee';
      ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(text, bx + 27, by + 17);

      ctx.restore();
    }

    // ===================================================
    // BOUCLE DE RENDU PRINCIPALE (RAF)
    // ===================================================
    function gameLoop(timestamp) {
      if (!isRunning) return;

      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      update(dt);
      draw();

      animFrameId = requestAnimationFrame(gameLoop);
    }

    // API Publique du Moteur
    return {
      init: function () {
        resizeCanvas();
        this.start();
      },
      start: function () {
        if (isRunning) return;
        isRunning = true;
        isPaused = false;
        lastTime = 0;
        resizeCanvas();
        animFrameId = requestAnimationFrame(gameLoop);
      },
      pause: function () {
        isPaused = true;
      },
      resume: function () {
        isPaused = false;
      },
      stop: function () {
        isRunning = false;
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      },
      resize: function () {
        resizeCanvas();
      },
      getPlayer: function () {
        return player;
      },
      spawnPlayerNearZone1: function () {
        player.x = 480;
        player.y = 1470;
        player.dir = 'up';
        camera.x = player.x - viewportWidth / 2;
        camera.y = player.y - viewportHeight / 2;
        resizeCanvas();
      },
      teleport: function (x, y) {
        player.x = x;
        player.y = y;
        camera.x = player.x - viewportWidth / 2;
        camera.y = player.y - viewportHeight / 2;
      }
    };
  };

  // Auto-démarrage si le DOM est déjà prêt
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (window.WorldEngine && window.WorldEngine.init) {
      window.WorldEngine.init();
    }
  }
})();
