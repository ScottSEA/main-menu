<template>
  <div class="editor">
    <div class="editor-sidebar">
      <div class="sidebar-header">
        <router-link to="/dashboard" class="back">← Back</router-link>
        <h2>{{ menu?.name || 'Loading...' }}</h2>
      </div>

      <div v-if="menu" class="editor-content">
        <!-- Menu Settings -->
        <section class="panel">
          <h3>Display Settings</h3>
          <div class="field-row">
            <div class="field">
              <label>Width (px)</label>
              <input v-model.number="menu.width_px" type="number" @change="saveSettings" />
            </div>
            <div class="field">
              <label>Height (px)</label>
              <input v-model.number="menu.height_px" type="number" @change="saveSettings" />
            </div>
          </div>
          <div class="field">
            <label>Template</label>
            <select v-model="menu.template_id" @change="saveSettings">
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </section>

        <!-- Style Settings -->
        <section class="panel">
          <h3>Style</h3>
          <div class="field-row">
            <div class="field">
              <label>Background</label>
              <input v-model="settings.backgroundColor" type="color" @change="saveSettings" />
            </div>
            <div class="field">
              <label>Text</label>
              <input v-model="settings.textColor" type="color" @change="saveSettings" />
            </div>
            <div class="field">
              <label>Accent</label>
              <input v-model="settings.accentColor" type="color" @change="saveSettings" />
            </div>
          </div>
          <div class="field">
            <label>Font</label>
            <select v-model="settings.fontFamily" @change="saveSettings">
              <option value="'Georgia', 'Times New Roman', serif">Georgia (Serif)</option>
              <option value="'Helvetica Neue', Arial, sans-serif">Helvetica (Sans)</option>
              <option value="'Palatino', 'Book Antiqua', serif">Palatino (Elegant)</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet (Modern)</option>
              <option value="'Courier New', monospace">Courier (Monospace)</option>
            </select>
          </div>
        </section>

        <!-- Pages & Categories -->
        <section class="panel" v-for="page in pages" :key="page.id">
          <h3>Page {{ page.page_order + 1 }}</h3>

          <div v-for="category in page.categories" :key="category.id" class="category-block">
            <div class="category-header">
              <input v-model="category.name" class="category-name-input" @change="updateCategory(category)" />
              <button @click="deleteCategory(category)" class="btn-icon" title="Delete category">✕</button>
            </div>

            <!-- Items -->
            <div v-for="item in category.items" :key="item.id" class="item-block">
              <div class="item-main">
                <input v-model="item.name" placeholder="Item name" class="item-name-input" @change="updateItem(item)" />
                <input v-model.number="item.price_display" placeholder="0.00" class="item-price-input" type="number" step="0.01" @change="updateItemPrice(item)" />
              </div>
              <input v-model="item.description" placeholder="Description (optional)" class="item-desc-input" @change="updateItem(item)" />
              <div class="item-meta">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="item.is_special_bool" @change="updateItem(item)" /> Special
                </label>
                <button @click="deleteItem(item)" class="btn-icon btn-icon-small" title="Delete item">✕</button>
              </div>
            </div>

            <button @click="addItem(category)" class="btn btn-link">+ Add item</button>
          </div>

          <button @click="addCategory(page)" class="btn btn-outline">+ Add Category</button>
        </section>

        <!-- Actions -->
        <section class="panel actions">
          <button @click="refreshPreview" class="btn btn-secondary">Refresh Preview</button>
          <button @click="publish" class="btn btn-primary" :disabled="publishing">
            {{ publishing ? 'Publishing...' : '🚀 Publish Menu' }}
          </button>
          <p v-if="publishedSlug" class="published-link">
            Live at: <a :href="'/menu/' + publishedSlug" target="_blank">/menu/{{ publishedSlug }}</a>
          </p>
        </section>
      </div>
    </div>

    <div class="editor-preview">
      <div class="preview-toolbar">
        <span>Live Preview</span>
        <span class="preview-dims" v-if="menu">{{ menu.width_px }}×{{ menu.height_px }}</span>
      </div>
      <div class="preview-frame-wrapper">
        <iframe ref="previewFrame" class="preview-frame" :style="previewStyle" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const menuId = route.params.id

const menu = ref(null)
const pages = ref([])
const templates = ref([])
const settings = ref({})
const publishing = ref(false)
const publishedSlug = ref('')
const previewFrame = ref(null)

