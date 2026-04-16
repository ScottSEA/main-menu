<template>
  <div class="editor">
    <div class="editor-sidebar">
      <div class="sidebar-header">
        <router-link
          to="/dashboard"
          class="back"
        >
          ← Back
        </router-link>
        <h2>{{ menu?.name || 'Loading...' }}</h2>
      </div>

      <div
        v-if="menu"
        class="editor-content"
      >
        <!-- Restaurant Branding -->
        <section class="panel">
          <h3>🏪 Branding</h3>
          <div class="field">
            <label>Restaurant Logo</label>
            <div class="image-upload">
              <img
                v-if="restaurantLogo"
                :src="restaurantLogo"
                class="logo-preview"
              >
              <label class="upload-btn">
                {{ restaurantLogo ? 'Change Logo' : 'Upload Logo' }}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  @change="uploadLogo"
                >
              </label>
            </div>
          </div>
        </section>

        <!-- Menu Settings -->
        <section class="panel">
          <h3>📐 Display Settings</h3>
          <div class="field-row">
            <div class="field">
              <label>Width (px)</label>
              <input
                v-model.number="menu.width_px"
                type="number"
                @change="saveSettings"
              >
            </div>
            <div class="field">
              <label>Height (px)</label>
              <input
                v-model.number="menu.height_px"
                type="number"
                @change="saveSettings"
              >
            </div>
          </div>
          <div class="field">
            <label>Template</label>
            <select
              v-model="menu.template_id"
              @change="saveSettings"
            >
              <option
                v-for="t in templates"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }}
              </option>
            </select>
          </div>
        </section>

        <!-- Style Settings -->
        <section class="panel">
          <h3>🎨 Style</h3>
          <div class="field-row">
            <div class="field">
              <label>Background</label>
              <input
                v-model="settings.backgroundColor"
                type="color"
                @change="saveSettings"
              >
            </div>
            <div class="field">
              <label>Text</label>
              <input
                v-model="settings.textColor"
                type="color"
                @change="saveSettings"
              >
            </div>
            <div class="field">
              <label>Accent</label>
              <input
                v-model="settings.accentColor"
                type="color"
                @change="saveSettings"
              >
            </div>
          </div>
          <div class="field">
            <label>Font</label>
            <select
              v-model="settings.fontFamily"
              @change="saveSettings"
            >
              <option value="'Georgia', 'Times New Roman', serif">
                Georgia (Serif)
              </option>
              <option value="'Helvetica Neue', Arial, sans-serif">
                Helvetica (Sans)
              </option>
              <option value="'Palatino', 'Book Antiqua', serif">
                Palatino (Elegant)
              </option>
              <option value="'Trebuchet MS', sans-serif">
                Trebuchet (Modern)
              </option>
              <option value="'Courier New', monospace">
                Courier (Monospace)
              </option>
            </select>
          </div>
        </section>

        <!-- QR Code -->
        <section class="panel">
          <h3>📱 QR Code</h3>
          <div class="field">
            <label>Link URL (ordering, website, etc.)</label>
            <input
              v-model="settings.qrUrl"
              placeholder="https://your-restaurant.com"
              @change="saveSettings"
            >
          </div>
          <div
            v-if="settings.qrUrl"
            class="qr-preview-wrapper"
          >
            <img
              v-if="qrDataUrl"
              :src="qrDataUrl"
              class="qr-preview"
            >
            <button
              class="btn btn-small"
              @click="generateQr"
            >
              Regenerate QR
            </button>
          </div>
        </section>

        <!-- Pages & Categories -->
        <section
          v-for="page in pages"
          :key="page.id"
          class="panel"
        >
          <h3>📄 Page {{ page.page_order + 1 }}</h3>

          <div
            v-for="category in page.categories"
            :key="category.id"
            class="category-block"
          >
            <div class="category-header">
              <input
                v-model="category.name"
                class="category-name-input"
                @change="updateCategory(category)"
              >
              <button
                class="btn-icon"
                title="Delete category"
                @click="deleteCategory(category)"
              >
                ✕
              </button>
            </div>

            <!-- Items -->
            <div
              v-for="item in category.items"
              :key="item.id"
              class="item-block"
            >
              <div class="item-main">
                <input
                  v-model="item.name"
                  placeholder="Item name"
                  class="item-name-input"
                  @change="updateItem(item)"
                >
                <input
                  v-model.number="item.price_display"
                  placeholder="0.00"
                  class="item-price-input"
                  type="number"
                  step="0.01"
                  @change="updateItemPrice(item)"
                >
              </div>
              <input
                v-model="item.description"
                placeholder="Description (optional)"
                class="item-desc-input"
                @change="updateItem(item)"
              >

              <!-- Item photo -->
              <div class="item-image-row">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  class="item-thumb"
                >
                <label class="upload-btn upload-btn-small">
                  {{ item.image_url ? '📷' : '+ Photo' }}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    @change="uploadItemImage($event, item)"
                  >
                </label>
                <button
                  v-if="item.image_url"
                  class="btn-icon btn-icon-small"
                  title="Remove photo"
                  @click="removeItemImage(item)"
                >
                  ✕
                </button>
              </div>

              <!-- Dietary tags -->
              <div class="dietary-row">
                <button
                  v-for="tag in DIETARY_OPTIONS"
                  :key="tag.code"
                  :class="['tag-btn', { active: itemHasTag(item, tag.code) }]"
                  :title="tag.label"
                  @click="toggleDietaryTag(item, tag.code)"
                >
                  {{ tag.icon }}
                </button>
              </div>

              <div class="item-meta">
                <label class="checkbox-label">
                  <input
                    v-model="item.is_special_bool"
                    type="checkbox"
                    @change="updateItem(item)"
                  > ⭐ Special
                </label>
                <button
                  class="btn-icon btn-icon-small"
                  title="Delete item"
                  @click="deleteItem(item)"
                >
                  ✕
                </button>
              </div>
            </div>

            <button
              class="btn btn-link"
              @click="addItem(category)"
            >
              + Add item
            </button>
          </div>

          <button
            class="btn btn-outline"
            @click="addCategory(page)"
          >
            + Add Category
          </button>
        </section>

        <!-- Actions -->
        <section class="panel actions">
          <button
            class="btn btn-secondary"
            @click="refreshPreview"
          >
            Refresh Preview
          </button>
          <button
            class="btn btn-primary"
            :disabled="publishing"
            @click="publish"
          >
            {{ publishing ? 'Publishing...' : '🚀 Publish Menu' }}
          </button>
          <p
            v-if="publishedSlug"
            class="published-link"
          >
            Live at: <a
              :href="'/menu/' + publishedSlug"
              target="_blank"
            >/menu/{{ publishedSlug }}</a>
          </p>
        </section>
      </div>
    </div>

    <div class="editor-preview">
      <div class="preview-toolbar">
        <span>Live Preview</span>
        <span
          v-if="menu"
          class="preview-dims"
        >{{ menu.width_px }}×{{ menu.height_px }}</span>
      </div>
      <div class="preview-frame-wrapper">
        <iframe
          ref="previewFrame"
          class="preview-frame"
          :style="previewStyle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const menuId = route.params.id;

