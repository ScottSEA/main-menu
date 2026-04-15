<template>
  <div class="wizard">
    <h2>🍽️ Create Your Menu</h2>

    <!-- Progress bar -->
    <div class="progress-bar">
      <div
        v-for="s in steps"
        :key="s.num"
        class="progress-step"
        :class="{ active: step === s.num, done: step > s.num }"
      >
        <div class="step-circle">{{ step > s.num ? '✓' : s.num }}</div>
        <span class="step-label">{{ s.label }}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: ((step - 1) / (steps.length - 1)) * 100 + '%' }"></div>
      </div>
    </div>

    <!-- Step 1: Restaurant Info -->
    <div v-if="step === 1" class="step-content">
      <h3>Restaurant Info</h3>
      <label class="field-label">Restaurant Name</label>
      <input v-model="restaurantName" placeholder="e.g. Joe's Diner" class="input" />

      <label class="field-label">Menu Slug</label>
      <input v-model="slug" placeholder="e.g. joes-diner" class="input" @input="onSlugInput" />
      <div class="slug-preview">
        Your menu will be at: <strong>/menu/{{ slug || '...' }}</strong>
        <span v-if="slugChecking" class="slug-status checking">Checking...</span>
        <span v-else-if="slugAvailable === true" class="slug-status available">✓ Available</span>
        <span v-else-if="slugAvailable === false" class="slug-status taken">✕ Taken</span>
      </div>
    </div>

    <!-- Step 2: Choose Template -->
    <div v-if="step === 2" class="step-content">
      <h3>Choose a Template</h3>
      <div v-if="templatesLoading" class="loading">Loading templates...</div>
      <div v-else class="template-grid">
        <div
          v-for="t in templates"
          :key="t.id"
          class="template-card"
          :class="{ selected: selectedTemplate === t.id }"
          @click="selectedTemplate = t.id"
        >
          <h4>{{ t.name }}</h4>
          <p>{{ t.description }}</p>
        </div>
      </div>
    </div>

    <!-- Step 3: Display Settings -->
    <div v-if="step === 3" class="step-content">
      <h3>Display Settings</h3>

      <label class="field-label">Screen Size Preset</label>
      <div class="preset-grid">
        <button
          v-for="p in presets"
          :key="p.label"
          class="preset-btn"
          :class="{ selected: displayWidth === p.w && displayHeight === p.h }"
          @click="displayWidth = p.w; displayHeight = p.h"
        >
          {{ p.label }}<br /><small>{{ p.w }}×{{ p.h }}</small>
        </button>
      </div>

      <div class="dimension-row">
        <div>
          <label class="field-label">Width (px)</label>
          <input v-model.number="displayWidth" type="number" min="320" class="input input-sm" />
        </div>
        <div>
          <label class="field-label">Height (px)</label>
          <input v-model.number="displayHeight" type="number" min="240" class="input input-sm" />
        </div>
      </div>

      <div class="color-row">
        <div>
          <label class="field-label">Background</label>
          <input v-model="colorBg" type="color" class="color-picker" />
        </div>
        <div>
          <label class="field-label">Text</label>
          <input v-model="colorText" type="color" class="color-picker" />
        </div>
        <div>
          <label class="field-label">Accent</label>
          <input v-model="colorAccent" type="color" class="color-picker" />
        </div>
      </div>
    </div>

    <!-- Step 4: Add Menu Items -->
    <div v-if="step === 4" class="step-content">
      <h3>Add Menu Items</h3>

      <div v-for="(cat, ci) in categories" :key="ci" class="category-block">
        <div class="category-header">
          <input v-model="cat.name" class="input category-name-input" placeholder="Category name" />
          <button v-if="categories.length > 1" @click="categories.splice(ci, 1)" class="btn-icon danger" title="Remove category">✕</button>
        </div>

        <div v-for="(item, ii) in cat.items" :key="ii" class="item-row">
          <input v-model="item.name" placeholder="Item name" class="input input-sm" />
          <input v-model="item.price" placeholder="Price" type="number" step="0.01" min="0" class="input input-xs" />
          <input v-model="item.description" placeholder="Description (optional)" class="input input-sm" />
          <button @click="cat.items.splice(ii, 1)" class="btn-icon danger" title="Remove item">✕</button>
        </div>

        <button @click="cat.items.push({ name: '', price: '', description: '' })" class="btn btn-small">+ Add Item</button>
      </div>

      <button @click="categories.push({ name: '', items: [{ name: '', price: '', description: '' }] })" class="btn btn-small add-category-btn">+ Add Category</button>
    </div>

    <!-- Step 5: Review & Publish -->
    <div v-if="step === 5" class="step-content">
      <h3>Review &amp; Publish</h3>

      <div v-if="!published" class="review-card">
        <div class="review-row"><span>Restaurant:</span><strong>{{ restaurantName }}</strong></div>
        <div class="review-row"><span>Slug:</span><strong>/menu/{{ slug }}</strong></div>
        <div class="review-row"><span>Template:</span><strong>{{ selectedTemplateName }}</strong></div>
        <div class="review-row"><span>Dimensions:</span><strong>{{ displayWidth }}×{{ displayHeight }}</strong></div>
        <div class="review-row"><span>Categories:</span><strong>{{ categories.length }}</strong></div>
        <div class="review-row"><span>Items:</span><strong>{{ totalItems }}</strong></div>

        <button @click="publish" class="btn btn-primary btn-publish" :disabled="publishing">
          {{ publishing ? 'Publishing...' : '🚀 Publish Menu' }}
        </button>
        <p v-if="publishError" class="error">{{ publishError }}</p>
      </div>

      <div v-else class="success-card">
        <h4>🎉 Menu Published!</h4>
        <p>Your menu is live at:</p>
        <a :href="`/menu/${slug}`" class="menu-link" target="_blank">/menu/{{ slug }}</a>
        <div class="success-actions">
          <router-link :to="`/editor/${createdMenuId}`" class="btn btn-primary">Open Editor</router-link>
          <router-link to="/dashboard" class="btn btn-secondary">Go to Dashboard</router-link>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div v-if="!(step === 5 && published)" class="nav-buttons">
      <button @click="step--" class="btn btn-secondary" :disabled="step === 1">← Back</button>
      <button v-if="step < 5" @click="step++" class="btn btn-primary" :disabled="!canAdvance">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const steps = [
  { num: 1, label: 'Restaurant' },
  { num: 2, label: 'Template' },
  { num: 3, label: 'Settings' },
  { num: 4, label: 'Items' },
  { num: 5, label: 'Publish' },
]

