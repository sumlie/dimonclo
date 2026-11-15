import type { Field } from 'payload';
import { toOptions } from '@/shared/lib/status';
import { productStatus } from '../../model/status';

export const publishingFields: Field[] = [
  {
    name: 'tags',
    type: 'array',
    label: 'Теги',
    fields: [
      {
        name: 'tag',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    name: 'featured',
    type: 'checkbox',
    label: 'Показывать на главной',
    defaultValue: false,
  },
  {
    name: 'status',
    type: 'select',
    label: 'Статус',
    options: toOptions(productStatus),
    defaultValue: 'draft',
    required: true,
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-select-cell',
      },
      custom: {
        updateURL: '/api/products/:id/update-select',
      },
    },
  },
];
