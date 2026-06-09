# myprout

> Gestionnaire de mots de passe auto-hébergé, avec **chiffrement de bout en bout côté client**.
> Les mots de passe sont chiffrés dans le navigateur en AES-256-GCM avant d'être envoyés au serveur : **le serveur ne voit jamais les données en clair.**

## Stack

| Couche | Technologies |
|---|---|
| Frontend | Vue 3 · Vite · Pinia · Vue Router (port `5173`) |
| Backend | Express 5 · TypeScript (ESM) · Prisma ORM (port `3000`) |
| Base de données | MySQL |
| Emails | Nodemailer / Resend |

## Démarrage rapide

```bash
# 1. Dépendances
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. Configurer backend/.env (voir backend/.exemple_env) + générer les clés JWT RS256
mkdir -p backend/keys
openssl genrsa -out backend/keys/private_key.pem 2048
openssl rsa -in backend/keys/private_key.pem -pubout -out backend/keys/public_key.pem

# 3. Base de données
npm run prisma:migrate --prefix backend

# 4. Lancer frontend + backend
npm run dev
```

Frontend sur http://localhost:5173 · API sur http://localhost:3000/api.

## Documentation

📖 **La documentation technique complète se trouve dans [`docs/DOCUMENTATION_TECHNIQUE.md`](docs/DOCUMENTATION_TECHNIQUE.md).**

Elle couvre notamment :

- [Architecture générale](docs/DOCUMENTATION_TECHNIQUE.md#2-architecture-générale) et [modèle de données](docs/DOCUMENTATION_TECHNIQUE.md#4-modèle-de-données-prisma--mysql)
- [Sécurité & cryptographie](docs/DOCUMENTATION_TECHNIQUE.md#5-sécurité--cryptographie) (hiérarchie des clés, tokens, recovery)
- [Référence API](docs/DOCUMENTATION_TECHNIQUE.md#7-référence-api) et [diagrammes de séquence](docs/DOCUMENTATION_TECHNIQUE.md#12-diagrammes-de-séquence) (login, refresh, recovery)
- [Problèmes connus & dette technique](docs/DOCUMENTATION_TECHNIQUE.md#13-problèmes-connus--dette-technique)
- [Déploiement](docs/DOCUMENTATION_TECHNIQUE.md#15-déploiement) et [dépannage](docs/DOCUMENTATION_TECHNIQUE.md#19-dépannage-faq-technique)

✅ **Avant toute mise en ligne**, dérouler la [checklist de mise en ligne](docs/CHECKLIST_MISE_EN_LIGNE.md).

## Structure du dépôt

```
myprout/
├── backend/    # API Express + Prisma (routes, middlewares, services email, crypto)
├── frontend/   # Application Vue 3 (views, components, stores, composables)
├── docs/       # Documentation technique
└── start.js    # Lance migrations + frontend + backend
```
