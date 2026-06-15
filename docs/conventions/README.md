# Conventions de code — myprout

Ce dossier décrit **à quoi doit ressembler chaque type de fichier** du projet, pour
que l'ensemble du code soit cohérent (mêmes règles de formatage, même structure,
mêmes conventions de nommage, mêmes patterns d'erreurs).

## Comment l'utiliser

1. Lis d'abord [`CONVENTIONS.md`](./CONVENTIONS.md) : ce sont les règles **transversales**
   qui s'appliquent à *tous* les fichiers (langue, guillemets, indentation, nommage,
   gestion d'erreurs, code mort…).
2. Quand tu crées ou modifies un fichier, ouvre le **template correspondant** dans
   [`templates/`](./templates/) et calque ta structure dessus.
3. Avant un commit, vérifie ton fichier contre la checklist en bas de `CONVENTIONS.md`.

## Index des templates

| Type de fichier              | Template                                                        | Exemple existant à imiter            |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| Route Express (backend)      | [`backend-route.template.ts`](./templates/backend-route.template.ts)         | `backend/src/routes/passwords.ts`    |
| Middleware Express           | [`backend-middleware.template.ts`](./templates/backend-middleware.template.ts) | `backend/src/middlewares/authMiddleware.ts` |
| Service / util (backend)     | [`backend-service.template.ts`](./templates/backend-service.template.ts)     | `backend/src/utils/jwt.ts`           |
| Modèle Prisma                | [`prisma-model.template.prisma`](./templates/prisma-model.template.prisma)   | `backend/prisma/schema.prisma`       |
| Composant Vue (SFC)          | [`frontend-component.template.vue`](./templates/frontend-component.template.vue) | `frontend/src/components/ui/Toast.vue` |
| Composable Vue               | [`frontend-composable.template.ts`](./templates/frontend-composable.template.ts) | `frontend/src/components/passwords/composables/usePasswords.js` |
| Store Pinia                  | [`frontend-store.template.ts`](./templates/frontend-store.template.ts)       | `frontend/src/stores/authStore.js`   |
| Service API (axios)          | [`frontend-api-service.template.ts`](./templates/frontend-api-service.template.ts) | `frontend/src/services/api.js`     |

## Fichier à part

- [`../A_REFORMATER.md`](../A_REFORMATER.md) : la **liste priorisée des fichiers existants
  à reformater** pour respecter ces conventions, avec pour chacun ce qui ne va pas.
</content>
</invoke>
