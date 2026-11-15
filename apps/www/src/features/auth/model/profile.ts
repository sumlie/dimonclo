import type { Customer } from '@/shared/api/payload-types';
import type { Payload } from 'payload';
import { AuthError } from '@/shared/lib/auth/errors';
import {
  getCustomer,
  listCustomerIdentities,
  type CustomerIdentity,
} from '@/entities/customer/server';

export function sanitizeCustomer(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    username: customer.username || null,
    phone: customer.phone || null,

    deliveryRegion: customer.deliveryRegion ?? null,
    cdekPointCode: customer.cdekPointCode ?? null,

    addresses: customer.addresses || [],
    defaultPaymentMethod: customer.defaultPaymentMethod || null,
    emailVerifiedAt: customer.emailVerifiedAt || null,
    registrationCompletedAt: customer.registrationCompletedAt || null,
    createdAt: customer.createdAt,
  };
}

export function sanitizeIdentity(identity: CustomerIdentity) {
  return {
    provider: identity.provider,
    providerId: identity.providerId,
    email: identity.email || null,
    emailVerified: Boolean(identity.emailVerified),
    linkedAt: identity.linkedAt || null,
    lastLoginAt: identity.lastLoginAt || null,
  };
}

export async function getCustomerProfile(payload: Payload, customerId: number) {
  const customer = await getCustomer(payload, customerId);

  if (!customer) {
    throw new AuthError('not_found', 'Customer not found', 404);
  }

  const identities = await listCustomerIdentities(payload, customerId);

  return {
    customer: sanitizeCustomer(customer),
    identities: identities.map(sanitizeIdentity),
  };
}
