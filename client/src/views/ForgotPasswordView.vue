<template>
  <div class="auth-form">
    <h2>Reset Password</h2>
    <p class="subtitle">
      Enter your email and we'll send you a link to reset your password.
    </p>
    <form
      v-if="!submitted"
      @submit.prevent="handleSubmit"
    >
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
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
        {{ loading ? 'Sending...' : 'Send Reset Link' }}
      </button>
    </form>
    <div
      v-else
      class="success-message"
    >
      <p>✓ {{ message }}</p>
    </div>
    <p class="switch">
      <router-link to="/login">
        Back to Sign In
      </router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const email = ref('');
const error = ref('');
const message = ref('');
const loading = ref(false);
const submitted = ref(false);

async function handleSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await axios.post('/api/auth/forgot-password', { email: email.value });
    message.value = res.data.message;
    submitted.value = true;
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
h2 { margin-bottom: 0.5rem; }
.subtitle { color: var(--text-muted); margin-bottom: 1.5rem; }
.field { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.25rem; font-weight: 600; color: var(--text); }
input { width: 100%; }
.error { color: var(--danger); font-size: 0.9rem; }
.success-message { background: #e8f5e9; padding: 1rem; border-radius: 6px; color: #2e7d32; }
.btn { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--accent); color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.switch { text-align: center; margin-top: 1rem; }
.switch a { color: var(--accent); }
</style>
