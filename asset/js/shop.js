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
  { id: 'skin_multicolor', name: 'Multicolor', price: 80, type: 'skin', pal: 99,          lock: false, buy: false, equip: false },
  { id: 'trick_toupie',  name: 'Toupie',   price: 60,  type: 'trick',   trick: 'toupie',  lock: false, buy: false, equip: false },
  { id: 'trail_rainbow', name: 'Arc-ciel', price: 400, type: 'trail',   trail: 'rainbow', lock: false, buy: false, equip: false },
  { id: 'trail_cloud',   name: 'Nuage',    price: 30,  type: 'trail',   trail: 'cloud',   lock: false, buy: false, equip: false },
  { id: 'trick_firework', name: 'Firework', price: 80,  type: 'jump',    jump:  'firework', lock: false, buy: false, equip: false },
  { id: 'jump_ring',     name: 'Anneau',   price: 35,  type: 'jump',    jump:  'ring',    lock: false, buy: false, equip: false },
  { id: 'skin_phosphor', name: 'Phosphor',  price: 35,  type: 'skin',  pal: 98,          lock: false, buy: false, equip: false },
  { id: 'trick_looping',  name: 'pirouette',  price: 100, type: 'trick',   trick: 'looping',  lock: false, buy: false, equip: false },
  { id: 'trail_miasma',  name: 'Miasma',   price: 45,  type: 'trail',   trail: 'miasma',  lock: false, buy: false, equip: false },
  { id: 'sndJump_pet',    name: 'Pet',      price: 20,  type: 'sndJump', snd:   'jumpPet',   lock: false, buy: false, equip: false },
  { id: 'jump_fart',    name: 'Fart',     price: 30,  type: 'jump',    jump:  'fart',    lock: false, buy: false, equip: false },
];

// ─────────────────────────────────────────────
//  ÉTAT ACTIF DU JOUEUR
// ─────────────────────────────────────────────
let playerPal        = 0;  // palette équipée (0=jaune, 98=phosphor, 99=multicolor)
let _multicolorPal     = 1; // palette 'from' du multicolor
let _multicolorNextPal = 1; // palette 'to' du multicolor
let _multicolorBlend   = 1; // 0→1 lerp entre from et to
let _multicolorIdle    = 0; // compteur auto-cycle entre deux transitions
let _phosphorPhase     = 0; // phase d'oscillation phosphor (radians)
let activeTrail  = null; // 'rainbow' | 'cloud' | null
let activeJump   = null; // 'ring' | 'fart' | null
let activeJumpSnd = null; // 'jumpPet' | null
let activeTrick  = null; // 'firework' | 'looping' | null

// ─────────────────────────────────────────────
//  PREVIEW (essai avant achat)
// ─────────────────────────────────────────────
let previewedItem = null;

function setPreview(item) {
  previewedItem = item;
  trailParticles.length = 0;
  jumpEffects.length    = 0;
  trickEffects.length   = 0;
  loopingFrame          = 0;
  toupieFrame           = 0;
}

function clearPreview() {
  previewedItem = null;
  trailParticles.length = 0;
  jumpEffects.length    = 0;
  trickEffects.length   = 0;
  loopingFrame          = 0;
  toupieFrame           = 0;
}

function getPreviewPal() {
  const pal = (previewedItem && previewedItem.type === 'skin') ? previewedItem.pal : playerPal;
  return pal === 99 ? _multicolorPal : pal;
}

function advanceMulticolor() {
  if (playerPal !== 99 && !(previewedItem && previewedItem.pal === 99)) return;
  if (_multicolorBlend < 1) _multicolorPal = _multicolorNextPal; // snap si déjà en transition
  _multicolorNextPal = (_multicolorPal % 7) + 1;
  _multicolorBlend   = 0;
}

function _lerpHex(a, b, t) {
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  const h = v => Math.round(v).toString(16).padStart(2,'0');
  return `#${h(ar+(br-ar)*t)}${h(ag+(bg-ag)*t)}${h(ab+(bb-ab)*t)}`;
}

function getPhosphorColors() {
  const t = (Math.sin(_phosphorPhase) + 1) / 2;
  return [
    `hsl(128,95%,${28+Math.round(t*30)}%)`,  // body  : 28%→58%
    `hsl(128,85%,${44+Math.round(t*24)}%)`,  // light : 44%→68%
    `hsl(128,100%,${14+Math.round(t*18)}%)`, // dark  : 14%→32%
  ];
}

