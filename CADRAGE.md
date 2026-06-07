# Nysa — Document de cadrage

> Application mobile de *personal trackers* réunissant tous les pôles du quotidien dans un système interconnecté, augmenté par l'IA.
> Version du document : 1.0 — 5 juin 2026

---

## 1. Vision & principes directeurs

Nysa n'est pas une collection d'outils juxtaposés mais **un seul organisme de données** où chaque pôle nourrit les autres. Une séance de sport (Bien-être) consomme du temps (Planning), peut être un objectif (Objectifs transverses), influence l'énergie de la journée de travail (Travail → suivi focus). C'est cette **interconnexion** qui est le vrai produit ; les trackers individuels existent déjà partout ailleurs.

Quatre principes non négociables guident chaque décision :

**Interconnexion d'abord.** Toute donnée appartient à un graphe commun. Un même objet (un événement, un objectif, une dépense) peut être vu depuis plusieurs pôles. On ne duplique jamais une donnée : on la relie.

**Mobile-first, offline-first.** L'app doit être instantanée et fonctionner sans réseau. La donnée vit en local sur le téléphone ; le cloud n'est qu'une copie de synchronisation et de sauvegarde. Aucune action utilisateur ne doit attendre le réseau.

**Souveraineté & sécurité des données.** Ce sont les données les plus intimes qui soient (santé, finances, menstruations, médicaments). Chiffrement, cloisonnement par utilisateur au niveau base de données, et minimisation : l'IA ne voit que ce qui est nécessaire.

**Simplicité ressentie, puissance cachée.** Bento, mascotte, animations douces, prise en main immédiate — par-dessus une architecture lourde. L'utilisateur ne doit jamais sentir la complexité du système.

---

## 2. Stack technique recommandée

Tu m'as laissé trancher. Voici le choix et le **pourquoi**, pas seulement le quoi.

### Recommandation : React Native + Expo (TypeScript)

| Couche | Choix | Justification courte |
|---|---|---|
| Framework | **Expo SDK 56** (React Native 0.85, React 19) | Un seul codebase iOS + Android + web responsive. New Architecture (Fabric/TurboModules) activée d'office : démarrage Android −40 %, GC −73 %. |
| Langage | **TypeScript strict** | Sécurité de typage indispensable pour un modèle de données aussi large et interconnecté. |
| Navigation | **Expo Router** (file-based) | Routing typé, deep links natifs (utile pour notifications/rappels), web et mobile partagés. |
| Base locale | **WatermelonDB** (sur SQLite) | Réactif et observable : l'UI se met à jour seule quand la donnée change. Conçu pour des milliers d'enregistrements sans ralentir. Protocole de sync intégré. |
| ORM/typage requêtes | **Drizzle** (côté serveur & migrations) | Type-safe, migrations versionnées. |
| Backend / cloud | **Supabase** (Postgres + Auth + Storage + Edge Functions) | Postgres = relationnel, parfait pour un graphe d'entités. **Row Level Security** = cloisonnement par utilisateur au niveau base, pas applicatif. Open-source, auto-hébergeable si besoin un jour. |
| Sync | **WatermelonDB ↔ Supabase** (pull/push par timestamps) | Pattern éprouvé et documenté officiellement par Supabase. On ne transfère que le delta. |
| IA | **API Claude (Anthropic)** via Edge Functions + couche on-device légère | L'IA tourne côté serveur pour la puissance, avec un proxy qui filtre les données envoyées (minimisation). |
| État UI | **Zustand** + React Query (pour le cache serveur non-Watermelon) | Léger, sans boilerplate. |
| Style | **Nativewind** (Tailwind pour RN) + **Reanimated 3** + **Moti** | Design system cohérent, animations 60 fps sur le thread natif. |
| Build / déploiement | **EAS Build & Submit** | CI/CD natif Expo, OTA updates (corriger sans repasser par les stores). |

### Pourquoi pas les alternatives

**Flutter** : excellent techniquement (perfs, animations), mais Dart t'enferme dans un écosystème plus restreint pour les très nombreuses intégrations API que tu veux, et l'IA générative actuelle est nettement plus performante en TS/React. Pour un projet solo aussi vaste, la vélocité prime.

**Natif Swift + Kotlin** : deux codebases = tu ferais le travail deux fois sur un projet déjà gigantesque. À écarter, sauf modules natifs ponctuels (voir §6).

