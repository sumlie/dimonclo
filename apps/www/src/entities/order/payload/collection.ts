import { orderHooks } from './hooks';
import { itemsFields } from './fields/items';
import { pricingFields } from './fields/pricing';
import { customerFields } from './fields/customer';
import { deliveryFields } from './fields/delivery';
import { workflowFields } from './fields/workflow';
import type { CollectionConfig } from 'payload';
import { orderEndpoints } from '../api/endpoints';
import { lockFields } from '@/shared/api/payload/lock-fields';

export const Orders: CollectionConfig = {
  slug: 'orders',

  access: {
    update: ({ req: { user } }) => user?.collection === 'users',
    create: () => false,
    read: ({ req: { user } }) => {
      if (user?.collection === 'users') {
        return true;
      }

      if (user?.collection === 'customers' && !user.isBlocked) {
        return { customer: { equals: user.id } };
      }

      return false;
    },
    delete: () => false,
  },

  hooks: orderHooks,

  endpoints: orderEndpoints,

  admin: {
    group: 'Shop',
    useAsTitle: 'id',
    defaultColumns: [
      'id',
      'customerName',
      'username',
      'items',
      'totalByn',
      'total',
      'createdAt',
      'status',
      'paymentStatus',
    ],
    components: {
      views: {
        edit: {
          root: {
            Component: '/src/views/order/payload/order-detail/order-view',
          },
        },
      },
    },
  },

  fields: lockFields(
    [
      ...itemsFields,
      ...pricingFields,
      ...customerFields,
      ...deliveryFields,
      ...workflowFields,
    ],
    ['status', 'paymentStatus', 'adminNote'],
  ),
};
