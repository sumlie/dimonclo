import type { GlobalConfig } from 'payload'

export const HomePageSettings: GlobalConfig = {
  slug: 'home-page-settings',

  label: 'Home Page',

  admin: {
    group: 'Tweaks',
  },

  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.collection === 'admins',
  },

  fields: [
    {
      name: 'featuredProducts',
      type: 'array',
      label: 'Популярные товары',
      maxRows: 4,

      labels: {
        singular: 'Товар',
        plural: 'Товары',
      },

      admin: {
        description:
          'Выбери до четырёх товаров и перетащи их в нужном порядке.',
      },

      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Товар',
          required: true,

          filterOptions: {
            status: {
              equals: 'published',
            },
          },

          admin: {
            allowCreate: false,
            allowEdit: false,
          },
        },
      ],
    },
  ],
}