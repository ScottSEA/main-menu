<script setup>
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <header class="app-header">
    <router-link to="/" class="logo">🍽️ Main Menu</router-link>
    <nav>
      <template v-if="auth.isAuthenticated">
        <router-link to="/dashboard">Dashboard</router-link>
        <button @click="handleLogout" class="logout-btn">Logout</button>
      </template>
      <template v-else>
        <router-link to="/login">Sign In</router-link>
        <router-link to="/register">Register</router-link>
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
  border-bottom: 1px solid #e5e7eb;
}
.logo {
  font-size: 1.3rem;
  font-weight: 700;
  text-decoration: none;
  color: #111827;
}
nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}
nav a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
}
.logout-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  color: #4b5563;
}
</style>
