import { defineStore } from 'pinia'
import { api } from '../api/client'
import centralSushiLogo from '../assets/logo central sushi.jpg'
import brunaFarmaLogo from '../assets/bruna-farma-logo.png'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    slug: null,
    restaurant: null,
    loading: false
  }),
  actions: {
    async loadBySlug(slug) {
      this.loading = true
      try {
        const { data } = await api.get(`/t/${encodeURIComponent(slug)}/public/restaurant`)
        this.slug = slug
        const r = data.restaurant || null
        if (r?.logoUrl === 'asset:centralsushi') {
          r.logoUrl = centralSushiLogo
        }
        if (r?.logoUrl === 'asset:brunafarma') {
          r.logoUrl = brunaFarmaLogo
        }
        this.restaurant = r
        const primary = data.restaurant?.themePrimary || '#0ea5e9'
        const secondary = data.restaurant?.themeSecondary || '#0f172a'
        document.documentElement.style.setProperty('--pv-primary', primary)
        document.documentElement.style.setProperty('--pv-secondary', secondary)
      } finally {
        this.loading = false
      }
    }
  }
})
