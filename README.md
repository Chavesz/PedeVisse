# PedeVisse

Vitrine digital e sistema de pedidos para comércios locais: mercado, farmácia, conveniência, pet shop ou restaurante. O cliente compra pelo celular com entrega ou retirada; o lojista gerencia catálogo e pedidos num painel.

## Funcionalidades

- Catálogo com busca, categorias e carrinho
- Checkout com entrega ou retirada, Pix e cartão
- Painel do lojista: produtos, pedidos, horário de funcionamento e área de entrega
- Área do entregador com atribuição de pedidos
- Cadastro self-service da loja e assinatura via Stripe
- Notificações de pedido pelo WhatsApp

## Stack

**Front-end:** Vue 3, Vite, Pinia e Tailwind CSS
**Back-end:** Node.js, Express, Prisma e PostgreSQL, com autenticação JWT

## Como rodar

```bash
# back-end
cd backend
cp .env.example .env   # preencha DATABASE_URL e JWT_SECRET
npm install
npm run prisma:migrate
npm run seed
npm run dev

# front-end (outro terminal)
cd frontend
npm install
npm run dev
```

## O que aprendi

Modelar um sistema multi-perfil (cliente, lojista, entregador e super admin), evoluir o banco com migrations do Prisma e integrar pagamento recorrente com webhooks do Stripe.
