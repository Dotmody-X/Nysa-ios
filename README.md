# Nysa — Phase 0

Personal trackers app (iOS / Android / web) — fondation technique.
Voir [`CADRAGE.md`](./CADRAGE.md) pour la vision, l'architecture et la roadmap complètes.

## Stack

- **Expo SDK 54** (React Native, New Architecture) + **TypeScript** strict
- **Expo Router** — navigation file-based, typée
- **WatermelonDB** (SQLite) — base locale réactive, offline-first
- **Supabase** — cloud (Postgres + Auth + RLS) et cible de sync
- **Nativewind** + **Moti / Reanimated** — style et animations
- **Zustand** — état UI léger

> Le scaffold cible le SDK 54 (mature, largement compatible avec WatermelonDB et Nativewind v4). Pour passer au SDK 56 plus tard : `npx expo install expo@^56` puis `npx expo install --fix`.

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Aligner les versions natives sur le SDK Expo (filet de sécurité)
npx expo install --fix

# 3. Variables d'environnement
cp .env.example .env   # puis remplir les valeurs Supabase

# 4. Lancer
npx expo start
```

WatermelonDB et expo-secure-store utilisent du code natif → il faut un **development build**, pas Expo Go :

```bash
npx expo run:ios       # ou
npx expo run:android
```

Le web tourne avec `npx expo start --web` (WatermelonDB utilise alors l'adaptateur LokiJS — à brancher en Phase 5).

## Polices

Phase 0 tourne **sans** les binaires de police (fallback système automatique). Pour activer la vraie typo :

1. Télécharger (toutes gratuites) : **Chillax** (Fontshare), **Inter** (rsms.me/inter), **Space Grotesk** (Google Fonts).
2. Déposer les `.ttf` dans `assets/fonts/`.
3. Décommenter les `require()` dans `src/theme/fonts.ts`.

## Structure

```
app/                      # Routes (Expo Router)
  _layout.tsx             # Root : providers, fonts, splash
  index.tsx               # Redirige vers l'accueil
  (tabs)/                 # Barre d'onglets
    _layout.tsx
    home.tsx · poles.tsx · goals.tsx · settings.tsx
src/
  theme/                  # Design system
    tokens.ts             # ★ source de vérité couleurs/typo/espacements
    themes → ThemeProvider.tsx
    fonts.ts
  components/             # Text, Screen, BentoGrid, BentoCard
  db/                     # WatermelonDB
    schema.ts             # ★ modèle universel : entries / links / goals / tags
    models/               # Entry · Link · Goal · Tag
    index.ts              # init database
    sync/sync.ts          # squelette de sync Supabase
  lib/supabase.ts         # client Supabase (tokens en secure store)
  poles/registry.ts       # ★ carte des 9 pôles et sous-pôles
  features/home/          # écran d'accueil bento
assets/logo.svg
```

Les ★ sont les trois fichiers qui portent l'architecture : le modèle de données, les tokens de design, et le registre des pôles.

## Ce qui est fait (Phase 0)

- Squelette qui tourne : navigation, accueil bento, switch de thème live (Réglages).
- Design system par tokens (palette + typo de marque), 2 thèmes (`soft`, `bold`).
- Modèle de données universel `Entry` / `Link` / `Goal` / `Tag` en local-first.
- Client Supabase sécurisé + squelette de sync.
- Registre complet des 9 pôles et de leurs sous-pôles, phasés.

## Prochaine étape (Phase 1)

Pôles **Planning + Travail** end-to-end pour prouver l'interconnexion (time tracker → créneau planning → suivi énergie), avec premières requêtes WatermelonDB réactives et le moteur d'objectifs.

## Côté serveur (à faire avant la sync réelle)

Créer le projet Supabase, les tables miroir (`entries`, `links`, `goals`, `tags` avec colonne `user_id`), les **policies Row Level Security**, et l'Edge Function `sync` que `src/db/sync/sync.ts` appelle.
