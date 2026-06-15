# Conventions transversales — myprout

Règles qui s'appliquent à **tous** les fichiers du projet. Les templates dans
[`templates/`](./templates/) ne font qu'appliquer ces règles à chaque type de fichier.

---

## 1. Formatage (Prettier)

Le code est déjà majoritairement formaté façon Prettier. On fige ces réglages comme
**la** norme du projet :

| Réglage              | Valeur            |
| -------------------- | ----------------- |
| Guillemets           | `'simple'`        |
| Point-virgule        | **non** (`semi: false`) |
| Indentation          | 2 espaces         |
| Largeur de ligne     | 80 colonnes       |
| Virgule finale       | `all` (es5 mini)  |
| Fins de ligne        | `lf`              |

> **À faire (voir `A_REFORMATER.md`) :** ajouter un `.prettierrc` à la racine + dans
> `frontend/` et `backend/`, et un script `format` dans chaque `package.json`. Tant
> que ce n'est pas automatisé, ces règles se vérifient à la main.

```jsonc
// .prettierrc (à créer à la racine)
{
  "singleQuote": true,
  "semi": false,
  "tabWidth": 2,
  "printWidth": 80,
  "trailingComma": "all"
}
```

---

## 2. Langue

- **Identifiants** (variables, fonctions, types, fichiers) : **anglais**.
  `fetchPasswordsList`, `tokenRecord`, `isLocked`.
- **Commentaires** : **français**, courts, sur la ligne *au-dessus* du code.
- **Messages destinés à l'utilisateur** (réponses API `error`/`message`, textes UI) :
  **français**, avec majuscule, sans point-virgule de code mais ponctuation correcte.

---

## 3. Nommage des fichiers

| Catégorie                         | Convention            | Exemple                       |
| --------------------------------- | --------------------- | ----------------------------- |
| Composant Vue (SFC)               | **PascalCase**        | `Navbar.vue`, `PasswordsCard.vue` |
| Vue de route (`views/`)           | **PascalCase + `View`** | `ProfileView.vue`           |
| Composable                        | **camelCase + `use`** | `usePasswords.ts`             |
| Store Pinia                       | **camelCase + `Store`** | `authStore.ts`              |
| Route / middleware / util backend | **camelCase**         | `authMiddleware.ts`, `jwt.ts` |
| Dossier                           | **kebab/camelCase**   | `components/passwords/`       |

> ⚠️ Aujourd'hui certains composants sont en minuscule (`profile.vue`, `security.vue`,
> `managedAccount.vue`). Ils doivent passer en PascalCase (`Profile.vue`…). Voir
> `A_REFORMATER.md`.

---

## 4. TypeScript partout (cible)

- **Backend** : déjà 100 % `.ts`. ✅
- **Frontend** : **cible = TypeScript**. C'est déjà le cas pour `router/index.ts`.
  Tout nouveau fichier frontend doit être en `.ts` / `<script setup lang="ts">`.
  Les fichiers `.js` existants (`main.js`, `authStore.js`, `api.js`, `crypto.js`,
  composables…) sont à migrer **progressivement** (voir `A_REFORMATER.md`).
- Un fichier avec l'extension `.ts` **doit réellement être typé**. Aujourd'hui
  `backend/src/utils/crypto.ts` est en `.ts` mais sans aucune annotation : à corriger.
- Éviter `any`. Si un type est inconnu, le déclarer explicitement (ex. payload Prisma).
  Les `(user: any)` actuels des services email sont à remplacer par un type `User`.

---

## 5. Organisation d'un fichier

Ordre imposé, de haut en bas :

1. **Commentaire d'en-tête** : une ligne avec le chemin relatif du fichier.
   `// routes/auth.ts` — déjà fait dans la majorité des fichiers, à généraliser.
2. **Imports**, groupés et **tous en haut** (jamais au milieu du fichier — cf.
   `backend/src/index.ts` à corriger). Ordre des groupes :
   1. librairies externes (`express`, `vue`, `axios`…)
   2. modules internes via alias `@/…` ou chemins relatifs
3. **Constantes de module** (`const PBKDF2_ITERATIONS = 310000`).
4. **Corps** (handlers, fonction exportée, store…).
5. **`export default` / exports** en bas.

Pour découper visuellement de longs fichiers, on garde le séparateur déjà utilisé :

```ts
// ─── REGISTER ────────────────────────────────────────────────────────────────
```

---

## 6. Gestion des erreurs (backend)

- Tout handler async est enveloppé dans `try / catch`.
- **Toujours logguer l'erreur** dans le `catch` avant de répondre — ne pas l'avaler
  silencieusement comme c'est le cas aujourd'hui :

```ts
} catch (error) {
  logger.error('auth.register a échoué', error) // ← obligatoire
  res.status(500).json({ error: 'Erreur serveur lors de la création du compte' })
}
```

- **Codes HTTP** cohérents : `400` champ manquant/invalide · `401` non authentifié ·
  `403` interdit · `404` introuvable · `409` conflit · `500` erreur serveur.
- **Forme de la réponse** : succès → `{ message }` ou la ressource ;
  erreur → **toujours** `{ error: '…' }` (ne pas mélanger avec `{ message }` pour les
  erreurs comme dans `passwords.ts` `patch /:id/is_stared`).
- Ne **jamais** renvoyer de hash, de clé ou de secret dans une réponse.

---

## 7. Pas de code mort

- Pas de gros blocs commentés laissés « au cas où » (cf. les ~165 lignes commentées
  dans `api.js`, le menu commenté de `Navbar.vue`, les modèles commentés du schéma
  Prisma). L'historique Git sert d'archive.
- Un `TODO` est autorisé **s'il est actionnable** : `// TODO(gsap): brancher VITE_API_URL`.

---

## 8. Configuration / secrets

- **Aucune URL ni secret en dur** dans le code. On passe par les variables d'env :
  - Backend : `process.env.X` (déjà fait pour `LOGO_DEV_TOKEN`, `ADMIN_EMAIL`…).
  - Frontend : `import.meta.env.VITE_X`.
- L'URL de l'API (`http://localhost:3000/api`, en dur dans `api.js` et `usePasswords.js`)
  doit venir de `import.meta.env.VITE_API_URL`.
- Chaque variable utilisée est documentée dans `backend/.exemple_env`.

---

## 9. Composants Vue (SFC)

Ordre des blocs **imposé** : `<template>` → `<script setup lang="ts">` → `<style scoped>`.

- Le `<style>` est **toujours `scoped`** (cf. `Navbar.vue` dont le style n'est pas scoped).
- Le contenu de `<script setup>` n'est **pas** ré-indenté (niveau 0), comme dans
  `profile.vue`.
- Pas de commentaire HTML mort entre les blocs (cf. `Navbar.vue`).
- Logique non triviale → extraite dans un **composable** `useXxx`, comme `usePasswords`.

---

## 10. Checklist avant commit

- [ ] Guillemets simples, pas de `;`, indentation 2 espaces.
- [ ] Commentaire d'en-tête avec le chemin du fichier.
- [ ] Tous les imports en haut, groupés.
- [ ] Aucune URL / secret en dur (variables d'env).
- [ ] Aucun bloc de code commenté / mort.
- [ ] Backend : `try/catch` avec log + `{ error }` + bon code HTTP.
- [ ] Vue : ordre `template → script → style scoped`, fichier en PascalCase.
- [ ] Nouveau fichier frontend en `.ts` / `lang="ts"`.
- [ ] Messages utilisateur en français, identifiants en anglais.
</content>
