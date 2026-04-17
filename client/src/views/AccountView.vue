<template>
  <div class="account-page">
    <h2>Account Settings</h2>

    <section class="panel">
      <h3>Change Password</h3>
      <form @submit.prevent="handleChangePassword">
        <div class="field">
          <label for="current">Current Password</label>
          <input
            id="current"
            v-model="currentPassword"
            type="password"
            required
          >
        </div>
        <div class="field">
          <label for="newpw">New Password</label>
          <input
            id="newpw"
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            placeholder="At least 8 characters"
          >
        </div>
        <div class="field">
          <label for="confirm">Confirm New Password</label>
          <input
            id="confirm"
            v-model="confirmPassword"
            type="password"
            required
          >
        </div>
        <p
          v-if="error"
          class="error"
        >
          {{ error }}
        </p>
        <p
          v-if="success"
          class="success"
        >
          {{ success }}
        </p>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading"
        >
          {{ loading ? 'Updating...' : 'Update Password' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);

async function handleChangePassword() {
  error.value = '';
  success.value = '';

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match';
    return;
  }

  loading.value = true;
  try {
    const res = await axios.post('/api/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    // Update token so current session stays valid
    if (res.data.token) {
      auth.setAuth(res.data.token, auth.user);
    }
    success.value = res.data.message;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to change password';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.account-page {
  max-width: 500px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.panel {
  padding: 1.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-top: 1.5rem;
}
.panel h3 { margin-bottom: 1rem; }
.field { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.25rem; font-weight: 600; color: var(--text); }
input { width: 100%; }
.error { color: var(--danger); font-size: 0.9rem; }
.success { color: var(--success); font-size: 0.9rem; }
.btn { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--accent); color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
