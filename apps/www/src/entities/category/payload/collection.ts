import type { CollectionConfig } from 'payload';

export const Categories: CollectionConfig = {
  slug: 'categories',

  labels: {
    singular: 'Categories',
    plural: 'Categories',
  },

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
    group: 'Shop',
  },

  access: {
    create: ({ req: { user } }) => user?.collection === 'users',
    update: ({ req: { user } }) => user?.collection === 'users',
    delete: ({ req: { user } }) => user?.collection === 'users',
    read: () => true,
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      unique: true,
      required: true,
    },
    {
      name: 'products',
      type: 'join',
      label: 'Товары категории',
      collection: 'products',
      on: 'category',
      defaultLimit: 10,
      defaultSort: 'title',
      admin: {
        defaultColumns: [
          'title',
          'category',
          'priceByn',
          'priceRub',
          'stock',
          'status',
        ],
      },
    },
  ],
};
