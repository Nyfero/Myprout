# Documentation technique — myprout

> Gestionnaire de mots de passe auto-hébergé avec chiffrement de bout en bout (E2E) côté client.
> Les mots de passe sont chiffrés dans le navigateur en **AES-256-GCM** avant d'être envoyés au serveur : **le serveur ne voit jamais les données en clair.**

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Stack & dépendances clés](#3-stack--dépendances-clés)
4. [Modèle de données (Prisma / MySQL)](#4-modèle-de-données-prisma--mysql)
5. [Sécurité & cryptographie](#5-sécurité--cryptographie)
6. [Parcours d'inscription](#6-parcours-dinscription-multi-étapes-avec-validation-admin)
7. [Référence API](#7-référence-api)
8. [Frontend — fonctionnement](#8-frontend--fonctionnement)
9. [Configuration & variables d'environnement](#9-configuration--variables-denvironnement)
10. [Installation & exécution](#10-installation--exécution)
11. [Service email](#11-service-email)
12. [Diagrammes de séquence](#12-diagrammes-de-séquence)
13. [Problèmes connus & dette technique](#13-problèmes-connus--dette-technique)
14. [Tests](#14-tests)
15. [Déploiement](#15-déploiement)
16. [Fonctionnalités désactivées & pistes](#16-fonctionnalités-désactivées--pistes)
17. [Cartographie des composants frontend](#17-cartographie-des-composants-frontend)
18. [Migrations de base de données](#18-migrations-de-base-de-données)
19. [Dépannage (FAQ technique)](#19-dépannage-faq-technique)
20. [Glossaire](#20-glossaire)

---

## 1. Vue d'ensemble

| Aspect | Détail |
|---|---|
| Type d'application | Gestionnaire de mots de passe, web, auto-hébergé |
| Modèle de sécurité | Zero-knowledge — chiffrement/déchiffrement uniquement côté client |
| Frontend | Vue 3 + Vite + Pinia + Vue Router (port `5173`) |
| Backend | Express 5 + TypeScript (ESM) + Prisma ORM (port `3000`) |
| Base de données | MySQL |
| Emails | Nodemailer (SMTP / Mailtrap) + Resend |
| Domaine prod | `https://myprout.fr` |

### Principe directeur

Le serveur stocke uniquement des **données chiffrées** (`encrypted_crypto_key`, entrées de mots de passe chiffrées) et des **empreintes** (hash bcrypt du mot de passe, hash SHA-256 des tokens). La clé qui permet de déchiffrer les mots de passe (`crypto_key`) n'existe en clair **que dans la mémoire du navigateur** (objet WebCrypto `CryptoKey` non sérialisable), jamais sur le serveur ni dans le `localStorage`.

---

## 2. Architecture générale

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   Frontend (Vue 3 / Vite)   │         │   Backend (Express / Prisma) │
│                             │  HTTPS  │                              │
│  - WebCrypto (AES-256-GCM)  │◄───────►│  - Routes /api/auth          │
│  - Pinia authStore          │  JSON   │  - Routes /api/admin         │
│  - Axios api.js (intercept.)│  +cookie│  - Routes /api/passwords     │
│  - crypto_key en mémoire    │         │  - Node crypto (KEK/cryptokey)│
└─────────────────────────────┘         └──────────────┬───────────────┘
                                                        │
                                                  ┌─────▼─────┐
                                                  │   MySQL   │
                                                  │  (Prisma) │
                                                  └───────────┘
```

### Arborescence

```
myprout/
├── start.js                      # Lance migrate + frontend + backend (prod/dev)
├── package.json                  # Scripts racine (dev via concurrently)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Modèle de données
│   │   ├── migrations/           # Historique des migrations SQL
│   │   ├── seed.ts               # Création de l'admin initial
│   │   └── reset.ts
│   └── src/
│       ├── index.ts              # Bootstrap Express + CORS + montage des routes
│       ├── prisma.ts             # Client Prisma singleton
│       ├── routes/
│       │   ├── auth.ts           # Inscription, login, tokens, reset, recovery
│       │   ├── admin.ts          # Validation/refus des comptes en attente
│       │   └── passwords.ts      # CRUD entrées chiffrées + proxy logo
│       ├── middlewares/
│       │   ├── authMiddleware.ts # Vérifie le JWT + présence en DB
│       │   └── isAdmin.ts        # Contrôle du rôle Admin
│       ├── services/email/       # Templates HTML + envoi des mails
│       └── utils/
│           ├── crypto.ts         # KEK (PBKDF2), chiffrement crypto_key
│           └── jwt.ts            # Signature RS256, hash de tokens
└── frontend/
    └── src/
        ├── main.js               # Bootstrap Vue + Pinia + router
        ├── router/index.ts       # Routes + guards (auth, admin, lock)
        ├── stores/authStore.js   # État d'authentification + crypto_key
        ├── services/api.js       # Axios + interceptors (refresh auto)
        ├── utils/crypto.js       # WebCrypto (KEK, chiffrement mdp)
        ├── composables/useInactivity.js  # Déconnexion après inactivité
        ├── views/                # Pages (Login, Passwords, Profile, Admin, Unlock…)
        └── components/           # Login, passwords, modals, profil, admin, UI
```

---

## 3. Stack & dépendances clés

### Backend (`backend/package.json`)
- **express** `^5.1.0`, **@prisma/client** / **prisma** `^5.22.0`
- **jsonwebtoken** `^9.0.2` (JWT **RS256**, clés asymétriques)
- **bcrypt** `^6.0.0` (hash mots de passe & réponses de sécurité, coût 12)
- **cookie-parser**, **cors**, **dotenv**
- **nodemailer** `^8.0.4`, **resend** `^6.9.4`
- Exécution : `tsx` / `nodemon` (TypeScript ESM sans build préalable)

### Frontend (`frontend/package.json`)
- **vue** `^3.5`, **vue-router** `^4.5`, **pinia** `^3.0`
- **axios** `^1.12`
- **@fortawesome/*** (icônes)
- **vite** `^6.2`

---

## 4. Modèle de données (Prisma / MySQL)

Schéma : `backend/prisma/schema.prisma`.

### `users`
| Champ | Type | Rôle |
|---|---|---|
| `user_id` | Int (PK) | Identifiant |
| `firstName`, `lastName`, `email` | String | Identité (`email` unique) |
| `password_hash` | String? | Hash bcrypt du mot de passe maître |
| `is_active` | Boolean | Compte validé par un admin |
| `is_email_verified` | Boolean | Email confirmé |
| `encrypted_crypto_key` | Text | `crypto_key` chiffrée par la KEK (dérivée du mot de passe) |
| `kek_salt` | VarChar(64) | Sel PBKDF2 (hex) pour dériver la KEK |
| `recovery_questions` | Json? | Questions + réponses (hashées bcrypt) |
| `recovery_encrypted_crypto_key` | String? | `crypto_key` chiffrée par la KEK de récupération |
| `created_at`, `updated_at` | DateTime | Horodatage |

### `tokens`
Tous les tokens (accès, refresh, vérification, etc.) sont stockés **hashés (SHA-256)**, jamais en clair.

| Champ | Type | Rôle |
|---|---|---|
| `token_id` | Int (PK) | |
| `user_id` | Int (FK) | |
| `token_hash` | String (unique) | SHA-256 du token |
| `type` | String | `email_verification` \| `activate` \| `access` \| `refresh` \| `password_reset` |
| `expires_at` | DateTime? | Expiration (nullable pour la vérification d'email) |

### `passwords`
Chaque entrée appartient à un utilisateur. Les champs sensibles contiennent du **texte chiffré**.

| Champ | Type | Note |
|---|---|---|
| `password_id` | Int (PK) | |
| `user_id` | Int (FK) | |
| `title`, `username`, `password`, `email`, `note` | String/Text | Valeurs chiffrées côté client |
| `is_compromised`, `is_stared`, `is_deleted` | Boolean | Drapeaux |
| `deleted_time` | DateTime? | Suppression douce |

### `roles` / `userRoles`
RBAC simple. `role_id = 1` → `Admin` ; `role_id = 2` → utilisateur standard (assigné à la validation). `userRoles` est une table de jointure à clé composite `(user_id, role_id)`.

---

## 5. Sécurité & cryptographie

> C'est le cœur du projet. Backend : `backend/src/utils/crypto.ts` (module Node `crypto`). Frontend : `frontend/src/utils/crypto.js` (WebCrypto). Les deux utilisent **AES-256-GCM** avec le format hex `iv:tag:ciphertext`.

### 5.1 Hiérarchie des clés

```
Mot de passe utilisateur
        │  PBKDF2 (310 000 itérations, SHA-256, sel = kek_salt)
        ▼
       KEK  (Key Encryption Key, 256 bits)
        │  AES-256-GCM
        ▼
   crypto_key  (256 bits, générée aléatoirement à l'activation)
        │  AES-256-GCM
        ▼
  Entrées de mots de passe (title, username, password, note…)
```

- **`crypto_key`** : clé maître aléatoire (256 bits) générée **une seule fois** à l'activation du compte. C'est elle qui chiffre/déchiffre chaque entrée.
- **KEK** : dérivée du mot de passe via PBKDF2 (310 000 itérations). Sert uniquement à chiffrer la `crypto_key`. Changer de mot de passe = re-chiffrer la `crypto_key` avec une nouvelle KEK, **sans toucher aux entrées**.
- Stockage : seul `encrypted_crypto_key` (la `crypto_key` chiffrée) et `kek_salt` sont en base. La `crypto_key` en clair n'existe qu'en mémoire navigateur (`authStore.crypto_key`).

### 5.2 Format de chiffrement

- **`crypto_key`** chiffrée : `iv(hex):tag(hex):ciphertext(hex)` (séparés par `:`).
- **Entrées de mots de passe** : `base64( iv(12o) || ciphertext||tag )` — voir `encryptPassword` / `decryptPassword` dans `frontend/src/utils/crypto.js`.

### 5.3 Récupération (recovery)

À l'activation, l'utilisateur fournit des **questions de sécurité**. Les réponses sont :
1. Normalisées (`toLowerCase`, suppression des espaces) puis concaténées → une *passphrase de récupération*.
2. Utilisées pour dériver une **KEK de récupération** (PBKDF2, même `kek_salt`).
3. Cette KEK chiffre une copie de la `crypto_key` → `recovery_encrypted_crypto_key`.
4. Les réponses individuelles sont aussi **hashées bcrypt** (`recovery_questions`) pour vérification.

En cas d'oubli du mot de passe, l'utilisateur répond aux questions → le serveur vérifie les hash bcrypt → renvoie `recovery_encrypted_crypto_key` + `kek_salt` → le client déchiffre la `crypto_key` et la re-chiffre avec une KEK dérivée du nouveau mot de passe.

### 5.4 Authentification & tokens

| Token | Algo / forme | Durée | Transport | Stockage DB |
|---|---|---|---|---|
| **Access** | JWT RS256 | 15 min | header `Authorization: Bearer` | hash SHA-256 (`type=access`) |
| **Refresh** | aléatoire 32 o hex | 7 jours | cookie `httpOnly` `refreshToken` | hash SHA-256 (`type=refresh`) |
| **email_verification** | aléatoire | — | lien email | hash SHA-256 |
| **activate** | JWT RS256 | 7 jours | lien email | hash SHA-256 |
| **password_reset** | aléatoire | 1 h | lien email | hash SHA-256 |

Points clés :
- Les JWT sont signés en **RS256** avec une paire de clés (`JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH`).
- **Chaque token est aussi stocké hashé en DB** et vérifié à chaque requête (`authMiddleware.ts`) → les tokens sont **révocables** (logout = suppression en DB).
- Le cookie refresh est `httpOnly`, `sameSite: strict`, et `secure` en production.
- Le refresh effectue une **rotation** : nouveau refresh token + nouvel access token à chaque appel.

### 5.5 Surface de durcissement / points d'attention

- `baseURL` est **codé en dur** à `http://localhost:3000/api` dans `frontend/src/services/api.js` → à externaliser (variable `VITE_API_BASE_URL`) pour la prod.
- CORS : liste blanche d'origines dans `backend/src/index.ts` (`localhost:5173`, `localhost:3000`, `myprout.fr`).
- `PATCH /api/passwords/:id/is_stared` ne filtre pas par `user_id` (contrairement aux autres routes) → IDOR potentiel à corriger.

---

## 6. Parcours d'inscription (multi-étapes, avec validation admin)

```
1. POST /api/auth/register
   → crée un user (is_active=false, is_email_verified=false)
   → envoie un email de vérification (token email_verification)

2. POST /api/auth/verify-email  (lien cliqué)
   → is_email_verified=true ; notifie l'admin

3. POST /api/admin/approve/:user_id   (admin, isAdmin)
   → is_active=true ; assigne le rôle (role_id=2)
   → envoie l'email d'activation (JWT activate, 7 j)

4. POST /api/auth/activate  (lien d'activation)
   → l'utilisateur définit son mot de passe + questions de sécurité
   → génération crypto_key + kek_salt
   → calcul encrypted_crypto_key et recovery_encrypted_crypto_key

5. POST /api/auth/login  → l'utilisateur peut se connecter
```

L'admin peut aussi refuser : `DELETE /api/admin/reject/:user_id` (supprime le compte + email de refus).

---

## 7. Référence API

Base : `http://localhost:3000/api`. 🔒 = nécessite `authMiddleware` (Bearer access token). 👑 = nécessite le rôle Admin.

### Auth (`/api/auth`)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/register` | Inscription (email, firstName, lastName) |
| POST | `/verify-email` | Vérifie l'email via token |
| POST | `/activate` | Définit mot de passe + questions ; active le compte |
| POST | `/login` | Connexion → access token + cookie refresh + données user |
| POST | `/logout` | Supprime les tokens DB + efface le cookie |
| POST | `/refresh` | Rotation refresh + nouvel access token |
| 🔒 PUT | `/password` | Change le mot de passe (re-chiffre la crypto_key) |
| 🔒 POST | `/password/verify` | Vérifie le mot de passe (déverrouillage) |
| POST | `/password/forgot` | Envoie l'email de récupération |
| PUT | `/password/reset` | Réinitialise le mot de passe via token |
| GET | `/recovery?token=` | Récupère les questions de sécurité |
| POST | `/recovery/verify` | Vérifie les réponses → renvoie recovery key |
| 🔒 DELETE | `/account` | Supprime le compte (vérif. mot de passe) |

### Admin (`/api/admin`) — 🔒👑
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/approve/:user_id` | Valide un compte + email d'activation |
| DELETE | `/reject/:user_id` | Refuse et supprime le compte |
| GET | `/pending-users` | Liste les comptes en attente |

### Passwords (`/api/passwords`) — 🔒
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/` | Liste les entrées de l'utilisateur (triées par titre) |
| POST | `/` | Crée une entrée (valeurs déjà chiffrées) |
| PUT | `/:id` | Met à jour une entrée |
| DELETE | `/:id` | Supprime une entrée |
| PATCH | `/:id/is_stared` | Marque/démarque comme favori |
| GET | `/logo?domain=` | Proxy favicon via logo.dev (non authentifié) |

---

## 8. Frontend — fonctionnement

### 8.1 Store d'authentification (`stores/authStore.js`)
État : `isAuthenticated`, `user`, `token`, `crypto_key`, `isLoggingIn`.
- **`initAuth()`** — appelé une fois à la première navigation : tente un `/auth/refresh` pour restaurer la session.
- **`login()`** — stocke les données user dans `localStorage` (jamais la `crypto_key`, qui reste en mémoire Pinia).
- **`unlockKey(password)`** — vérifie le mot de passe puis re-dérive la `crypto_key` en mémoire (déverrouillage).
- **`logout()`** — appelle `/auth/logout`, vide l'état et le `localStorage`.
- Getter **`isLocked`** = `isAuthenticated && !crypto_key`.

### 8.2 Mécanisme de verrouillage (lock)
Après un rafraîchissement de page, l'utilisateur reste **authentifié** (cookie refresh) mais la `crypto_key` disparaît de la mémoire → `isLocked = true`. Le guard du routeur redirige vers `/unlock` (`UnlockView`), qui redemande le mot de passe pour re-dériver la `crypto_key`.

### 8.3 Guards de routage (`router/index.ts`)
- `requiresAuth` → redirige vers `/login` si non authentifié.
- `requiresAuth && isLocked` → redirige vers `/unlock` (avec `redirect` en query).
- `requiresAdmin` → réservé aux administrateurs.
- Routes actives : `/login`, `/password`, `/unlock`, `/profile`, `/admin`. (Files/Games/Movies désactivées.)

### 8.4 Client API (`services/api.js`)
Instance Axios avec deux interceptors :
1. **Requête** : ajoute `Authorization: Bearer <token>` depuis le store.
2. **Réponse** : sur `401`, **met en file d'attente** les requêtes concurrentes et tente un `/auth/refresh` ; en cas d'échec → `logout()` + redirection `/login`. Les appels à `/auth/refresh` et `/auth/login` ne déclenchent pas le retry.

### 8.5 Déconnexion par inactivité
`composables/useInactivity.js` : déconnexion complète après **20 minutes** d'inactivité.

---

## 9. Configuration & variables d'environnement

Fichier `backend/.env` (modèle dans `backend/.exemple_env`) :

```dotenv
# Base de données
DATABASE_URL="mysql://user:password@localhost:3306/myprout"

# Admin initial (seed)
ADMIN_EMAIL=john.doe@mail.com
ADMIN_PASSWORD='password'
ADMIN_FIRSTNAME=John
ADMIN_LASTNAME=Doe

# JWT (RS256 — paire de clés)
JWT_PRIVATE_KEY_PATH=./keys/private_key.pem
JWT_PUBLIC_KEY_PATH=./keys/public_key.pem

# Frontend / mails
FRONTEND_URL=http://localhost:5173
MAILTRAP_USER=...
MAILTRAP_PASSWORD=...

# Proxy logo
LOGO_DEV_TOKEN=...

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:3000
```

Génération des clés JWT (RS256) :
```bash
mkdir -p backend/keys
openssl genrsa -out backend/keys/private_key.pem 2048
openssl rsa -in backend/keys/private_key.pem -pubout -out backend/keys/public_key.pem
```

---

## 10. Installation & exécution

### Prérequis
- Node.js (ESM), MySQL, npm.

### Mise en route
```bash
# 1. Dépendances
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. Configurer backend/.env (voir §9) + générer les clés JWT

# 3. Base de données
npm run prisma:migrate --prefix backend   # applique les migrations
# (seed admin via la config prisma.seed → ts-node seed.ts)

# 4. Démarrage
npm run dev        # frontend (5173) + backend (3000) via concurrently
# ou
npm start          # via start.js : prisma migrate deploy + frontend + backend
```

### Scripts utiles
| Commande | Emplacement | Effet |
|---|---|---|
| `npm run dev` | racine | Lance front + back en parallèle |
| `npm start` | racine | Migrate deploy + front + back (`start.js`) |
| `npm run dev` | `backend/` | `nodemon` sur `src/index` |
| `npm run prisma:migrate` | `backend/` | `prisma migrate dev` |
| `npm run prisma:studio` | `backend/` | GUI Prisma Studio |
| `npm run dev` / `build` / `preview` | `frontend/` | Vite |

---

## 11. Service email

`backend/src/services/email/` — envoi via Nodemailer/Resend. Templates HTML :
- `EmailValidation.html` — confirmation d'adresse email.
- `Admin.html` — notification d'une demande d'inscription à l'admin.
- `Activate.html` — lien d'activation après validation admin.
- `Refuse.html` — refus d'inscription.
- `Recovery.html` — récupération de mot de passe.

---

## 12. Diagrammes de séquence

> Diagrammes au format **Mermaid** (rendus nativement par GitHub/GitLab et la plupart des éditeurs Markdown). Acteurs : **U** = utilisateur/navigateur, **F** = frontend Vue (`Login.vue`/`Recovery.vue`/`api.js`/`authStore`), **B** = backend Express, **DB** = MySQL.

### 12.1 Login (`POST /api/auth/login`)

Le serveur authentifie, émet les tokens et renvoie `kek_salt` + `encrypted_crypto_key` ; **la `crypto_key` est déchiffrée uniquement côté client** puis gardée en mémoire.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (Login.vue)
    participant B as Backend (auth.ts)
    participant DB as MySQL

    U->>F: Saisit email + mot de passe
    F->>B: POST /auth/login { email, password }
    B->>DB: findFirst(users) + userRoles
    DB-->>B: user (password_hash, kek_salt, encrypted_crypto_key)
    B->>B: Vérifs is_email_verified / is_active / password_hash
    B->>B: bcrypt.compare(password, password_hash)
    alt Identifiants invalides ou compte non actif
        B-->>F: 401 / 403 { error }
        F-->>U: Message d'erreur
    else Succès
        B->>B: accessToken = JWT RS256 (15 min) + refreshToken aléatoire
        B->>DB: delete anciens tokens (access/refresh/reset)
        B->>DB: create tokens hashés (SHA-256) access + refresh
        B-->>F: 200 { token, user{ kek_salt, encrypted_crypto_key, isAdmin } }<br/>+ Set-Cookie refreshToken (httpOnly)
        F->>F: unlockCryptoKey(password, kek_salt, encrypted_crypto_key)
        Note over F: PBKDF2 → KEK → AES-GCM décrypte<br/>la crypto_key → importKey (WebCrypto)
        F->>F: authStore.login(user, token, crypto_key)
        Note over F: crypto_key en mémoire Pinia<br/>(jamais dans localStorage)
        F-->>U: Redirection vers /password
    end
```

### 12.2 Refresh (`POST /api/auth/refresh`)

Déclenché soit au **chargement de l'app** (`authStore.initAuth`), soit automatiquement par l'**interceptor Axios** sur une réponse `401`. Effectue une **rotation** du refresh token. À noter : la `crypto_key` n'est **pas** restaurée par le refresh → après un rechargement de page l'utilisateur est `isLocked` et doit passer par `/unlock`.

```mermaid
sequenceDiagram
    autonumber
    participant F as Frontend (api.js / authStore)
    participant B as Backend (auth.ts)
    participant DB as MySQL

    Note over F: 401 sur une requête OU initAuth() au démarrage
    F->>B: POST /auth/refresh (cookie refreshToken)
    B->>B: hashToken(refreshToken) [SHA-256]
    B->>DB: findUnique(tokens) by token_hash + user/roles
    alt Token absent
        B-->>F: 401 { error: refresh invalide }
        F->>F: authStore.logout()
        F-->>F: Redirection /login
    else Token expiré
        B->>DB: delete(token)
        B-->>F: 401 { error: refresh expiré }
        F->>F: logout() + /login
    else Token valide
        B->>B: newRefreshToken aléatoire + newAccessToken JWT (15 min)
        B->>DB: delete tokens type access
        B->>DB: update refresh (nouveau hash, +7 j) + create access hashé
        B-->>F: 200 { token, user } + Set-Cookie nouveau refreshToken
        F->>F: authStore.token = token (requêtes en file rejouées)
    end
```

### 12.3 Recovery — mot de passe oublié

Flux en **deux phases**. Le serveur ne peut pas déchiffrer la `crypto_key` : c'est la *passphrase* dérivée des réponses aux questions de sécurité qui la déverrouille, côté client, via `recovery_encrypted_crypto_key`.

**Phase A — demande du lien** (`POST /auth/password/forgot`) : réponse toujours `200` (anti-énumération de comptes).

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (Login.vue)
    participant B as Backend (auth.ts)
    participant DB as MySQL
    participant M as Email (Resend/SMTP)

    U->>F: « Mot de passe oublié » + email
    F->>B: POST /auth/password/forgot { email }
    B->>DB: findFirst(users)
    alt User absent ou inactif
        B-->>F: 200 { success } (aucun mail — anti-énumération)
    else User actif
        B->>DB: delete anciens tokens password_reset
        B->>DB: create token password_reset (hashé, exp. 1 h)
        B->>M: sendRecoveryToUser(user, token)
        B-->>F: 200 { success }
    end
    F-->>U: « Email envoyé, vérifiez vos spams »
```

**Phase B — réinitialisation via le lien** : vérification des questions, déchiffrement de la `crypto_key`, re-chiffrement avec le nouveau mot de passe.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (Recovery.vue → Password.vue)
    participant B as Backend (auth.ts)
    participant DB as MySQL

    U->>F: Ouvre le lien de réinitialisation (?token=…)
    F->>B: GET /auth/recovery?token=… 
    B->>DB: findFirst(tokens type=password_reset) + user
    B-->>F: 200 { questions[] } (libellés seulement)
    U->>F: Saisit ses réponses
    F->>B: POST /auth/recovery/verify { token, security_questions }
    B->>B: Normalise (lowercase, sans espaces) + bcrypt.compare(chaque réponse)
    alt Réponses incorrectes
        B-->>F: 401 { error: Réponses incorrectes }
        F-->>U: Erreur
    else Réponses correctes
        B-->>F: 200 { recovery_encrypted_crypto_key, kek_salt }
        F->>F: passphrase = concat(réponses normalisées)
        F->>F: KEK_recovery = PBKDF2(passphrase, kek_salt)
        F->>F: crypto_key = AES-GCM.decrypt(recovery_encrypted_crypto_key)
        Note over F: La crypto_key (hex) est récupérée côté client
        U->>F: Saisit le nouveau mot de passe
        F->>F: KEK_new = PBKDF2(newPassword, kek_salt)
        F->>F: encrypted_crypto_key = AES-GCM.encrypt(crypto_key, KEK_new)
        F->>B: PUT /auth/password/reset { token, encrypted_crypto_key, password }
        B->>B: bcrypt.hash(newPassword, 12)
        B->>DB: update user (password_hash, encrypted_crypto_key) + delete token
        B-->>F: 200 { message }
        F-->>U: « Mot de passe réinitialisé », redirection login
    end
```

> ⚠️ **Incohérence repérée dans le code** : `GET /auth/recovery` recherche le token avec `type: 'password_reset'`, mais `POST /auth/recovery/verify` le recherche avec `type: 'activate'` (`backend/src/routes/auth.ts`). Comme le flux « mot de passe oublié » crée un token `password_reset`, l'étape `verify` ne retrouvera pas ce token. À aligner sur `password_reset` (cf. §5.5).

---

## 13. Problèmes connus & dette technique

> Anomalies relevées lors de la rédaction de cette documentation, à partir du code source. À traiter avant une mise en production sérieuse. Sévérité indicative : 🔴 critique · 🟠 important · 🟡 mineur.

| # | Sévérité | Localisation | Problème | Correctif suggéré |
|---|---|---|---|---|
| 1 | 🔴 | `routes/auth.ts` (`/recovery/verify`) | Recherche le token avec `type: 'activate'` alors que le flux « mot de passe oublié » crée un token `password_reset`. La vérification des questions ne retrouve donc jamais le token → récupération cassée. | Remplacer `type: 'activate'` par `type: 'password_reset'`. |
| 2 | 🔴 | `prisma/seed.ts` vs `routes/auth.ts` | Le seed crée le rôle `role: 'ADMIN'`, mais le calcul `isAdmin` compare à `'Admin'` (`ur.role.role === 'Admin'`). L'admin initial n'est donc **pas** reconnu comme administrateur. | Uniformiser la casse (`'Admin'` partout) ou comparer en *insensible à la casse*. |
| 3 | 🟠 | `routes/passwords.ts` (`PATCH /:id/is_stared`) | La requête `update` ne filtre **pas** par `user_id` (contrairement aux autres routes CRUD) → un utilisateur authentifié peut modifier le favori d'une entrée appartenant à autrui (IDOR). | Ajouter `user_id: req.user.user_id` à la clause `where`. |
| 4 | 🟠 | `frontend/src/services/api.js` | `baseURL` codé en dur à `http://localhost:3000/api` ; la variable `VITE_API_BASE_URL` du `.env` n'est pas utilisée. | Lire `import.meta.env.VITE_API_BASE_URL`. |
| 5 | 🟠 | `Password.vue` (`handleSubmit`) | La validation des critères de robustesse du mot de passe est **commentée** (lignes ~168-171) ; aucun contrôle de robustesse n'est appliqué non plus côté serveur lors de `activate` / `password/reset`. | Réactiver la validation côté client **et** valider côté serveur. |
| 6 | 🟡 | `routes/admin.ts` (`/approve/:user_id`) | Expiration du token `activate` calculée `7 * 24 * 60 * 1000` (≈ 7 min, l'unité « secondes » est omise) au lieu de `7 * 24 * 60 * 60 * 1000` (7 jours annoncés dans le mail). | Corriger le calcul d'expiration. |
| 7 | 🟡 | `routes/auth.ts` (`/refresh`) | `storedToken.expires_at < new Date()` est évalué sans garde si `expires_at` est `null` (possible selon le schéma). | Vérifier la nullité avant comparaison. |

Ces points sont volontairement **documentés et non corrigés** dans cette passe ; ils servent de référence pour une future itération.

---

## 14. Tests

**État actuel : aucun test automatisé** n'est présent dans le dépôt (ni backend, ni frontend, ni e2e).

Pistes recommandées :
- **Backend** : tests d'intégration des routes (`vitest` + `supertest`) avec une base MySQL de test ou un schéma SQLite éphémère. Cibler en priorité les flux sensibles : `login`, `refresh`, `activate`, `recovery/verify`.
- **Crypto** : tests unitaires de round-trip `deriveKek` → `encryptCryptoKey` → `decryptCryptoKey`, et de compatibilité **back ↔ front** (même format `iv:tag:ciphertext`, mêmes paramètres PBKDF2).
- **Frontend** : tests de composants (`vitest` + `@vue/test-utils`) sur `Login.vue` / `Recovery.vue`, et e2e (`Playwright`/`Cypress`) sur le parcours connexion + verrouillage/déverrouillage.

---

## 15. Déploiement

> Aucune configuration de CI/CD, Docker ou reverse-proxy n'est versionnée à ce jour. Repères pour une mise en production manuelle.
>
> 📋 **Checklist complète** avant déploiement : [`CHECKLIST_MISE_EN_LIGNE.md`](CHECKLIST_MISE_EN_LIGNE.md).

### Points à adapter avant la prod
1. **Frontend** : remplacer le `baseURL` codé en dur (cf. §13-4) par `VITE_API_BASE_URL` et builder avec `npm run build --prefix frontend` (sortie statique `frontend/dist`).
2. **CORS** : la liste blanche (`backend/src/index.ts`) inclut déjà `https://myprout.fr`. Ajuster selon le domaine réel.
3. **Cookies** : `secure: process.env.NODE_ENV === 'production'` → définir `NODE_ENV=production` pour activer le cookie `Secure`.
4. **Clés JWT** : générer une paire RS256 dédiée à la prod (cf. §9) et **ne pas** la versionner.
5. **Base de données** : appliquer les migrations avec `prisma migrate deploy` (déjà fait par `start.js`).
6. **HTTPS** : servir derrière un reverse-proxy (nginx/Caddy) avec TLS ; le frontend statique et l'API doivent être joignables en HTTPS (le cookie `sameSite: strict` impose une cohérence d'origine).

### Démarrage type
```bash
# Backend (port 3000)
NODE_ENV=production node start.js
# ou séparément : npx prisma migrate deploy && npx tsx src/index.ts
```

---

## 16. Fonctionnalités désactivées & pistes

Éléments présents dans le code mais inactifs — utiles pour comprendre l'intention produit :

- **Vues `Files`, `Games`, `Movies`** (`frontend/src/views/`) : importées mais **commentées** dans `router/index.ts`. Le projet vise apparemment au-delà du seul coffre de mots de passe.
- **Vue `Home`** : route racine `/` commentée ; la navigation redirige par défaut vers `/login`.
- **Modèle `ipAddress`** (`schema.prisma`) : commenté — prévoyait un suivi/filtrage des connexions par IP/pays.
- **Champs `passwords`** non exposés par l'API : `email`, `is_compromised`, `is_deleted`, `deleted_time` (suppression douce et détection de compromission envisagées mais non câblées dans les routes CRUD actuelles).

---

## 17. Cartographie des composants frontend

> Point d'entrée : `main.js` → monte `App.vue` avec Pinia + Vue Router. Les **vues** (`views/`) sont les cibles des routes ; elles composent des **composants** (`components/`) et s'appuient sur des **composables** (`composables/`) pour la logique réutilisable.

### Vues (`src/views/`)
| Vue | Route | Rôle |
|---|---|---|
| `LoginView.vue` | `/login` | Conteneur connexion/inscription (orchestre `Login`, `Register`, `Password`, `Recovery`, `VerifyEmail`) |
| `PasswordsView.vue` | `/password` | Coffre principal : liste et gestion des entrées |
| `UnlockView.vue` | `/unlock` | Re-déverrouillage de la `crypto_key` après rechargement |
| `ProfileView.vue` | `/profile` | Profil, sécurité, compte géré |
| `AdminView.vue` | `/admin` | Console d'administration (validation des comptes) |
| `HomeView` / `FilesView` / `GamesView` / `MoviesView` | — | **Désactivées** (routes commentées, cf. §16) |

### Composants clés (`src/components/`)
| Domaine | Composant | Rôle |
|---|---|---|
| **login** | `Login.vue` | Connexion + « mot de passe oublié » (envoi du lien) |
| | `Register.vue` | Formulaire d'inscription |
| | `VerifyEmail.vue` | Validation de l'adresse email via token |
| | `Password.vue` | Définition (`set`) ou réinitialisation (`reset`) du mot de passe |
| | `Recovery.vue` | Questions de sécurité (`set` à l'activation, `verify` en récupération) |
| **passwords** | `PasswordsList.vue` | Liste groupée des entrées |
| | `PasswordsCard.vue` | Carte d'une entrée (afficher/copier/éditer) |
| | `PasswordsAlphabet.vue` | Navigation alphabétique latérale |
| **modals** | `PasswordsModal.vue` | Création/édition d'une entrée |
| | `changePasswordModal.vue` | Changement de mot de passe (re-chiffre la `crypto_key`) |
| | `deleteAccountModal.vue` | Suppression de compte |
| **profile** | `profile.vue` / `security.vue` / `managedAccount.vue` | Sous-écrans du profil |
| **admin** | `Users.vue` | Liste et validation/refus des utilisateurs en attente |
| **ui** | `Navbar.vue`, `BaseModal.vue`, `Toast.vue` | Briques d'interface transverses |
| **background** | `DustParticles.vue` | Effet visuel d'arrière-plan |

### Composables (`src/composables/` & locaux)
| Composable | Rôle |
|---|---|
| `usePasswords.js` | Cœur du coffre : CRUD, **chiffrement/déchiffrement** (`encryptPassword`/`decryptPassword`), filtrage, groupage alphabétique, favoris, chargement des logos |
| `useProfile.js` | Logique de l'écran profil |
| `useInactivity.js` | Déconnexion automatique après **20 min** d'inactivité (écoute `mousemove`, `keydown`, `click`, `scroll`, `touchstart`) |
| `useDustDirection.js` | Animation de l'arrière-plan |

> **Note technique** : `usePasswords.js` récupère les logos via une URL **codée en dur** `http://localhost:3000/api/passwords/logo` (même problème que §13-4 — à externaliser pour la prod).

---

## 18. Migrations de base de données

Les migrations Prisma sont versionnées dans `backend/prisma/migrations/`. Elles racontent l'évolution du modèle, notamment l'introduction progressive du chiffrement et du *recovery*. Appliquer avec `prisma migrate dev` (développement) ou `prisma migrate deploy` (production).

| Date (préfixe) | Migration | Apport |
|---|---|---|
| 2025-09-19 → 09-26 | `*_init` (×7) | Schéma initial (users, passwords, tokens…) |
| 2025-10-01 | `add_approval_flow` (×2) | Flux de validation des comptes par un admin |
| 2026-02-26 | `fix_token_length` | Correction de la longueur des tokens |
| 2026-02-28 | `user_roles` | Tables `roles` / `userRoles` (RBAC) |
| 2026-03-01 | `add_unique_password_reset_token`, `rename_password_restet_token_to_token_hash` | Unicité + renommage en `token_hash` |
| 2026-03-07 | `added_crypto_salt` | Ajout de `kek_salt` |
| 2026-03-12 | `fix_notes_length` | Champ `note` en `TEXT` |
| 2026-03-26 → 03-30 | `add_recovery_payload`, `remove_recovery_fields`, `add_recovery_fields` | Itérations sur le mécanisme de récupération |
| 2026-03-28 | `encrypted_crypto_key` | Stockage de la `crypto_key` chiffrée |
| 2026-04-02 | `added_email_verification`, `rework_tokens` | Vérification d'email + refonte du modèle de tokens |

> ⚠️ Toutes les migrations initiales portent le suffixe `_init` et plusieurs migrations apparaissent en double (`×2`) : l'historique reflète des itérations rapides. En cas de divergence entre l'état réel de la base et l'historique, utiliser `prisma migrate resolve` plutôt que d'éditer les fichiers à la main.

---

## 19. Dépannage (FAQ technique)

| Symptôme | Cause probable | Piste de résolution |
|---|---|---|
| L'utilisateur est renvoyé vers `/unlock` après un F5 | Comportement **normal** : la `crypto_key` n'est qu'en mémoire et disparaît au rechargement (`isLocked = true`) | Ressaisir le mot de passe sur `UnlockView` |
| `401` puis déconnexion en boucle | Refresh token expiré/invalide ou absent (cookie non transmis) | Vérifier `withCredentials`, le domaine du cookie et la liste CORS (`index.ts`) |
| Erreur CORS dans la console | Origine non incluse dans `allowedOrigins` (`backend/src/index.ts`) | Ajouter l'origine du frontend à la liste blanche |
| « Impossible de déchiffrer la clé » au changement de mot de passe | `kek_salt`/`encrypted_crypto_key` incohérents, ou mauvais ancien mot de passe | Vérifier que l'ancien mot de passe est correct ; ne jamais régénérer le `kek_salt` seul |
| Les requêtes API échouent en prod | `baseURL` codé en dur sur `localhost` (cf. §13-4) | Externaliser via `VITE_API_BASE_URL` |
| Token d'activation « expiré » très vite | Calcul d'expiration erroné (cf. §13-6) | Corriger l'expiration côté `admin.ts` |
| L'admin n'a pas accès à `/admin` | Casse du rôle `'ADMIN'` vs `'Admin'` (cf. §13-2) | Aligner la casse en base et dans le code |
| Les logos n'apparaissent pas | `LOGO_DEV_TOKEN` absent/invalide ou domaine non résolu par logo.dev | Vérifier la variable d'env et le domaine extrait du titre |
| `prisma migrate` échoue | Divergence schéma ↔ base | `npx prisma migrate resolve` puis `migrate deploy` |

---

## 20. Glossaire

| Terme | Définition |
|---|---|
| **crypto_key** | Clé maître AES-256 aléatoire qui chiffre les entrées. Jamais stockée en clair. |
| **KEK** | *Key Encryption Key* — dérivée du mot de passe (PBKDF2) pour chiffrer la `crypto_key`. |
| **kek_salt** | Sel PBKDF2 (hex) propre à chaque utilisateur. |
| **encrypted_crypto_key** | `crypto_key` chiffrée par la KEK, stockée en DB. |
| **recovery** | Mécanisme de secours basé sur les questions de sécurité (KEK alternative). |
| **lock / unlock** | État où l'utilisateur est authentifié mais sans `crypto_key` en mémoire. |
| **Zero-knowledge** | Le serveur ne peut techniquement pas lire les secrets de l'utilisateur. |
```

