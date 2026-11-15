import type { Field } from 'payload';
import { toOptions } from '@/shared/lib/status';
import { orderStatus, paymentStatus } from '../../model/status';

export const workflowFields: Field[] = [
  {
    name: 'status',
    type: 'select',
    required: true,
    defaultValue: 'new',
    label: 'Статус заказа',
    options: toOptions(orderStatus),
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-select-cell',
      },
      custom: {
        updateURL: '/api/orders/:id/update-status',
      },
    },
  },
  {
    name: 'paymentStatus',
    type: 'select',
    required: true,
    defaultValue: 'pending',
    label: 'Статус оплаты',
    options: toOptions(paymentStatus),
    admin: {
      components: {
        Cell: '/src/shared/ui/payload/editable-select-cell',
      },
      custom: {
        updateURL: '/api/orders/:id/update-payment-status',
      },
    },
  },
  {
    name: 'adminNote',
    type: 'textarea',
    label: 'Заметка (видна только админам)',
    maxLength: 5000,
    admin: { hidden: true },
    access: {
      create: ({ req: { user } }) => user?.collection === 'users',
      read: ({ req: { user } }) => user?.collection === 'users',
      update: ({ req: { user } }) => user?.collection === 'users',
    },
  },
  {
    name: 'comment',
    type: 'textarea',
    label: 'Комментарий покупателя',
  },
  {
    name: 'notificationVersion',
    type: 'number',
    required: true,
    defaultValue: 1,
    admin: {
      hidden: true,
    },
    access: {
      update: () => false,
    },
  },
  {
    name: 'seenNotificationVersion',
    type: 'number',
    required: true,
    defaultValue: 0,
    admin: {
      hidden: true,
    },
    access: {
      update: () => false,
    },
  },
];
