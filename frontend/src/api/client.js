import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:3000/api' : '/api',
  timeout: 20000
})

export const uploadsBaseUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''

export function resolveUploadUrl(url) {
  const u = String(url || '')
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('/uploads')) return `${uploadsBaseUrl}${u}`
  return u
}

export function setBearerToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}
