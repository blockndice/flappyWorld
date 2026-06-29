// ── Translations ──
const CAPTIONS = {
  en: ['Gameplay', 'Shop', 'Top 10', 'Discover'],
  fr: ['Gameplay', 'Boutique', 'Top 10', 'Découvrir'],
  es: ['Juego',    'Tienda',   'Top 10', 'Descubrir'],
};

const T = {
  en: {
    slogan:   'play · collect · earn',
    'f1-title': 'Easy to pick up',
    'f1-text':  'One tap and you fly. Mastery comes with every run.',
    'f2-title': 'Your bird, your style',
    'f2-text':  'Collect coins in-game to unlock colors, trails, tricks and sounds.',
    'f3-title': 'Adventure Mode',
    'f3-text':  'Go further in Adventure mode to unlock better rewards. Limited runs, bigger stakes.',
    'f4-title': 'Challenge Mode',
    'f4-text':  'A challenge mode is coming — built on the Solana ecosystem.',
    soon:        'Soon',
    cta:         'Demo on itch.io →',
    badge:       'Browser · PC & Mobile · No install',
    'more-info': 'More info',
    'play-now':  'Play now',
  },
  fr: {
    slogan:   'joue · récolte · gagne',
    'f1-title': 'Facile à prendre en main',
    'f1-text':  'Un tap et tu voles. La finesse vient avec chaque run.',
    'f2-title': 'Ton oiseau, ton style',
    'f2-text':  'Récolte des pièces en jeu pour débloquer couleurs, traînées, tricks et sons.',
    'f3-title': 'Mode Aventure',
    'f3-text':  'Tente le mode Aventure pour accéder à de meilleures récompenses. Runs limités, enjeux plus grands.',
    'f4-title': 'Mode Challenge',
    'f4-text':  "Un mode challenge est en préparation sur l'écosystème Solana.",
    soon:        'Bientôt',
    cta:         'Démo sur itch.io →',
    badge:       'Navigateur · PC & Mobile · Sans installation',
    'more-info': "Plus d'infos",
    'play-now':  'Joue maintenant',
  },
  es: {
    slogan:   'juega · recoge · gana',
    'f1-title': 'Fácil de aprender',
    'f1-text':  'Un toque y vuelas. La maestría llega con cada intento.',
    'f2-title': 'Tu pájaro, tu estilo',
    'f2-text':  'Recoge monedas en el juego para desbloquear colores, estelas, trucos y sonidos.',
    'f3-title': 'Modo Aventura',
    'f3-text':  'Prueba el modo Aventura para acceder a mejores recompensas. Partidas limitadas, apuestas más altas.',
    'f4-title': 'Modo Desafío',
    'f4-text':  'Un modo desafío está en preparación en el ecosistema Solana.',
    soon:        'Pronto',
    cta:         'Demo en itch.io →',
    badge:       'Navegador · PC & Móvil · Sin instalación',
    'more-info': 'Más info',
    'play-now':  'Juega ahora',
  },
};

let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (T[lang]?.[key]) el.textContent = T[lang][key];
  });
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
  document.documentElement.lang = lang;
  localStorage.setItem('fw-lang', lang);
  updateCaption();
}

document.querySelectorAll('.lang-btn').forEach(btn =>
  btn.addEventListener('click', () => setLang(btn.dataset.lang))
);

// ── Carousel ──
const track   = document.getElementById('track');
const dotsEl  = document.getElementById('dots');
const caption = document.getElementById('caption');
const TOTAL   = 4;
let current   = 0;
let autoTimer;

for (let i = 0; i < TOTAL; i++) {
  const d = document.createElement('button');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', () => goTo(i));
  dotsEl.appendChild(d);
}

function updateCaption() {
  const caps = CAPTIONS[currentLang] || CAPTIONS.en;
  caption.textContent = caps[current] ?? '';
}

function goTo(idx) {
  current = (idx + TOTAL) % TOTAL;
  const imgW = track.querySelector('img').offsetWidth;
  track.style.transform = `translateX(-${current * imgW}px)`;
  dotsEl.querySelectorAll('.dot').forEach((d, i) =>
    d.classList.toggle('active', i === current)
  );
  updateCaption();
  resetAuto();
}

function resetAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => goTo(current + 1), 3500);
}

document.getElementById('prev').addEventListener('click', () => goTo(current - 1));
document.getElementById('next').addEventListener('click', () => goTo(current + 1));

let touchX = 0;
track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
track.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
});

resetAuto();
setLang(localStorage.getItem('fw-lang') || 'en');

