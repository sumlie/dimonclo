import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import { Users } from '@/entities/user/payload';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(configDir, '../../..');

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: appRoot,
      importMapFile: path.resolve(appRoot, 'app/(payload)/admin/importMap.js'),
    },
  },
  collections: [Users],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(appRoot, 'src/app/migrations'),
    push: process.env.NODE_ENV !== 'production',
  }),
  typescript: {
    outputFile: path.resolve(appRoot, 'src/shared/api/payload-types.ts'),
  },
});
