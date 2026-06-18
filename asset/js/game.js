// ─────────────────────────────────────────────
//  CANVAS & CONSTANTS
// ─────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const W          = 400;
const H          = 600;
const GROUND_H   = 80;
const GRAVITY    = 0.38;
const FLAP_VY    = -7.2;
const PIPE_SPEED = 2.4;
const PIPE_W     = 54;
const PIPE_GAP   = 130;
const BIRD_W     = 26;
const BIRD_H     = 22;
const PIPE_SPAWN_EVERY = 88; // frames

const INTRO2_T1    = 120;
const INTRO2_CX0   = W * 0.62;
const BG_BIRD_MIN_Y  = 120; // hauteur min de spawn des oiseaux de fond — augmenter pour les repousser vers le bas
const CLOUD_Y_MIN    = 15;  // ← position Y minimale des nuages (haut de l'écran) — diminuer pour les remonter
const CLOUD_Y_MAX    = 110; // ← position Y maximale des nuages (bas autorisé)    — diminuer pour les remonter

const POP_CY  = 205; // centre vertical des pop-ups — remonter pour déplacer vers le haut

const BTN_YES = { x: W/2 - 78, y: POP_CY + 16, w: 70, h: 34 };
const BTN_NO  = { x: W/2 +  8, y: POP_CY + 16, w: 70, h: 34 };

const MENU_BW = 176, MENU_BH = 36, MENU_BX = W/2 - 88;
const BTN_BACK_I1 = { x: W/2 - 26, y: H/2 + 112, w: 52, h: 20 };
const MENU_BTNS = [
  { label: 'Free Run',   action: 'freerun',    x: MENU_BX, y: H/2 - 90, w: MENU_BW, h: MENU_BH },
  { label: 'Historique', action: 'historique', x: MENU_BX, y: H/2 - 42, w: MENU_BW, h: MENU_BH },
  { label: 'Adventure',  action: 'adventure',  x: MENU_BX, y: H/2 +  6, w: MENU_BW, h: MENU_BH },
  { label: 'Shop',       action: 'shop',       x: MENU_BX, y: H/2 + 68, w: MENU_BW, h: MENU_BH, icon: true },
];

canvas.width  = W;
canvas.height = H;

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let bird, pipes, score, best, state, frame, groundX, coinTick, countdown, intro2Frame, waitFrame, bgBirds, deadFrame, deadPage, prevTopScore, intro1Page;
let mouseX = -1, mouseY = -1;
let topScores = [];
let currentScoreRank = -1;
let bgClouds = [];

function init() {
  bird    = { x: 90, y: H / 2 - 90, vy: 0, vx: 0, rot: 0, scale: 1 };
  pipes   = [];
  score   = 0;
  state       = 'intro1'; // intro1 | intro2 | countdown | playing | dead | score
  frame       = 0;
  groundX     = 0;
  countdown   = 0;
  intro2Frame = 0;
  waitFrame   = 0;
  bgBirds      = [];
  deadFrame    = 0;
  prevTopScore = topScores[topScores.length - 1] || 0;
  intro1Page   = 1;
  bgClouds     = Array.from({ length: 7 }, () => ({
    x:     Math.random() * W,
    y:     CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
    s:     4  + Math.floor(Math.random() * 5),
    shape: CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)],
  }));
  // coinTick n'est pas réinitialisé : la rotation continue sans saut visuel
}

// ─────────────────────────────────────────────
//  SPRITE PLACEHOLDERS
//  → Remplacer chaque fonction par un drawImage()
//    quand les vrais sprites seront prêts.
// ─────────────────────────────────────────────

/** BACKGROUND — ciel dégradé + nuages + soleil */
function sprBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  grad.addColorStop(0, '#1a6fa0');
  grad.addColorStop(1, '#5ec8f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_H);

  drawSun();
  for (const c of bgClouds) pixelCloud(c.x, c.y, c.s, c.shape);
}

function drawSun() {
  const sx = 332, sy = 48, sr = 11;
  ctx.fillStyle = '#ffee33';
  for (let dy = -sr; dy <= sr; dy += 2) {
    const hw = Math.sqrt(Math.max(0, sr * sr - dy * dy));
    ctx.fillRect(sx - hw, sy + dy, hw * 2, 2);
  }
  ctx.fillStyle = '#ffcc00';
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.fillRect(sx + Math.cos(a) * (sr + 5) - 2, sy + Math.sin(a) * (sr + 5) - 2, 3, 3);
  }
}

