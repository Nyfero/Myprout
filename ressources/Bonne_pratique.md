Gérer la **connexion d'un utilisateur** (authentification) est une partie critique de toute application, car elle impacte directement la **sécurité**, l'**expérience utilisateur** et la **maintenabilité** du code. Voici un guide complet des **bonnes pratiques** pour implémenter une authentification robuste avec **Vue 3**, **Express**, et **Prisma**, en couvrant tous les aspects : sécurité, UX, stockage des mots de passe, gestion des tokens, et protection des routes.

---

## **1. Architecture Globale**
Voici une architecture typique pour gérer l'authentification :
```
Frontend (Vue 3)
│
├── Composants d'authentification (Login.vue, Register.vue)
├── Store (Pinia/Vuex) pour gérer l'état de l'utilisateur
├── Services API (axios) pour les requêtes d'authentification
├── Middlewares pour protéger les routes (ex: `auth.js`)
│
Backend (Express + Prisma)
│
├── Routes d'authentification (`/login`, `/register`, `/logout`, `/refresh`)
├── Middlewares (vérification des tokens, rôles, etc.)
├── Services d'authentification (génération de tokens, validation)
├── Modèle `User` avec Prisma (stockage sécurisé des mots de passe)
│
Base de données (PostgreSQL/MySQL)
│
├── Table `User` (avec `email`, `passwordHash`, `salt`, etc.)
```

---

## **2. Bonnes Pratiques Côté Backend (Express + Prisma)**
### **A. Stockage des mots de passe**
#### **❌ À éviter absolument**
- Stocker les mots de passe **en clair**.
- Utiliser des algorithmes non sécurisés comme **MD5** ou **SHA-1**.

#### **✅ Bonnes pratiques**
1. **Utiliser `bcrypt`** pour hacher les mots de passe avec un **salt** :
   ```bash
   npm install bcrypt
   ```
   ```typescript
   // services/auth.ts
   import * as bcrypt from 'bcrypt';

   const SALT_ROUNDS = 10; // Nombre de tours pour le salage

   export async function hashPassword(password: string): Promise<string> {
     return bcrypt.hash(password, SALT_ROUNDS);
   }

   export async function comparePasswords(
     plainPassword: string,
     hashedPassword: string
   ): Promise<boolean> {
     return bcrypt.compare(plainPassword, hashedPassword);
   }
   ```

2. **Ne jamais renvoyer le hash du mot de passe** dans les réponses API.

3. **Exemple de modèle Prisma** :
   ```prisma
   model User {
     id           Int      @id @default(autoincrement())
     email        String   @unique
     passwordHash String   // Stocké haché, jamais en clair
     salt         String?  // Optionnel si vous utilisez bcrypt (qui gère le salt interne)
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
   }
   ```

---

### **B. Gestion des tokens (JWT)**
#### **Pourquoi JWT ?**
- **Stateless** : Pas besoin de stocker les sessions côté serveur.
- **Sécurisé** : Signé avec une clé secrète.
- **Flexible** : Peut contenir des métadonnées (rôles, expiration, etc.).

