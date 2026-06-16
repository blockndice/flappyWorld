# FlappySol

Clone de Flappy Bird entièrement en pixel art, développé en JavaScript vanilla sur Canvas 2D. Aucune dépendance externe.

## Présentation

Le joueur contrôle un oiseau pixel art et doit naviguer entre des tuyaux en évitant les collisions. Des pièces d'or sont placées au centre de chaque ouverture — les collecter fait monter le score. Le meilleur score est conservé pendant la session.

## Stack technique

| Élément | Détail |
|---|---|
| Langage | JavaScript ES6 vanilla |
| Rendu | Canvas 2D (`400 × 600 px`) |
| Style | CSS minimal, fond sombre centré |
| Dépendances | Aucune |

## Fichiers

```
flappySol/
├── index.html   — page unique, monte le canvas
├── style.css    — fond #0d0d1a, canvas centré, rendu pixelisé
├── game.js      — toute la logique du jeu
└── patchNote.txt
```

## Architecture de game.js

| Section | Rôle |
|---|---|
| Constants | Dimensions, physique, vitesse |
| State | `bird`, `pipes`, `score`, `best`, `state`, `frame` |
| Sprites | `sprBg`, `sprGround`, `sprBird`, `sprCoin`, `sprCoinUI`, `sprPipe` |
| Logique | `spawnPipe`, `flap`, `update` (physique + collisions) |
| Rendu UI | `drawUI` (écrans waiting / playing / dead) |
| Boucle | `loop` → `update` + `render` via `requestAnimationFrame` |

## Sprites (pixel art manuel)

Tous les sprites sont dessinés pixel par pixel avec `ctx.fillRect` — pas d'images externes.

- **Oiseau** : corps jaune, aile, oeil, bec orange
- **Tuyau** : vert avec chapeau élargi et ombres
- **Pièce en jeu** (`sprCoin`) : grille 5×6, animation de rotation simulée par `ctx.scale`
- **Pièce UI** (`sprCoinUI`) : même forme 5×6, statique, avec reflet et ombre
- **Fond** : dégradé ciel + nuages pixel art
- **Sol** : herbe scrollante avec motif de terre

## Contrôles

| Action | Contrôle |
|---|---|
| Sauter | Clic souris |
| Sauter | Barre espace / Flèche haut |
| Sauter | Toucher (mobile) |
| Rejouer | N'importe lequel des contrôles ci-dessus |

## États du jeu

```
waiting → playing → dead → (waiting)
```

- **waiting** : écran titre, attend le premier input
- **playing** : physique active, spawn de tuyaux toutes les 88 frames
- **dead** : collision détectée, affiche score + record

## Physique

```
GRAVITY    = 0.38   (accélération verticale par frame)
FLAP_VY    = -7.2   (vitesse verticale au saut)
PIPE_SPEED = 2.4    (pixels par frame)
PIPE_GAP   = 130    (ouverture entre tuyaux)
```

## Statut

Alpha — sprites placeholders, pas de sons, pas de persistence du record entre sessions.
