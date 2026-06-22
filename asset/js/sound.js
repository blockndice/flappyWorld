// ─────────────────────────────────────────────
//  SOUND CONFIG — modifier ici chemin et volume
// ─────────────────────────────────────────────
const SOUND_PATH = 'asset/sound/';

const SOUNDS = [
  { id: 'jump',        file: 'jump02.mp3',       loop: false, volume: 3, overlap: true },
  { id: 'jumpPet',    file: 'pet01.mp3',        loop: false, volume: 7, overlap: true },
  { id: 'coin',        file: 'valide01.wav',      loop: false, volume: 7 },
  { id: 'coinRecord', file: 'Coin01.wav',         loop: false, volume: 8 },
  { id: 'purchase',   file: 'valide02.wav',      loop: false, volume: 7 },
  { id: 'equip',      file: 'Coin02.wav',        loop: false, volume: 7 },
  { id: 'unequip',    file: 'Coin03.mp3',        loop: false, volume: 7 },
  { id: 'dead',        file: 'Impact01.wav',      loop: false, volume: 9 },
  { id: 'nextPage',    file: 'nextPage.wav',      loop: false, volume: 6 },
  { id: 'introMusic',  file: 'intro1Music.mp3',   loop: true,  volume: 3 },
  { id: 'startRun',    file: 'Start_Run.mp3',     loop: false, volume: 7 },
  { id: 'travelMusic', file: 'travelMusic01.mp3', loop: true,  volume: 6 },
  { id: 'deadMusic',   file: 'Dead02.mp3',        loop: false, volume: 6 },
  { id: 'deadPet',    file: 'pet02.mp3',         loop: false, volume: 6 },
  { id: 'resumeMusic', file: 'resumeMusic.mp3',   loop: true,  volume: 6 },
  { id: 'evilLaught', file: 'evilLaught.mp3',    loop: false, volume: 9 },
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
//  VOLUME MAÎTRE
// ─────────────────────────────────────────────
let _masterVol = parseFloat(localStorage.getItem('fw_vol') ?? '1');

function setMasterVolume(v) {
  _masterVol = Math.max(0, Math.min(1, v));
  localStorage.setItem('fw_vol', _masterVol);
  for (const s of SOUNDS) {
    const a = _audioMap[s.id];
    if (a) a.volume = (s.volume / 10) * _masterVol;
  }
}

function getMasterVolume() { return _masterVol; }

// ─────────────────────────────────────────────
//  CHARGEMENT
// ─────────────────────────────────────────────
let _loadedCount      = 0;
const _totalCount     = SOUNDS.length;
let soundsReady       = false;
let _currentLoadFile  = '';

function getLoadingFile() { return _currentLoadFile; }

function _onAudioReady() {
  _loadedCount = Math.min(_loadedCount + 1, _totalCount);
  if (_loadedCount >= _totalCount) {
    soundsReady = true;
    setMasterVolume(_masterVol);
    playIntroMusic();
  }
}

for (const s of SOUNDS) {
  const a = _audioMap[s.id];
  const _done = () => { _currentLoadFile = s.file; _onAudioReady(); };
  if (a.readyState >= 4) { _done(); }
  else {
    a.addEventListener('canplaythrough', _done, { once: true });
    a.addEventListener('error',          _done, { once: true }); // évite le blocage si fichier inaccessible
  }
}

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

// Impact01.wav terminé → enchaîne musique mort (Dead02 ou pet02 si sndJump_pet équipé)
_audioMap['dead'].addEventListener('ended', () => playSound(_activeDeadSnd()));

// Dead02.mp3 ou pet02.mp3 terminé → 0.1s → resumeMusic.mp3
// _resumeAllowed n'est true qu'entre die() et stopResumeMusic/init — gate dur contre toute fuite d'état
let _resumeTimer   = null;
let _resumeAllowed = false;
function allowResumeMusic() { _resumeAllowed = true; }
const _scheduleResume = () => {
  _resumeTimer = setTimeout(() => { if (_resumeAllowed) playSound('resumeMusic'); }, 100);
};
_audioMap['deadMusic'].addEventListener('ended', _scheduleResume);
_audioMap['deadPet'].addEventListener('ended',   _scheduleResume);

function playIntroMusic()  { playSound('introMusic'); }
function stopIntroMusic()  { _stopSound('introMusic'); }
function stopTravelMusic() { _stopSound('travelMusic'); }
function stopResumeMusic() {
  _resumeAllowed = false;
  clearTimeout(_resumeTimer);
  _resumeTimer = null;
  _stopSound('resumeMusic');
}

// Appelé à chaque frame depuis la boucle de jeu en intro1 :
// si le chargement est terminé mais la musique est encore en pause
// (bloquée par l'autoplay mobile), on retente dès que le navigateur accepte.
function ensureIntroMusic() {
  const a = _audioMap['introMusic'];
  if (a && a.paused && soundsReady) a.play().catch(() => {});
}

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

  // 2. Déverrouiller les sons ponctuels
  Object.values(_audioMap).forEach(a => {
    if (a.loop) return;
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });

  // 3. Rattrapage mobile : si la musique a été bloquée par l'autoplay, la relancer
  const m = _audioMap['introMusic'];
  if (m && m.paused) playIntroMusic();
}
document.addEventListener('touchstart', _unlockAudio, { once: true });
document.addEventListener('click',      _unlockAudio, { once: true });
