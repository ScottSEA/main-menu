<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const subscription = ref({ plan: 'free', status: 'active' })
const plans = ref({})
const loading = ref(true)
const error = ref('')
const checkoutLoading = ref('')
const portalLoading = ref(false)
const stripeNotConfigured = ref(false)

const planOrder = ['starter', 'pro', 'business']

const currentPlanIndex = computed(() => {
  const plan = subscription.value?.plan
  if (!plan || plan === 'free') return -1
  return planOrder.indexOf(plan)
})

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

function statusLabel(status) {
  const labels = { active: 'Active', inactive: 'Inactive', cancelled: 'Cancelled', past_due: 'Past Due' }
  return labels[status] || status
}

function statusClass(status) {
  if (status === 'active') return 'badge-success'
  if (status === 'cancelled') return 'badge-danger'
  return 'badge-warning'
}

async function loadStatus() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/stripe/status')
    subscription.value = res.data.subscription
    plans.value = res.data.plans
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load subscription status'
  } finally {
    loading.value = false
  }
}

async function startCheckout(planKey) {
  checkoutLoading.value = planKey
  error.value = ''
  try {
    const res = await axios.post('/api/stripe/checkout', { plan: planKey })
    window.location.href = res.data.url
  } catch (err) {
    if (err.response?.status === 503) {
      stripeNotConfigured.value = true
    }
    error.value = err.response?.data?.error || 'Failed to start checkout'
    checkoutLoading.value = ''
  }
}

async function openPortal() {
  portalLoading.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/stripe/portal')
    window.location.href = res.data.url
  } catch (err) {
    if (err.response?.status === 503) {
      stripeNotConfigured.value = true
    }
    error.value = err.response?.data?.error || 'Failed to open billing portal'
    portalLoading.value = false
  }
}

onMounted(loadStatus)
</script>

<template>
  <div class="subscription-page">
    <h2>Subscription</h2>

    <div v-if="loading" class="loading">Loading subscription info…</div>

    <template v-else>
      <!-- Stripe not configured notice -->
      <div v-if="stripeNotConfigured" class="notice">
        <p>⚠️ Stripe is not configured on this server. Subscription management is unavailable.</p>
        <p class="muted">Ask the administrator to add <code>STRIPE_SECRET_KEY</code> to the server environment.</p>
      </div>

      <!-- Current plan banner -->
      <div class="current-plan-card">
        <div class="current-plan-info">
          <span class="plan-label">Current Plan</span>
          <span class="plan-name">{{ subscription.plan === 'free' ? 'Free' : plans[subscription.plan]?.name || subscription.plan }}</span>
        </div>
        <span class="badge" :class="statusClass(subscription.status)">
          {{ statusLabel(subscription.status) }}
        </span>
      </div>

      <!-- Manage subscription button -->
      <div v-if="subscription.plan !== 'free'" class="portal-section">
        <button class="btn btn-outline" :disabled="portalLoading" @click="openPortal">
          {{ portalLoading ? 'Opening…' : 'Manage Subscription' }}
        </button>
      </div>

      <!-- Error message -->
      <p v-if="error" class="error">{{ error }}</p>

      <!-- Plan cards -->
      <div class="plans-grid">
        <div
          v-for="(key, idx) in planOrder"
          :key="key"
          class="plan-card"
          :class="{ 'plan-current': subscription.plan === key }"
        >
          <div v-if="subscription.plan === key" class="current-badge">Current Plan</div>
          <h3>{{ plans[key]?.name }}</h3>
          <div class="price">
            <span class="amount">{{ formatPrice(plans[key]?.price_monthly || 0) }}</span>
            <span class="period">/month</span>
          </div>
          <ul class="features">
            <li v-for="feat in plans[key]?.features" :key="feat">{{ feat }}</li>
          </ul>
          <div class="plan-action">
            <template v-if="subscription.plan === key">
              <button class="btn btn-current" disabled>Your Plan</button>
            </template>
            <template v-else-if="idx > currentPlanIndex">
              <button
                class="btn btn-primary"
                :disabled="checkoutLoading === key"
                @click="startCheckout(key)"
              >
                {{ checkoutLoading === key ? 'Redirecting…' : 'Upgrade' }}
              </button>
            </template>
            <template v-else>
              <button
                class="btn btn-downgrade"
                :disabled="checkoutLoading === key"
                @click="startCheckout(key)"
              >
                {{ checkoutLoading === key ? 'Redirecting…' : 'Downgrade' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.subscription-page {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.loading {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem 0;
}

.notice {
  background: #92400e22;
  border: 1px solid #92400e;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}
.notice p { margin: 0.25rem 0; }
.notice .muted { color: var(--text-muted); font-size: 0.9rem; }
.notice code {
  background: var(--bg-input);
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-size: 0.85em;
}

/* Current plan banner */
.current-plan-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}
.current-plan-info { display: flex; flex-direction: column; gap: 0.15rem; }
.plan-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.plan-name { font-size: 1.4rem; font-weight: 700; color: #f9fafb; }

.badge {
  font-size: 0.8rem;
  padding: 0.25em 0.75em;
  border-radius: 999px;
  font-weight: 600;
}
.badge-success { background: #065f4633; color: var(--success); }
.badge-danger { background: #7f1d1d33; color: #f87171; }
.badge-warning { background: #92400e33; color: var(--warning); }

.portal-section { margin-bottom: 1.5rem; }

.error { color: var(--danger); font-size: 0.9rem; }

/* Plan cards grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

.plan-card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}
.plan-card.plan-current {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.current-badge {
  position: absolute;
  top: -0.65rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2em 0.75em;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.plan-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.price { margin-bottom: 1rem; }
.amount { font-size: 1.75rem; font-weight: 700; color: #f9fafb; }
.period { color: var(--text-muted); font-size: 0.9rem; }

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  flex: 1;
}
.features li {
  padding: 0.3rem 0;
  color: var(--text);
  font-size: 0.9rem;
}
.features li::before {
  content: '✓ ';
  color: var(--success);
}

.plan-action { margin-top: auto; }

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.6rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: var(--bg-surface);
  color: var(--text);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }

.btn-outline { background: transparent; border-color: var(--border); color: var(--text); width: auto; }
.btn-outline:hover:not(:disabled) { border-color: var(--text); color: #f9fafb; }

.btn-downgrade { background: transparent; border-color: var(--border); color: var(--text-muted); }
.btn-downgrade:hover:not(:disabled) { border-color: var(--text); color: var(--text); }

.btn-current { background: var(--bg-input); color: var(--text-muted); border-color: var(--bg-input); }

@media (max-width: 700px) {
  .plans-grid { grid-template-columns: 1fr; }
}
</style>
