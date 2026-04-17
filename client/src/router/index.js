import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPasswordView.vue'),
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPasswordView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('../views/SubscriptionView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/editor/:id',
    name: 'MenuEditor',
    component: () => import('../views/MenuEditorView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/wizard',
    name: 'Wizard',
    component: () => import('../views/WizardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/AccountView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login' };
  }
});

export default router;
