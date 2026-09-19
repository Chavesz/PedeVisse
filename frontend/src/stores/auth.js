import { defineStore } from 'pinia'
import { api, setBearerToken } from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('pv_token') || null,
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem('pv_user') || 'null')
      } catch {
        return null
      }
    })()
  }),
  actions: {
    setSession({ token, user }) {
      this.token = token || null
      this.user = user || null
      localStorage.setItem('pv_token', this.token || '')
      localStorage.setItem('pv_user', JSON.stringify(this.user || null))
      if (!this.token) {
        localStorage.removeItem('pv_token')
      }
      setBearerToken(this.token)
    },
    init() {
      setBearerToken(this.token)
      if (!this.user) {
        try {
          this.user = JSON.parse(localStorage.getItem('pv_user') || 'null')
        } catch {
          this.user = null
        }
      }
    },
    async login({ email, password }) {
      const { data } = await api.post('/auth/login', { email, password })
      this.setSession({ token: data.token, user: data.user })
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('pv_token')
      localStorage.removeItem('pv_user')
      setBearerToken(null)
    }
  }
})
