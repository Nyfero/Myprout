# Checklist de mise en ligne — myprout

> À parcourir avant tout déploiement public. Les éléments 🔴 sont **bloquants**, 🟠 **fortement recommandés**, 🟡 **améliorations**.
> Références croisées vers [`DOCUMENTATION_TECHNIQUE.md`](DOCUMENTATION_TECHNIQUE.md).

---

## 1. Bugs bloquants à corriger (§13)

- [ ] 🔴 **Recovery cassé** — `POST /auth/recovery/verify` cherche un token `type: 'activate'` au lieu de `'password_reset'` (`backend/src/routes/auth.ts`). Sans ça, la récupération de mot de passe ne fonctionne pas. *(§13-1)*
- [ ] 🔴 **Rôle admin non reconnu** — le seed crée `role: 'ADMIN'` mais le code compare à `'Admin'` (`auth.ts`). L'admin initial n'a pas accès à `/admin`. Uniformiser la casse. *(§13-2)*
- [ ] 🟠 **IDOR sur les favoris** — `PATCH /passwords/:id/is_stared` ne filtre pas par `user_id`. Ajouter `user_id: req.user.user_id` à la clause `where`. *(§13-3)*
- [ ] 🟠 **Token d'activation expire en ~7 min** au lieu de 7 jours (calcul erroné dans `admin.ts`). *(§13-6)*
- [ ] 🟡 **`/refresh`** — comparer `expires_at` sans garde sur `null`. *(§13-7)*

## 2. Configuration frontend

- [ ] 🔴 **Externaliser le `baseURL`** de l'API — actuellement codé en dur sur `http://localhost:3000/api` dans `frontend/src/services/api.js`. Utiliser `import.meta.env.VITE_API_BASE_URL`. *(§13-4)*
- [ ] 🔴 **URL des logos codée en dur** dans `frontend/src/components/passwords/composables/usePasswords.js` (`http://localhost:3000/api/passwords/logo`). À externaliser de même. *(§17)*
- [ ] 🟠 **Validation de robustesse du mot de passe** — réactiver les critères commentés dans `Password.vue` (et valider aussi côté serveur). *(§13-5)*
- [ ] 🟠 Builder le frontend en production : `npm run build --prefix frontend` → servir `frontend/dist` en statique.

## 3. Configuration backend & secrets

- [ ] 🔴 Créer `backend/.env` à partir de `backend/.exemple_env` avec les **vraies** valeurs de production.
- [ ] 🔴 `DATABASE_URL` pointe vers la base MySQL de production (utilisateur dédié, mot de passe fort).
- [ ] 🔴 **Générer une paire de clés JWT RS256 dédiée à la prod** et **ne pas la versionner** :
  ```bash
  mkdir -p backend/keys
  openssl genrsa -out backend/keys/private_key.pem 2048
  openssl rsa -in backend/keys/private_key.pem -pubout -out backend/keys/public_key.pem
  ```
- [ ] 🔴 `NODE_ENV=production` défini (active le cookie `Secure` sur le refresh token).
- [ ] 🔴 Vérifier que `backend/keys/`, `.env` et les fichiers de secrets sont bien dans `.gitignore`.
- [ ] 🟠 Changer le mot de passe admin initial (`ADMIN_PASSWORD`) — ne pas garder la valeur d'exemple.
- [ ] 🟠 Configurer le fournisseur d'emails de prod (Resend / SMTP) et retirer les identifiants Mailtrap de test.
- [ ] 🟠 `LOGO_DEV_TOKEN` valide pour le proxy de favicons.

## 4. CORS, cookies & domaines

- [ ] 🔴 Mettre à jour la liste blanche CORS dans `backend/src/index.ts` (`allowedOrigins`) avec le(s) domaine(s) de prod, et retirer les origines `localhost` si inutiles.
- [ ] 🔴 Vérifier la cohérence d'origine front ↔ API : le cookie refresh est `sameSite: 'strict'` → les deux doivent être servis de façon cohérente (idéalement même domaine ou sous-domaines).
- [ ] 🟠 `FRONTEND_URL` (utilisé dans les liens des emails) pointe vers le domaine de prod.

## 5. Base de données

- [ ] 🔴 Appliquer les migrations : `npx prisma migrate deploy` (déjà fait par `start.js`).
- [ ] 🔴 Exécuter le seed pour créer l'admin (`prisma db seed`) **après** correction du bug de casse du rôle (§13-2).
- [ ] 🟠 Mettre en place des **sauvegardes** automatiques et tester une restauration.
- [ ] 🟡 Vérifier qu'aucune donnée de test ne subsiste en base.

## 6. Sécurité (transport & durcissement)

- [ ] 🔴 **HTTPS obligatoire** via reverse-proxy (nginx / Caddy) avec TLS valide ; rediriger HTTP → HTTPS.
- [ ] 🟠 Ajouter des en-têtes de sécurité (HSTS, CSP, `X-Content-Type-Options`, etc.) — ex. via `helmet`.
- [ ] 🟠 Mettre en place un **rate limiting** sur les routes sensibles (`/auth/login`, `/auth/password/forgot`, `/auth/recovery/verify`).
- [ ] 🟡 Vérifier les messages d'erreur : ne pas divulguer d'info sensible (l'anti-énumération de `/password/forgot` est déjà en place).
- [ ] 🟡 Revue rapide des dépendances : `npm audit` (racine, `backend/`, `frontend/`).

## 7. Infrastructure & exploitation

- [ ] 🟠 Gestionnaire de processus pour le backend (pm2 / systemd / conteneur) avec redémarrage auto.
- [ ] 🟠 Centraliser les logs et surveiller les erreurs serveur.
- [ ] 🟡 Mettre en place une supervision basique (uptime, espace disque, santé DB).
- [ ] 🟡 Documenter la procédure de déploiement et de rollback.

## 8. Vérifications fonctionnelles finales (smoke tests)

Tester de bout en bout sur l'environnement de prod :

- [ ] Inscription → email de vérification reçu → vérification de l'email.
- [ ] Validation du compte par un admin → email d'activation reçu (lien valide plusieurs jours).
- [ ] Activation : définition du mot de passe + questions de sécurité.
- [ ] Connexion → accès au coffre.
- [ ] Création / édition / suppression / favori d'une entrée de mot de passe.
- [ ] Affichage et copie d'un mot de passe déchiffré.
- [ ] Rechargement de page → redirection `/unlock` → déverrouillage par mot de passe.
- [ ] Changement de mot de passe (re-chiffrement de la `crypto_key`).
- [ ] **Mot de passe oublié** → email reçu → questions de sécurité → réinitialisation → reconnexion *(dépend du fix §13-1)*.
- [ ] Déconnexion automatique après 20 min d'inactivité.
- [ ] Suppression de compte.
- [ ] Accès `/admin` réservé aux administrateurs *(dépend du fix §13-2)*.

---

### Légende
🔴 Bloquant · 🟠 Fortement recommandé · 🟡 Amélioration