const CLOUD_SHAPES = [
  [[0,1],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,1],[3,2],[4,1]],                                  // large allongé
  [[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[1,3],[2,3]],                       // haut et gonflé
  [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2],[2,2]],                                                     // petit compact
  [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[2,2],[3,2]],                             // long et plat
];

function pixelCloud(ox, oy, s = 7, shape = CLOUD_SHAPES[0]) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  shape.forEach(([cx, cy]) => ctx.fillRect(ox + cx * s, oy + cy * s, s, s));
}

/** GROUND — bande herbe + terre scrollante */
function sprGround(offsetX) {
  ctx.fillStyle = '#c8a04a';
  ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
  ctx.fillStyle = '#5ab55a';
  ctx.fillRect(0, H - GROUND_H, W, 14);
  ctx.fillStyle = '#3d8c3d';
  ctx.fillRect(0, H - GROUND_H + 12, W, 3);
  ctx.fillStyle = '#a07838';
  for (let x = offsetX % 20; x < W; x += 20) {
    ctx.fillRect(x + 2,  H - GROUND_H + 22, 7, 7);
    ctx.fillRect(x + 12, H - GROUND_H + 36, 5, 5);
  }
}

/** BIRD — rectangle pixel avec oeil et bec */
// pal : 0=jaune 1=vert 2=rouge 3=rose 4=bleu 5=violet
const BIRD_PALS = [
  ['#f5d600','#fff3a0','#d4a800'], // 0 jaune
  ['#4caf50','#a5d6a7','#2e7d32'], // 1 vert
  ['#f44336','#ffcdd2','#b71c1c'], // 2 rouge
  ['#e91e63','#f8bbd0','#880e4f'], // 3 rose
  ['#2196f3','#bbdefb','#0d47a1'], // 4 bleu
  ['#9c27b0','#e1bee7','#4a148c'], // 5 violet
  ['#ff8c00','#ffe0b2','#e65100'], // 6 orange
  ['#ff7043','#ffccbc','#bf360c'], // 7 corail
];

const COIN_BORDER = [
  [1,0],[2,0],[3,0],
  [0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[0,4],[4,4],
  [1,5],[2,5],[3,5],
];
const COIN_FILL = [
  [1,1],[2,1],[3,1],
  [1,2],[2,2],[3,2],
  [1,3],[2,3],[3,3],
  [1,4],[2,4],[3,4],
];
const COIN_SHINE  = [[1,1],[2,1],[1,2]];
const COIN_SHADOW = [[3,3],[2,4],[3,4]];

function sprBird(x, y, rot, pal = 0) {
  const [body, light, dark] = BIRD_PALS[pal % BIRD_PALS.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = body;
  ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);

  ctx.fillStyle = light;
  ctx.fillRect(-BIRD_W / 2 + 4, BIRD_H / 2 - 8, BIRD_W - 10, 6);

  ctx.fillStyle = dark;
  ctx.fillRect(-BIRD_W / 2, 0, 10, 7);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, -BIRD_H / 2 + 3, 9, 9);
  ctx.fillStyle = '#111111';
  ctx.fillRect(7, -BIRD_H / 2 + 6, 4, 4);

  ctx.fillStyle = '#ff8800';
  ctx.fillRect(BIRD_W / 2 - 2, -3, 9, 5);
  ctx.fillStyle = '#cc6600';
  ctx.fillRect(BIRD_W / 2 - 2,  1, 9, 2);

  ctx.restore();
}

/** COIN — pièce pixel avec rotation simulée sur l'axe vertical */
function sprCoin(x, y, spinning = true) {
  const S = 3;
  const spinX = spinning ? Math.abs(Math.cos(coinTick * 0.04)) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(spinX, 1);
  const ox = -8, oy = -9;
  ctx.fillStyle = '#b8860b';
  COIN_BORDER.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#f5d600';
  COIN_FILL.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#fff3a0';
  COIN_SHINE.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.restore();
}

/** COIN UI — même forme que sprCoin (5×6), statique, avec ombre */
function sprCoinUI(x, y) {
  sprCoin(x, y, false);
  const S = 3, ox = x - 8, oy = y - 9;
  ctx.fillStyle = '#d4a820';
  COIN_SHADOW.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
}

