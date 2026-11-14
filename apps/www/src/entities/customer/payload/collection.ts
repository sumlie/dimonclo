import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: { useAsTitle: 'email' },
  access: authenticatedCollectionAccess('users'),
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
  ],
};