**Firebase au lieu de Supabase** : Firebase a un meilleur offline natif, mais NoSQL se prête mal à un modèle aussi relationnel/interconnecté, et le RLS Postgres de Supabase est un atout de sécurité majeur. WatermelonDB compense l'offline.

### Point de vigilance budget
Le free tier Supabase met le projet en pause après 7 jours d'inactivité → inadapté en production. Prévoir le passage au plan Pro (~25 $/mois) dès le lancement réel. À l'inverse, en phase de dev solo, le free tier suffit largement.

---

## 3. Architecture globale

Quatre couches, du téléphone vers le cloud :

```
┌─────────────────────────────────────────────────────────────┐
│  UI  — Expo Router · Bento · Nativewind · Reanimated/Moti    │
│        Mascotte · Thèmes (style packs) · Composants partagés │
├─────────────────────────────────────────────────────────────┤
│  DOMAINE  — Logique métier par pôle (modules découplés)      │
│        Moteur d'objectifs · Moteur de liens inter-pôles      │
│        Couche IA (client) : intentions, suggestions          │
├─────────────────────────────────────────────────────────────┤
│  DONNÉES LOCALES  — WatermelonDB (SQLite réactif)            │
│        Source de vérité côté app · 100 % offline             │
│        Sync engine (delta par timestamps)                    │
├─────────────────────────────────────────────────────────────┤
│  NATIF  — Modules santé/capteurs (HealthKit, Health Connect, │
│        notifications, calendrier système, biométrie)         │
└─────────────────────────────────────────────────────────────┘
                              ↕ (sync chiffrée)
┌─────────────────────────────────────────────────────────────┐
│  CLOUD  — Supabase                                           │
│   Postgres (RLS par user) · Auth · Storage (photos, docs)    │
│   Edge Functions : proxy IA · webhooks Garmin/Strava · cron  │
└─────────────────────────────────────────────────────────────┘
```

**Principe de modularité par pôle.** Chaque pôle est un module quasi autonome (`features/wellbeing`, `features/work`…) avec ses écrans, sa logique, ses tables. Les modules ne se parlent **jamais directement** : ils communiquent via le *graphe de liens* et un bus d'événements interne. Conséquence : on peut développer, tester et désactiver un pôle sans casser les autres — essentiel vu l'ampleur.

---

## 4. Modèle de données — le cœur du système

C'est ici que se joue l'interconnexion. L'erreur classique serait de faire une table par tracker, isolées. À la place, **un socle d'entités universelles** que chaque pôle spécialise.

### 4.1 Entités-socle (partagées par tous les pôles)

- **Entry** — l'unité atomique de donnée (une dépense, une séance, une tâche, une mesure de poids…). Champs communs : `id`, `userId`, `poleId`, `type`, `title`, `timestamp`, `payload` (JSON typé spécifique au type), `createdAt`, `updatedAt`, `deletedAt` (soft-delete pour la sync).
- **Link** — la relation entre deux entités. `(fromId, toId, relationType)`. Exemple : `seance_sport —[consomme]→ creneau_planning` ; `depense —[finance]→ objectif_epargne`. **C'est la table qui rend Nysa unique.**
- **Goal (Objectif)** — transverse à tous les pôles. `targetType` (atteindre / maintenir / réduire / habitude), `metric`, `targetValue`, `deadline`, `linkedEntries[]`. Objectifs imposés (templates) ou libres/modifiables.
- **Tag** — étiquetage libre transversal (`#voyage` peut relier une dépense, un événement, une photo).
- **Reminder / Notification** — rattachée à n'importe quelle entité.
- **MediaAsset** — photo/document/audio, stocké local + Supabase Storage, référencé par une Entry.

### 4.2 Spécialisation par pôle

Chaque pôle définit ses **types d'Entry** et leur `payload`. Exemples :

- Finances → `expense`, `income`, `asset`, `budget_line`, `tax_doc`
- Bien-être → `meal`, `sleep_log`, `workout`, `med_intake`, `cycle_day`, `mood`
- Travail → `project`, `task`, `time_block`, `energy_log`, `note`
- Maison → `maintenance_item`, `chore`, `subscription`, `wardrobe_item`, `admin_doc`

### 4.3 Exemples d'interconnexion concrète (le « waouh »)