/** PIPE — tuyau vert avec chapeau et ombres */
function sprPipe(x, topH, botY) {
  const CAP_H  = 22;
  const CAP_EX = 6;

  // Tuyau haut
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(x, 0, PIPE_W, topH - CAP_H);
  ctx.fillStyle = '#43a047';
  ctx.fillRect(x - CAP_EX, topH - CAP_H, PIPE_W + CAP_EX * 2, CAP_H);
  ctx.fillStyle = '#81c784';
  ctx.fillRect(x + 4,            0,           6, topH - CAP_H);
  ctx.fillRect(x - CAP_EX + 3,  topH - CAP_H, 5, CAP_H);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(x + PIPE_W - 7,          0,           4, topH - CAP_H);
  ctx.fillRect(x + PIPE_W + CAP_EX - 6, topH - CAP_H, 4, CAP_H);

  // Tuyau bas
  const botH = H - GROUND_H - botY;
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(x, botY + CAP_H, PIPE_W, botH - CAP_H);
  ctx.fillStyle = '#43a047';
  ctx.fillRect(x - CAP_EX, botY, PIPE_W + CAP_EX * 2, CAP_H);
  ctx.fillStyle = '#81c784';
  ctx.fillRect(x + 4,           botY + CAP_H, 6, botH - CAP_H);
  ctx.fillRect(x - CAP_EX + 3,  botY,          5, CAP_H);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(x + PIPE_W - 7,          botY + CAP_H, 4, botH - CAP_H);
  ctx.fillRect(x + PIPE_W + CAP_EX - 6, botY,          4, CAP_H);
}

// ─────────────────────────────────────────────
//  LOGIQUE
// ─────────────────────────────────────────────

function spawnPipe() {
  const minH = 55;
  const maxH = H - GROUND_H - PIPE_GAP - minH;
  const topH = Math.random() * (maxH - minH) + minH | 0;
  const coinY = topH + PIPE_GAP / 2;
  pipes.push({ x: W + 10, topH, coinY, collected: false });
}

function addScore(s) {
  if (s === 0) { currentScoreRank = -1; return; }
  topScores.push(s);
  topScores.sort((a, b) => b - a);
  if (topScores.length > 10) topScores.length = 10;
  currentScoreRank = topScores.indexOf(s);
  localStorage.setItem('fw_top', JSON.stringify(topScores));
}

function die() {
  addScore(score);
  state     = 'dead';
  deadFrame = 0;
  deadPage  = 1;
}

function flap() {
  if (state === 'intro2')    return;
  if (state === 'dead')      return;
  if (state === 'score') {
    if (deadFrame < 30) return;
    if (deadPage === 1) { deadPage = 2; deadFrame = 0; return; }
    if (deadPage === 2) { deadPage = 3; deadFrame = 0; return; }
    return; // page 3 : géré par les boutons Yes/No
  }
  if (state === 'countdown') return;
  if (state === 'intro1') {
    if (intro1Page === 1) { intro1Page = 2; return; }
    if (intro1Page === 3) { intro1Page = 2; return; }
    return; // page 2 : géré par handlePageBtn
  }
  bird.vy = FLAP_VY;
}