const DIETARY_OPTIONS = [
  { code: 'V', icon: '🌱', label: 'Vegetarian' },
  { code: 'VG', icon: '🌿', label: 'Vegan' },
  { code: 'GF', icon: '🌾', label: 'Gluten Free' },
  { code: 'DF', icon: '🥛', label: 'Dairy Free' },
  { code: 'NF', icon: '🥜', label: 'Nut Free' },
  { code: '🌶', icon: '🌶️', label: 'Spicy' },
];

const menu = ref(null);
const pages = ref([]);
const templates = ref([]);
const settings = ref({});
const publishing = ref(false);
const publishedSlug = ref('');
const previewFrame = ref(null);
const restaurantLogo = ref(null);
const restaurantId = ref(null);
const qrDataUrl = ref(null);

const previewStyle = computed(() => {
  if (!menu.value) return {};
  const maxW = 700;
  const scale = Math.min(1, maxW / menu.value.width_px);
  return {
    width: menu.value.width_px + 'px',
    height: menu.value.height_px + 'px',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
});

async function loadMenu() {
  const res = await axios.get(`/api/menus/menus/${menuId}`);
  menu.value = res.data;
  pages.value = res.data.pages || [];
  settings.value = JSON.parse(res.data.settings_json || '{}');

  // Add display-friendly price to items
  for (const page of pages.value) {
    for (const cat of page.categories || []) {
      for (const item of cat.items || []) {
        item.price_display = (item.price_cents / 100).toFixed(2);
        item.is_special_bool = !!item.is_special;
        item.parsedTags = JSON.parse(item.dietary_tags || '[]');
      }
    }
  }

  // Get restaurant slug and logo for published link
  const restRes = await axios.get(`/api/menus/restaurants/${menu.value.restaurant_id}`);
  publishedSlug.value = restRes.data.slug;
  restaurantLogo.value = restRes.data.logo_url;
  restaurantId.value = restRes.data.id;

  // Generate QR if URL is set
  if (settings.value.qrUrl) {
    generateQr();
  }

  await nextTick();
  refreshPreview();
}

async function loadTemplates() {
  const res = await axios.get('/api/templates');
  templates.value = res.data;
}

async function saveSettings() {
  menu.value.settings_json = JSON.stringify(settings.value);
  await axios.put(`/api/menus/menus/${menuId}`, {
    width_px: menu.value.width_px,
    height_px: menu.value.height_px,
    template_id: menu.value.template_id,
    settings_json: menu.value.settings_json,
  });
  refreshPreview();
}

async function addCategory(page) {
  const res = await axios.post(`/api/menus/pages/${page.id}/categories`, { name: 'New Category' });
  res.data.items = [];
  page.categories.push(res.data);
  refreshPreview();
}

async function updateCategory(category) {
  await axios.put(`/api/menus/categories/${category.id}`, { name: category.name });
  refreshPreview();
}

async function deleteCategory(category) {
  await axios.delete(`/api/menus/categories/${category.id}`);
  for (const page of pages.value) {
    page.categories = page.categories.filter(c => c.id !== category.id);
  }
  refreshPreview();
}

async function addItem(category) {
  const res = await axios.post(`/api/menus/categories/${category.id}/items`, {
    name: 'New Item',
    price_cents: 0,
  });
  res.data.price_display = '0.00';
  res.data.is_special_bool = false;
  category.items.push(res.data);
  refreshPreview();
}

async function updateItem(item) {
  await axios.put(`/api/menus/items/${item.id}`, {
    name: item.name,
    description: item.description,
    price_cents: item.price_cents,
    is_special: item.is_special_bool,
    dietary_tags: item.parsedTags || [],
    image_url: item.image_url,
  });
  refreshPreview();
}

async function updateItemPrice(item) {
  item.price_cents = Math.round((item.price_display || 0) * 100);
  await updateItem(item);
}

async function deleteItem(item) {
  await axios.delete(`/api/menus/items/${item.id}`);
  for (const page of pages.value) {
    for (const cat of page.categories) {
      cat.items = cat.items.filter(i => i.id !== item.id);
    }
  }
  refreshPreview();
}

async function refreshPreview() {
  try {
    const res = await axios.get(`/api/publish/preview/${menuId}`, { responseType: 'text' });
    const iframe = previewFrame.value;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(res.data);
      doc.close();
    }
  } catch (err) {
    console.error('Preview error:', err);
  }
}