// ── Scroll arrow ──
document.querySelector('.scroll-hint').addEventListener('click', () => {
  document.getElementById('play-now').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Canvas background ──
const canvas = document.getElementById('bg');
const ctx    = canvas.getContext('2d');

const GRAVITY    = 0.38;
const FLAP_VY    = -7.22;
const FLAP_EVERY = 37;
const BIRD_W     = 26;
const BIRD_H     = 22;

const BIRD_PALS = [
  ['#f5d600','#fff3a0','#d4a800'],
  ['#4caf50','#a5d6a7','#2e7d32'],
  ['#f44336','#ffcdd2','#b71c1c'],
  ['#e91e63','#f8bbd0','#880e4f'],
  ['#2196f3','#bbdefb','#0d47a1'],
  ['#9c27b0','#e1bee7','#4a148c'],
  ['#ff8c00','#ffe0b2','#e65100'],
  ['#ff7043','#ffccbc','#bf360c'],
];

const CLOUD_SHAPES = [
  [[0,1],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,1],[3,2],[4,1]],
  [[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[1,3],[2,3]],
  [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2],[2,2]],
  [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[2,2],[3,2]],
];

let W = 0, H = 0, skyGrad = null;
let birds = [], clouds = [], tick = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0,    '#1a6fa0');
  skyGrad.addColorStop(0.65, '#5ec8f5');
  skyGrad.addColorStop(1,    '#82dcff');
  clouds = Array.from({ length: 9 }, () => ({
    x: Math.random() * W, y: 35 + Math.random() * (H * 0.52),
    s: 6 + Math.floor(Math.random() * 9),
    shape: CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)],
    speed: 0.25 + Math.random() * 0.45,
  }));
}

function spawnBird(startX) {
  const scale = 0.45 + Math.random() * 1.4;
  birds.push({
    x: startX ?? -70, y: 70 + Math.random() * (H * 0.65),
    vy: FLAP_VY, scale, speed: scale * 2.0 + 0.6,
    pal: Math.floor(Math.random() * BIRD_PALS.length),
    flapOffset: Math.floor(Math.random() * FLAP_EVERY),
  });
  birds.sort((a, b) => a.scale - b.scale);
}

function drawCloud(ox, oy, s, shape) {
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  for (const [cx, cy] of shape) ctx.fillRect(ox + cx * s, oy + cy * s, s, s);
}

function drawBird(x, y, rot, scale, pal) {
  const [body, light, dark] = BIRD_PALS[pal];
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(rot);
  ctx.fillStyle = body;      ctx.fillRect(-BIRD_W/2,     -BIRD_H/2,     BIRD_W,    BIRD_H);
  ctx.fillStyle = light;     ctx.fillRect(-BIRD_W/2 + 4,  BIRD_H/2 - 8, BIRD_W-10, 6);
  ctx.fillStyle = dark;      ctx.fillRect(-BIRD_W/2,       0,            10,        7);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(3,  -BIRD_H/2+3, 9, 9);
  ctx.fillStyle = '#111111'; ctx.fillRect(7,  -BIRD_H/2+6, 4, 4);
  ctx.fillStyle = '#ff8800'; ctx.fillRect(BIRD_W/2-2, -3, 9, 5);
  ctx.fillStyle = '#cc6600'; ctx.fillRect(BIRD_W/2-2,  1, 9, 2);
  ctx.restore();
}

function loop() {
  if (Math.random() < 0.014) spawnBird();
  for (let i = birds.length - 1; i >= 0; i--) {
    const b = birds[i];
    if ((tick + b.flapOffset) % FLAP_EVERY === 0) b.vy = FLAP_VY;
    b.vy += GRAVITY; b.y += b.vy; b.x += b.speed;
    if (b.x > W + 90) birds.splice(i, 1);
  }
  for (const c of clouds) {
    c.x -= c.speed;
    if (c.x < -(c.s * 7)) { c.x = W + 20; c.y = 35 + Math.random() * (H * 0.52); }
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
  for (const c of clouds) drawCloud(c.x, c.y, c.s, c.shape);
  for (const b of birds) {
    drawBird(b.x, b.y, Math.min(Math.max(b.vy * 0.055, -0.45), 1.3), b.scale, b.pal);
  }
  tick++;
  requestAnimationFrame(loop);
}

window.addEventListener('resize', resize);
resize();
for (let i = 0; i < 14; i++) spawnBird(Math.random() * W);
loop();

// ── Music ──
const audio     = document.getElementById('landing-audio');
const musicBtn  = document.getElementById('music-btn');
const volSlider = document.getElementById('music-vol-slider');

let musicPlaying = false;
audio.volume = volSlider ? parseFloat(volSlider.value) : 0.5;

function setMusicState(playing) {
  musicPlaying = playing;
  musicBtn.classList.toggle('muted', !playing);
}

function startMusic() {
  audio.play().then(() => setMusicState(true)).catch(() => setMusicState(false));
}

// Tente l'autoplay immédiatement
startMusic();

// Si le navigateur a bloqué l'autoplay, on attend la première interaction
function onFirstInteraction() {
  if (!musicPlaying) startMusic();
  document.removeEventListener('click',      onFirstInteraction);
  document.removeEventListener('touchstart', onFirstInteraction);
  document.removeEventListener('keydown',    onFirstInteraction);
}
document.addEventListener('click',      onFirstInteraction);
document.addEventListener('touchstart', onFirstInteraction, { passive: true });
document.addEventListener('keydown',    onFirstInteraction);

musicBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (musicPlaying) {
    audio.pause();
    setMusicState(false);
  } else {
    audio.play().then(() => setMusicState(true));
  }
});

if (volSlider) {
  volSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volSlider.value);
  });
}
