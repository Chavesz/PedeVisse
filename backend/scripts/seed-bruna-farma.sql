INSERT INTO "Restaurant" (
  "id", "name", "slug", "commerceType", "heroTitle", "heroDescription",
  "themePrimary", "themeSecondary", "logoUrl", "isOpen", "closedMessage",
  "subscriptionPlan", "subscriptionStatus", "deliveryFee", "minOrder", "createdAt", "updatedAt"
) VALUES (
  'demo_bruna_farma', 'Bruna Farma', 'brunafarma', 'PHARMACY',
  'Cuidado e bem-estar perto de você.',
  'Catálogo demonstrativo para visualizar a experiência da Bruna Farma. Produtos e preços são ilustrativos.',
  '#e52c39', '#160f10', 'asset:brunafarma', false,
  'Loja demonstrativa: pedidos reais não estão disponíveis.',
  'START', 'ACTIVE', 0, 0, NOW(), NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name", "commerceType" = EXCLUDED."commerceType",
  "heroTitle" = EXCLUDED."heroTitle", "heroDescription" = EXCLUDED."heroDescription",
  "themePrimary" = EXCLUDED."themePrimary", "themeSecondary" = EXCLUDED."themeSecondary",
  "logoUrl" = EXCLUDED."logoUrl", "isOpen" = EXCLUDED."isOpen",
  "closedMessage" = EXCLUDED."closedMessage", "updatedAt" = NOW();

INSERT INTO "Category" ("id", "restaurantId", "name", "sortOrder", "createdAt", "updatedAt") VALUES
  ('bruna_cat_medicamentos', 'demo_bruna_farma', 'Medicamentos', 0, NOW(), NOW()),
  ('bruna_cat_higiene', 'demo_bruna_farma', 'Higiene pessoal', 1, NOW(), NOW()),
  ('bruna_cat_bem_estar', 'demo_bruna_farma', 'Bem-estar', 2, NOW(), NOW()),
  ('bruna_cat_receita', 'demo_bruna_farma', 'Requer receita', 3, NOW(), NOW())
ON CONFLICT ("restaurantId", "name") DO UPDATE SET "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = NOW();

INSERT INTO "Product" ("id", "restaurantId", "categoryId", "name", "description", "unitLabel", "price", "isAvailable", "requiresPrescription", "imageUrl", "createdAt", "updatedAt") VALUES
  ('bruna_prod_paracetamol', 'demo_bruna_farma', 'bruna_cat_medicamentos', 'Paracetamol 750 mg', 'Analgésico e antitérmico · item demonstrativo', 'caixa com 20 comprimidos', 1290, true, false, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_ibuprofeno', 'demo_bruna_farma', 'bruna_cat_medicamentos', 'Ibuprofeno 400 mg', 'Item demonstrativo para o protótipo', 'caixa com 10 cápsulas', 1450, true, false, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_dipirona', 'demo_bruna_farma', 'bruna_cat_medicamentos', 'Dipirona sódica gotas', 'Item demonstrativo para o protótipo', 'frasco 10 ml', 890, true, false, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_loratadina', 'demo_bruna_farma', 'bruna_cat_medicamentos', 'Antialérgico loratadina', 'Item demonstrativo para o protótipo', 'caixa com 12 comprimidos', 1890, true, false, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_protetor', 'demo_bruna_farma', 'bruna_cat_higiene', 'Protetor solar FPS 50', 'Proteção diária · item demonstrativo', 'frasco 120 ml', 4290, true, false, 'asset:pharmacy-care', NOW(), NOW()),
  ('bruna_prod_sabonete', 'demo_bruna_farma', 'bruna_cat_higiene', 'Sabonete líquido neutro', 'Higiene diária · item demonstrativo', 'frasco 250 ml', 1690, true, false, 'asset:pharmacy-care', NOW(), NOW()),
  ('bruna_prod_vitamina', 'demo_bruna_farma', 'bruna_cat_bem_estar', 'Vitamina C efervescente', 'Suplemento demonstrativo', 'tubo com 10 comprimidos', 1590, true, false, 'asset:pharmacy-vitamins', NOW(), NOW()),
  ('bruna_prod_curativos', 'demo_bruna_farma', 'bruna_cat_bem_estar', 'Curativos adesivos', 'Cuidados básicos · item demonstrativo', 'caixa com 20 unidades', 990, true, false, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_receita', 'demo_bruna_farma', 'bruna_cat_receita', 'Medicamento com retenção de receita', 'Exemplo visual. Não disponível para pedido real.', 'unidade demonstrativa', 2590, false, true, 'asset:pharmacy-tablets', NOW(), NOW()),
  ('bruna_prod_controle', 'demo_bruna_farma', 'bruna_cat_receita', 'Medicamento de controle especial', 'Exemplo visual. Não disponível para pedido real.', 'unidade demonstrativa', 3490, false, true, 'asset:pharmacy-tablets', NOW(), NOW())
ON CONFLICT ("restaurantId", "name") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId", "description" = EXCLUDED."description",
  "unitLabel" = EXCLUDED."unitLabel", "price" = EXCLUDED."price",
  "isAvailable" = EXCLUDED."isAvailable", "requiresPrescription" = EXCLUDED."requiresPrescription",
  "imageUrl" = EXCLUDED."imageUrl",
  "updatedAt" = NOW();

INSERT INTO "User" ("id", "restaurantId", "email", "passwordHash", "role", "createdAt", "updatedAt") VALUES
  ('demo_bruna_admin', 'demo_bruna_farma', 'bruna@pedevisse.demo', '$2a$10$vNzwAw7/befNkkmLyWAr9eoAlqVkXt67SxwUJ/a5XX/pdBkWmohmK', 'RESTAURANT_ADMIN', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET
  "restaurantId" = EXCLUDED."restaurantId", "passwordHash" = EXCLUDED."passwordHash",
  "role" = EXCLUDED."role", "updatedAt" = NOW();
