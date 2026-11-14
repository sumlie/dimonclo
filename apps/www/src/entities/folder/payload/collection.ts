import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

export const Folders: CollectionConfig = {
  slug: 'folders',
  admin: { useAsTitle: 'name' },
  folders: true,
  access: authenticatedCollectionAccess('users'),
  fields: [
    { name: 'name', type: 'text', required: true },
  ],
};
