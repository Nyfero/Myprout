// src/services/api.js
import axios from "axios";
import { ref } from "vue";

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  // baseURL: 'https://votre-backend.com/api', // Pour la prod
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  console.log('Token envoyé :', token) // 👈 Ajoutez ce log temporairement
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api;

// Configuration de base d'Axios
// const api = axios.create({
//   baseURL: "http://localhost:3000",
//   timeout: 10000, // Timeout en ms
//   headers: {
//     "Content-Type": "application/json",
//     // Ajoutez ici des headers globaux (ex: token d'authentification)
//   },
// });

// // État global pour la gestion des erreurs et du chargement
// export const apiError = ref(null);
// export const isLoading = ref(false);

// // Intercepteur pour ajouter le token d'authentification (si nécessaire)
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Intercepteur pour gérer les erreurs globalement
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     apiError.value = {
//       message: error.response?.data?.message || error.message,
//       status: error.response?.status || 500,
//       details: error.response?.data || null,
//     };
//     return Promise.reject(error);
//   }
// );

// // ======================
// // SERVICES POUR LES UTILISATEURS
// // ======================
// export const UserService = {
//   /**
//    * Récupère tous les utilisateurs
//    * @returns {Promise<Array>} Liste des utilisateurs
//    */
//   async getUsers() {
//     isLoading.value = true;
//     try {
//       const response = await api.get("/users");
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },

//   /**
//    * Crée un nouvel utilisateur
//    * @param {Object} user - Données de l'utilisateur
//    * @param {string} user.lastName - Nom de famille
//    * @param {string} user.firstName - Prénom
//    * @param {string} user.email - Email
//    * @returns {Promise<Object>} Utilisateur créé
//    */
//   async createUser(user) {
//     isLoading.value = true;
//     try {
//       const response = await api.post("/users", {
//         lastName: user.lastName.trim(),
//         firstName: user.firstName.trim(),
//         email: user.email.trim().toLowerCase(),
//       });
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },

//   /**
//    * Récupère un utilisateur par son ID
//    * @param {string|number} id - ID de l'utilisateur
//    * @returns {Promise<Object>} Utilisateur trouvé
//    */
//   async getUserById(id) {
//     isLoading.value = true;
//     try {
//       const response = await api.get(`/users/${id}`);
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },

//   /**
//    * Met à jour un utilisateur
//    * @param {string|number} id - ID de l'utilisateur
//    * @param {Object} updates - Champs à mettre à jour
//    * @returns {Promise<Object>} Utilisateur mis à jour
//    */
//   async updateUser(id, updates) {
//     isLoading.value = true;
//     try {
//       const response = await api.patch(`/users/${id}`, updates);
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },

//   /**
//    * Supprime un utilisateur
//    * @param {string|number} id - ID de l'utilisateur
//    * @returns {Promise<Object>} Confirmation de suppression
//    */
//   async deleteUser(id) {
//     isLoading.value = true;
//     try {
//       const response = await api.delete(`/users/${id}`);
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },
// };

// // ======================
// // SERVICES D'AUTHENTIFICATION (EXEMPLE)
// // ======================
// export const AuthService = {
//   async login(credentials) {
//     isLoading.value = true;
//     try {
//       const response = await api.post("/auth/login", credentials);
//       localStorage.setItem("token", response.data.token); // Sauvegarde du token
//       return response.data;
//     } finally {
//       isLoading.value = false;
//     }
//   },

//   async logout() {
//     localStorage.removeItem("token");
//   },

//   async refreshToken() {
//     const response = await api.post("/auth/refresh");
//     localStorage.setItem("token", response.data.token);
//     return response.data;
//   },
// };

// // ======================
// // UTILITAIRES
// // ======================
// /**
//  * Nettoie les données avant envoi (trim, lowercase, etc.)
//  */
// export function cleanUserData(user) {
//   return {
//     ...user,
//     lastName: user.lastName?.trim(),
//     firstName: user.firstName?.trim(),
//     email: user.email?.trim().toLowerCase(),
//   };
// }

// export default api;