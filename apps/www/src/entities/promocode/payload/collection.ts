import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

export const Promocodes: CollectionConfig = {
  slug: 'promocodes',
  admin: { useAsTitle: 'code' },
  access: authenticatedCollectionAccess('users'),
  fields: [
    { name: 'code', type: 'text', required: true, unique: true },
  ],
};
