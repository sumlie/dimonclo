import { profileSchema } from '../model/schemas';
import { readAuthBody } from './request-body';
import { AuthError, jsonError } from '@/shared/lib/auth/errors';
import { authenticateRequest } from '@/entities/customer/server';
import { sanitizeCustomer } from '../service';
import { checkOrigin } from './me';

export async function handleUpdateProfile(request: Request): Promise<Response> {
  const originError = checkOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const { user, payload, req, responseHeaders } =
      await authenticateRequest(request);

    if (!user || user.collection !== 'customers' || user.isBlocked) {
      throw new AuthError('unauthorized', 'Sign in first', 401);
    }

    const {
      name,
      phone,
      username,
      deliveryRegion,
      deliveryMethod,
      deliveryAddress,
      cdekPointCode,
    } = await readAuthBody(request, profileSchema);

    const usesCdekMap =
      deliveryMethod === 'cdek' &&
      (deliveryRegion === 'belarus' || deliveryRegion === 'russia');

    const existingAddresses = user.addresses ?? [];

    const defaultIndex = existingAddresses.findIndex(
      (address) => address.isDefault,
    );

    let addresses = [...existingAddresses];

    if (deliveryAddress) {
      const previousDefault =
        defaultIndex >= 0 ? existingAddresses[defaultIndex] : undefined;

      const updatedDefault = {
        ...previousDefault,
        deliveryMethod,
        address: deliveryAddress,
        isDefault: true,
      };

      if (defaultIndex >= 0) {
        addresses[defaultIndex] = updatedDefault;
      } else {
        if (addresses.length >= 5) {
          throw new AuthError(
            'invalid_request',
            'Maximum number of addresses reached',
            400,
          );
        }

        addresses.push(updatedDefault);
      }
    } else if (defaultIndex >= 0) {
      addresses = addresses.filter((_, index) => index !== defaultIndex);
    }

    const updatedCustomer = await payload.update({
      collection: 'customers',
      id: user.id,
      data: {
        name,
        phone: phone || null,
        username: username || null,

        deliveryRegion: deliveryRegion || null,

        cdekPointCode: usesCdekMap ? cdekPointCode : null,

        addresses,
      },
      user,
      req,
      overrideAccess: false,
    });

    const headers = new Headers(responseHeaders);

    headers.set('Cache-Control', 'no-store');

    return Response.json(
      {
        ok: true,
        customer: sanitizeCustomer(updatedCustomer),
      },
      { headers },
    );
  } catch (error) {
    console.error('Profile update failed:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return jsonError(error);
  }
}
