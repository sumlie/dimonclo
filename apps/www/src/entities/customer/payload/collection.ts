import { profileFields } from './fields/profile';
import { deliveryFields } from './fields/delivery';
import { authenticationFields } from './fields/authentication';
import type { CollectionConfig } from 'payload';
import { socialSessionStrategy } from '../api/session';
import { adminOrSelf } from './access';
import { customerHooks } from './hooks';

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },

  auth: {
    tokenExpiration: 60 * 60 * 2,
    verify: true,
    useSessions: true,
    strategies: [socialSessionStrategy],
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    removeTokenFromResponses: true,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      domain: process.env.COOKIE_DOMAIN,
    },
  },

  admin: {
    group: 'Users',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'phone', 'createdAt'],
  },

  access: {
    admin: () => false,
    create: () => false,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: adminOrSelf,
  },

  hooks: customerHooks,

  fields: [...profileFields, ...deliveryFields, ...authenticationFields],
};