function update() {
  if (state === 'intro1') {
    waitFrame++;
    groundX  = (groundX - PIPE_SPEED) % 20;
    bird.x = W / 2;
    if (waitFrame % 37 === 1) bird.vy = -(GRAVITY * 19);
    bird.vy += GRAVITY;
    bird.y  += bird.vy;
    bird.y   = Math.max(BIRD_H / 2 + 8, Math.min(bird.y, H - GROUND_H - BIRD_H / 2 - 8));
    bird.rot = Math.min(Math.max(bird.vy * 0.055, -0.45), 1.3);

    if (Math.random() < 0.012) {
      const scale = 0.3 + Math.random() * 1.1;
      bgBirds.push({
        x: -60,
        y: BG_BIRD_MIN_Y + Math.random() * (H - GROUND_H - BG_BIRD_MIN_Y - 30),
        vy: FLAP_VY,
        flapOffset: Math.floor(Math.random() * 37),
        scale,
        speed: scale * 2.0 + 0.6,
        pal: Math.random() < 0.55 ? 0 : [1, 4, 6, 7, 3][Math.floor(Math.random() * 5)],
      });
      bgBirds.sort((a, b) => a.scale - b.scale);
    }
    bgBirds = bgBirds.filter(b => b.x < W + 70);
    bgBirds.forEach(b => {
      b.x  += b.speed;
      b.vy += GRAVITY;
      b.y  += b.vy;
      if ((waitFrame + b.flapOffset) % 37 === 0) b.vy = FLAP_VY;
    });
    return;
  }

  if (state === 'intro2') {
    intro2Frame++;
    groundX = (groundX - PIPE_SPEED) % 20;

    const T2       = 40;  // frames où le bird suit l'envol avant de décrocher
    const t        = intro2Frame;
    const bxDetach = INTRO2_CX0 - 22 + T2 * 1.5; // x réel au moment exact du décrochage

    if (t <= INTRO2_T1 + T2) {
      // bird suit la formation puis le début de l'envol
      const p   = Math.min(t, INTRO2_T1) / INTRO2_T1;
      const ep  = p < 0.5 ? 2*p*p : -1 + (4 - 2*p)*p;
      const lcx = -50 + ep * (W * 0.62 + 50);
      const lcy = H * 0.42 + Math.sin(t * 0.09) * 22;
      const swoop = t > INTRO2_T1 ? ((t - INTRO2_T1) / 85) ** 2 * 430 : 0;
      bird.x   = t <= INTRO2_T1 ? lcx - 22 : INTRO2_CX0 - 22 + (t - INTRO2_T1) * 1.5;
      bird.y   = lcy + Math.sin(t * 0.09 + 1.5) * 14 - swoop;
      bird.vy  = 0;
      bird.rot = t > INTRO2_T1 ? -0.15 - ((t - INTRO2_T1) / T2) * 0.4 : -0.15;
    } else {
      // décrochage : drift de bxDetach vers x=90, auto-flap
      const elapsed = t - INTRO2_T1 - T2;
      bird.x = bxDetach + (90 - bxDetach) * Math.min(elapsed / 120, 1);
      if (elapsed % 37 === 30) bird.vy = FLAP_VY;
      bird.vy += GRAVITY;
      bird.y   = Math.max(BIRD_H / 2 + 8, Math.min(bird.y + bird.vy, H - GROUND_H - BIRD_H / 2 - 8));
      bird.rot = Math.min(Math.max(bird.vy * 0.055, -0.45), 1.3);
    }

    if (t >= 280) { bird.x = 90; bird.vy = FLAP_VY; state = 'countdown'; countdown = 0; }
    return;
  }

  if (state === 'countdown') {
    countdown++;
    if (countdown % 37 === 0) bird.vy = FLAP_VY;
    bird.vy += GRAVITY;
    bird.y  += bird.vy;
    bird.y   = Math.max(BIRD_H / 2 + 8, Math.min(bird.y, H - GROUND_H - BIRD_H / 2 - 8));
    bird.rot = Math.min(Math.max(bird.vy * 0.055, -0.45), 1.3);
    groundX  = (groundX - PIPE_SPEED) % 20;
    if (countdown >= 6 * 40) { state = 'playing'; frame = 0; }
    return;
  }

  if (state === 'dead') {
    deadFrame++;
    if (deadFrame >= 21) {
      if (deadFrame === 21) { bird.vy = -(3 + Math.random() * 13); bird.vx = (Math.random() - 0.5) * 14; }
      bird.vy    += GRAVITY;
      bird.y     += bird.vy;
      bird.x     += bird.vx;
      bird.scale  = Math.min(2.8, 1 + (deadFrame - 20) * 0.045);
      bird.rot    = Math.min(Math.max(bird.vy * 0.055, -0.45), 1.3);
      if (bird.y > H + 80) { state = 'score'; deadFrame = 0; }
    }
    return;
  }
  if (state === 'score') { deadFrame++; return; }
  if (state !== 'playing') return;

  frame++;

  bird.vy  += GRAVITY;
  bird.y   += bird.vy;
  bird.rot  = Math.min(Math.max(bird.vy * 0.055, -0.45), 1.3);

  groundX = (groundX - PIPE_SPEED) % 20;

  if (frame % PIPE_SPAWN_EVERY === 0) spawnPipe();

  for (const p of pipes) {
    p.x -= PIPE_SPEED;

    // Collecte de pièce
    if (!p.collected) {
      const coinX = p.x + PIPE_W / 2;
      const dx = bird.x - coinX;
      const dy = bird.y - p.coinY;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
        p.collected = true;
        score++;
        if (score > best) { best = score; localStorage.setItem('fw_best', best); }
      }
    }
  }
  pipes = pipes.filter(p => p.x + PIPE_W + 20 > 0);

  // Collisions
  const margin = 5;
  const bx = bird.x - BIRD_W / 2 + margin;
  const by = bird.y - BIRD_H / 2 + margin;
  const bw = BIRD_W - margin * 2;
  const bh = BIRD_H - margin * 2;

  if (bird.y - BIRD_H / 2 < 0 || bird.y + BIRD_H / 2 >= H - GROUND_H) {
    die(); return;
  }

  for (const p of pipes) {
    const botY   = p.topH + PIPE_GAP;
    const CAP_EX = 6;
    if (bx + bw > p.x - CAP_EX && bx < p.x + PIPE_W + CAP_EX) {
      if (by < p.topH || by + bh > botY) {
        die(); return;
      }
    }
  }
}

