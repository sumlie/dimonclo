import type { Endpoint } from 'payload';
import {
  createNumberFieldEndpoint,
  numberField,
} from '@/shared/api/payload/field-endpoints';
import { createSelectFieldEndpoint } from '@/shared/api/payload/field-endpoints';
import { productStatus } from '../model/status';

export const productEndpoints: Endpoint[] = [
  createNumberFieldEndpoint({
    collection: 'products',
    fields: {
      stock: { ...numberField },
      priceRub: { ...numberField },
      priceByn: { ...numberField },
      weight: { ...numberField },
    },
  }),
  createSelectFieldEndpoint({
    collection: 'products',
    fields: {
      status: { options: Object.keys(productStatus) },
    },
  }),
];