const previewStyle = computed(() => {
  if (!menu.value) return {}
  const maxW = 700
  const scale = Math.min(1, maxW / menu.value.width_px)
  return {
    width: menu.value.width_px + 'px',
    height: menu.value.height_px + 'px',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
})

async function loadMenu() {
  const res = await axios.get(`/api/menus/menus/${menuId}`)
  menu.value = res.data
  pages.value = res.data.pages || []
  settings.value = JSON.parse(res.data.settings_json || '{}')

  // Add display-friendly price to items
  for (const page of pages.value) {
    for (const cat of page.categories || []) {
      for (const item of cat.items || []) {
        item.price_display = (item.price_cents / 100).toFixed(2)
        item.is_special_bool = !!item.is_special
      }
    }
  }

  // Get restaurant slug for published link
  const restRes = await axios.get(`/api/menus/restaurants/${menu.value.restaurant_id}`)
  publishedSlug.value = restRes.data.slug

  await nextTick()
  refreshPreview()
}

async function loadTemplates() {
  const res = await axios.get('/api/templates')
  templates.value = res.data
}

async function saveSettings() {
  menu.value.settings_json = JSON.stringify(settings.value)
  await axios.put(`/api/menus/menus/${menuId}`, {
    width_px: menu.value.width_px,
    height_px: menu.value.height_px,
    template_id: menu.value.template_id,
    settings_json: menu.value.settings_json,
  })
  refreshPreview()
}

async function addCategory(page) {
  const res = await axios.post(`/api/menus/pages/${page.id}/categories`, { name: 'New Category' })
  res.data.items = []
  page.categories.push(res.data)
  refreshPreview()
}

async function updateCategory(category) {
  await axios.put(`/api/menus/categories/${category.id}`, { name: category.name })
  refreshPreview()
}

async function deleteCategory(category) {
  await axios.delete(`/api/menus/categories/${category.id}`)
  for (const page of pages.value) {
    page.categories = page.categories.filter(c => c.id !== category.id)
  }
  refreshPreview()
}

async function addItem(category) {
  const res = await axios.post(`/api/menus/categories/${category.id}/items`, {
    name: 'New Item',
    price_cents: 0,
  })
  res.data.price_display = '0.00'
  res.data.is_special_bool = false
  category.items.push(res.data)
  refreshPreview()
}

async function updateItem(item) {
  await axios.put(`/api/menus/items/${item.id}`, {
    name: item.name,
    description: item.description,
    price_cents: item.price_cents,
    is_special: item.is_special_bool,
  })
  refreshPreview()
}

async function updateItemPrice(item) {
  item.price_cents = Math.round((item.price_display || 0) * 100)
  await updateItem(item)
}

async function deleteItem(item) {
  await axios.delete(`/api/menus/items/${item.id}`)
  for (const page of pages.value) {
    for (const cat of page.categories) {
      cat.items = cat.items.filter(i => i.id !== item.id)
    }
  }
  refreshPreview()
}

async function refreshPreview() {
  try {
    const res = await axios.get(`/api/publish/preview/${menuId}`, { responseType: 'text' })
    const iframe = previewFrame.value
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      doc.open()
      doc.write(res.data)
      doc.close()
    }
  } catch (err) {
    console.error('Preview error:', err)
  }
}

async function publish() {
  publishing.value = true
  try {
    await axios.post(`/api/publish/${menuId}`)
    alert('Menu published! View it at /menu/' + publishedSlug.value)
  } catch (err) {
    alert(err.response?.data?.error || 'Publish failed')
  } finally {
    publishing.value = false
  }
}

onMounted(() => {
  loadTemplates()
  loadMenu()
})
</script>

<style scoped>
.editor {
  display: flex;
  height: calc(100vh - 60px);
}

.editor-sidebar {
  width: 420px;
  min-width: 420px;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  background: #fafafa;
}

.sidebar-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}
.sidebar-header .back {
  font-size: 0.85rem;
  color: #6b7280;
  text-decoration: none;
}
.sidebar-header h2 {
  margin: 0.25rem 0 0;
  font-size: 1.2rem;
}

.editor-content {
  padding: 1rem 1.25rem;
}

.panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.panel h3 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  color: #374151;
}

.field { margin-bottom: 0.5rem; }
.field label { display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 0.2rem; }
.field input, .field select {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.field input[type="color"] { height: 36px; padding: 2px; cursor: pointer; }

.field-row { display: flex; gap: 0.75rem; }
.field-row .field { flex: 1; }

.category-block {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: #f9fafb;
}
.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.category-name-input {
  flex: 1;
  font-weight: 700;
  font-size: 0.95rem;
  border: 1px solid transparent;
  background: transparent;
  padding: 0.25rem;
  border-radius: 4px;
}
.category-name-input:focus { border-color: #d1d5db; background: white; outline: none; }

.item-block {
  padding: 0.5rem;
  margin-bottom: 0.4rem;
  border-radius: 4px;
  background: white;
  border: 1px solid #e5e7eb;
}
.item-main {
  display: flex;
  gap: 0.5rem;
}
.item-name-input {
  flex: 1;
  border: none;
  font-size: 0.9rem;
  padding: 0.25rem;
  background: transparent;
}
.item-name-input:focus { outline: none; background: #f3f4f6; border-radius: 3px; }

.item-price-input {
  width: 70px;
  border: none;
  font-size: 0.9rem;
  text-align: right;
  padding: 0.25rem;
  background: transparent;
}
.item-price-input:focus { outline: none; background: #f3f4f6; border-radius: 3px; }

.item-desc-input {
  width: 100%;
  border: none;
  font-size: 0.8rem;
  color: #6b7280;
  padding: 0.2rem 0.25rem;
  background: transparent;
}
.item-desc-input:focus { outline: none; background: #f3f4f6; border-radius: 3px; }

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}
.checkbox-label {
  font-size: 0.8rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 1rem;
  padding: 0.2rem;
}
.btn-icon:hover { color: #dc2626; }
.btn-icon-small { font-size: 0.8rem; }

.btn { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; border: 1px solid #d1d5db; background: white; }
.btn-link { border: none; background: none; color: #2563eb; padding: 0.25rem 0; font-size: 0.85rem; }
.btn-outline { width: 100%; margin-top: 0.5rem; }
.btn-primary { background: #2563eb; color: white; border-color: #2563eb; width: 100%; padding: 0.75rem; font-size: 1rem; }
.btn-secondary { width: 100%; margin-bottom: 0.5rem; }

.actions { text-align: center; }
.published-link { margin-top: 0.5rem; font-size: 0.85rem; }
.published-link a { color: #2563eb; }

.editor-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1f2937;
}
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: #111827;
  color: #9ca3af;
  font-size: 0.85rem;
}
.preview-dims { font-family: monospace; }

.preview-frame-wrapper {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
.preview-frame {
  border: none;
  background: white;
  display: block;
}
</style>
