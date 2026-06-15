---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Vision et feuille de route de myprout — ce que le projet veut devenir'
session_goals: 'Générer des idées d évolution, clarifier la direction, produire une trame documentée des prochaines étapes'
selected_approach: 'ai-recommended'
techniques_used: ['Future Self Interview', 'What If Scenarios']
ideas_generated: 21
workflow_completed: true
session_active: false
decisions: 3
technique_execution_complete: true
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Gaetan
**Date:** 2026-06-08

## Session Overview

**Topic:** Vision et feuille de route de myprout — ce que le projet veut devenir
**Goals:** Générer des idées d'évolution, clarifier la direction, produire une trame documentée des prochaines étapes

### Session Setup

Approche choisie : Techniques recommandées par l'IA, adaptées à un exercice de vision produit et roadmap.

## Technique Execution Results

### Technique 1 — Future Self Interview

**[Vision #1] : Password Fortress**
_Concept :_ Gestionnaire de mots de passe avec surveillance active des fuites, alertes email automatiques, extension navigateur pour auto-fill, et app Windows locale pour usage offline.
_Novelty :_ Combinaison surveillance + auto-fill + local-first sans dépendance à un tiers commercial.

**[Vision #2] : Family Hub**
_Concept :_ Partage sécurisé de documents et mots de passe au sein du cercle familial — transmission directe via myprout, accès multi-utilisateurs avec permissions.
_Novelty :_ Un Bitwarden familial que tu contrôles toi-même.

**[Vision #3] : Game Server Control Panel**
_Concept :_ Interface permettant à des amis de démarrer/éteindre des serveurs de jeux hébergés sur ta machine, sans intervention manuelle.
_Novelty :_ Délégation d'accès contrôlé à de l'infrastructure personnelle — un mini Pterodactyl maison.

**[Vision #4] : Personal Media Vault**
_Concept :_ Bibliothèque de films stockée et accessible via myprout, avec enregistrement pour visionnage ultérieur.
_Novelty :_ Netflix local sans abonnement.

**[Vision #5] : Sovereign Platform**
_Concept :_ Tout tourne sur ta machine — données, chiffrement, contrôle total. Myprout est une infrastructure personnelle, pas un service.
_Novelty :_ Philosophie fondatrice qui unit tous les modules.

**[Vision #6] : Zero-Friction UX**
_Concept :_ Interface pensée pour des utilisateurs non-techniques — icônes explicites, labels textuels, parcours évidents dès la première utilisation.
_Novelty :_ Outil de power-user avec la clarté d'une app grand public.

**[Fix #1] : Registration Spam Shield**
_Concept :_ Email unique dès la création — empêcher la ré-soumission d'un email déjà en attente de vérification. Branche `rework_mail_registration` déjà en cours.
_Novelty :_ Ferme le vecteur de spam par conception.

**[Fix #2] : Favorites Filter**
_Concept :_ Rendre le filtre favoris fonctionnel — actuellement cosmétique uniquement.
_Novelty :_ Petit effort, gros gain UX.

**[Fix #3] : Logout Button Relocate**
_Concept :_ Déplacer le bouton de déconnexion vers un emplacement plus logique/accessible.
_Novelty :_ UX detail critique pour les utilisateurs non-techniques.

**[Vision #7] : Clean Foundation First**
_Concept :_ Corriger les erreurs connues avant de déployer — livrer une v1 saine plutôt qu'une v1 rapide.
_Novelty :_ Discipline de refactorer avant de scaler.

**[Vision #8] : Dev/Prod Pipeline**
_Concept :_ Environnement de développement isolé, déploiement contrôlé vers la prod — zéro friction, zéro régression visible par les utilisateurs.
_Novelty :_ Workflow de release professionnel pour un projet perso self-hosted.

**[Vision #9] : Security Hardening**
_Concept :_ Audit de sécurité proactif — identifier les failles avant qu'elles soient exploitées, en particulier les vecteurs compromettant la machine hôte.
_Novelty :_ Si myprout est compromis, c'est toute la machine domestique qui l'est.

**[Vision #10] : Mobile App**
_Concept :_ Application mobile (iOS/Android) miroir de l'app Windows — gestionnaire de mots de passe natif avec accès sécurisé au serveur myprout.
_Novelty :_ Le téléphone est l'endroit où on a le plus besoin des mots de passe.

**[Vision #11] : Sovereign Mail**
_Concept :_ Messagerie email complète intégrée — envoi/réception hébergés sur ta machine, avec création d'adresses temporaires révocables pour les sites non-fiables.
_Novelty :_ SimpleLogin + ProtonMail + ton propre serveur mail. Souveraineté totale.

### Technique 2 — What If Scenarios

**[Vision #12] : One-Command Deploy**
_Concept :_ Myprout packagé en image Docker — installation en quelques minutes, utilisable par n'importe qui souhaitant héberger sa propre instance.
_Novelty :_ Transforme myprout en produit self-hostable. Le Docker est aussi le plan B personnel en cas de panne machine.

**[Vision #13] : Resilience Stack**
_Concept :_ Données sur baie RAID + backup hebdomadaire automatique. En cas de panne, remontée temporaire sur VPS en quelques minutes grâce à l'image Docker.
_Novelty :_ Myprout devient auto-résilient par design.

**[Vision #14] : Admin-Assisted Recovery**
_Concept :_ Code de secours généré à l'activation, transmis à l'admin. Permet une réinitialisation de compte si l'utilisateur perd mot de passe ET questions de sécurité.
_Novelty :_ Trade-off assumé entre sécurité E2E et récupérabilité — la clé de chiffrement dérivée du mot de passe reste le défi fondamental.

**[Vision #15] : Document Vault**
_Concept :_ Gestionnaire de documents chiffrés — cartes d'identité, contrats, photos importantes. Bloqué par l'absence de stockage dédié, à activer avec la baie RAID.
_Novelty :_ Dépendant du hardware, pas du code.

**[Vision #16] : Test Suite Foundation**
_Concept :_ Tests unitaires dès maintenant — commencer petit (routes auth, logique crypto) et scaler avec les nouvelles features.
_Novelty :_ Construire la confiance pour les déploiements prod avant que le chantier soit trop grand.

**[Vision #17] : Offline-First Apps**
_Concept :_ Apps Windows et mobile fonctionnant en mode dégradé avec données locales synchronisées — le web tombe mais les apps restent opérationnelles.
_Novelty :_ Avantage direct sur les gestionnaires cloud-only.

**[Vision #18] : Extension Password Generator**
_Concept :_ L'extension navigateur propose un mot de passe fort lors de la création d'un compte — enregistrement automatique dans myprout.
_Novelty :_ Workflow zéro friction : nouveau compte → mot de passe fort → sauvegardé.

**[Vision #19] : 2FA for myprout**
_Concept :_ Authentification à deux facteurs pour se connecter à myprout via l'app mobile. Optionnel mais recommandé pour le compte admin.
_Novelty :_ L'app mobile devient aussi la clé de sécurité de myprout.

**[Vision #20] : CSV Import**
_Concept :_ Import de mots de passe via CSV standard (Chrome/Firefox/LastPass) — migration one-shot, interface minimaliste.
_Novelty :_ Réduit le coût de migration à zéro. Sans ça, personne ne bascule.

**[Vision #21] : Offline-First Apps (confirmed)**
_Concept :_ Index alphabétique + recherche par titre déjà en place. Filtre favoris = Fix #2.
_Novelty :_ Architecture de navigation déjà solide, pas besoin de catégories/tags.

### Decisions Made

**[Décision #1] : Private Repository** — Myprout reste privé. Potentiellement montrable en entretien, mais pas open-source publiquement.

**[Décision #2] : Admin par DB** — Gestion des incidents via accès direct à la base de données. Interface admin actuelle suffisante pour le quotidien.

**[Décision #3] : No Temporary Sharing** — Pas de partage temporaire par lien — hors scope, complexité non justifiée.

### Creative Facilitation Narrative

Session ancrée dans la vision personnelle de Gaetan : myprout comme plateforme de souveraineté numérique familiale. La philosophie "tout tourne chez moi, je contrôle mes données" est apparue organiquement comme fil conducteur unissant toutes les idées. Les contraintes hardware actuelles (pas de disque supplémentaire) ont révélé des priorités claires : password manager d'abord, document vault ensuite. L'ambition email souverain est la vision long-terme la plus audacieuse et la plus cohérente avec la philosophie du projet.

---

## Idea Organization and Prioritization

### Thematic Clusters

**🔧 Theme 1 — Foundations (before launch)**
- Fix #1: Registration Spam Shield *(branch rework_mail_registration in progress)*
- Fix #2: Favorites Filter — make functional
- Fix #3: Logout Button Relocate
- Vision #7: Clean Foundation First — fix before scaling
- Vision #16: Test Suite Foundation — TU on auth routes + crypto

**🚀 Theme 2 — Launch & Infrastructure**
- Vision #8: Dev/Prod Pipeline — isolated environments, controlled deployment
- Vision #9: Security Hardening — proactive audit, protect host machine
- Vision #12: One-Command Deploy — Docker image for distribution and personal disaster recovery
- Vision #13: Resilience Stack — RAID + weekly backup + VPS fallback via Docker

**🔑 Theme 3 — Complete Password Manager**
- Vision #1: Password Fortress — breach monitoring (HIBP) + email alerts
- Vision #18: Extension Password Generator — strong password suggestion on account creation
- Vision #20: CSV Import — one-shot migration from Chrome/Firefox/LastPass
- Vision #19: 2FA for myprout — TOTP via mobile app, optional but recommended for admin
- Vision #6: Zero-Friction UX — explicit icons, text labels, non-technical family users

**📱 Theme 4 — Multi-Platform Ecosystem**
- Browser extension — auto-fill + password generator
- Windows app — offline-first local password manager
- Vision #10: Mobile App — iOS/Android, mirrors Windows app + myprout 2FA
- Vision #17: Offline-First Apps — local data sync, resilient to network outages

**👨‍👩‍👧 Theme 5 — Family & Sharing**
- Vision #2: Family Hub — multi-user, permissions, secure sharing
- Vision #14: Admin-Assisted Recovery — emergency recovery code at activation
- Vision #15: Document Vault — encrypted documents (hardware dependent: needs RAID first)

**🌐 Theme 6 — Long-Term Vision**
- Vision #3: Game Server Control Panel — friend-accessible server start/stop
- Vision #4: Personal Media Vault — local movie library
- Vision #11: Sovereign Mail — full email client + disposable/revocable addresses

### Key Decisions
- **Private Repository** — not open-source, potentially a portfolio piece for interviews
- **Admin by DB** — emergency incident management via direct database access
- **No Temporary Sharing** — out of scope, complexity not justified for family use

### Prioritization Results

**Top Priority (do now):** Fix #1, Fix #2, Fix #3, Test Suite Foundation
**Critical Path to Launch:** Dev/Prod Pipeline → Security Hardening → Deploy v1
**Highest Impact Post-Launch:** CSV Import (adoption), Extension auto-fill (daily use), Breach Monitoring (trust)
**Breakthrough Concept:** Sovereign Mail — most ambitious, most coherent with the sovereignty philosophy
**Hardware-Gated:** Document Vault, RAID resilience stack

---

## Myprout Roadmap

### 🟥 Phase 0 — Foundations (now, before anything else)
1. Complete `rework_mail_registration` — unique email, anti-spam registration
2. Fix favorites filter — make it functional
3. Relocate logout button
4. Set up basic unit tests (auth routes, crypto logic)

### 🟧 Phase 1 — Launch
5. Separate dev / prod environments
6. Security audit — code review, hardening, host machine protection
7. Deploy v1 live on `myprout.fr`
8. Package as Docker image

### 🟨 Phase 2 — Complete Password Manager
9. Breach monitoring — Have I Been Pwned integration + email alerts
10. CSV Import — migration from Chrome/Firefox/LastPass
11. Browser extension — auto-fill + password generator
12. 2FA for myprout login (via future mobile app)

### 🟩 Phase 3 — Multi-Platform
13. Windows app (offline-first local password manager)
14. Mobile app (iOS/Android) — password manager + myprout 2FA
15. Automatic offline → online sync

### 🟦 Phase 4 — Family & Resilience
16. Multi-user family — permissions, secure sharing
17. RAID array + weekly automated backup
18. Document Vault (conditional: hardware available)
19. Admin-Assisted Recovery — emergency code generated at activation

### 🟪 Phase 5 — Long-Term Vision
20. Game Server Control Panel
21. Personal Media Vault
22. Sovereign Mail + revocable disposable addresses

---

## Session Summary and Insights

**Key Achievements:**
- 21 ideas generated across 6 thematic areas
- Complete product vision from "fix the bug today" to "own your email in 2028"
- Clear sequenced roadmap with hardware-gated and dependency-aware phases
- 3 explicit scope decisions preventing feature creep

**Core Insight:** Myprout is not a password manager — it is a **personal digital sovereignty platform**, self-hosted, family-first, where even your email belongs to you. The password manager is just the entry point.

**Breakthrough Moment:** The Docker image revelation — not just a distribution tool, but Gaetan's own disaster recovery plan. One image, one command, back online in minutes anywhere.

**Constraint that shaped everything:** No extra hardware today. The roadmap respects this: software-first phases (0–2), then hardware-enabled phases (4+) when resources allow.

**Session completed:** 2026-06-08