- Tu démarres un **Time Tracker** (Travail) → crée une Entry `time_block`, liée au `project`, qui alimente le **suivi énergie/focus** et bloque automatiquement un **créneau Planning**.
- Tu scannes un ticket de course (Bien-être/Courses) → met à jour l'**inventaire placard**, crée une **dépense** (Finances) liée au **budget alimentation**, et propose des **recettes** réalisables avec le nouvel inventaire.
- Un **objectif** « courir 3×/semaine » lit les `workout` (Bien-être), s'affiche dans le **dashboard Objectifs**, et nourrit l'**habit tracker** (Planning).

### 4.4 Pourquoi ce modèle tient la charge
`Entry` + `Link` + `payload` JSON = on ajoute un nouveau pôle ou sous-pôle **sans migration de schéma lourde**. WatermelonDB indexe `poleId`, `type`, `timestamp` pour des requêtes rapides même avec des dizaines de milliers d'entrées.

---

## 5. Couche IA

L'IA est un **assistant transversal**, pas un chatbot collé sur le côté. Trois rôles :

**Observateur** — détecte des patterns dans le graphe (« tes journées à <4h de sommeil corrèlent avec −30 % de focus au travail »).

**Copilote d'action** — saisie en langage naturel qui se transforme en Entries structurées (« j'ai dépensé 40 € au resto avec Léa hier soir » → crée `expense` + `Link` vers le contact Léa + tag). Réduit drastiquement la friction de saisie, principal point d'échec des trackers.

