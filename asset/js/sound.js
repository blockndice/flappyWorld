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
  _audioMap[s.id] = a;
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

// Déverrouillage audio au premier geste (requis sur iOS / Android)
// Les navigateurs mobiles bloquent tout .play() avant une interaction utilisateur.
function _unlockAudio() {
  Object.values(_audioMap).forEach(a => {
    if (a.loop) return; // les musiques en boucle ne sont pas interrompues ici
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });
  playIntroMusic(); // démarre intro1Music (bloquée au chargement sur mobile)
}
document.addEventListener('touchstart', _unlockAudio, { once: true });
document.addEventListener('click',      _unlockAudio, { once: true });
