# Nysa — Audit des pôles

Revue fonctionnalité par fonctionnalité (vs cadrage). Légende :
**✅ fait** · **◑ partiel** · **○ manquant**

---

## 🗓️ Planning
- ✅ **Calendrier** — vue mois, navigation, événements créer/éditer/supprimer ; les événements des interconnexions (focus, sport, RDV) y apparaissent.
- ✅ **Rappels** — notifications locales programmées (one-shot + quotidien).
- ✅ **Habit tracker** — habitudes + streaks + check du jour.
- ○ **Routine quotidienne** — pas de routines matin/soir dédiées. *Quick win : checklists de routine (réutilise les habitudes).*

## 💼 Travail
- ✅ **Projets** · ✅ **To-do list** · ✅ **Time tracker** (live → session).
- ◑ **Énergie & focus** — l'énergie est saisie après chaque session, mais pas de **vue d'historique/courbe**. *Quick win : écran de suivi énergie/focus.*
- ◑ **Archives projets** — le statut `archived` existe déjà dans la donnée, mais pas de bouton archiver/filtre. *Quick win facile.*
- ○ **Moodboard** (type Miro) — non fait, gros morceau (images). *Plus tard.*
- ○ **Knowledge perso** — non fait (le « second cerveau » existe côté Apprentissage). *Quick win : liens/notes par projet.*
- ○ **Revue hebdo / mensuelle** — non faite. *Moyen : génération auto depuis les données.*

## 🌿 Bien-être
- ✅ **Recettes · Courses · Placard · Meal planning** (boucle complète).
- ✅ **Sommeil** (+ import Santé) · ✅ **Médicaments** · ✅ **Médecins/RDV** · ✅ **Cycle menstruel** · ✅ **Méditation**.
- ◑ **Nutrition** — repas loggés (type, calories, nutriscore stockés) mais pas de **résumé du jour** ni calcul de nutriments. *Quick win : total calories/jour + affichage du score.*
- ◑ **Santé médicale** — praticiens/RDV faits, mais pas de **mesures** (poids, tension…). *Quick win : suivi de mesures.*
- ○ **Routines matin/soir** — non faites.

## 💰 Finances
- ✅ **Budgétisation** (budget mensuel + jauge) · ✅ **Suivi des finances** (transactions, solde du mois).
- ◑ **Objectifs financiers** — un objectif épargne existe mais pas de **création/contribution** depuis l'UI. *Quick win.*
- ○ **Patrimoine** — non fait. *Quick win : actifs/comptes manuels + total.*
- ○ **Bourse / crypto** — non fait (API externe). *Plus tard.*
- ○ **Taxes / impôts** — non fait. *Plus tard.*

## 🏠 Maison
- ✅ **Entretien** (échéances) · ✅ **Tâches ménagères** · ✅ **Abonnements** (→ alimente Finances).
- ○ **Documents admin** — non fait. *Quick win : liste de documents (nom + note, pièce jointe plus tard).*
- ○ **Garde-robe (avatar)** — non fait, gros morceau. *Plus tard.*

## 👥 Relations
- ✅ **Contacts** · ✅ **Suivi des interactions** (dernière fois vu + log) · ✅ **Idées cadeaux**.
- ◑ **Événements familiaux** — anniversaire → Planning existe, mais pas de **liste d'événements** récurrents dédiée. *Quick win.*

## 📚 Apprentissage
- ✅ **Livres** (statut) · ✅ **Cours** (progression) · ✅ **Second cerveau** (notes).
- *Enrichissement possible : liens/tags dans les notes.*

## 🎲 Loisirs
- ✅ **Wishlist** · ✅ **Films/séries/livres** (tracker) · ✅ **Bucket list**.
- ○ **Collections** (vin, figurines…) — non fait. *Quick win : items avec catégorie/photo.*
- ○ **Projets créatifs** — non fait. *Quick win : réutilise le motif projets.*

---

## 🔁 Transverse (touche tous les pôles)
- ◑ **Objectifs** — le moteur existe (3 objectifs seedés : focus, calme, épargne) mais **pas d'écran pour en créer/éditer**, ni le système « imposés + libres » du cadrage. **➡️ Le plus gros levier transverse.**
- ○ **Mascotte** — non faite (prévue plus tard).
- ◑ **Thèmes** — 2 style packs (soft/bold) ; cadrage en voulait davantage.
- ○ **Tags / recherche globale** — table `tags` créée mais non exploitée.

---

## 🎯 Top quick wins recommandés (JS pur, fort impact)
1. **Objectifs : écran de création/édition** (imposés + libres) — transverse, c'est le manque le plus visible.
2. **Archives projets** (Travail) — la donnée est déjà là.
3. **Nutrition : résumé calories du jour** (Bien-être).
4. **Patrimoine** : actifs manuels + total (Finances).
5. **Documents admin** (Maison).
6. **Collections + projets créatifs** (Loisirs).
7. **Routines matin/soir** (Planning/Bien-être).
8. **Vue énergie & focus** (Travail).

## 🧱 Chantiers plus lourds (plus tard)
Moodboard, garde-robe/avatar, bourse·crypto, taxes, revues auto, mascotte, intégrations API (Strava/Garmin/banques).
