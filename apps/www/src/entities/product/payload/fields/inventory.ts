import type { Field } from 'payload';
import { numberField } from '@/shared/api/payload/field-endpoints';

export const inventoryFields: Field[] = [
  {
    name: 'priceRub',
    type: 'number',
    label: 'Цена (RUB)',
    required: true,
    ...numberField,
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-number-cell',
      },
      custom: {
        updateURL: '/api/products/:id/update-number',
      },
    },
  },
  {
    name: 'priceByn',
    type: 'number',
    label: 'Цена (BYN)',
    required: true,
    ...numberField,
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-number-cell',
      },
      custom: {
        updateURL: '/api/products/:id/update-number',
      },
    },
  },
  {
    name: 'weight',
    type: 'number',
    label: 'Вес (граммы)',
    ...numberField,
    required: true,
    defaultValue: 100,
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-number-cell',
      },
      custom: {
        updateURL: '/api/products/:id/update-number',
      },
    },
  },
  {
    name: 'sizes',
    type: 'array',
    label: 'Размеры',
    admin: {
      description: 'Оставь пустым, если товар одного размера',
      initCollapsed: true,
    },
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Размер',
        required: true,
      },
    ],
  },
  {
    name: 'stock',
    type: 'number',
    label: 'Остаток',
    required: true,
    defaultValue: 0,
    ...numberField,
    admin: {
      components: { Cell: '/src/shared/ui/payload/editable-number-cell' },
      custom: { updateURL: '/api/products/:id/update-number' },
    },
  },
];