#### **✅ Bonnes pratiques**
1. **Installer les dépendances** :
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   ```

2. **Configurer JWT** :
   ```typescript
   // services/jwt.ts
   import jwt from 'jsonwebtoken';

   const JWT_SECRET = process.env.JWT_SECRET || 'votre_cle_secrete_ultra_complexe';
   const JWT_EXPIRES_IN = '1h'; // Durée de validité du token

   export function generateToken(userId: number, email: string): string {
     return jwt.sign(
       { userId, email }, // Payload (évitez les données sensibles)
       JWT_SECRET,
       { expiresIn: JWT_EXPIRES_IN }
     );
   }

   export function verifyToken(token: string): jwt.JwtPayload {
     return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
   }
   ```

3. **Ne jamais stocker de données sensibles dans le JWT** (ex: mot de passe, rôle sensible).
   → Le JWT peut être décodé côté client (même s’il ne peut pas être modifié sans la clé secrète).

4. **Utiliser des tokens courts** (ex: 1h) et implémenter un **refresh token** pour les sessions longues.

---

### **C. Routes d'authentification**
#### **1. Route `/register` (Inscription)**
```typescript
// routes/auth.ts (Express)
import { hashPassword } from '../services/auth';
import { prisma } from '../services/prisma';

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation des entrées
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // 2. Vérifier si l'email existe déjà
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Email already exists" });
  }

  // 3. Hacher le mot de passe
  const passwordHash = await hashPassword(password);

  // 4. Créer l'utilisateur
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true }, // Ne pas renvoyer le hash !
  });

  res.status(201).json(user);
});
```

#### **2. Route `/login` (Connexion)**
```typescript
import { comparePasswords } from '../services/auth';
import { generateToken } from '../services/jwt';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // 2. Trouver l'utilisateur
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // 3. Comparer les mots de passe
  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // 4. Générer un token JWT
  const token = generateToken(user.id, user.email);

  res.json({ token, user: { id: user.id, email: user.email } });
});
```

#### **3. Route `/refresh` (Rafraîchir le token)**
Pour éviter de demander à l'utilisateur de se reconnecter toutes les heures, utilisez un **refresh token** (stocké en HTTP-only cookie ou en base de données) :
```typescript
// À implémenter avec une table `RefreshToken` dans Prisma
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  // 1. Vérifier le refresh token (ex: en base de données)
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // 2. Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: tokenRecord.userId },
  });

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // 3. Générer un nouveau token
  const newToken = generateToken(user.id, user.email);

  // 4. Mettre à jour le refresh token (optionnel)
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // +30 jours
  });

  res.json({ token: newToken });
});
```

#### **4. Route `/logout` (Déconnexion)**
```typescript
router.post('/logout', async (req, res) => {
  // 1. Récupérer le refresh token (si utilisé)
  const { refreshToken } = req.body;

  // 2. Supprimer le refresh token de la base
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  res.json({ message: "Logged out successfully" });
});
```

---

### **D. Middleware d'authentification**
Pour protéger les routes, créez un middleware qui vérifie le token JWT :
```typescript
// middlewares/auth.ts
import { verifyToken } from '../services/jwt';
import { prisma } from '../services/prisma';