// ─────────────────────────────────────────────
//  RENDU UI
// ─────────────────────────────────────────────

function hitBtn(cx, cy, b) {
  return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
}

function drawLock(cx, cy, color) {
  const S = 2;
  // Corps (fond)
  ctx.fillStyle = color;
  ctx.fillRect(cx - 3*S, cy - S,   6*S, 5*S);
  // Ombre bas + droite
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - 3*S, cy + 3*S, 6*S, S  );
  ctx.fillRect(cx + 2*S, cy - S,   S,   4*S);
  // Reflet haut + gauche
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - 3*S, cy - S,   6*S, S  );
  ctx.fillRect(cx - 3*S, cy,       S,   4*S);
  // Arceau (par-dessus le corps)
  ctx.fillStyle = color;
  ctx.fillRect(cx - 2*S, cy - 5*S, S,   4*S); // jambe gauche
  ctx.fillRect(cx +   S, cy - 5*S, S,   4*S); // jambe droite
  ctx.fillRect(cx - 2*S, cy - 5*S, 3*S, S  ); // barre haute
  // Trou de serrure
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - S,   cy + S,   2*S, 2*S); // trou
  ctx.fillRect(cx,       cy + 3*S, S,   S  ); // fente
}

function drawCoinStack(cx, cy) {
  const ox = cx - 8;
  // Couches inférieures (peintre : dessinées avant la pièce du dessus)
  ctx.fillStyle = '#4a3200';
  ctx.fillRect(ox, cy + 9, 15, 2);  // ombre basse
  ctx.fillStyle = '#7a5a0a';
  ctx.fillRect(ox, cy + 6, 15, 3);  // flanc pièce 3
  ctx.fillStyle = '#a07c14';
  ctx.fillRect(ox, cy + 4, 15, 2);  // dessus pièce 3
  ctx.fillStyle = '#3a2600';
  ctx.fillRect(ox, cy + 6, 15, 1);  // séparateur sombre
  ctx.fillStyle = '#8a6810';
  ctx.fillRect(ox, cy + 3, 15, 3);  // flanc pièce 2
  // Pièce principale (recouvre le haut des couches)
  sprCoinUI(cx, cy - 5);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,         x + r, y,         r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(x, y, w, h, r, color, lw) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,         x + r, y,         r);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function drawUI() {
  ctx.textAlign = 'center';

  if (state === 'intro2') {
    // [offsetX, offsetY, palette] — 0=jaune 1=vert 4=bleu 6=orange 7=corail
    const flock = [
      [   0,   0, 1],
      [ -30,  16, 0],
      [ -55,  -7, 0],
      [ -82,  22, 0],
      [ -48, -22, 7],
      [ -75,  38, 4],
      [-108,   6, 0],
      [ -96, -18, 0],
      [-132,  28, 0],
      [-158,   4, 6],
    ];
    const t   = intro2Frame;
    const cy0 = H * 0.42 + Math.sin(INTRO2_T1 * 0.09) * 22;

    let cx, cy, rot;
    if (t <= INTRO2_T1) {
      const p  = t / INTRO2_T1;
      const ep = p < 0.5 ? 2*p*p : -1 + (4 - 2*p)*p;   // ease-in-out
      cx  = -50 + ep * (W * 0.62 + 50);
      cy  = H * 0.42 + Math.sin(t * 0.09) * 22;
      rot = -0.15;
    } else {
      const p = (t - INTRO2_T1) / 85;
      cx  = INTRO2_CX0 + p * 130;                        // continue vers la droite
      cy  = cy0 - p * p * 430;                           // monte en accélérant
      rot = -0.15 - p * 0.75;
    }

    flock.forEach(([ox, oy, pal], i) => {
      const bx = cx + ox;
      const by = cy + oy + Math.sin(t * 0.09 + i * 0.9) * 14;
      if (bx > -30 && bx < W + 30 && by > -30) sprBird(bx, by, rot, pal);
    });

    if (t > 150) {
      const a = Math.min((t - 150) / 45, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffe033';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('Be ready', W / 2, H / 2 - 14);
      ctx.globalAlpha = 1;
    }
  }

  if (state === 'countdown') {
    const idx   = Math.min(Math.floor(countdown / 40), 5);
    const label = idx < 5 ? String(5 - idx) : 'Go !';
    ctx.font        = 'bold 72px monospace';
    ctx.lineWidth   = 7;
    ctx.strokeStyle = '#00000099';
    ctx.strokeText(label, W / 2, H / 2 + 24);
    ctx.fillStyle   = idx === 5 ? '#ffe033' : '#ffffff';
    ctx.fillText(label, W / 2, H / 2 + 24);
  }

  if (state === 'intro1') {
    if (intro1Page === 1) {
      roundRect(W/2 - 110, H/2 - 55, 220, 90, 8, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = '#ffe033';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('FLAPPY WORLD', W/2, H/2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.fillText('Clic  /  Espace  /  Toucher', W/2, H/2 + 14);

    } else if (intro1Page === 2) {
      roundRect(W/2 - 100, H/2 - 132, 200, 266, 10, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = '#ffe033';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('FLAPPY WORLD', W/2, H/2 - 108);
      for (const btn of MENU_BTNS) {
        const disabled = btn.action === 'adventure';
        const hov = !disabled && hitBtn(mouseX, mouseY, btn);
        if (btn.icon) {
          roundRect(btn.x, btn.y, btn.w, btn.h, 7, hov ? 'rgba(255,224,51,0.6)' : 'rgba(255,224,51,0.38)');
          if (hov) {
            ctx.save();
            ctx.shadowColor = '#ffe033';
            ctx.shadowBlur  = 16;
            strokeRoundRect(btn.x, btn.y, btn.w, btn.h, 7, '#ffe033', 1.5);
            ctx.restore();
          }
        } else {
          roundRect(btn.x, btn.y, btn.w, btn.h, 7,
            disabled ? 'rgba(255,255,255,0.06)' : hov ? 'rgba(255,224,51,0.18)' : 'rgba(255,255,255,0.07)');
        }
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = btn.icon ? '#ffffff' : disabled ? '#888888' : hov ? '#ffe033' : '#ffffff';
        ctx.fillText(btn.label, W/2, btn.y + btn.h / 2 + 5);
      }
      const backHov = hitBtn(mouseX, mouseY, BTN_BACK_I1);
      ctx.fillStyle = backHov ? '#ffe033' : '#aaaaaa';
      ctx.font = '12px monospace';
      ctx.fillText('back', W/2, BTN_BACK_I1.y + 13);

    } else {
      roundRect(W/2 - 100, H/2 - 106, 200, 216, 10, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = '#ffe033';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('TOP 10', W/2, H/2 - 88);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W/2 - 82, H/2 - 75);
      ctx.lineTo(W/2 + 82, H/2 - 75);
      ctx.stroke();
      ctx.font = '13px monospace';
      for (let i = 0; i < 10; i++) {
        const ty  = H/2 - 60 + i * 16;
        const val = topScores[i] !== undefined ? topScores[i] : '-';
        ctx.fillStyle = topScores[i] !== undefined ? '#cccccc' : '#444444';
        ctx.fillText(`${String(i + 1).padStart(2)}.   ${String(val).padStart(3)}`, W/2, ty);
      }
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '12px monospace';
      ctx.fillText('Click to go back', W/2, H/2 + 98);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText('v0.09.1', W/2, H - 14);
  }

  if (state === 'playing') {
    // pièce à gauche, score centré à droite — espace pour 3 chiffres
    sprCoinUI(W/2 - 36, 48);
    ctx.font = 'bold 36px monospace';
    ctx.strokeStyle = '#00000077';
    ctx.lineWidth = 4;
    ctx.strokeText(score, W/2 + 12, 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(score, W/2 + 12, 62);
    if (score > 0 && score > prevTopScore) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#ffe033';
      ctx.fillText('record', W/2 + 12, 76); // 14px sous le score (y=62)
    }
  }

  if (state === 'score') {
    if (deadPage === 1) {
      roundRect(W/2 - 120, POP_CY - 70, 240, 140, 10, 'rgba(0,0,0,0.55)');

      ctx.fillStyle = '#ff4455';
      ctx.font      = 'bold 24px monospace';
      ctx.fillText('GAME OVER', W/2, POP_CY - 32);

      sprCoinUI(W/2 - 32, POP_CY + 14);
      ctx.fillStyle = '#ffffff';
      ctx.font      = '16px monospace';
      ctx.fillText(`× ${score}`, W/2 + 6, POP_CY + 20);
      if (score > 0 && score > prevTopScore) {
        const sw    = ctx.measureText(`× ${score}`).width;
        const lerpT = (Math.sin(coinTick * 0.05) + 1) / 2;
        ctx.font      = 'bold 13px monospace';
        ctx.fillStyle = `rgb(255,${Math.round(160 + lerpT * 64)},${Math.round(lerpT * 51)})`;
        ctx.textAlign = 'left';
        ctx.fillText('record', W/2 + 6 + sw / 2 + 8, POP_CY + 20);
        ctx.textAlign = 'center';
      }

      ctx.fillStyle = '#aaaaaa';
      ctx.font      = '12px monospace';
      ctx.fillText('Click to continue', W/2, POP_CY + 58);

    } else if (deadPage === 2) {
      roundRect(W/2 - 100, POP_CY - 111, 200, 238, 10, 'rgba(0,0,0,0.55)');

      ctx.font        = 'bold 15px monospace';
      ctx.lineWidth   = 3;
      ctx.strokeStyle = '#8a6000';
      ctx.strokeText('TOP 10', W/2, POP_CY - 90);
      ctx.fillStyle   = '#ffe033';
      ctx.fillText('TOP 10', W/2, POP_CY - 90);

      ctx.font = '13px monospace';
      for (let i = 0; i < 10; i++) {
        const ty  = POP_CY - 65 + i * 16;
        const val = topScores[i] !== undefined ? topScores[i] : '-';
        if (i === currentScoreRank) {
          const lerpT = (Math.sin(coinTick * 0.05) + 1) / 2;
          ctx.fillStyle = `rgb(255,${Math.round(160 + lerpT * 64)},${Math.round(lerpT * 51)})`;
          const entry = `${String(i + 1).padStart(2)}.   ${String(val).padStart(3)}`;
          ctx.fillText(entry, W/2, ty);
          const entryW = ctx.measureText(entry).width;
          ctx.font      = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('new', W/2 + entryW / 2 + 6, ty);
          ctx.textAlign = 'center';
          ctx.font      = '13px monospace';
        } else {
          ctx.fillStyle = topScores[i] !== undefined ? '#cccccc' : '#333344';
          ctx.fillText(`${String(i + 1).padStart(2)}.   ${String(val).padStart(3)}`, W/2, ty);
        }
      }

      ctx.fillStyle = '#aaaaaa';
      ctx.font      = '12px monospace';
      ctx.fillText('Click to continue', W/2, POP_CY + 112);

    } else {
      roundRect(W/2 - 90, POP_CY - 50, 180, 106, 10, 'rgba(0,0,0,0.55)');

      ctx.fillStyle = '#ffffff';
      ctx.font      = 'bold 17px monospace';
      ctx.fillText('Try Again ?', W/2, POP_CY - 22);

      const yesHov = hitBtn(mouseX, mouseY, BTN_YES);
      const noHov  = hitBtn(mouseX, mouseY, BTN_NO);

      roundRect(BTN_YES.x, BTN_YES.y, BTN_YES.w, BTN_YES.h, 7, yesHov ? '#4a3e00' : '#2e2500');
      ctx.fillStyle = yesHov ? '#ffe033' : '#b89000';
      ctx.font      = 'bold 15px monospace';
      ctx.fillText('Yes', BTN_YES.x + BTN_YES.w / 2, BTN_YES.y + 22);

      roundRect(BTN_NO.x, BTN_NO.y, BTN_NO.w, BTN_NO.h, 7, noHov ? '#2e2e3a' : '#1a1a22');
      ctx.fillStyle = noHov ? '#ccccdd' : '#666677';
      ctx.font      = 'bold 15px monospace';
      ctx.fillText('No',  BTN_NO.x  + BTN_NO.w  / 2, BTN_NO.y  + 22);
    }
  }

  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────
//  BOUCLE PRINCIPALE
// ─────────────────────────────────────────────

function renderBgBirds() {
  bgBirds.forEach(b => {
    const rot = Math.min(Math.max(b.vy * 0.055, -0.45), 1.3);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale, b.scale);
    sprBird(0, 0, rot, b.pal);
    ctx.restore();
  });
}

function render() {
  ctx.save();
  if (state === 'dead' && deadFrame > 0 && deadFrame <= 10) {
    const mag = (11 - deadFrame) * 1.1;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  sprBg();
  pipes.forEach(p => {
    sprPipe(p.x, p.topH, p.topH + PIPE_GAP);
    if (!p.collected) sprCoin(p.x + PIPE_W / 2, p.coinY);
  });
  sprGround(groundX);
  if (state === 'intro1') renderBgBirds();
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.scale(bird.scale, bird.scale);
  sprBird(0, 0, bird.rot);
  ctx.restore();
  drawUI();
  ctx.restore();
}

function loop() {
  coinTick++;
  if (state !== 'dead' && state !== 'score') {
    for (const c of bgClouds) {
      c.x -= 0.18;
      if (c.x < -80) {
        c.x     = W + 20 + Math.random() * 100;
        c.y     = CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN);
        c.s     = 4  + Math.floor(Math.random() * 5);
        c.shape = CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)];
      }
    }
  }
  update();
  render();
  requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────
//  INPUTS
// ─────────────────────────────────────────────

function canvasPos(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return [(clientX - r.left) * W / r.width, (clientY - r.top) * H / r.height];
}

function handlePageBtn(cx, cy) {
  if (state === 'intro1' && intro1Page === 2) {
    if (hitBtn(cx, cy, BTN_BACK_I1)) { intro1Page = 1; return true; }
    for (const btn of MENU_BTNS) {
      if (hitBtn(cx, cy, btn)) {
        if (btn.action === 'freerun')    { state = 'intro2'; intro2Frame = 0; }
        if (btn.action === 'historique') { intro1Page = 3; }
        return true;
      }
    }
    return true;
  }
  if (state === 'intro1' && intro1Page === 3) { intro1Page = 2; return true; }
  if (state !== 'score' || deadPage !== 3 || deadFrame < 30) return false;
  if (hitBtn(cx, cy, BTN_YES)) { init(); state = 'countdown'; bird.vy = FLAP_VY; return true; }
  if (hitBtn(cx, cy, BTN_NO))  { init(); return true; }
  return true;
}

canvas.addEventListener('mousemove',  e => { [mouseX, mouseY] = canvasPos(e.clientX, e.clientY); });
canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

canvas.addEventListener('click', e => {
  const [cx, cy] = canvasPos(e.clientX, e.clientY);
  if (!handlePageBtn(cx, cy)) flap();
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  const [cx, cy] = canvasPos(t.clientX, t.clientY);
  if (!handlePageBtn(cx, cy)) flap();
}, { passive: false });

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === 'score' && deadPage === 3 && deadFrame >= 30) {
      init(); state = 'countdown'; bird.vy = FLAP_VY; return;
    }
    flap();
  }
});