const step = ref(1)

// Step 1
const restaurantName = ref('')
const slug = ref('')
const slugManuallyEdited = ref(false)
const slugAvailable = ref(null)
const slugChecking = ref(false)
let slugTimer = null

watch(restaurantName, (val) => {
  if (!slugManuallyEdited.value) {
    slug.value = val.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-').replace(/^-|-$/g, '')
  }
})

watch(slug, (val) => {
  if (val.length < 3) { slugAvailable.value = null; return }
  slugChecking.value = true
  clearTimeout(slugTimer)
  slugTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`/api/menus/restaurants/check-slug/${val}`)
      slugAvailable.value = res.data.available
    } catch { slugAvailable.value = null }
    slugChecking.value = false
  }, 400)
})

function onSlugInput() {
  slugManuallyEdited.value = true
  slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

// Step 2
const templates = ref([])
const templatesLoading = ref(false)
const selectedTemplate = ref(null)

const selectedTemplateName = computed(() => {
  const t = templates.value.find(t => t.id === selectedTemplate.value)
  return t ? t.name : '—'
})

onMounted(async () => {
  templatesLoading.value = true
  try {
    const res = await axios.get('/api/templates')
    templates.value = res.data
    if (res.data.length) selectedTemplate.value = res.data[0].id
  } catch { /* templates will stay empty */ }
  templatesLoading.value = false
})

// Step 3
const presets = [
  { label: 'Full HD', w: 1920, h: 1080 },
  { label: 'HD', w: 1280, h: 720 },
  { label: '4K', w: 3840, h: 2160 },
  { label: 'Portrait', w: 1080, h: 1920 },
]
const displayWidth = ref(1920)
const displayHeight = ref(1080)
const colorBg = ref('#111827')
const colorText = ref('#e5e7eb')
const colorAccent = ref('#2563eb')

// Step 4
const categories = ref([
  { name: 'Main Menu', items: [{ name: '', price: '', description: '' }] },
])

const totalItems = computed(() =>
  categories.value.reduce((sum, c) => sum + c.items.filter(i => i.name).length, 0)
)

// Step 5
const publishing = ref(false)
const published = ref(false)
const publishError = ref('')
const createdMenuId = ref(null)

// Validation
const canAdvance = computed(() => {
  if (step.value === 1) return restaurantName.value.trim() && slug.value.length >= 3 && slugAvailable.value === true && !slugChecking.value
  if (step.value === 2) return !!selectedTemplate.value
  if (step.value === 3) return displayWidth.value > 0 && displayHeight.value > 0
  if (step.value === 4) return categories.value.some(c => c.name && c.items.some(i => i.name))
  return true
})

async function publish() {
  publishing.value = true
  publishError.value = ''
  try {
    // 1. Create restaurant
    const rRes = await axios.post('/api/menus/restaurants', {
      name: restaurantName.value,
      slug: slug.value,
    })
    const restaurantId = rRes.data.id

    // 2. Create menu
    const mRes = await axios.post(`/api/menus/restaurants/${restaurantId}/menus`, {
      name: 'Main Menu',
      template_id: selectedTemplate.value,
      width_px: displayWidth.value,
      height_px: displayHeight.value,
    })
    const menuId = mRes.data.id
    createdMenuId.value = menuId

    // 3. Save display settings
    await axios.put(`/api/menus/menus/${menuId}`, {
      settings_json: JSON.stringify({
        backgroundColor: colorBg.value,
        textColor: colorText.value,
        accentColor: colorAccent.value,
      }),
    })

    // 4. Get menu to find default page
    const menuData = await axios.get(`/api/menus/menus/${menuId}`)
    const pageId = menuData.data.pages?.[0]?.id

    if (pageId) {
      // 5. Create categories and items
      for (const cat of categories.value) {
        if (!cat.name) continue
        const cRes = await axios.post(`/api/menus/pages/${pageId}/categories`, {
          name: cat.name,
        })
        const categoryId = cRes.data.id

        for (const item of cat.items) {
          if (!item.name) continue
          await axios.post(`/api/menus/categories/${categoryId}/items`, {
            name: item.name,
            price_cents: Math.round((parseFloat(item.price) || 0) * 100),
            description: item.description || '',
            dietary_tags: '',
            is_special: false,
          })
        }
      }
    }

    // 6. Publish
    await axios.post(`/api/publish/${menuId}`)
    published.value = true
  } catch (err) {
    publishError.value = err.response?.data?.error || 'Publishing failed. Please try again.'
  }
  publishing.value = false
}
</script>

<style scoped>
.wizard {
  max-width: 720px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.wizard h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

/* Progress bar */
.progress-bar {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}
.progress-track {
  position: absolute;
  top: 15px;
  left: 30px;
  right: 30px;
  height: 3px;
  background: var(--border);
  z-index: 0;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}
.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}
.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.2s;
}
.progress-step.active .step-circle {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}
.progress-step.done .step-circle {
  border-color: var(--success);
  background: var(--success);
  color: #111827;
}
.step-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}
.progress-step.active .step-label {
  color: var(--text);
  font-weight: 600;
}

