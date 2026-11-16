import type { Order } from '@/shared/api/payload-types';

export type { Product, Media } from '@/shared/api/payload-types';

export type OrderDocument = Order;

export type OrderItem = Order['items'][number];
