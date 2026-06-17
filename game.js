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
const BG_BIRD_MIN_Y = 120; // hauteur min de spawn des oiseaux de fond — augmenter pour les repousser vers le bas

canvas.width  = W;
canvas.height = H;

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let bird, pipes, score, state, frame, groundX, coinTick, countdown, intro2Frame, waitFrame, bgBirds;

function init() {
  bird    = { x: 90, y: H / 2 - 90, vy: 0, rot: 0 };
  pipes   = [];
  score   = 0;
  state       = 'intro1'; // intro1 | intro2 | countdown | playing | dead
  frame       = 0;
  groundX     = 0;
  countdown   = 0;
  intro2Frame = 0;
  waitFrame   = 0;
  bgBirds     = [];
  // coinTick n'est pas réinitialisé : la rotation continue sans saut visuel
}

// ─────────────────────────────────────────────
//  SPRITE PLACEHOLDERS
//  → Remplacer chaque fonction par un drawImage()
//    quand les vrais sprites seront prêts.
// ─────────────────────────────────────────────

/** BACKGROUND — ciel dégradé + nuages pixel */
function sprBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  grad.addColorStop(0, '#1a6fa0');
  grad.addColorStop(1, '#5ec8f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_H);

  pixelCloud(50,  70);
  pixelCloud(220, 100);
  pixelCloud(130, 40);
}

function pixelCloud(ox, oy) {
  const S = 7;
  const shape = [
    [0,1],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,1],[3,2],[4,1],
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  shape.forEach(([cx, cy]) => ctx.fillRect(ox + cx * S, oy + cy * S, S, S));
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

function flap() {
  if (state === 'intro2')    return; // ignoré pendant l'intro2
  if (state === 'dead')      { init(); state = 'countdown'; bird.vy = FLAP_VY; return; }
  if (state === 'countdown') return;
  if (state === 'intro1')   { state = 'intro2'; intro2Frame = 0; return; }
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
    state = 'dead';
    return;
  }

  for (const p of pipes) {
    const botY   = p.topH + PIPE_GAP;
    const CAP_EX = 6;
    if (bx + bw > p.x - CAP_EX && bx < p.x + PIPE_W + CAP_EX) {
      if (by < p.topH || by + bh > botY) {
        state = 'dead';
        return;
      }
    }
  }
}

// ─────────────────────────────────────────────
//  RENDU UI
// ─────────────────────────────────────────────

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
    roundRect(W/2 - 110, H/2 - 55, 220, 90, 8, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = '#ffe033';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('FLAPPY WORLD', W/2, H/2 - 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText('Clic  /  Espace  /  Toucher', W/2, H/2 + 14);
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
  }

  if (state === 'dead') {
    roundRect(W/2 - 120, H/2 - 75, 240, 130, 10, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = '#ff4455';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('GAME OVER', W/2, H/2 - 36);

    sprCoinUI(W/2 - 30, H/2 + 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`× ${score}`, W/2 + 4, H/2 + 16);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.fillText('Cliquer pour rejouer', W/2, H/2 + 46);
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
  sprBg();
  pipes.forEach(p => {
    sprPipe(p.x, p.topH, p.topH + PIPE_GAP);
    if (!p.collected) sprCoin(p.x + PIPE_W / 2, p.coinY);
  });
  sprGround(groundX);
  if (state === 'intro1') renderBgBirds();
  sprBird(bird.x, bird.y, bird.rot);
  drawUI();
}

function loop() {
  coinTick++;
  update();
  render();
  requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────
//  INPUTS
// ─────────────────────────────────────────────

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
});

// ─────────────────────────────────────────────
//  LANCEMENT
// ─────────────────────────────────────────────
coinTick = 0;
init();
loop();