/* Step content */
.step-content {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.step-content h3 {
  margin: 0 0 1rem;
}

/* Inputs */
.field-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
  margin-top: 0.75rem;
}
.field-label:first-of-type {
  margin-top: 0;
}
.input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.95rem;
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: var(--accent);
}
.input-sm { max-width: 100%; }
.input-xs { max-width: 100px; flex-shrink: 0; }

/* Slug */
.slug-preview {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}
.slug-preview strong { color: #60a5fa; }
.slug-status { margin-left: 0.5rem; font-size: 0.8rem; }
.slug-status.checking { color: var(--text-muted); }
.slug-status.available { color: var(--success); }
.slug-status.taken { color: #f87171; }

/* Templates */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.template-card {
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  background: var(--bg-input);
  transition: border-color 0.15s;
}
.template-card:hover { border-color: var(--text-muted); }
.template-card.selected { border-color: var(--accent); background: #1e3a5f40; }
.template-card h4 { margin: 0 0 0.35rem; }
.template-card p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
.loading { color: var(--text-muted); text-align: center; padding: 2rem; }

/* Presets */
.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.preset-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1.3;
}
.preset-btn:hover { border-color: var(--text-muted); }
.preset-btn.selected { border-color: var(--accent); background: #1e3a5f40; }
.preset-btn small { color: var(--text-muted); font-size: 0.75rem; }

.dimension-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.dimension-row > div { flex: 1; }
.dimension-row .input { max-width: 100%; }

.color-row {
  display: flex;
  gap: 1.5rem;
}
.color-picker {
  width: 48px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  padding: 2px;
}

/* Menu items */
.category-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--bg);
}
.category-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.category-name-input {
  font-weight: 600;
  font-size: 1rem;
}
.item-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.item-row .input-sm { flex: 1; }
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.btn-icon.danger:hover { color: var(--danger); }
.add-category-btn { margin-top: 0.5rem; }

/* Review */
.review-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.review-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.95rem;
}
.review-row span { color: var(--text-muted); }

/* Publish */
.btn-publish {
  margin-top: 1.5rem;
  width: 100%;
  padding: 0.75rem;
  font-size: 1.05rem;
}
.error { color: var(--danger); font-size: 0.9rem; margin-top: 0.5rem; }

/* Success */
.success-card {
  text-align: center;
  padding: 1rem 0;
}
.success-card h4 { font-size: 1.4rem; margin: 0 0 0.5rem; }
.menu-link {
  display: inline-block;
  color: #60a5fa;
  font-size: 1.1rem;
  margin: 0.5rem 0 1.5rem;
}
.success-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Nav buttons */
.nav-buttons {
  display: flex;
  justify-content: space-between;
}

/* Shared button styles */
.btn {
  padding: 0.55rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  background: var(--bg-surface);
  color: var(--text);
  text-decoration: none;
}
.btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn-primary:disabled { background: #1e3a5f; color: #6b7280; border-color: #1e3a5f; cursor: not-allowed; opacity: 0.6; }
.btn-secondary { background: var(--bg-surface); color: var(--text); }
.btn-small { padding: 0.35rem 0.7rem; font-size: 0.85rem; }
</style>
