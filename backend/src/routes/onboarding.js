import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function onboardingRoutes() {
  const router = Router()

  router.post('/signup', async (req, res) => {
    const schema = z.object({
      restaurantName: z.string().min(2).max(80),
      slug: z.string().min(2).max(60).optional().nullable(),
      email: z.string().email(),
      password: z.string().min(6).max(100),
      whatsappNumber: z.string().max(30).optional().nullable(),
      plan: z.enum(['START', 'PRO', 'SCALE']).optional().default('START')
    })

    const input = schema.parse(req.body)
    const normalizedSlug = slugify(input.slug || input.restaurantName)
    if (!normalizedSlug || normalizedSlug.length < 2) {
      return res.status(400).json({ message: 'Informe um nome ou slug válido para a loja.' })
    }

    const email = String(input.email || '').trim().toLowerCase()
    const whatsappNumber =
      input.whatsappNumber === undefined || input.whatsappNumber === null
        ? null
        : String(input.whatsappNumber).replace(/\D/g, '') || null

    const existingSlug = await prisma.restaurant.findUnique({ where: { slug: normalizedSlug } })
    if (existingSlug) {
      return res.status(400).json({ message: 'Este slug já está em uso. Tente outro nome para a loja.' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso.' })
    }

    const passwordHash = await bcrypt.hash(input.password, 10)

    const { restaurant, user } = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: input.restaurantName,
          slug: normalizedSlug,
          subscriptionPlan: input.plan,
          subscriptionStatus: 'TRIALING',
          subscriptionStartedAt: new Date(),
          whatsappNumber,
          themePrimary: input.plan === 'START' ? '#0ea5e9' : input.plan === 'PRO' ? '#8b5cf6' : '#e11d48',
          themeSecondary: '#0f172a'
        }
      })

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email,
          passwordHash,
          role: 'RESTAURANT_ADMIN'
        }
      })

      return { restaurant, user }
    })

    const token = signToken({ userId: user.id, role: user.role, restaurantId: restaurant.id })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        subscriptionPlan: restaurant.subscriptionPlan,
        subscriptionStatus: restaurant.subscriptionStatus
      }
    })
  })

  return router
}
