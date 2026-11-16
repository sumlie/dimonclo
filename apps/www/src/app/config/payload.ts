import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import { Products } from '@/entities/product/payload';
import { Orders } from '@/entities/order/payload';
import { Categories } from '@/entities/category/payload';
import { Promocodes } from '@/entities/promocode/payload';
import { Customers, CustomerIdentities } from '@/entities/customer/payload';
import { Pages } from '@/entities/page/payload';
import { Folders } from '@/entities/folder/payload';
import { Media } from '@/entities/media/payload';
import { Users } from '@/entities/user/payload';
import { DeliveryPrices } from './globals/delivery-and-pickup';
import { HomePageSettings } from './globals/home-page';
import { OwnerInfo } from './globals/legal';
import { SocialLinks } from './globals/social-links';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(configDir, '../../..');

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  admin: {
    user: Users.slug,
    components: {
      beforeNav: ['/src/shared/ui/payload/reset-sidebar-tab'],
      afterNavLinks: ['/src/views/order/payload/order-statistic/navigation'],
      views: {
        orderStatistics: {
          Component:
            '/src/views/order/payload/order-statistic/order-statistics',
          path: '/order-statistic',
        },
      },
    },
    importMap: {
      baseDir: appRoot,
      importMapFile: path.resolve(appRoot, 'app/(payload)/admin/importMap.js'),
    },
  },
  collections: [
    Users,
    Products,
    Orders,
    Categories,
    Media,
    Folders,
    Promocodes,
    Customers,
    CustomerIdentities,
    Pages,
  ],
  globals: [DeliveryPrices, HomePageSettings, OwnerInfo, SocialLinks],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(appRoot, 'src/app/migrations'),
    push: process.env.NODE_ENV !== 'production',
  }),
  typescript: {
    outputFile: path.resolve(appRoot, 'src/shared/api/payload-types.ts'),
  },
});