async function publish() {
  publishing.value = true;
  try {
    await axios.post(`/api/publish/${menuId}`);
    alert('Menu published! View it at /menu/' + publishedSlug.value);
  } catch (err) {
    alert(err.response?.data?.error || 'Publish failed');
  } finally {
    publishing.value = false;
  }
}

// --- Image uploads ---

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post('/api/uploads', formData);
  return res.data.url;
}

async function uploadLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const url = await uploadFile(file);
    restaurantLogo.value = url;
    await axios.put(`/api/menus/restaurants/${restaurantId.value}`, { logo_url: url });
    refreshPreview();
  } catch (err) {
    alert('Logo upload failed: ' + (err.response?.data?.error || err.message));
  }
}

async function uploadItemImage(event, item) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const url = await uploadFile(file);
    item.image_url = url;
    await axios.put(`/api/menus/items/${item.id}`, { image_url: url });
    refreshPreview();
  } catch (err) {
    alert('Image upload failed: ' + (err.response?.data?.error || err.message));
  }
}

async function removeItemImage(item) {
  item.image_url = null;
  await axios.put(`/api/menus/items/${item.id}`, { image_url: null });
  refreshPreview();
}

// --- Dietary tags ---

function itemHasTag(item, code) {
  const tags = Array.isArray(item.parsedTags) ? item.parsedTags : [];
  return tags.includes(code);
}