// ─────────────────────────────────────────────
//  LANCEMENT
// ─────────────────────────────────────────────
const SAVE_VER = '4';
if (localStorage.getItem('fw_ver') !== SAVE_VER) {
  localStorage.removeItem('fw_top');
  localStorage.removeItem('fw_best');
  localStorage.setItem('fw_ver', SAVE_VER);
}
topScores = JSON.parse(localStorage.getItem('fw_top')) ?? [55, 50, 45, 40, 35, 30, 25, 20, 15, 10];
best      = parseInt(localStorage.getItem('fw_best') || '0');
coinTick  = 0;

(function setFavicon() {
  const fc   = document.createElement('canvas');
  fc.width   = fc.height = 32;
  const f    = fc.getContext('2d');
  const s    = 0.85, cx = 14, cy = 16; // scale + centre (décalé à gauche pour équilibrer le bec)

  f.save();
  f.translate(cx, cy);
  f.rotate(-0.55);
  f.scale(s, s);

  f.fillStyle = '#f5d600';
  f.fillRect(-BIRD_W/2, -BIRD_H/2, BIRD_W, BIRD_H);
  f.fillStyle = '#fff3a0';
  f.fillRect(-BIRD_W/2 + 4, BIRD_H/2 - 8, BIRD_W - 10, 6);
  f.fillStyle = '#d4a800';
  f.fillRect(-BIRD_W/2, 0, 10, 7);
  f.fillStyle = '#ffffff';
  f.fillRect(3, -BIRD_H/2 + 3, 9, 9);
  f.fillStyle = '#111111';
  f.fillRect(7, -BIRD_H/2 + 6, 4, 4);
  f.fillStyle = '#ff8800';
  f.fillRect(BIRD_W/2 - 2, -3, 9, 5);
  f.fillStyle = '#cc6600';
  f.fillRect(BIRD_W/2 - 2,  1, 9, 2);

  f.restore();

  const link = document.createElement('link');
  link.rel   = 'icon';
  link.type  = 'image/png';
  link.href  = fc.toDataURL();
  document.head.appendChild(link);
})();

init();
loop();