export async function authMiddleware(req: any, res: any, next: any) {
  // 1. Récupérer le token depuis le header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Vérifier le token
    const payload = verifyToken(token);

    // 3. Trouver l'utilisateur et l'ajouter à la requête
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user; // Ajoute l'utilisateur à la requête
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
```

**Utilisation dans une route protégée** :
```typescript
// routes/protected.ts
import { authMiddleware } from '../middlewares/auth';

router.get('/profile', authMiddleware, async (req: any, res) => {
  // req.user est disponible grâce au middleware
  res.json({ user: req.user });
});
```

---

### **E. Sécurité avancée**
1. **Limiter les tentatives de connexion** :
   - Utilisez un mécanisme comme **rate-limiting** pour éviter les attaques par force brute.
   - Exemple avec `express-rate-limit` :
     ```bash
     npm install express-rate-limit
     ```
     ```typescript
     import rateLimit from 'express-rate-limit';

     const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 5, // Limite à 5 tentatives par IP
       message: "Too many login attempts, please try again later",
     });

     router.post('/login', limiter, async (req, res) => { ... });
     ```

2. **Protéger contre les attaques CSRF** :
   - Utilisez des tokens CSRF pour les formulaires de connexion.
   - Exemple avec `csurf` :
     ```bash
     npm install csurf
     ```
     ```typescript
     import csurf from 'csurf';
     const csrfProtection = csurf({ cookie: true });

     router.post('/login', csrfProtection, async (req, res) => { ... });
     ```

3. **Utiliser des cookies sécurisés** (si vous stockez le token dans un cookie) :
   ```typescript
   res.cookie('token', token, {
     httpOnly: true, // Empêche l'accès via JavaScript
     secure: process.env.NODE_ENV === 'production', // HTTPS seulement
     sameSite: 'strict', // Protège contre CSRF
     maxAge: 3600000, // 1 heure
   });
   ```

4. **Journaliser les tentatives de connexion** :
   - Stockez les tentatives infructueuses pour détecter les attaques.
   ```typescript
   await prisma.loginAttempt.create({
     data: {
       userId: user.id,
       ip: req.ip,
       success: false,
       userAgent: req.headers['user-agent'],
     },
   });
   ```

---

## **3. Bonnes Pratiques Côté Frontend (Vue 3)**
### **A. Structure des composants**
```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.vue
│   │   ├── RegisterForm.vue
│   │   └── LogoutButton.vue
├── stores/
│   └── auth.store.ts (Pinia)
├── services/
│   └── api.ts (Axios)
├── router/
│   └── index.ts (routes protégées)
```

---

### **B. Gestion de l'état avec Pinia**
1. **Créer un store `auth`** :
   ```bash
   npm install pinia
   ```
   ```typescript
   // stores/auth.store.ts
   import { defineStore } from 'pinia';
   import { ref } from 'vue';

   export const useAuthStore = defineStore('auth', () => {
     const user = ref<{ id: number; email: string } | null>(null);
     const token = ref<string | null>(null);
     const isAuthenticated = ref<boolean>(false);

     function setUser(payload: { user: any; token: string }) {
       user.value = payload.user;
       token.value = payload.token;
       isAuthenticated.value = true;
       localStorage.setItem('token', payload.token); // Optionnel (voir section sécurité)
     }

     function clearUser() {
       user.value = null;
       token.value = null;
       isAuthenticated.value = false;
       localStorage.removeItem('token');
     }

     return { user, token, isAuthenticated, setUser, clearUser };
   });
   ```

2. **Initialiser le store au démarrage** :
   ```typescript
   // main.ts
   import { createApp } from 'vue';
   import { createPinia } from 'pinia';
   import App from './App.vue';

   const app = createApp(App);
   app.use(createPinia());
   app.mount('#app');
   ```

---

### **C. Service API avec Axios**
1. **Configurer Axios** :
   ```typescript
   // services/api.ts
   import axios from 'axios';
   import { useAuthStore } from '../stores/auth.store';

   const api = axios.create({
     baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
   });

   // Intercepteur pour ajouter le token à chaque requête
   api.interceptors.request.use((config) => {
     const authStore = useAuthStore();
     if (authStore.token) {
       config.headers.Authorization = `Bearer ${authStore.token}`;
     }
     return config;
   });

   // Intercepteur pour gérer les erreurs 401 (token expiré)
   api.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         const authStore = useAuthStore();
         authStore.clearUser();
         window.location.href = '/login'; // Rediriger vers la page de login
       }
       return Promise.reject(error);
     }
   );

   export default api;
   ```

2. **Appels API pour l'authentification** :
   ```typescript
   // services/auth.api.ts
   import api from './api';
   import { useAuthStore } from '../stores/auth.store';

   export async function login(email: string, password: string) {
     const response = await api.post('/login', { email, password });
     const authStore = useAuthStore();
     authStore.setUser(response.data);
     return response.data;
   }

   export async function register(email: string, password: string) {
     const response = await api.post('/register', { email, password });
     return response.data;
   }

   export async function logout() {
     const authStore = useAuthStore();
     await api.post('/logout', {}, {
       headers: { Authorization: `Bearer ${authStore.token}` },
     });
     authStore.clearUser();
   }
   ```

---

### **D. Composants d'authentification**
#### **1. Formulaire de connexion (`LoginForm.vue`)**
```vue
<template>
  <form @submit.prevent="handleLogin">
    <div>
      <label for="email">Email</label>
      <input v-model="email" type="email" id="email" required />
    </div>
    <div>
      <label for="password">Mot de passe</label>
      <input v-model="password" type="password" id="password" required />
    </div>
    <button type="submit" :disabled="isLoading">
      {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/auth.api';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref('');
const router = useRouter();

async function handleLogin() {
  try {
    isLoading.value = true;
    error.value = '';
    await login(email.value, password.value);
    router.push('/dashboard'); // Redirige après connexion
  } catch (err) {
    error.value = err.response?.data?.error || 'Erreur de connexion';
  } finally {
    isLoading.value = false;
  }
}
</script>
```

#### **2. Formulaire d'inscription (`RegisterForm.vue`)**
```vue
<template>
  <form @submit.prevent="handleRegister">
    <div>
      <label for="email">Email</label>
      <input v-model="email" type="email" id="email" required />
    </div>
    <div>
      <label for="password">Mot de passe</label>
      <input v-model="password" type="password" id="password" required />
    </div>
    <button type="submit" :disabled="isLoading">
      {{ isLoading ? 'Inscription en cours...' : "S'inscrire" }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../services/auth.api';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');
const router = useRouter();

async function handleRegister() {
  try {
    isLoading.value = true;
    error.value = '';
    success.value = '';
    await register(email.value, password.value);
    success.value = 'Compte créé avec succès ! Redirection vers la connexion...';
    setTimeout(() => router.push('/login'), 2000);
  } catch (err) {
    error.value = err.response?.data?.error || 'Erreur lors de l\'inscription';
  } finally {
    isLoading.value = false;
  }
}
</script>
```

---

### **E. Protection des routes avec Vue Router**
1. **Créer un guard pour les routes protégées** :
   ```typescript
   // router/index.ts
   import { createRouter, createWebHistory } from 'vue-router';
   import { useAuthStore } from '../stores/auth.store';

   const router = createRouter({
     history: createWebHistory(),
     routes: [
       { path: '/login', component: () => import('../views/Login.vue') },
       { path: '/register', component: () => import('../views/Register.vue') },
       {
         path: '/dashboard',
         component: () => import('../views/Dashboard.vue'),
         meta: { requiresAuth: true }, // Marqueur pour les routes protégées
       },
     ],
   });

   // Guard pour vérifier l'authentification
   router.beforeEach((to, from, next) => {
     const authStore = useAuthStore();
     if (to.meta.requiresAuth && !authStore.isAuthenticated) {
       next('/login'); // Redirige vers le login si non authentifié
     } else {
       next();
     }
   });

   export default router;
   ```

2. **Rediriger après connexion** :
   ```typescript
   // Dans LoginForm.vue après une connexion réussie
   router.push({ path: '/dashboard' });
   ```

---

### **F. Gestion des tokens**
#### **❌ À éviter**
- Stocker le token **en clair dans localStorage** (vulnérable aux attaques XSS).
- Ne pas définir de durée d'expiration pour le token.

#### **✅ Bonnes pratiques**
1. **Stocker le token dans un cookie HTTP-only** (plus sécurisé) :
   - **Backend** : Définir le cookie lors du login :
     ```typescript
     res.cookie('token', token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: 3600000, // 1 heure
     });
     ```
   - **Frontend** : Pas besoin de stocker le token manuellement, Axios peut lire les cookies automatiquement.

2. **Si vous utilisez localStorage** (moins sécurisé mais plus simple) :
   - **Chiffrez les données sensibles** avant de les stocker.
   - **Nettoyez localStorage à la déconnexion** :
     ```typescript
     localStorage.removeItem('token');
     ```

3. **Rafraîchir le token automatiquement** :
   - Utilisez un intercepteur Axios pour détecter les tokens expirés et rafraîchir silencieusement :
     ```typescript
     api.interceptors.response.use(
       (response) => response,
       async (error) => {
         const originalRequest = error.config;
         if (error.response?.status === 401 && !originalRequest._retry) {
           originalRequest._retry = true;
           try {
             const authStore = useAuthStore();
             const newToken = await refreshToken(authStore.refreshToken); // À implémenter
             authStore.setToken(newToken);
             originalRequest.headers.Authorization = `Bearer ${newToken}`;
             return api(originalRequest);
           } catch (err) {
             authStore.clearUser();
             window.location.href = '/login';
           }
         }
         return Promise.reject(error);
       }
     );
     ```

---

### **G. Expérience Utilisateur (UX)**
1. **Feedback clair** :
   - Afficher des messages d'erreur **spécifiques mais pas trop détaillés** (ex: "Email ou mot de passe incorrect" plutôt que "L'email n'existe pas").
   - Utiliser des **indicateurs de chargement** pendant les requêtes.

2. **Rester connecté** :
   - Proposer une case à cocher "Rester connecté" pour étendre la durée du token (via un refresh token long).

3. **Réinitialisation du mot de passe** :
   - Implémenter un flux de réinitialisation avec un **token temporaire** envoyé par email.

4. **Double authentification (2FA)** :
   - Pour les applications sensibles, ajouter une couche de sécurité avec **Google Authenticator** ou **SMS**.

---

## **4. Sécurité Avancée**
### **A. Protéger contre les attaques courantes**
| Attaque | Solution |
|---------|----------|
| **Brute Force** | Limiter les tentatives de connexion (`express-rate-limit`). |
| **SQL Injection** | Utiliser Prisma (qui protège contre les injections). |
| **XSS (Cross-Site Scripting)** | Ne pas stocker de données sensibles dans localStorage, utiliser `httpOnly` cookies. |
| **CSRF (Cross-Site Request Forgery)** | Utiliser des tokens CSRF ou `sameSite` cookies. |
| **Man-in-the-Middle** | Toujours utiliser **HTTPS** en production. |

### **B. Bonnes pratiques pour les mots de passe**
1. **Exiger des mots de passe forts** :
   - Minimum 8 caractères.
   - Au moins une majuscule, un chiffre, un caractère spécial.
   - Exemple de validation :
     ```typescript
     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
     if (!passwordRegex.test(password)) {
       throw new Error("Mot de passe trop faible");
     }
     ```

2. **Ne jamais envoyer le mot de passe par email**.

3. **Permettre la réinitialisation sécurisée** :
   - Générer un **token temporaire** (ex: valide 1h) pour la réinitialisation.
   - Stocker ce token en base de données avec une date d'expiration.

---

### **C. Journalisation (Logging)**
1. **Logger les tentatives de connexion** (succès et échecs) :
   ```typescript
   await prisma.loginAttempt.create({
     data: {
       userId: user.id,
       ip: req.ip,
       success: true, // ou false
       userAgent: req.headers['user-agent'],
     },
   });
   ```

2. **Alerter en cas d'activités suspectes** (ex: plusieurs échecs depuis une même IP).

---

## **5. Exemple Complet : Flux de Connexion**
### **Backend (Express)**
```typescript
// routes/auth.ts
import express from 'express';
import { hashPassword, comparePasswords } from '../services/auth';
import { generateToken } from '../services/jwt';
import { prisma } from '../services/prisma';

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });
  res.status(201).json(user);
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email } });
});

