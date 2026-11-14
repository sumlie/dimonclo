import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: authenticatedCollectionAccess('users'),
  fields: [],
};
