import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFolderField } from 'payload';
import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

const collectionDir = path.dirname(fileURLToPath(import.meta.url));

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  access: authenticatedCollectionAccess('users'),
  upload: {
    staticDir: path.resolve(collectionDir, '../../../../uploads/media'),
    mimeTypes: ['image/*'],
  },
  fields: [
    { name: 'alt', type: 'text' },
    createFolderField({ relationTo: 'folders' }),
  ],
};