function getMulticolorBlendColors() {
  if (_multicolorBlend >= 1) return [...BIRD_PALS[_multicolorPal]];
  return BIRD_PALS[_multicolorPal].map((c, i) => _lerpHex(c, BIRD_PALS[_multicolorNextPal][i], _multicolorBlend));
}

function getSkinColors() {
  const pal = (previewedItem && previewedItem.type === 'skin') ? previewedItem.pal : playerPal;
  if (pal === 98) return getPhosphorColors();
  if (pal === 99) return getMulticolorBlendColors();
  return null;
}

function skinAnimTick() {
  _phosphorPhase = (_phosphorPhase + 0.05) % (Math.PI * 2);
  if (_multicolorBlend < 1) {
    _multicolorBlend = Math.min(1, _multicolorBlend + 0.06);
    if (_multicolorBlend >= 1) { _multicolorPal = _multicolorNextPal; _multicolorIdle = 0; }
  } else {
    _multicolorIdle++;
    if (_multicolorIdle >= 55) { // ~0.9s entre chaque couleur
      _multicolorNextPal = (_multicolorPal % 7) + 1;
      _multicolorBlend   = 0;
    }
  }
}

function _activeTrail() {
  if (previewedItem && previewedItem.type === 'trail') return previewedItem.trail;
  return activeTrail;
}

function _activeJump() {
  if (previewedItem && previewedItem.type === 'jump') return previewedItem.jump;
  return activeJump;
}

function _activeJumpSnd() {
  if (previewedItem && previewedItem.type === 'sndJump') return previewedItem.snd;
  return activeJumpSnd;
}

function _activeDeadSnd() {
  return activeJumpSnd === 'jumpPet' ? 'deadPet' : 'deadMusic';
}

function _activeTrick() {
  if (previewedItem && previewedItem.type === 'trick') return previewedItem.trick;
  return activeTrick;
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
  if (!_activeTrail()) { _trailFrame = 0; trailParticles.length = 0; return; }

  const trail = _activeTrail();

  // mise à jour des particules existantes
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.x -= 2;
    if (p.kind === 'miasma') {
      p.y  -= p.vy;
      p.life++;
      p.r   = 2 + (p.life / p.maxLife) * 3;
      if (p.life >= p.maxLife) trailParticles.splice(i, 1);
    }
  }

  // spawn
  _trailFrame++;
  const every = trail === 'miasma' ? 5 : TRAIL_EVERY;
  if (_trailFrame % every === 0) {
    if (trail === 'miasma') {
      trailParticles.push({
        kind: 'miasma',
        x: bx - 8,
        y: by + 6,
        vy: 0.35 + Math.random() * 0.35,
        life: 0,
        maxLife: 38 + Math.floor(Math.random() * 18),
        r: 2,
        hue: 85 + Math.floor(Math.random() * 35),
      });
    } else {
      if (trailParticles.length >= 20) trailParticles.shift();
      const color = trail === 'rainbow'
        ? `hsl(${(_trailColorIndex * 36) % 360},100%,65%)`
        : 'rgba(255,255,255,0.85)';
      trailParticles.push({ kind: 'default', x: bx, y: by, color });
      _trailColorIndex++;
    }
  }
}

