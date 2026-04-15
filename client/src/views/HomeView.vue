<template>
  <div class="home">
    <h1>🍽️ Main Menu</h1>
    <p>Beautiful digital menus for your restaurant — no designer needed.</p>
    <div class="actions" v-if="!auth.isAuthenticated">
      <router-link to="/register" class="btn btn-primary">Get Started</router-link>
      <router-link to="/login" class="btn btn-secondary">Sign In</router-link>
    </div>
    <div class="actions" v-else>
      <router-link to="/dashboard" class="btn btn-primary">Go to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>

<style scoped>
.home {
  text-align: center;
  padding: 4rem 2rem;
}
h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}
p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
}
.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn {
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
}
.btn-primary {
  background: #2563eb;
  color: white;
}
.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}
</style>
