import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export function superadminRoutes() {
  const router = Router()

  router.post('/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
    const input = schema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user || user.role !== 'SUPER_ADMIN') return res.status(401).json({ message: 'Credenciais inválidas.' })
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' })

    const token = signToken({ userId: user.id, role: user.role, restaurantId: null })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  })

  router.use(authenticate, requireRole('SUPER_ADMIN'))

  router.get('/restaurants', async (req, res) => {
    const restaurants = await prisma.restaurant.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ restaurants })
  })

  router.post('/restaurants', async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      whatsappNumber: z.string().optional().nullable(),
      themePrimary: z.string().optional().nullable(),
      themeSecondary: z.string().optional().nullable(),
      subscriptionPlan: z.enum(['START', 'PRO', 'SCALE']).optional().default('START'),
      subscriptionStatus: z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED']).optional().default('ACTIVE')
    })
    const input = schema.parse(req.body)
    const restaurant = await prisma.restaurant.create({
      data: {
        name: input.name,
        slug: input.slug,
        whatsappNumber: input.whatsappNumber || null,
        themePrimary: input.themePrimary || null,
        themeSecondary: input.themeSecondary || null,
        subscriptionPlan: input.subscriptionPlan,
        subscriptionStatus: input.subscriptionStatus,
        subscriptionStartedAt: new Date()
      }
    })
    res.status(201).json({ restaurant })
  })

  router.patch('/restaurants/:id', async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      whatsappNumber: z.string().optional().nullable(),
      themePrimary: z.string().optional().nullable(),
      themeSecondary: z.string().optional().nullable(),
      subscriptionPlan: z.enum(['START', 'PRO', 'SCALE']).optional(),
      subscriptionStatus: z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED']).optional()
    })
    const input = schema.parse(req.body)
    const id = req.params.id

    const existing = await prisma.restaurant.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Restaurante não encontrado.' })

    try {
      const restaurant = await prisma.restaurant.update({
        where: { id },
        data: {
          name: input.name ?? existing.name,
          slug: input.slug ?? existing.slug,
          whatsappNumber: input.whatsappNumber !== undefined ? input.whatsappNumber : existing.whatsappNumber,
          themePrimary: input.themePrimary !== undefined ? input.themePrimary : existing.themePrimary,
          themeSecondary: input.themeSecondary !== undefined ? input.themeSecondary : existing.themeSecondary,
          subscriptionPlan: input.subscriptionPlan ?? existing.subscriptionPlan,
          subscriptionStatus: input.subscriptionStatus ?? existing.subscriptionStatus
        }
      })
      res.json({ restaurant })
    } catch (e) {
      if (e?.code === 'P2002') return res.status(400).json({ message: 'Slug já está em uso.' })
      throw e
    }
  })

  router.delete('/restaurants/:id', async (req, res) => {
    const id = req.params.id
    await prisma.restaurant.delete({ where: { id } })
    res.status(204).end()
  })

  router.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { in: ['RESTAURANT_ADMIN', 'DRIVER'] } },
      orderBy: { createdAt: 'desc' },
      include: { restaurant: true }
    })
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        restaurantId: u.restaurantId,
        restaurant: u.restaurant ? { id: u.restaurant.id, name: u.restaurant.name } : null
      }))
    })
  })

  router.post('/users', async (req, res) => {
    const schema = z.object({
      restaurantId: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['RESTAURANT_ADMIN', 'DRIVER']).optional().default('RESTAURANT_ADMIN')
    })
    const input = schema.parse(req.body)

    const restaurant = await prisma.restaurant.findUnique({ where: { id: input.restaurantId } })
    if (!restaurant) return res.status(400).json({ message: 'Restaurante inválido.' })

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await prisma.user.create({
      data: {
        restaurantId: input.restaurantId,
        email: input.email,
        passwordHash,
        role: input.role
      }
    })
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, restaurantId: user.restaurantId } })
  })

  router.delete('/users/:id', async (req, res) => {
    const id = req.params.id
    await prisma.user.delete({ where: { id } })
    res.status(204).end()
  })

  return router
}