// Déconnexion (invalide le refresh token si utilisé)
router.post('/logout', async (req, res) => {
  // Logique de déconnexion
  res.json({ message: "Logged out" });
});

export default router;
```

### **Frontend (Vue 3 + Pinia)**
```vue
<!-- LoginForm.vue -->
<template>
  <form @submit.prevent="login">
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Mot de passe" required />
    <button type="submit" :disabled="loading">
      {{ loading ? 'Connexion...' : 'Se connecter' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const authStore = useAuthStore();
const router = useRouter();

async function login() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Erreur de connexion';
  } finally {
    loading.value = false;
  }
}
</script>
```

```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as { id: number; email: string } | null,
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(email: string, password: string) {
      const response = await api.post('/login', { email, password });
      this.token = response.data.token;
      this.user = response.data.user;
      localStorage.setItem('token', this.token);
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
    },
    async checkAuth() {
      if (this.token) {
        try {
          const response = await api.get('/me'); // Endpoint pour récupérer l'utilisateur
          this.user = response.data;
        } catch {
          this.logout();
        }
      }
    },
  },
});
```

---

## **6. Tests**
### **Backend (Jest)**
```typescript
// __tests__/auth.test.ts
import request from 'supertest';
import app from '../app';
import { prisma } from '../services/prisma';

