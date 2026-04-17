<template>
  <div class="auth-form">
    <h2>Set New Password</h2>
    <form
      v-if="!success"
      @submit.prevent="handleReset"
    >
      <div class="field">
        <label for="password">New Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          placeholder="At least 8 characters"
        >
      </div>
      <div class="field">
        <label for="confirm">Confirm Password</label>
        <input
          id="confirm"
          v-model="confirm"
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
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading"
      >
        {{ loading ? 'Resetting...' : 'Reset Password' }}
      </button>
    </form>
    <div
      v-else
      class="success-message"
    >
      <p>✓ {{ message }}</p>
      <router-link
        to="/login"
        class="btn btn-primary"
        style="display: inline-block; margin-top: 1rem; text-decoration: none; text-align: center;"
      >
        Sign In
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const password = ref('');
const confirm = ref('');
const error = ref('');
const message = ref('');
const loading = ref(false);
const success = ref(false);

async function handleReset() {
  error.value = '';

  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match';
    return;
  }

  const token = route.query.token;
  if (!token) {
    error.value = 'Missing reset token. Please use the link from your email.';
    return;
  }

  loading.value = true;
  try {
    const res = await axios.post('/api/auth/reset-password', {
      token,
      password: password.value,
    });
    message.value = res.data.message;
    success.value = true;
  } catch (err) {
    error.value = err.response?.data?.error || 'Something went wrong';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 3rem auto;
  padding: 2rem;
}
h2 { margin-bottom: 1.5rem; }
.field { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.25rem; font-weight: 600; color: var(--text); }
input { width: 100%; }
.error { color: var(--danger); font-size: 0.9rem; }
.success-message { background: #e8f5e9; padding: 1rem; border-radius: 6px; color: #2e7d32; text-align: center; }
.btn { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--accent); color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