function toggleDietaryTag(item, code) {
  if (!Array.isArray(item.parsedTags)) item.parsedTags = [];
  const idx = item.parsedTags.indexOf(code);
  if (idx >= 0) {
    item.parsedTags.splice(idx, 1);
  } else {
    item.parsedTags.push(code);
  }
  item.dietary_tags = JSON.stringify(item.parsedTags);
  updateItem(item);
}

// --- QR Code ---

async function generateQr() {
  if (!settings.value.qrUrl) return;
  try {
    const res = await axios.post('/api/qrcode/generate', { url: settings.value.qrUrl, size: 200 });
    qrDataUrl.value = res.data.dataUrl;
    settings.value.qrDataUrl = res.data.dataUrl;
    saveSettings();
  } catch (err) {
    console.error('QR generation failed:', err);
  }
}

onMounted(() => {
  loadTemplates();
  loadMenu();
});
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
  border-right: 1px solid var(--border);
  background: var(--bg);
}

.sidebar-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}
.sidebar-header .back {
  font-size: 0.85rem;
  color: var(--text-muted);
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
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.panel h3 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  color: var(--text);
}

.field { margin-bottom: 0.5rem; }
.field label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.2rem; }
.field input, .field select {
  width: 100%;
  font-size: 0.9rem;
}
.field input[type="color"] { height: 36px; padding: 2px; cursor: pointer; }

.field-row { display: flex; gap: 0.75rem; }
.field-row .field { flex: 1; }

.category-block {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: var(--bg);
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
  color: var(--text);
  padding: 0.25rem;
  border-radius: 4px;
}
.category-name-input:focus { border-color: var(--border); background: var(--bg-input); outline: none; }

.item-block {
  padding: 0.5rem;
  margin-bottom: 0.4rem;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
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
  color: var(--text);
}
.item-name-input:focus { outline: none; background: var(--bg-input); border-radius: 3px; }

.item-price-input {
  width: 70px;
  border: none;
  font-size: 0.9rem;
  text-align: right;
  padding: 0.25rem;
  background: transparent;
  color: var(--text);
}
.item-price-input:focus { outline: none; background: var(--bg-input); border-radius: 3px; }

.item-desc-input {
  width: 100%;
  border: none;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 0.2rem 0.25rem;
  background: transparent;
}
.item-desc-input:focus { outline: none; background: var(--bg-input); border-radius: 3px; color: var(--text); }

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}
.checkbox-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1rem;
  padding: 0.2rem;
}
.btn-icon:hover { color: var(--danger); }
.btn-icon-small { font-size: 0.8rem; }

/* Image uploads */
.image-upload { display: flex; align-items: center; gap: 0.75rem; }
.logo-preview { width: 60px; height: 60px; object-fit: contain; border-radius: 6px; border: 1px solid var(--border); }
.upload-btn {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
}
.upload-btn:hover { border-color: var(--accent); }
.upload-btn-small { padding: 0.2rem 0.5rem; font-size: 0.75rem; }

/* Item images */
.item-image-row { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.3rem; }
.item-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 3px; }

/* Dietary tags */
.dietary-row { display: flex; gap: 0.3rem; margin-top: 0.3rem; flex-wrap: wrap; }
.tag-btn {
  width: 28px; height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
  transition: opacity 0.15s, border-color 0.15s;
}
.tag-btn:hover { opacity: 0.7; }
.tag-btn.active { opacity: 1; border-color: var(--accent); background: var(--bg-surface); }

/* QR Code */
.qr-preview-wrapper { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
.qr-preview { width: 80px; height: 80px; border-radius: 4px; background: white; padding: 4px; }

.btn { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text); }
.btn-small { padding: 0.35rem 0.6rem; font-size: 0.8rem; }
.btn-link { border: none; background: none; color: var(--accent); padding: 0.25rem 0; font-size: 0.85rem; }
.btn-outline { width: 100%; margin-top: 0.5rem; }
.btn-primary { background: var(--accent); color: white; border-color: var(--accent); width: 100%; padding: 0.75rem; font-size: 1rem; }
.btn-secondary { width: 100%; margin-bottom: 0.5rem; }

.actions { text-align: center; }
.published-link { margin-top: 0.5rem; font-size: 0.85rem; }
.published-link a { color: var(--accent); }

.editor-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
}
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--bg);
  color: var(--text-muted);
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