describe('Auth Routes', () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: await hashPassword('password123'),
      },
    });
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'new@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('email');
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    expect(res.statusCode).toEqual(401);
  });
});
```

### **Frontend (Vitest)**
```typescript
// __tests__/LoginForm.spec.ts
import { mount } from '@vue/test-utils';
import LoginForm from '../components/LoginForm.vue';
import { createPinia, setActivePinia } from 'pinia';

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should show error on failed login', async () => {
    const wrapper = mount(LoginForm);
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.find('.error').exists()).toBe(true);
  });
});
```

---

## **7. Déploiement et Configuration**
### **Variables d'environnement**
Créez un fichier `.env` pour les clés sensibles :
```
# Backend
JWT_SECRET=votre_cle_secrete_ultra_complexe_123
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Frontend
VITE_API_BASE_URL=https://votre-api.com
```

### **HTTPS**
- **Backend** : Utilisez **Nginx** ou **Let's Encrypt** pour forcer HTTPS.
- **Frontend** : Si vous utilisez un domaine personnalisé, configurez HTTPS via votre hébergeur (Vercel, Netlify, etc.).

### **CORS**
Configurez CORS dans Express pour autoriser seulement votre domaine frontend :
```typescript
import cors from 'cors';

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Pour les cookies
  })
);
```

---

## **8. Résumé des Bonnes Pratiques**
| Catégorie | Bonne Pratique |
|-----------|----------------|
| **Backend** | Utiliser `bcrypt` pour hacher les mots de passe. |
| | Générer des JWT avec une durée courte (ex: 1h). |
| | Implémenter des refresh tokens pour les sessions longues. |
| | Valider toutes les entrées (email, mot de passe). |
| | Limiter les tentatives de connexion (`rate-limit`). |
| | Utiliser des cookies HTTP-only pour les tokens. |
| **Frontend** | Stocker le token dans Pinia + localStorage (ou cookies HTTP-only). |
| | Protéger les routes avec des guards Vue Router. |
| | Afficher des messages d'erreur clairs mais génériques. |
| | Désactiver les boutons pendant le chargement. |
| **Sécurité** | Toujours utiliser HTTPS en production. |
| | Protéger contre XSS, CSRF, et les injections SQL. |
| | Ne jamais exposer les hashs de mots de passe. |
| | Journaliser les tentatives de connexion. |
| **UX** | Permettre "Rester connecté" avec un refresh token long. |
| | Offrir une réinitialisation de mot de passe. |
| | Rediriger automatiquement après connexion/déconnexion. |

---

## **9. Aller Plus Loin**
### **A. Authentification avec OAuth (Google, Facebook)**
Utilisez des bibliothèques comme :
- **Backend** : `passport-js` ou `oauth2-client`.
- **Frontend** : `@vueuse/social-sharing` ou des SDKs officiels (Google API).

Exemple avec Google :
```typescript
// Backend (Express)
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/auth/google', async (req, res) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) return res.status(400).json({ error: "Invalid token" });

  // Trouver ou créer l'utilisateur
  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        // Pas de mot de passe pour les utilisateurs OAuth
      },
    });
  }

  // Générer un JWT
  const jwtToken = generateToken(user.id, user.email);
  res.json({ token: jwtToken, user });
});
```

### **B. Double Authentification (2FA)**
Utilisez des bibliothèques comme :
- **Backend** : `speakeasy` pour générer des codes TOTP.
- **Frontend** : `vue-qrcode` pour afficher le QR code.

Exemple :
```typescript
// Backend
import speakeasy from 'speakeasy';

