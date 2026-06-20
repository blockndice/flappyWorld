// ─────────────────────────────────────────────
//  SOUND CONFIG — modifier ici chemin et volume
// ─────────────────────────────────────────────
const SOUND_PATH = 'asset/sound/';

const SOUNDS = [
  { id: 'jump',        file: 'Jump01.wav',       loop: false, volume: 7, overlap: true },
  { id: 'coin',        file: 'valide01.wav',      loop: false, volume: 7 },
  { id: 'dead',        file: 'Impact01.wav',      loop: false, volume: 8 },
  { id: 'nextPage',    file: 'nextPage.wav',      loop: false, volume: 6 },
  { id: 'introMusic',  file: 'intro1Music.mp3',   loop: true,  volume: 3 },
  { id: 'startRun',    file: 'Start_Run.mp3',     loop: false, volume: 7 },
  { id: 'travelMusic', file: 'travelMusic01.mp3', loop: true,  volume: 6 },
  { id: 'deadMusic',   file: 'Dead02.mp3',        loop: false, volume: 6 },
  { id: 'resumeMusic', file: 'resumeMusic.mp3',   loop: true,  volume: 6 },
];

// ─────────────────────────────────────────────
//  AUDIO ENGINE
// ─────────────────────────────────────────────
const _audioMap = {};
for (const s of SOUNDS) {
  const a      = new Audio(SOUND_PATH + s.file);
  a.loop       = s.loop;
  a.volume     = s.volume / 10;
  a._overlap   = !!s.overlap;
  a.preload    = 'auto';
  _audioMap[s.id] = a;
}

// ─────────────────────────────────────────────
//  CHARGEMENT
// ─────────────────────────────────────────────
let _loadedCount = 0;
const _totalCount = SOUNDS.length;
let soundsReady = false;

function _onAudioReady() {
  _loadedCount = Math.min(_loadedCount + 1, _totalCount);
  if (_loadedCount >= _totalCount) soundsReady = true;
}

Object.values(_audioMap).forEach(a => {
  if (a.readyState >= 4) { _onAudioReady(); return; }
  a.addEventListener('canplaythrough', _onAudioReady, { once: true });
});

function getSoundProgress() {
  return _totalCount > 0 ? _loadedCount / _totalCount : 1;
}

function playSound(id) {
  const a = _audioMap[id];
  if (!a) return;
  if (a._overlap) {
    const clone = a.cloneNode();
    clone.volume = a.volume;
    clone.play().catch(() => {});
    return;
  }
  a.currentTime = 0;
  a.play().catch(() => {});
}

function _stopSound(id) {
  const a = _audioMap[id];
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

// Start_Run.mp3 terminé → 0.5s → travelMusic01.mp3
_audioMap['startRun'].addEventListener('ended', () => setTimeout(() => playSound('travelMusic'), 500));

// Impact01.wav terminé → enchaîne Dead02.mp3
_audioMap['dead'].addEventListener('ended', () => playSound('deadMusic'));

// Dead02.mp3 terminé → 0.5s → resumeMusic.mp3
_audioMap['deadMusic'].addEventListener('ended', () => setTimeout(() => playSound('resumeMusic'), 500));

function playIntroMusic()   { playSound('introMusic'); }
function stopIntroMusic()   { _stopSound('introMusic'); }
function stopTravelMusic()  { _stopSound('travelMusic'); }
function stopResumeMusic()  { _stopSound('resumeMusic'); }

// ─────────────────────────────────────────────
//  DÉVERROUILLAGE MOBILE (iOS / Android)
// ─────────────────────────────────────────────
// Android Chrome maintient l'AudioContext en état "suspended" jusqu'au premier geste.
// On le réveille avec un buffer silencieux, puis on déverrouille chaque HTMLAudioElement.
function _unlockAudio() {
  // 1. Réveiller l'AudioContext (Android Chrome)
  try {
    const ac  = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(0);
    ac.resume().catch(() => {});
  } catch (e) {}

  // 2. Déverrouiller les HTMLAudioElement (sons ponctuels uniquement)
  Object.values(_audioMap).forEach(a => {
    if (a.loop) return;
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });

  // 3. Lancer la musique d'intro (bloquée au chargement de la page)
  playIntroMusic();
}
document.addEventListener('touchstart', _unlockAudio, { once: true });
document.addEventListener('click',      _unlockAudio, { once: true });
