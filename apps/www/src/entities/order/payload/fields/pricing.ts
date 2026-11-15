import type { Field } from 'payload';

export const pricingFields: Field[] = [
  {
    name: 'discountType',
    type: 'select',
    label: 'Тип скидки',
    defaultValue: 'none',
    options: [
      { label: 'Без скидки', value: 'none' },
      { label: 'Первый заказ', value: 'first_order' },
      { label: 'Промокод', value: 'promo_code' },
    ],
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'promoCode',
    type: 'text',
    label: 'Промокод',
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'discountPercent',
    type: 'number',
    label: 'Скидка (%)',
    min: 0,
    max: 100,
    defaultValue: 0,
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'discountAmount',
    type: 'number',
    label: 'Сумма скидки (RUB)',
    min: 0,
    defaultValue: 0,
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'discountAmountByn',
    type: 'number',
    min: 0,
    defaultValue: 0,
    label: 'Сумма скидки (BYN)',
    admin: { readOnly: true },
  },
  {
    name: 'deliveryPrice',
    type: 'number',
    label: 'Стоимость доставки (RUB)',
    min: 0,
    defaultValue: 0,
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'deliveryPriceByn',
    type: 'number',
    min: 0,
    defaultValue: 0,
    label: 'Стоимость доставки (BYN)',
    admin: { readOnly: true },
  },
  {
    name: 'total',
    type: 'number',
    required: true,
    min: 0,
    label: 'Сумма (RUB)',
  },
  {
    name: 'totalByn',
    type: 'number',
    min: 0,
    defaultValue: 0,
    label: 'Сумма (BYN)',
    admin: { readOnly: true },
  },
  {
    name: 'totalWeight',
    type: 'number',
    label: 'Общий вес (граммы)',
    min: 0,
    defaultValue: 0,
  },
];
