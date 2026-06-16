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

canvas.width  = W;
canvas.height = H;

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let bird, pipes, score, best, state, frame, groundX, coinTick;

function init() {
  bird    = { x: 90, y: H / 2, vy: 0, rot: 0 };
  pipes   = [];
  score   = 0;
  state   = 'waiting'; // waiting | playing | dead
  frame   = 0;
  groundX = 0;
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
function sprBird(x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = '#f5d600';
  ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);

  ctx.fillStyle = '#fff3a0';
  ctx.fillRect(-BIRD_W / 2 + 4, BIRD_H / 2 - 8, BIRD_W - 10, 6);

  ctx.fillStyle = '#d4a800';
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

  const border = [
    [1,0],[2,0],[3,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[4,4],
    [1,5],[2,5],[3,5],
  ];
  const fill = [
    [1,1],[2,1],[3,1],
    [1,2],[2,2],[3,2],
    [1,3],[2,3],[3,3],
    [1,4],[2,4],[3,4],
  ];
  const shine = [[1,1],[2,1],[1,2]];

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(spinX, 1);

  const ox = -8;
  const oy = -9;

  ctx.fillStyle = '#b8860b';
  border.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#f5d600';
  fill.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#fff3a0';
  shine.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));

  ctx.restore();
}


/** COIN UI — même forme que sprCoin (5×6), statique, avec ombre */
function sprCoinUI(x, y) {
  const S  = 3;
  const ox = x - 8;
  const oy = y - 9;

  const border = [
    [1,0],[2,0],[3,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[4,4],
    [1,5],[2,5],[3,5],
  ];
  const fill = [
    [1,1],[2,1],[3,1],
    [1,2],[2,2],[3,2],
    [1,3],[2,3],[3,3],
    [1,4],[2,4],[3,4],
  ];
  const shine  = [[1,1],[2,1],[1,2]];
  const shadow = [[3,3],[2,4],[3,4]];

  ctx.fillStyle = '#b8860b';
  border.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#f5d600';
  fill.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#fff3a0';
  shine.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
  ctx.fillStyle = '#a07020';
  shadow.forEach(([bx, by]) => ctx.fillRect(ox + bx*S, oy + by*S, S, S));
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
  if (state === 'dead') {
    init();
    state = 'playing';
    return;
  }
  if (state === 'waiting') state = 'playing';
  bird.vy = FLAP_VY;
}

function update() {
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
        if (score > (best || 0)) best = score;
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

  if (state === 'waiting') {
    roundRect(W/2 - 110, H/2 - 55, 220, 90, 8, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = '#ffe033';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('FLAPPY SOL', W/2, H/2 - 20);
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

    // lignes pièces alignées à gauche — espace pour 3 chiffres
    ctx.textAlign = 'left';
    sprCoinUI(W/2 - 58, H/2 + 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`× ${score}`, W/2 - 44, H/2 + 10);
    sprCoinUI(W/2 - 58, H/2 + 28);
    ctx.fillStyle = '#ffe033';
    ctx.font = '14px monospace';
    ctx.fillText(`× ${best || 0}  record`, W/2 - 44, H/2 + 33);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.fillText('Cliquer pour rejouer', W/2, H/2 + 52);
  }

  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────
//  BOUCLE PRINCIPALE
// ─────────────────────────────────────────────

function render() {
  sprBg();
  pipes.forEach(p => {
    sprPipe(p.x, p.topH, p.topH + PIPE_GAP);
    if (!p.collected) sprCoin(p.x + PIPE_W / 2, p.coinY);
  });
  sprGround(groundX);
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
best     = 0;
coinTick = 0;
init();
loop();
