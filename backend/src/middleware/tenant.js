import { prisma } from '../lib/prisma.js'

export async function withTenant(req, res, next) {
  const slug = req.params.slug
  if (!slug) return res.status(400).json({ message: 'Tenant não informado.' })
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } })
  if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' })
  req.tenant = { slug, restaurantId: restaurant.id, restaurant }
  next()
}

