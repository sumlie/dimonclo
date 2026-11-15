import type { Endpoint } from 'payload';
import { createSelectFieldEndpoint } from '@/shared/api/payload/field-endpoints';
import { orderStatus, paymentStatus } from '../model/status';

const statusField = { options: Object.keys(orderStatus) };
const paymentStatusField = { options: Object.keys(paymentStatus) };

export const orderEndpoints: Endpoint[] = [
  createSelectFieldEndpoint({
    collection: 'orders',
    fields: { status: { ...statusField } },
    path: '/:id/update-status',
  }),
  createSelectFieldEndpoint({
    collection: 'orders',
    fields: { paymentStatus: { ...paymentStatusField } },
    path: '/:id/update-payment-status',
  }),
];
