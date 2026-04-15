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
        <div class="restaurant-header">
          <div>
            <h4>{{ r.name }}</h4>
            <span class="slug">/menu/{{ r.slug }}</span>
          </div>
          <button @click="createMenu(r)" class="btn btn-small">+ New Menu</button>
        </div>
        <div v-if="r.menus && r.menus.length" class="menu-list">
          <div v-for="m in r.menus" :key="m.id" class="menu-card">
            <div>
              <strong>{{ m.name }}</strong>
              <span class="menu-status" :class="m.status">{{ m.status }}</span>
            </div>
            <router-link :to="`/editor/${m.id}`" class="btn btn-small btn-primary">Edit</router-link>
          </div>
        </div>
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
  // Load menus for each restaurant
  for (const r of res.data) {
    const menusRes = await axios.get(`/api/menus/restaurants/${r.id}/menus`)
    r.menus = menusRes.data
  }
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

async function createMenu(restaurant) {
  try {
    const res = await axios.post(`/api/menus/restaurants/${restaurant.id}/menus`, {
      name: 'Main Menu',
      template_id: 'classic',
    })
    await loadRestaurants()
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to create menu')
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
.restaurant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.restaurant-card h4 { margin: 0 0 0.25rem; }
.slug { color: #6b7280; font-size: 0.9rem; }
.menu-list { margin-top: 0.75rem; }
.menu-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 0.4rem;
}
.menu-status {
  font-size: 0.75rem;
  padding: 0.1em 0.5em;
  border-radius: 3px;
  margin-left: 0.5rem;
}
.menu-status.draft { background: #fef3c7; color: #92400e; }
.menu-status.published { background: #d1fae5; color: #065f46; }
.empty { color: #9ca3af; padding: 2rem; text-align: center; }
.error { color: #dc2626; font-size: 0.9rem; }
.btn { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 0.9rem; background: white; text-decoration: none; }
.btn-primary { background: #2563eb; color: white; border-color: #2563eb; }
.btn-small { padding: 0.4rem 0.75rem; font-size: 0.85rem; }
</style>
