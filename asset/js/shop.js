// ─────────────────────────────────────────────
//  SHOP ITEMS
// ─────────────────────────────────────────────
const SHOP_ITEMS = [
  { id: 'skin_vert',     name: 'Vert',     price: 10,  type: 'skin',  pal: 1,           lock: false, buy: false, equip: false },
  { id: 'skin_rouge',    name: 'Rouge',    price: 15,  type: 'skin',  pal: 2,           lock: false, buy: false, equip: false },
  { id: 'skin_rose',     name: 'Rose',     price: 15,  type: 'skin',  pal: 3,           lock: false, buy: false, equip: false },
  { id: 'skin_bleu',     name: 'Bleu',     price: 20,  type: 'skin',  pal: 4,           lock: false, buy: false, equip: false },
  { id: 'skin_violet',   name: 'Violet',   price: 20,  type: 'skin',  pal: 5,           lock: false, buy: false, equip: false },
  { id: 'skin_orange',   name: 'Orange',   price: 25,  type: 'skin',  pal: 6,           lock: false, buy: false, equip: false },
  { id: 'skin_corail',   name: 'Corail',   price: 25,  type: 'skin',  pal: 7,           lock: false, buy: false, equip: false },
  { id: 'trail_rainbow', name: 'Arc-ciel', price: 400, type: 'trail', trail: 'rainbow', lock: false, buy: false, equip: false },
  { id: 'trail_cloud',   name: 'Nuage',    price: 30,  type: 'trail', trail: 'cloud',   lock: false, buy: false, equip: false },
  { id: 'jump_ring',     name: 'Anneau',   price: 35,  type: 'jump',  jump:  'ring',    lock: false, buy: false, equip: false },
];

// ─────────────────────────────────────────────
//  ÉTAT ACTIF DU JOUEUR
// ─────────────────────────────────────────────
let playerPal   = 0;    // palette équipée (0 = jaune défaut)
let activeTrail = null; // 'rainbow' | 'cloud' | null
let activeJump  = null; // 'ring' | null

// ─────────────────────────────────────────────
//  PREVIEW (essai avant achat)
// ─────────────────────────────────────────────
let previewedItem = null;

function setPreview(item) {
  previewedItem = item;
  trailParticles.length = 0;
  jumpEffects.length    = 0;
}

function clearPreview() {
  previewedItem = null;
  trailParticles.length = 0;
  jumpEffects.length    = 0;
}

function getPreviewPal() {
  if (previewedItem && previewedItem.type === 'skin') return previewedItem.pal;
  return playerPal;
}

function _activeTrail() {
  if (previewedItem && previewedItem.type === 'trail') return previewedItem.trail;
  return activeTrail;
}

function _activeJump() {
  if (previewedItem && previewedItem.type === 'jump') return previewedItem.jump;
  return activeJump;
}

// ─────────────────────────────────────────────
//  TRAIL SYSTEM
// ─────────────────────────────────────────────
const TRAIL_PX    = 3; // ← taille des carrés (pixels)
const TRAIL_EVERY = 2; // ← créer 1 carré toutes les N frames

const trailParticles  = [];
let _trailFrame      = 0;
let _trailColorIndex = 0;

function trailTick(bx, by) {
  if (!_activeTrail()) { _trailFrame = 0; return; }

  // déplace tous les carrés vers la gauche uniquement
  for (const p of trailParticles) { p.x -= 2; }

  // crée 1 carré toutes les 2 frames
  _trailFrame++;
  if (_trailFrame % TRAIL_EVERY === 0) {
    if (trailParticles.length >= 20) trailParticles.shift();
    const color = _activeTrail() === 'rainbow'
      ? `hsl(${(_trailColorIndex * 36) % 360},100%,65%)`
      : 'rgba(255,255,255,0.85)';
    trailParticles.push({ x: bx, y: by, color });
    _trailColorIndex++;
  }
}

function trailDraw() {
  for (const p of trailParticles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x) - TRAIL_PX / 2, Math.round(p.y) - TRAIL_PX / 2, TRAIL_PX, TRAIL_PX);
  }
}

// ─────────────────────────────────────────────
//  JUMP SYSTEM
// ─────────────────────────────────────────────
const jumpEffects = [];

function jumpSpawn(bx, by) {
  if (!_activeJump()) return;
  jumpEffects.push({ x: bx, y: by + 6, jump: _activeJump(), frame: 0 });
}

function jumpTick() {
  for (let i = jumpEffects.length - 1; i >= 0; i--) {
    jumpEffects[i].x -= 2;
    jumpEffects[i].frame++;
    if (jumpEffects[i].frame > 18) jumpEffects.splice(i, 1);
  }
}

function jumpDraw() {
  for (const e of jumpEffects) {
    const t = e.frame / 18;
    const a = 1 - t;
    const r = t * 14;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  ÉQUIPEMENT
// ─────────────────────────────────────────────
function equipItem(item) {
  SHOP_ITEMS.forEach(i => { if (i.type === item.type && i.equip) i.equip = false; });
  item.equip = true;
  if (item.type === 'skin')  playerPal   = item.pal;
  if (item.type === 'trail') activeTrail = item.trail;
  if (item.type === 'jump')  activeJump  = item.jump;
}

function unequipItem(item) {
  item.equip = false;
  if (item.type === 'skin')  playerPal   = 0;
  if (item.type === 'trail') activeTrail = null;
  if (item.type === 'jump')  activeJump  = null;
}

// ─────────────────────────────────────────────
//  SHOP CARD — état achat
// ─────────────────────────────────────────────
function drawItemBuyState(item, cx, cy, cardH) {
  if (item.equip) {
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#44dd66';
    ctx.textAlign = 'left';
    ctx.fillText('EQUIP', cx + 6, cy + 11);
    ctx.textAlign = 'center';
  }
  if (item.buy) {
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#44dd66';
    ctx.textAlign = 'left';
    ctx.fillText('✓', cx + 10, cy + cardH - 8);
    ctx.textAlign = 'center';
  } else {
    sprCoinUI(cx + 16, cy + cardH - 15);
    ctx.font = '10px monospace'; ctx.fillStyle = '#ffe033'; ctx.textAlign = 'left';
    ctx.fillText(item.price, cx + 28, cy + cardH - 11);
    ctx.textAlign = 'center';
  }
}
