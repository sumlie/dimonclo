import type { Customer } from '@/shared/api/payload-types';
import type { CheckoutBody, CheckoutContext, DeliveryRegion } from './types';

export async function saveProfile(
  { payload, req }: CheckoutContext,
  body: CheckoutBody,
  customer: Customer,
  orderUsername: string,
) {
  const profileUpdate: {
    phone?: string;
    username?: string;
    deliveryRegion?: DeliveryRegion;
    cdekPointCode?: null;
    addresses?: NonNullable<typeof customer.addresses>;
  } = {};

  if (!customer.phone?.trim() && body.phone) {
    profileUpdate.phone = body.phone;
  }

  if (
    !customer.username?.trim() &&
    orderUsername &&
    orderUsername.length <= 33
  ) {
    profileUpdate.username = orderUsername;
  }

  if (body.deliveryMethod !== 'pickup') {
    const addresses = customer.addresses ?? [];
    const hasDefaultAddress = addresses.some((a) => a.isDefault);

    if (!hasDefaultAddress && addresses.length < 5) {
      profileUpdate.deliveryRegion = body.deliveryRegion;
      profileUpdate.cdekPointCode = null;
      profileUpdate.addresses = [
        ...addresses,
        {
          deliveryMethod: body.deliveryMethod,
          address: body.deliveryAddress,
          isDefault: true,
        },
      ];
    }
  }

  if (Object.keys(profileUpdate).length > 0) {
    await payload.update({
      collection: 'customers',
      id: customer.id,
      data: profileUpdate,
      user: customer,
      req,
      overrideAccess: false,
    });
  }
}
