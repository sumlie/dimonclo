import { contentFields } from './fields/content';
import { inventoryFields } from './fields/inventory';
import { publishingFields } from './fields/publishing';
import type { CollectionConfig } from 'payload';
import { productEndpoints } from '../api/endpoints';

export const Products: CollectionConfig = {
  endpoints: productEndpoints,

  slug: 'products',
  orderable: true,

  labels: {
    singular: 'Products',
    plural: 'Products',
  },

  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'photos',
      'category',
      'priceByn',
      'priceRub',
      'stock',
      'weight',
      'status',
    ],
    group: 'Shop',
  },

  access: {
    update: ({ req: { user } }) => user?.collection === 'users',
    create: ({ req: { user } }) => user?.collection === 'users',
    delete: ({ req: { user } }) => user?.collection === 'users',
    read: ({ req: { user } }) => {
      if (user?.collection === 'users') {
        return true;
      }

      return {
        status: { equals: 'published' },
      };
    },
  },

  fields: [...contentFields, ...inventoryFields, ...publishingFields],
};
