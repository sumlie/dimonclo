import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  access: authenticatedCollectionAccess('users'),
  fields: [
    { name: 'name', type: 'text', required: true },
  ],
};
