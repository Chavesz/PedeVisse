export const COMMERCE_TYPES = {
  GENERAL: { label: 'Comércio local', catalogLabel: 'Produtos' },
  MARKET: { label: 'Mercado', catalogLabel: 'Produtos' },
  PHARMACY: { label: 'Farmácia', catalogLabel: 'Produtos' },
  CONVENIENCE: { label: 'Conveniência', catalogLabel: 'Produtos' },
  PET_SHOP: { label: 'Pet shop', catalogLabel: 'Produtos' },
  RESTAURANT: { label: 'Restaurante', catalogLabel: 'Cardápio' }
}

export function commerceMeta(type) {
  return COMMERCE_TYPES[type] || COMMERCE_TYPES.GENERAL
}
