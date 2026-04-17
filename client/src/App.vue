<script setup>
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <header class="app-header">
    <router-link
      to="/"
      class="logo"
    >
      🍽️ Main Menu
    </router-link>
    <nav>
      <template v-if="auth.isAuthenticated">
        <router-link to="/dashboard">
          Dashboard
        </router-link>
        <router-link to="/subscription">
          Subscription
        </router-link>
        <router-link to="/account">
          Account
        </router-link>
        <button
          class="logout-btn"
          @click="handleLogout"
        >
          Logout
        </button>
      </template>
      <template v-else>
        <router-link to="/login">
          Sign In
        </router-link>
        <router-link to="/register">
          Register
        </router-link>
      </template>
    </nav>
  </header>
  <main>
    <router-view />
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}
.logo {
  font-size: 1.3rem;
  font-weight: 700;
  text-decoration: none;
  color: #f9fafb;
}
nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}
nav a {
  text-decoration: none;
  color: var(--text);
  font-weight: 500;
}
nav a:hover { color: #f9fafb; }
.logout-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  color: var(--text);
}
.logout-btn:hover { color: #f9fafb; border-color: var(--text); }
</style>
