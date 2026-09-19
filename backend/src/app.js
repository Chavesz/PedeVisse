import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { publicRoutes } from './routes/public.js'
import { adminRoutes } from './routes/admin.js'
import { driverRoutes } from './routes/driver.js'
import { superadminRoutes } from './routes/superadmin.js'
import { onboardingRoutes } from './routes/onboarding.js'
import { stripeWebhookHandler } from './routes/stripeWebhook.js'
import { errorHandler } from './middleware/errors.js'
import { prisma } from './lib/prisma.js'
import { signToken } from './lib/jwt.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler)
  app.use(express.json({ limit: '1mb' }))

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

  app.get('/api/health', (req, res) => res.json({ ok: true }))

  app.post('/api/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
    const input = schema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' })

    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' })

    let restaurantSlug = null
    if (user.restaurantId) {
      const r = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
      restaurantSlug = r?.slug || null
    }

    const token = signToken({ userId: user.id, role: user.role, restaurantId: user.restaurantId || null })
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, restaurantId: user.restaurantId || null, restaurantSlug }
    })
  })

  app.use('/api/t/:slug/public', publicRoutes())
  app.use('/api/t/:slug/admin', adminRoutes())
  app.use('/api/t/:slug/driver', driverRoutes())
  app.use('/api/superadmin', superadminRoutes())
  app.use('/api/onboarding', onboardingRoutes())

  app.use(errorHandler)

  return app
}