function trailDraw() {
  for (const p of trailParticles) {
    if (p.kind === 'miasma') {
      const alpha = (1 - p.life / p.maxLife) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue},65%,52%)`;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(Math.round(p.x) - p.r * 0.3, Math.round(p.y) - p.r * 0.35, p.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x) - TRAIL_PX / 2, Math.round(p.y) - TRAIL_PX / 2, TRAIL_PX, TRAIL_PX);
    }
  }
}

// ─────────────────────────────────────────────
//  JUMP SYSTEM
// ─────────────────────────────────────────────
const jumpEffects = [];

function jumpSpawn(bx, by, scale = 1, impact = false, driftAngle = 0) {
  if (!_activeJump()) return;
  const type = _activeJump();
  if (impact) {
    const driftSpd = 0.55;
    const driftX   = Math.cos(driftAngle) * driftSpd;
    const driftY   = Math.sin(driftAngle) * driftSpd;
    const maxLife  = 22;
    if (type === 'fart') {
      const particles = Array.from({ length: 10 }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.3 + 0.15;
        return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
      });
      jumpEffects.push({ x: bx, y: by, jump: type, frame: 0, maxLife, scale, impact: true, driftX, driftY, particles });
    } else if (type === 'firework') {
      const count = 14;
      const particles = Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const s = 0.25 + Math.random() * 0.15;
        return { dx: Math.cos(a) * s, dy: Math.sin(a) * s, color: `hsl(${i * (360 / count)},100%,65%)` };
      });
      jumpEffects.push({ x: bx, y: by, jump: type, frame: 0, maxLife, scale, impact: true, driftX, driftY, particles });
    } else {
      jumpEffects.push({ x: bx, y: by, jump: type, frame: 0, maxLife, scale, impact: true, driftX, driftY });
    }
    return;
  }
  if (type === 'fart') {
    const particles = Array.from({ length: 7 }, () => ({
      dx: (Math.random() - 0.5) * 2.5,
      dy: Math.random() * 2 + 0.5,
    }));
    jumpEffects.push({ x: bx, y: by + 6, jump: type, frame: 0, scale, particles });
  } else if (type === 'firework') {
    const particles = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const spd = 1.5 + Math.random() * 2;
      return { dx: Math.cos(a) * spd, dy: Math.sin(a) * spd, color: `hsl(${i * 30},100%,65%)` };
    });
    jumpEffects.push({ x: bx, y: by, jump: type, frame: 0, maxLife: 25, scale, particles });
  } else {
    jumpEffects.push({ x: bx, y: by + 6, jump: type, frame: 0, scale });
  }
}

function jumpTick() {
  for (let i = jumpEffects.length - 1; i >= 0; i--) {
    const e = jumpEffects[i];
    if (e.impact) { e.x += e.driftX; e.y += e.driftY; }
    else          { e.x -= 2; }
    e.frame++;
    if (e.frame > (e.maxLife ?? 22)) jumpEffects.splice(i, 1);
  }
}

function jumpDraw() {
  for (const e of jumpEffects) {
    const sc = e.scale ?? 1;
    ctx.save();
    if (e.impact) {
      const t         = e.frame / e.maxLife;
      const alpha     = Math.max(0, 1 - t);
      const growScale = (0.2 + t * 1.8) * sc;
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y);
      ctx.scale(growScale, growScale);
      if (e.jump === 'fart') {
        for (const p of e.particles) {
          const px = p.dx * e.frame * 4;
          const py = p.dy * e.frame * 4;
          ctx.fillStyle = '#aaee22';
          const s = Math.max(0.5, 3.5 * (1 - t * 0.7));
          ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2); ctx.fill();
        }
      } else if (e.jump === 'firework') {
        for (const p of e.particles) {
          const px = p.dx * e.frame * 5;
          const py = p.dy * e.frame * 5;
          ctx.fillStyle = p.color;
          const s = Math.max(0.5, 3 * (1 - t * 0.6));
          ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        const r = t * 12;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      continue;
    }
    if (e.jump === 'fart') {
      const t = e.frame / 22;
      for (const p of e.particles) {
        const px = e.x + p.dx * e.frame;
        const py = e.y + p.dy * e.frame;
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.fillStyle = '#aaee22';
        const s = Math.max(1, (3.5 - t * 3) * sc);
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.jump === 'firework') {
      const t = e.frame / 25;
      ctx.globalAlpha = Math.max(0, 1 - t);
      for (const p of e.particles) {
        const px = e.x + p.dx * e.frame;
        const py = e.y + p.dy * e.frame + 0.05 * e.frame * e.frame;
        ctx.fillStyle = p.color;
        const s = Math.max(1, (3 - t * 2) * sc);
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const t = e.frame / 18;
      const a = 1 - t;
      const r = t * 14 * sc;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.5 * sc;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  TRICK SYSTEM
// ─────────────────────────────────────────────
const trickEffects  = [];
let   loopingFrame  = 0;
const LOOPING_TOTAL = 32;
let   toupieFrame   = 0;
const TOUPIE_TOTAL  = 28; // ~durée d'un saut (20 frames montée + atterrissage)

function trickSpawn(bx, by) {
  const trick = _activeTrick();
  if (!trick) return;
  if (trick === 'firework') {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spd   = 1.5 + Math.random() * 2;
      trickEffects.push({
        x: bx, y: by,
        dx: Math.cos(angle) * spd,
        dy: Math.sin(angle) * spd,
        color: `hsl(${i * 30},100%,65%)`,
        life: 0, maxLife: 22 + Math.floor(Math.random() * 8),
      });
    }
  } else if (trick === 'looping' && loopingFrame === 0) {
    loopingFrame = 1;
  } else if (trick === 'toupie' && toupieFrame === 0) {
    toupieFrame = 1;
  }
}

function trickTick() {
  for (let i = trickEffects.length - 1; i >= 0; i--) {
    const p = trickEffects[i];
    p.x  += p.dx - 2;
    p.y  += p.dy;
    p.dy += 0.1;
    p.life++;
    if (p.life >= p.maxLife) trickEffects.splice(i, 1);
  }
  if (loopingFrame > 0) {
    loopingFrame++;
    if (loopingFrame > LOOPING_TOTAL) loopingFrame = 0;
  }
  if (toupieFrame > 0) {
    toupieFrame++;
    if (toupieFrame > TOUPIE_TOTAL) toupieFrame = 0;
  }
}

function trickDraw() {
  for (const p of trickEffects) {
    ctx.save();
    ctx.globalAlpha = 1 - p.life / p.maxLife;
    ctx.fillStyle   = p.color;
    ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
    ctx.restore();
  }
}

function getTrickRotation() {
  if (loopingFrame <= 0) return 0;
  return (loopingFrame / LOOPING_TOTAL) * Math.PI * 2;
}

function getToupieScaleX() {
  if (toupieFrame <= 0) return 1;
  return Math.cos(toupieFrame * (Math.PI * 2 / TOUPIE_TOTAL)); // 1 flip complet
}

// ─────────────────────────────────────────────
//  ÉQUIPEMENT
// ─────────────────────────────────────────────
function equipItem(item, silent = false) {
  SHOP_ITEMS.forEach(i => { if (i.type === item.type && i.equip) i.equip = false; });
  item.equip = true;
  if (item.type === 'skin')    playerPal    = item.pal;
  if (item.type === 'trail')   activeTrail  = item.trail;
  if (item.type === 'jump')    activeJump   = item.jump;
  if (item.type === 'sndJump') activeJumpSnd = item.snd;
  if (item.type === 'trick')   activeTrick  = item.trick;
  saveShopState();
  if (!silent) playSound('equip');
}

function unequipItem(item) {
  item.equip = false;
  if (item.type === 'skin')    playerPal    = 0;
  if (item.type === 'trail')   activeTrail  = null;
  if (item.type === 'jump')    activeJump   = null;
  if (item.type === 'sndJump') activeJumpSnd = null;
  if (item.type === 'trick')   activeTrick  = null;
  saveShopState();
  playSound('unequip');
}

function saveShopState() {
  const state = {};
  SHOP_ITEMS.forEach(i => { state[i.id] = { buy: i.buy, equip: i.equip }; });
  localStorage.setItem('fw_shop', JSON.stringify(state));
}

function loadShopState() {
  const raw = localStorage.getItem('fw_shop');
  if (!raw) return;
  const state = JSON.parse(raw);
  SHOP_ITEMS.forEach(i => {
    if (!state[i.id]) return;
    i.buy   = state[i.id].buy   ?? i.buy;
    i.equip = state[i.id].equip ?? i.equip;
    if (i.equip) {
      if (i.type === 'skin')    playerPal    = i.pal;
      if (i.type === 'trail')   activeTrail  = i.trail;
      if (i.type === 'jump')    activeJump   = i.jump;
      if (i.type === 'sndJump') activeJumpSnd = i.snd;
      if (i.type === 'trick')   activeTrick  = i.trick;
    }
  });
}

loadShopState();

// ─────────────────────────────────────────────
//  CHEAT MODE — hold soleil 3s en intro1
// ─────────────────────────────────────────────
let cheatMode     = false;
let _cheatTimer   = null;
let _cheatSnapshot = null;

function activateCheat() {
  if (cheatMode) return;
  cheatMode = true;
  _cheatSnapshot = {};
  SHOP_ITEMS.forEach(i => { _cheatSnapshot[i.id] = { buy: i.buy, equip: i.equip }; });
  SHOP_ITEMS.forEach(i => { i.buy = true; });
  playSound('evilLaught');
  _cheatTimer = setTimeout(deactivateCheat, 30 * 60 * 1000);
}

function deactivateCheat() {
  if (!cheatMode) return;
  cheatMode = false;
  clearTimeout(_cheatTimer);
  _cheatTimer = null;
  SHOP_ITEMS.forEach(i => {
    const s = _cheatSnapshot[i.id];
    if (s) { i.buy = s.buy; i.equip = s.equip; }
  });
  playerPal = 0; activeTrail = null; activeJump = null; activeJumpSnd = null; activeTrick = null;
  SHOP_ITEMS.forEach(i => {
    if (!i.equip) return;
    if (i.type === 'skin')    playerPal    = i.pal;
    if (i.type === 'trail')   activeTrail  = i.trail;
    if (i.type === 'jump')    activeJump   = i.jump;
    if (i.type === 'sndJump') activeJumpSnd = i.snd;
    if (i.type === 'trick')   activeTrick  = i.trick;
  });
  saveShopState();
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
