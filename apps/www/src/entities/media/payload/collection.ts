import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFolderField, createTagField } from 'payload';
import type { CollectionConfig } from 'payload';
import { authenticatedCollectionAccess } from '@/shared/api/payload/access';

const folderField = createFolderField({ relationTo: 'folders' });

if (folderField.type !== 'relationship' || folderField.hasMany === true) {
  throw new Error('Expected a single relationship field for folders');
}

// Keep the folder picker visible in the media edit form, as in the imported CMS.
delete folderField.admin?.components?.Field;
delete folderField.admin?.position;

const collectionDir = path.dirname(fileURLToPath(import.meta.url));

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename' },
  access: { ...authenticatedCollectionAccess('users'), read: () => true },
  upload: {
    bulkUpload: true,
    staticDir: path.resolve(collectionDir, '../../../../uploads/media'),
    mimeTypes: ['image/*'],
  },
  fields: [
    { name: 'alt', type: 'text' },
    createTagField({ relationTo: 'tags' }),
    folderField,
  ],
};
