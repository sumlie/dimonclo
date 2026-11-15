import type { Field } from 'payload';

export const itemsFields: Field[] = [
  {
    name: 'items',
    type: 'array',
    label: 'Товары в заказе',
    required: true,
    minRows: 1,
    labels: { singular: 'Товар', plural: 'Товары' },
    admin: {
      components: {
        Cell: '/src/entities/order/ui/payload/order-items-cell',
      },
    },
    fields: [
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        required: true,
        label: 'Товар',
        admin: {
          allowCreate: false,
          allowEdit: false,
        },
      },
      {
        name: 'quantity',
        type: 'number',
        required: true,
        min: 1,
        defaultValue: 1,
        label: 'Количество',
      },
      {
        name: 'unitPrice',
        type: 'number',
        required: true,
        min: 0,
        label: 'Цена за единицу',
      },
      {
        name: 'unitPriceByn',
        type: 'number',
        min: 0,
        label: 'Цена за единицу (BYN)',
      },
      {
        name: 'sizeId',
        type: 'text',
        label: 'ID размера',
      },
      {
        name: 'sizeLabel',
        type: 'text',
        label: 'Размер',
      },
    ],
  },
];
