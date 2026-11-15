import { ALL_PROVIDERS, type SocialProviderId } from '@/shared/config/auth';
import { AuthError, jsonError } from '@/shared/lib/auth/errors';
import { checkOrigin } from './me';
import { authenticateRequest } from '@/entities/customer/server';
import { unlinkProvider } from '../service';

export async function handleUnlinkProvider(
  request: Request,
  provider: string,
): Promise<Response> {
  const originError = checkOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    if (!ALL_PROVIDERS.includes(provider as SocialProviderId)) {
      throw new AuthError('invalid_request', 'Unknown provider', 400);
    }

    const { user, payload, req, responseHeaders } =
      await authenticateRequest(request);

    if (!user || user.collection !== 'customers' || user.isBlocked) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    await unlinkProvider({
      payload,
      req,
      customerId: user.id,
      provider,
    });

    const headers = new Headers(responseHeaders);

    headers.set('Cache-Control', 'no-store');

    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
