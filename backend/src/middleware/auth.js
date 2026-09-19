import { verifyToken } from '../lib/jwt.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  const bearer = header && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  const token = bearer || req.query.token
  if (!token) return res.status(401).json({ message: 'Não autenticado.' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido.' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' })
    if (req.user.role !== role) return res.status(403).json({ message: 'Sem permissão.' })
    next()
  }
}

export function requireRestaurantAdmin() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' })
    if (req.user.role !== 'RESTAURANT_ADMIN') return res.status(403).json({ message: 'Sem permissão.' })
    if (!req.tenant?.restaurantId || req.user.restaurantId !== req.tenant.restaurantId) {
      return res.status(403).json({ message: 'Tenant inválido.' })
    }
    next()
  }
}

export function requireDriver() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' })
    if (req.user.role !== 'DRIVER') return res.status(403).json({ message: 'Sem permissão.' })
    if (!req.tenant?.restaurantId || req.user.restaurantId !== req.tenant.restaurantId) {
      return res.status(403).json({ message: 'Tenant inválido.' })
    }
    next()
  }
}

export function requireActiveSubscription() {
  return (req, res, next) => {
    const status = req.tenant?.restaurant?.subscriptionStatus || 'ACTIVE'
    if (status === 'ACTIVE') return next()
    return res.status(402).json({ message: 'Assinatura inativa. Regularize o pagamento para continuar usando.' })
  }
}