router.get('/2fa/setup', authMiddleware, async (req: any, res) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorSecret: secret.base32 },
  });
  res.json({ secret: secret.otpauth_url }); // URL pour le QR code
});

router.post('/2fa/verify', authMiddleware, async (req: any, res) => {
  const { token } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const verified = speakeasy.totp.verify({
    secret: user!.twoFactorSecret,
    encoding: 'base32',
    token,
  });
  if (!verified) return res.status(401).json({ error: "Invalid token" });

  // Activer le 2FA pour l'utilisateur
  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorEnabled: true },
  });
  res.json({ success: true });
});
```

### **C. Audit de Sécurité**
- Utilisez des outils comme **OWASP ZAP** ou **Snyk** pour scanner les vulnérabilités.
- Effectuez des **tests d'intrusion** (pentests) régulièrement.

---

## **10. Exemple Complet avec Refresh Tokens**
### **Backend**
1. **Modèle Prisma** :
   ```prisma
   model RefreshToken {
     id        Int      @id @default(autoincrement())
     token     String   @unique
     userId    Int
     user      User     @relation(fields: [userId], references: [id])
     expiresAt DateTime
   }
   ```

2. **Génération des tokens** :
   ```typescript
   // services/jwt.ts
   export function generateTokens(userId: number, email: string) {
     const accessToken = jwt.sign(
       { userId, email },
       process.env.JWT_SECRET!,
       { expiresIn: '15m' } // Court pour le token d'accès
     );
     const refreshToken = jwt.sign(
       { userId },
       process.env.JWT_REFRESH_SECRET!,
       { expiresIn: '7d' } // Long pour le refresh token
     );
     return { accessToken, refreshToken };
   }
   ```

3. **Route `/login` mise à jour** :
   ```typescript
   router.post('/login', async (req, res) => {
     // ... (validation et vérification du mot de passe)
     const { accessToken, refreshToken } = generateTokens(user.id, user.email);

     // Stocker le refresh token en base
     await prisma.refreshToken.create({
       data: {
         token: refreshToken,
         userId: user.id,
         expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
       },
     });

     res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
   });
   ```

4. **Route `/refresh`** :
   ```typescript
   router.post('/refresh', async (req, res) => {
     const { refreshToken } = req.body;
     if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

     try {
       const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
       const tokenRecord = await prisma.refreshToken.findUnique({
         where: { token: refreshToken },
       });

       if (!tokenRecord || tokenRecord.userId !== payload.userId) {
         return res.status(401).json({ error: "Invalid refresh token" });
       }

       const user = await prisma.user.findUnique({ where: { id: payload.userId } });
       if (!user) return res.status(401).json({ error: "User not found" });

       // Générer un nouveau token d'accès
       const { accessToken: newAccessToken } = generateTokens(user.id, user.email);
       res.json({ accessToken: newAccessToken });
     } catch (error) {
       res.status(401).json({ error: "Invalid refresh token" });
     }
   });
   ```

### **Frontend**
1. **Stocker les tokens** :
   ```typescript
   // stores/auth.store.ts
   actions: {
     async login(email: string, password: string) {
       const response = await api.post('/login', { email, password });
       this.user = response.data.user;
       this.accessToken = response.data.accessToken;
       localStorage.setItem('accessToken', response.data.accessToken);
       localStorage.setItem('refreshToken', response.data.refreshToken);
     },
     async refreshToken() {
       const refreshToken = localStorage.getItem('refreshToken');
       if (!refreshToken) throw new Error("No refresh token");

       const response = await api.post('/refresh', { refreshToken });
       this.accessToken = response.data.accessToken;
       localStorage.setItem('accessToken', response.data.accessToken);
     },
   },
   ```

2. **Intercepteur Axios pour rafraîchir le token** :
   ```typescript
   // services/api.ts
   api.interceptors.response.use(
     (response) => response,
     async (error) => {
       const originalRequest = error.config;
       if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true;
         try {
           const authStore = useAuthStore();
           await authStore.refreshToken();
           originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`;
           return api(originalRequest);
         } catch (err) {
           const authStore = useAuthStore();
           authStore.logout();
           window.location.href = '/login';
         }
       }
       return Promise.reject(error);
     }
   );
   ```

---

## **11. Checklist Finale**
### **Backend**
- [ ] Utiliser `bcrypt` pour hacher les mots de passe.
- [ ] Générer des JWT avec une durée courte (ex: 15m).
- [ ] Implémenter des refresh tokens pour les sessions longues.
- [ ] Valider les entrées (email, mot de passe).
- [ ] Limiter les tentatives de connexion (`express-rate-limit`).
- [ ] Protéger contre les attaques CSRF (cookies `sameSite`).
- [ ] Utiliser HTTPS en production.
- [ ] Journaliser les tentatives de connexion.

### **Frontend**
- [ ] Stocker le token dans Pinia + localStorage (ou cookies HTTP-only).
- [ ] Protéger les routes avec des guards Vue Router.
- [ ] Afficher des messages d'erreur clairs.
- [ ] Désactiver les boutons pendant le chargement.
- [ ] Rafraîchir automatiquement le token expiré.
- [ ] Rediriger vers `/login` en cas de 401.

### **Sécurité**
- [ ] Ne jamais stocker de mots de passe en clair.
- [ ] Ne pas exposer les hashs de mots de passe dans les réponses API.
- [ ] Utiliser des cookies `httpOnly` et `secure` pour les tokens.
- [ ] Protéger contre XSS, CSRF, et les injections SQL.
- [ ] Effectuer des audits de sécurité réguliers.

---

## **12. Ressources Utiles**
- [Documentation JWT](https://jwt.io/)
- [BCrypt Node.js](https://github.com/kevinbeaty/bcrypt-nodejs)
- [Passport.js (OAuth)](http://www.passportjs.org/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Vue 3 + Pinia](https://pinia.vuejs.org/)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)

---

## **13. Exemple de Flux Complet**
1. **Utilisateur se connecte** :
   - Saisit email/mot de passe → `POST /login`.
   - Backend vérifie les identifiants → renvoie `accessToken` + `refreshToken`.
   - Frontend stocke les tokens et redirige vers `/dashboard`.

2. **Accès à une route protégée** :
   - Frontend envoie `accessToken` dans le header `Authorization`.
   - Backend vérifie le token → autorise l'accès.

3. **Token expiré** :
   - Backend renvoie 401.
   - Frontend utilise le `refreshToken` pour obtenir un nouveau `accessToken` → réessaye la requête.

4. **Déconnexion** :
   - Frontend supprime les tokens → `POST /logout`.
   - Backend invalide le `refreshToken`.

---

Si vous avez des questions spécifiques ou si vous rencontrez des problèmes en implémentant ces bonnes pratiques, n'hésitez pas à partager :
- Le code de votre backend/frontend.
- Les messages d'erreur que vous obtenez.
- Votre configuration actuelle (ex: `.env`, `schema.prisma`).

Je peux vous aider à déboguer ou à optimiser votre implémentation ! 🚀