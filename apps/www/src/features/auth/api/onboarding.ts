import { onboardingSchema } from '../model/schemas';
import { readAuthBody } from './request-body';
import { jsonError } from '@/shared/lib/auth/errors';
import { checkOrigin } from './me';
import { enforceRateLimit } from '../rate-limit';
import { getAuthContext } from '@/entities/customer/server';
import { clearedLegacySessionCookie } from '@/entities/customer/server';
import { completeOnboarding, sanitizeCustomer } from '../service';
import { clearedPendingCookie, readPendingCookie } from '../state';

export async function handleOnboardingProfile(
  request: Request,
): Promise<Response> {
  try {
    const profile = await readPendingCookie(request.headers);

    return Response.json(
      {
        provider: profile.provider,
        email: profile.email || '',
        name: profile.name || '',
        username: profile.username || '',
        emailVerified: profile.emailVerified,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleOnboarding(request: Request): Promise<Response> {
  const originError = checkOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    enforceRateLimit({
      request,
      scope: 'onboarding',
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    const profile = await readPendingCookie(request.headers);

    const body = await readAuthBody(request, onboardingSchema);

    const { payload, req } = await getAuthContext(request);

    const result = await completeOnboarding({
      payload,
      req,
      profile,
      email: body.email,
      name: body.name,
      consent: body.consent === true,
    });

    const redirectUrl = new URL(result.redirectTo, 'https://local.invalid');

    redirectUrl.searchParams.set('auth', 'success');
    const redirectTo = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;

    const headers = new Headers({ 'Cache-Control': 'no-store' });

    headers.append('Set-Cookie', clearedPendingCookie());
    headers.append('Set-Cookie', clearedLegacySessionCookie());
    headers.append('Set-Cookie', result.session.cookie);

    return Response.json(
      {
        ok: true,
        redirectTo,
        customer: sanitizeCustomer(result.customer),
      },
      { headers },
    );
  } catch (error) {
    return jsonError(error);
  }
}
