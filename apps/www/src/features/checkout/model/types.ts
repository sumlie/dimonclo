export type { CheckoutBody, CheckoutItem, DeliveryRegion } from './schema';

import type { PayloadRequest } from 'payload';
import type { sql } from '@payloadcms/db-postgres';

export type TransactionDb = {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>;
};

export type CheckoutContext = {
  payload: PayloadRequest['payload'];
  req: PayloadRequest;
  transactionDb: TransactionDb;
};
