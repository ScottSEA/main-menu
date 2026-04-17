<template>
  <div class="auth-form">
    <h2>Create Account</h2>
    <form @submit.prevent="handleRegister">
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
        >
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
        >
        <small>Minimum 8 characters</small>
      </div>
      <div class="field">
        <label for="confirm">Confirm Password</label>
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
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading"
      >
        {{ loading ? 'Creating account...' : 'Create Account' }}
      </button>
    </form>
    <p class="switch">
      Already have an account? <router-link to="/login">
        Sign In
      </router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  try {
    await auth.register(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed';
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
small { color: var(--text-muted); }
.error { color: var(--danger); font-size: 0.9rem; }
.btn { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--accent); color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.switch { text-align: center; margin-top: 1rem; color: var(--text-muted); }
.switch a { color: var(--accent); }
</style>
