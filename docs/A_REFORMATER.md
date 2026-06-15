# Fichiers à reformater — myprout

Liste **priorisée** des fichiers existants à mettre en conformité avec
[`docs/conventions/`](./conventions/README.md). Pour chacun : ce qui ne va pas et
l'action à mener. Coche au fur et à mesure.

> Légende priorité : 🔴 à faire en premier (incohérence structurelle ou risque) ·
> 🟠 important · 🟢 cosmétique / confort.

---

## 0. Outillage manquant (à mettre en place d'abord) 🔴

Sans ça, les règles de formatage restent manuelles et la dérive recommence.

- [ ] Ajouter un `.prettierrc` (racine, valeurs dans `CONVENTIONS.md` §1).
- [ ] Ajouter un `.eslintrc` (frontend Vue + backend TS) et un `.editorconfig`.
- [ ] Ajouter un script `"format"` et `"lint"` dans `frontend/package.json` et
      `backend/package.json`.
- [ ] Lancer `prettier --write` sur tout le repo une fois la config posée.

---

## 1. Bugs de configuration 🔴

| Fichier | Problème | Action |
| ------- | -------- | ------ |
| `backend/package.json` | Le script `dev` lance `src/index.js` (le fichier est `index.ts`) ; `prisma.seed` pointe vers `seed.ts` (le fichier est `prisma/seed.ts`) ; `description`/`author` vides | Corriger le chemin/extension (`tsx src/index.ts`), corriger le chemin du seed, remplir les métadonnées |
| `backend/.env` | Fichier `.env` versionné (présent dans `git status`) | Vérifier qu'il est bien ignoré (`backend/.gitignore`) et le retirer du suivi s'il contient des secrets |

---

## 2. Incohérence JS / TS 🟠

Cible = TypeScript partout au frontend (`CONVENTIONS.md` §4). À migrer progressivement.

- [ ] `backend/src/utils/crypto.ts` — **en `.ts` mais sans aucun typage** (`deriveKek(password, salt)`). Ajouter les annotations de types. 🔴
- [ ] `frontend/src/main.js` → `.ts`
- [ ] `frontend/src/services/api.js` → `.ts` (+ voir §4)
- [ ] `frontend/src/stores/authStore.js` → `.ts`
- [ ] `frontend/src/utils/crypto.js` → `.ts`
- [ ] `frontend/src/composables/useInactivity.js` → `.ts`
- [ ] `frontend/src/components/**/composables/*.js` (`usePasswords.js`, `useProfile.js`, `useDustDirection.js`) → `.ts`

---

## 3. Nommage des composants (PascalCase) 🟠

Renommer + mettre à jour les imports.

- [ ] `frontend/src/components/profile/profile.vue` → `Profile.vue`
- [ ] `frontend/src/components/profile/security.vue` → `Security.vue`
- [ ] `frontend/src/components/profile/managedAccount.vue` → `ManagedAccount.vue`

> Vérifier après renommage : aucun import cassé (`grep -r "profile.vue"` etc.).

---

## 4. Code mort / blocs commentés à supprimer 🟠

- [ ] `frontend/src/services/api.js` — **~165 lignes commentées** (faux `UserService`,
      `AuthService`, etc.) à supprimer. S'inspirer du template `frontend-api-service.template.ts`.
- [ ] `frontend/src/components/ui/Navbar.vue` — bloc `<!-- ... -->` de menu désactivé entre
      `<template>` et `<script>` ; `<style>` **non `scoped`** ; espace de fin de ligne parasite l.21.
- [ ] `frontend/src/components/profile/profile.vue` — boutons « Modifier » commentés.
- [ ] `frontend/src/router/index.ts` — routes commentées (`/`, `/files`, `/games`, `/movies`).
- [ ] `backend/prisma/schema.prisma` — modèle `ipAddress` entièrement commenté + relation `ip` commentée.
- [ ] `backend/src/routes/auth.ts` — ligne `// prisma.ipAddress.deleteMany(...)` commentée dans `delete /account`.

---

## 5. URLs / config en dur 🟠

- [ ] `frontend/src/services/api.js` — `baseURL: 'http://localhost:3000/api'` en dur (+ commentaire prod). Passer par `import.meta.env.VITE_API_URL`.
- [ ] `frontend/src/components/passwords/composables/usePasswords.js` — `fetch('http://localhost:3000/api/passwords/logo...')` en dur. Utiliser le service `api` + variable d'env.

---

## 6. Backend — structure & gestion d'erreurs 🟠

- [ ] `backend/src/index.ts` — **imports au milieu du fichier** (`cookieParser`, `authRoutes`,
      `adminRoutes`, `passwordRoutes` après des `app.use`). Tout remonter en haut (`CONVENTIONS.md` §5).
      Au passage : `'/api/admin/'` et `'/api/passwords/'` ont un `/` final superflu (incohérent avec `'/api/auth'`).
- [ ] `backend/src/routes/*.ts` — les `catch (error)` **avalent l'erreur** sans la logguer.
      Ajouter un `logger.error(...)` (story logging Winston) dans chaque catch.
- [ ] `backend/src/routes/passwords.ts` — `patch /:id/is_stared` répond `{ message: 'Erreur serveur' }`
      au lieu de `{ error }` ; `update`/`delete` ne filtrent pas par `user_id` partout (`patch` ne le fait pas).
      Uniformiser sur `{ error }` et le filtrage par `user_id`.
- [ ] `backend/src/services/email/email.ts` — paramètres `(user: any)` non typés. Introduire un type `User`.

---

## 7. Schéma Prisma — nommage des colonnes 🟢→🟠

- [ ] `backend/prisma/schema.prisma` — `firstName` / `lastName` en camelCase alors que tout le
      reste est en snake_case (`user_id`, `is_active`, `kek_salt`). Choisir snake_case
      (`first_name`, `last_name`) et migrer (migration + adaptation du code qui lit ces champs).
- [ ] Corriger l'indentation des commentaires de regroupement (`// Link to other tables`,
      `// User data`… sont sur-indentés) — voir `prisma-model.template.prisma`.

---

## 8. En-têtes de fichiers manquants 🟢

Généraliser le commentaire d'en-tête `// chemin/du/fichier` (déjà présent sur la plupart
des fichiers backend, absent sur plusieurs fichiers frontend).

- [ ] `frontend/src/router/index.ts` (pas d'en-tête)
- [ ] `frontend/src/components/**/*.vue` — la majorité n'a pas de commentaire d'en-tête (optionnel pour les SFC, mais à uniformiser).

---

## Ordre de chantier conseillé

1. **§0 + §1** : outillage + bugs de config (débloque tout le reste).
2. **§4 + §5** : supprimer le code mort et les URLs en dur (rapide, fort impact lisibilité).
3. **§6** : structure backend + logs d'erreurs.
4. **§2 + §3** : migration TS et renommage des composants (plus long, faire par lots).
5. **§7 + §8** : nommage Prisma et en-têtes (finitions).
</content>
