const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const superEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@pedevisse.com'
  const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123'

  const superPasswordHash = await bcrypt.hash(superPassword, 10)
  await prisma.user.upsert({
    where: { email: superEmail },
    update: { passwordHash: superPasswordHash, role: 'SUPER_ADMIN', restaurantId: null },
    create: { email: superEmail, passwordHash: superPasswordHash, role: 'SUPER_ADMIN', restaurantId: null }
  })

  async function ensureRestaurant({ slug, name, whatsappNumber, themePrimary, themeSecondary, logoUrl }) {
    let restaurant = await prisma.restaurant.findUnique({ where: { slug } })
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name,
          slug,
          whatsappNumber: whatsappNumber || null,
          themePrimary: themePrimary || null,
          themeSecondary: themeSecondary || null,
          logoUrl: logoUrl || null
        }
      })
    } else {
      restaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          name,
          whatsappNumber: whatsappNumber || null,
          themePrimary: themePrimary || null,
          themeSecondary: themeSecondary || null,
          logoUrl: logoUrl || null
        }
      })
    }
    return restaurant
  }

  async function ensureBasicMenu(restaurantId) {
    const hasAny = await prisma.category.findFirst({ where: { restaurantId } })
    if (hasAny) return
    const category = await prisma.category.create({ data: { restaurantId, name: 'Destaques', sortOrder: 0 } })
    await prisma.product.create({
      data: {
        restaurantId,
        categoryId: category.id,
        name: 'Combo 12 peças',
        description: 'Salmão + atum',
        imageUrl: 'asset:combo-12',
        price: 4990,
        isAvailable: true
      }
    })
  }

  async function upsertCategory({ restaurantId, name, sortOrder }) {
    return prisma.category.upsert({
      where: { restaurantId_name: { restaurantId, name } },
      update: { sortOrder: typeof sortOrder === 'number' ? sortOrder : 0 },
      create: { restaurantId, name, sortOrder: typeof sortOrder === 'number' ? sortOrder : 0 }
    })
  }

  async function upsertProduct({ restaurantId, categoryId, name, description, imageUrl, price, isAvailable }) {
    return prisma.product.upsert({
      where: { restaurantId_name: { restaurantId, name } },
      update: {
        categoryId,
        description: description || null,
        imageUrl: imageUrl || null,
        price,
        isAvailable: isAvailable !== false
      },
      create: {
        restaurantId,
        categoryId,
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        price,
        isAvailable: isAvailable !== false
      }
    })
  }

  async function ensureCentralMenu(restaurantId) {
    const catTemaki = await upsertCategory({ restaurantId, name: 'Temaki', sortOrder: 0 })
    const catSushi = await upsertCategory({ restaurantId, name: 'Sushi', sortOrder: 1 })
    const catQuentes = await upsertCategory({ restaurantId, name: 'Quentes', sortOrder: 2 })

    await upsertProduct({
      restaurantId,
      categoryId: catSushi.id,
      name: 'Combo 12 peças',
      description: 'Combinado de 12 peças (varia conforme disponibilidade).',
      imageUrl: 'asset:combo-12',
      price: 4990,
      isAvailable: true
    })

    await upsertProduct({
      restaurantId,
      categoryId: catTemaki.id,
      name: 'Temaki Salmão (Natural)',
      description: 'Temaki de salmão com arroz e nori.',
      imageUrl: 'asset:temaki-natural',
      price: 2790,
      isAvailable: true
    })
    await upsertProduct({
      restaurantId,
      categoryId: catTemaki.id,
      name: 'Temaki Salmão (Frito)',
      description: 'Temaki frito crocante com salmão.',
      imageUrl: 'asset:temaki-frito',
      price: 2990,
      isAvailable: true
    })
    await upsertProduct({
      restaurantId,
      categoryId: catSushi.id,
      name: 'Combo Sushi (Natural)',
      description: 'Combinado variado de sushi.',
      imageUrl: 'asset:sushi-natural',
      price: 4990,
      isAvailable: true
    })
    await upsertProduct({
      restaurantId,
      categoryId: catSushi.id,
      name: 'Combo Sushi (Frito)',
      description: 'Combinado frito variado.',
      imageUrl: 'asset:sushi-frito',
      price: 5390,
      isAvailable: true
    })
    await upsertProduct({
      restaurantId,
      categoryId: catQuentes.id,
      name: 'Yakisoba',
      description: 'Massa com legumes e molho especial.',
      imageUrl: 'asset:yakissoba',
      price: 3490,
      isAvailable: true
    })
  }

  async function ensureUser({ email, password, role, restaurantId }) {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role, restaurantId },
      create: { email, passwordHash, role, restaurantId }
    })
  }

  const restaurantSushidoze = await ensureRestaurant({
    slug: 'sushidoze',
    name: 'Sushi Doze',
    whatsappNumber: '5511999999999',
    themePrimary: '#0ea5e9',
    themeSecondary: '#0f172a',
    logoUrl: null
  })
  await ensureBasicMenu(restaurantSushidoze.id)
  await ensureUser({ email: process.env.RESTAURANT_ADMIN_EMAIL || 'admin@sushidoze.com', password: process.env.RESTAURANT_ADMIN_PASSWORD || 'admin123', role: 'RESTAURANT_ADMIN', restaurantId: restaurantSushidoze.id })
  await ensureUser({ email: process.env.DRIVER_EMAIL || 'entregador@sushidoze.com', password: process.env.DRIVER_PASSWORD || 'admin123', role: 'DRIVER', restaurantId: restaurantSushidoze.id })

  const restaurantCentral = await ensureRestaurant({
    slug: 'centralsushi',
    name: 'Central Sushi',
    whatsappNumber: '5511999999999',
    themePrimary: '#e11d48',
    themeSecondary: '#0f172a',
    logoUrl: 'asset:centralsushi'
  })
  await ensureCentralMenu(restaurantCentral.id)
  await ensureUser({ email: 'admin@centralsushi.com', password: 'admin123', role: 'RESTAURANT_ADMIN', restaurantId: restaurantCentral.id })
  await ensureUser({ email: 'entregador@centralsushi.com', password: 'admin123', role: 'DRIVER', restaurantId: restaurantCentral.id })

  process.stdout.write(`SUPER_ADMIN: ${superEmail} / ${superPassword}\n`)
  process.stdout.write(`Gerente (sushidoze): admin@sushidoze.com / admin123\n`)
  process.stdout.write(`Entregador (sushidoze): entregador@sushidoze.com / admin123\n`)
  process.stdout.write(`Gerente (centralsushi): admin@centralsushi.com / admin123\n`)
  process.stdout.write(`Entregador (centralsushi): entregador@centralsushi.com / admin123\n`)
  process.stdout.write(`Restaurantes seed: /${restaurantSushidoze.slug} e /${restaurantCentral.slug}\n`)
}

main()
  .catch((e) => {
    process.stderr.write(`${e?.message || e}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
