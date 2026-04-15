<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <p>Welcome, {{ auth.user?.email }}</p>

    <section class="restaurants">
      <div class="section-header">
        <h3>Your Restaurants</h3>
        <button @click="showNewRestaurant = true" class="btn btn-small">+ Add Restaurant</button>
      </div>

      <div v-if="showNewRestaurant" class="new-form">
        <input v-model="newName" placeholder="Restaurant name" />
        <input v-model="newSlug" placeholder="URL slug (e.g. joes-diner)" />
        <div class="form-actions">
          <button @click="createRestaurant" class="btn btn-primary btn-small">Create</button>
          <button @click="showNewRestaurant = false" class="btn btn-small">Cancel</button>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>
      </div>

      <div v-if="restaurants.length === 0 && !showNewRestaurant" class="empty">
        No restaurants yet. Add one to get started!
      </div>

      <div v-for="r in restaurants" :key="r.id" class="restaurant-card">
        <h4>{{ r.name }}</h4>
        <span class="slug">/menu/{{ r.slug }}</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const restaurants = ref([])
const showNewRestaurant = ref(false)
const newName = ref('')
const newSlug = ref('')
const createError = ref('')

async function loadRestaurants() {
  const res = await axios.get('/api/menus/restaurants')
  restaurants.value = res.data
}

async function createRestaurant() {
  createError.value = ''
  try {
    await axios.post('/api/menus/restaurants', {
      name: newName.value,
      slug: newSlug.value,
    })
    newName.value = ''
    newSlug.value = ''
    showNewRestaurant.value = false
    await loadRestaurants()
  } catch (err) {
    createError.value = err.response?.data?.error || 'Failed to create restaurant'
  }
}

onMounted(loadRestaurants)
</script>

<style scoped>
.dashboard {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2rem 0 1rem;
}
.new-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.new-form input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}
.form-actions { display: flex; gap: 0.5rem; }
.restaurant-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}
.restaurant-card h4 { margin: 0 0 0.25rem; }
.slug { color: #6b7280; font-size: 0.9rem; }
.empty { color: #9ca3af; padding: 2rem; text-align: center; }
.error { color: #dc2626; font-size: 0.9rem; }
.btn { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 0.9rem; background: white; }
.btn-primary { background: #2563eb; color: white; border-color: #2563eb; }
.btn-small { padding: 0.4rem 0.75rem; font-size: 0.85rem; }
</style>
