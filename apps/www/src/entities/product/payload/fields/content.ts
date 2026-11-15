import type { Field } from 'payload';

export const contentFields: Field[] = [
  {
    name: 'title',
    type: 'text',
    label: 'Название',
    required: true,
  },
  {
    name: 'slug',
    type: 'text',
    label: 'URL',
    required: true,
    unique: true,
    index: true,
  },
  {
    name: 'photos',
    type: 'upload',
    label: 'Фото',
    relationTo: 'media',
    hasMany: true,
    required: true,
    admin: {
      components: {
        Cell: '/src/entities/product/ui/payload/photo-cell',
      },
    },
  },
  {
    name: 'category',
    type: 'relationship',
    label: 'Категория',
    relationTo: 'categories',
    required: true,
    index: true,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Описание',
  },
];
