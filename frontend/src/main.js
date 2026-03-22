import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/main.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()
auth.initFromStorage()

app.use(router);
app.mount('#app');