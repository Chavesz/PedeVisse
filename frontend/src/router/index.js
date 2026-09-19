import { createRouter, createWebHistory } from 'vue-router'
import { useTenantStore } from '../stores/tenant'
import { useAuthStore } from '../stores/auth'
import { setBearerToken } from '../api/client'

const Landing = () => import('../pages/Landing.vue')
const Signup = () => import('../pages/Signup.vue')
const CustomerMenu = () => import('../pages/customer/Menu.vue')
const CustomerCart = () => import('../pages/customer/Cart.vue')
const CustomerCheckout = () => import('../pages/customer/Checkout.vue')
const CustomerSuccess = () => import('../pages/customer/Success.vue')
const AdminLogin = () => import('../pages/admin/Login.vue')
const AdminOrders = () => import('../pages/admin/Orders.vue')
const AdminMenu = () => import('../pages/admin/MenuManagement.vue')
const AdminSettings = () => import('../pages/admin/Settings.vue')
const AdminReports = () => import('../pages/admin/Reports.vue')
const AdminBilling = () => import('../pages/admin/Billing.vue')
const DriverLogin = () => import('../pages/driver/Login.vue')
const DriverDeliveries = () => import('../pages/driver/Deliveries.vue')
const SuperLogin = () => import('../pages/superadmin/Login.vue')
const SuperRestaurants = () => import('../pages/superadmin/Restaurants.vue')
const SuperUsers = () => import('../pages/superadmin/Users.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: Landing },
    { path: '/comecar', name: 'signup', component: Signup },
    { path: '/acesso', redirect: { name: 'login' } },
    { path: '/login', name: 'login', component: SuperLogin },
    {
      path: '/:restaurantSlug',
      children: [
        { path: '', name: 'customer.menu', component: CustomerMenu },
        { path: 'cart', name: 'customer.cart', component: CustomerCart },
        { path: 'checkout', name: 'customer.checkout', component: CustomerCheckout },
        { path: 'success', name: 'customer.success', component: CustomerSuccess },
        { path: 'acesso', redirect: { name: 'login' } },
        { path: 'admin/login', name: 'admin.login', component: AdminLogin },
        { path: 'admin/orders', name: 'admin.orders', component: AdminOrders },
        { path: 'admin/menu', name: 'admin.menu', component: AdminMenu },
        { path: 'admin/settings', name: 'admin.settings', component: AdminSettings },
        { path: 'admin/reports', name: 'admin.reports', component: AdminReports },
        { path: 'admin/billing', name: 'admin.billing', component: AdminBilling },
        { path: 'driver/login', name: 'driver.login', component: DriverLogin },
        { path: 'driver/deliveries', name: 'driver.deliveries', component: DriverDeliveries }
      ]
    },
    {
      path: '/superadmin',
      children: [
        { path: 'login', name: 'super.login', component: SuperLogin },
        { path: 'restaurants', name: 'super.restaurants', component: SuperRestaurants },
        { path: 'users', name: 'super.users', component: SuperUsers }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  auth.init()

  const tenantStore = useTenantStore()
  const slug = to.params.restaurantSlug
  if (typeof slug === 'string') {
    if (tenantStore.slug !== slug) {
      try {
        await tenantStore.loadBySlug(slug)
      } catch {
        if (to.name && (String(to.name).startsWith('customer.') || String(to.name).startsWith('admin.') || String(to.name).startsWith('driver.') || String(to.name).startsWith('tenant.'))) {
          return { name: 'login' }
        }
      }
    }
  }

  if (to.name && String(to.name).startsWith('admin.')) {
    setBearerToken(auth.token)
    if (to.name !== 'admin.login') {
      if (!auth.token) return { name: 'login' }
      if (auth.user?.role !== 'RESTAURANT_ADMIN') return { name: 'login' }
    }
  }

  if (to.name && String(to.name).startsWith('super.')) {
    setBearerToken(auth.token)
    if (to.name !== 'super.login') {
      if (!auth.token) return { name: 'login' }
      if (auth.user?.role !== 'SUPER_ADMIN') return { name: 'login' }
    }
  }

  if (to.name && String(to.name).startsWith('driver.')) {
    setBearerToken(auth.token)
    if (to.name !== 'driver.login') {
      if (!auth.token) return { name: 'login' }
      if (auth.user?.role !== 'DRIVER') return { name: 'login' }
    }
  }

  if (!to.name || (!String(to.name).startsWith('admin.') && !String(to.name).startsWith('super.') && !String(to.name).startsWith('driver.'))) {
    setBearerToken(null)
  }
})

export default router
