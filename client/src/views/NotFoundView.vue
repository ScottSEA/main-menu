<template>
  <div class="not-found">
    <h1>404</h1>
    <p>Page not found</p>
    <router-link
      to="/"
      class="btn btn-primary"
    >
      Go Home
    </router-link>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 4rem 2rem;
}
h1 {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  color: var(--text-muted);
}
p {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
}
.btn-primary { background: var(--accent); color: white; }
</style>