**Conseiller** — suggestions contextuelles et revues (revue hebdo auto-générée à partir du temps tracké, des objectifs, de l'humeur).

**Architecture & confidentialité** : l'app n'envoie jamais toute la base à l'IA. Une **Edge Function proxy** sélectionne le contexte minimal nécessaire à la requête, l'anonymise quand c'est possible, appelle l'API Claude, et journalise. Les pôles ultra-sensibles (santé médicale, menstruations) sont **exclus par défaut** du contexte IA, activables explicitement par l'utilisateur.

---

## 6. Intégrations API natives

Point technique important issu de la recherche : **les données santé/capteurs ne passent pas par un backend**, elles sont on-device et nécessitent des **modules natifs** (donc un *Expo Dev Client*, pas Expo Go).

| Service | Accès 2026 | Implémentation |
|---|---|---|
| **Apple HealthKit** | On-device uniquement, pas d'API backend | Module natif iOS, lecture locale puis sync chiffrée |
| **Google Fit** | ⚠️ **Déprécié en 2026** | Ne pas intégrer. Utiliser **Health Connect** |
| **Health Connect** (Android) | SDK natif on-device (remplaçant officiel) | Module natif Android |
| **Garmin Health** | Webhooks + OAuth | Edge Function réceptrice de webhooks |
| **Strava** | REST API + OAuth (gratuit) | OAuth côté app, fetch via backend |
| **Google Calendar / Apple Calendar** | API / EventKit | Sync bidirectionnelle Planning |
| **Banques (Finances)** | Agrégateurs type Plaid/Tink/Bridge | Phase ultérieure, réglementé (DSP2) |

Stratégie : **abstraire chaque intégration derrière une interface commune** (`HealthProvider`, `CalendarProvider`…) pour que le reste de l'app ne dépende jamais d'un fournisseur précis.

---

## 7. Sécurité

- **Cloisonnement** : Row Level Security Postgres — chaque ligne porte `userId`, une policy garantit qu'un utilisateur ne lit/écrit que ses données, au niveau base (pas applicatif, donc non contournable par un bug d'API).
- **Chiffrement** : au repos côté device (SQLCipher sur WatermelonDB), en transit (TLS), secrets dans le keychain/keystore natif.
- **Auth** : Supabase Auth (email + OAuth + biométrie locale pour déverrouiller l'app).
- **Minimisation IA** : cf. §5, contexte filtré, pôles sensibles exclus par défaut.
- **Conformité RGPD** : export total des données, suppression complète, consentements granulaires par intégration. À intégrer dès la conception (privacy by design), pas après.

---

## 8. Design system

Tes intuitions (bento, mascotte, typo atypique, simplicité) sont bonnes. On les structure en **système** pour la cohérence et l'évolutivité.

**Grille Bento** : composant `BentoCard` réutilisable, tailles modulaires (1×1, 2×1, 2×2), dashboard par pôle = composition de cartes. Réorganisables par l'utilisateur (drag, comme dans tes références TaskLab).

**Mascotte** : personnage identitaire simple, déclinable en états (neutre, content, alerte, célébration). Sert de fil conducteur émotionnel et de porte-voix de l'IA. À définir : nom, forme, palette. Idéalement vectoriel (Rive ou Lottie) pour animer sans alourdir.

**Thèmes = vrais style packs.** Pas un simple toggle de couleurs : chaque thème est un ensemble cohérent (typo, formes, grain, densité, animations). Architecture par **design tokens** (couleurs, rayons, espacements, typos, durées d'animation référencés par variable, jamais en dur) → changer de thème = échanger un fichier de tokens. Prévoir 2-3 thèmes au lancement (ex. « Soft/organique » à la image 2, « Bold/contrasté » à la TaskLab).

**Animations** : Reanimated + Moti, sobres, sur le thread natif. Micro-interactions (validation d'objectif, complétion de tâche) portées par la mascotte.

**Responsive** : mobile (base) → tablette (bento multi-colonnes) → desktop (layout type tes références). Breakpoints gérés via Nativewind.

---

## 9. Roadmap par phases

Construire les 9 pôles d'un coup = échec assuré. On valide d'abord le **socle interconnecté** sur peu de pôles, puis on étend. L'ordre de priorisation suit la valeur quotidienne et la richesse des liens.

### Phase 0 — Fondations (socle technique)
Setup Expo + WatermelonDB + Supabase + Auth + sync. Design system (tokens, BentoCard, navigation, 1 thème). Entités-socle (`Entry`, `Link`, `Goal`). **Aucun pôle complet, mais l'ossature qui rend tout le reste possible.**

### Phase 1 — Preuve d'interconnexion : Planning + Travail
Les deux pôles les plus structurants et les plus liés entre eux (temps ↔ tâches ↔ projets ↔ énergie). Objectif : démontrer qu'une donnée d'un pôle apparaît et agit dans l'autre. Premier dashboard bento réel. Premier objectif transverse.

### Phase 2 — Bien-être (cœur émotionnel) + couche IA v1
Habit tracker, sommeil, nutrition de base, méditation. Première intégration native (HealthKit / Health Connect). IA copilote de saisie en langage naturel. C'est le pôle le plus engageant au quotidien → moteur de rétention.

### Phase 3 — Finances + Maison
Budget, suivi dépenses, abonnements, tâches ménagères, documents admin. Liens forts avec Bien-être (courses → budget) et Planning (maintenance → rappels).

### Phase 4 — Relation + Apprentissage + Loisirs
Pôles « plaisir » et social, plus légers techniquement, fort potentiel de liens (cadeaux ↔ budget, livres ↔ objectifs, événements ↔ planning).

### Phase 5 — Intégrations avancées & polish
Strava/Garmin, agrégation bancaire, multi-thèmes, second cerveau, avatar garde-robe, et tout le « nice-to-have ». Optimisation, tests de charge, sécurité approfondie, préparation stores.

> Chaque phase est livrable et utilisable seule. On ne passe à la suivante qu'une fois la précédente stable.

---

## 10. Prochaines étapes immédiates

1. **Valider ce cadrage** (stack, modèle de données, roadmap) — ou ajuster.
2. **Nommer & croquer la mascotte** + choisir la direction artistique du thème de lancement (je peux produire un prototype visuel cliquable).
3. **Initialiser le repo** Phase 0 : structure de dossiers, Expo + WatermelonDB + Supabase, design tokens, premier écran bento qui tourne.
4. **Modéliser précisément** les types d'`Entry` et `relationType` du graphe pour Planning + Travail (Phase 1).

Dis-moi par où on enchaîne : **prototype visuel**, **setup du code Phase 0**, ou **affinage d'un point** de ce document.

---

### Sources (état de l'écosystème, juin 2026)
- [Expo SDK 56 / New Architecture](https://expo.dev/changelog/sdk-56-beta) · [Expo New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Offline-first React Native + WatermelonDB + Supabase](https://supabase.com/blog/react-native-offline-first-watermelon-db) · [WatermelonDB](https://github.com/nozbe/watermelondb)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Supabase Pricing](https://supabase.com/pricing)
- [Intégrations santé / wearables 2026](https://www.themomentum.ai/blog/why-health-apps-need-native-access-to-wearable-data) · [Google Fit déprécié → Health Connect](https://developers.google.com/fit)
