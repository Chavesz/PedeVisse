const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.BRUNA_FARMA_ADMIN_EMAIL || 'bruna@pedevisse.demo'
const ADMIN_PASSWORD = process.env.BRUNA_FARMA_ADMIN_PASSWORD || 'BrunaFarma123!'

async function upsertCategory(restaurantId, name, sortOrder) {
  return prisma.category.upsert({
    where: { restaurantId_name: { restaurantId, name } },
    update: { sortOrder },
    create: { restaurantId, name, sortOrder }
  })
}

async function upsertProduct(restaurantId, categoryId, product) {
  return prisma.product.upsert({
    where: { restaurantId_name: { restaurantId, name: product.name } },
    update: { categoryId, ...product },
    create: { restaurantId, categoryId, ...product }
  })
}

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'brunafarma' },
    update: {
      name: 'Bruna Farma',
      commerceType: 'PHARMACY',
      heroTitle: 'Cuidado e bem-estar perto de você.',
      heroDescription: 'Catálogo demonstrativo para visualizar a experiência da Bruna Farma. Produtos e preços são ilustrativos.',
      themePrimary: '#e52c39',
      themeSecondary: '#160f10',
      logoUrl: 'asset:brunafarma',
      isOpen: false,
      closedMessage: 'Loja demonstrativa: pedidos reais não estão disponíveis.'
    },
    create: {
      slug: 'brunafarma',
      name: 'Bruna Farma',
      commerceType: 'PHARMACY',
      heroTitle: 'Cuidado e bem-estar perto de você.',
      heroDescription: 'Catálogo demonstrativo para visualizar a experiência da Bruna Farma. Produtos e preços são ilustrativos.',
      themePrimary: '#e52c39',
      themeSecondary: '#160f10',
      logoUrl: 'asset:brunafarma',
      isOpen: false,
      closedMessage: 'Loja demonstrativa: pedidos reais não estão disponíveis.',
      subscriptionStatus: 'ACTIVE',
      deliveryFee: 0,
      minOrder: 0
    }
  })

  const categories = {
    medicines: await upsertCategory(restaurant.id, 'Medicamentos', 0),
    hygiene: await upsertCategory(restaurant.id, 'Higiene pessoal', 1),
    wellness: await upsertCategory(restaurant.id, 'Bem-estar', 2),
    prescriptions: await upsertCategory(restaurant.id, 'Requer receita', 3)
  }

  const products = [
    [categories.medicines, { name: 'Paracetamol 750 mg', description: 'Analgésico e antitérmico · item demonstrativo', unitLabel: 'caixa com 20 comprimidos', price: 1290, isAvailable: true, requiresPrescription: false }],
    [categories.medicines, { name: 'Ibuprofeno 400 mg', description: 'Item demonstrativo para o protótipo', unitLabel: 'caixa com 10 cápsulas', price: 1450, isAvailable: true, requiresPrescription: false }],
    [categories.medicines, { name: 'Dipirona sódica gotas', description: 'Item demonstrativo para o protótipo', unitLabel: 'frasco 10 ml', price: 890, isAvailable: true, requiresPrescription: false }],
    [categories.medicines, { name: 'Antialérgico loratadina', description: 'Item demonstrativo para o protótipo', unitLabel: 'caixa com 12 comprimidos', price: 1890, isAvailable: true, requiresPrescription: false }],
    [categories.hygiene, { name: 'Protetor solar FPS 50', description: 'Proteção diária · item demonstrativo', unitLabel: 'frasco 120 ml', price: 4290, isAvailable: true, requiresPrescription: false }],
    [categories.hygiene, { name: 'Sabonete líquido neutro', description: 'Higiene diária · item demonstrativo', unitLabel: 'frasco 250 ml', price: 1690, isAvailable: true, requiresPrescription: false }],
    [categories.wellness, { name: 'Vitamina C efervescente', description: 'Suplemento demonstrativo', unitLabel: 'tubo com 10 comprimidos', price: 1590, isAvailable: true, requiresPrescription: false }],
    [categories.wellness, { name: 'Curativos adesivos', description: 'Cuidados básicos · item demonstrativo', unitLabel: 'caixa com 20 unidades', price: 990, isAvailable: true, requiresPrescription: false }],
    [categories.prescriptions, { name: 'Medicamento com retenção de receita', description: 'Exemplo visual. Não disponível para pedido real.', unitLabel: 'unidade demonstrativa', price: 2590, isAvailable: false, requiresPrescription: true }],
    [categories.prescriptions, { name: 'Medicamento de controle especial', description: 'Exemplo visual. Não disponível para pedido real.', unitLabel: 'unidade demonstrativa', price: 3490, isAvailable: false, requiresPrescription: true }]
  ]

  for (const [category, product] of products) {
    await upsertProduct(restaurant.id, category.id, product)
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: 'RESTAURANT_ADMIN', restaurantId: restaurant.id },
    create: { email: ADMIN_EMAIL, passwordHash, role: 'RESTAURANT_ADMIN', restaurantId: restaurant.id }
  })

  process.stdout.write('Bruna Farma criada em /brunafarma\\n')
  process.stdout.write(`Acesso administrativo: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.message || error}\\n`)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
