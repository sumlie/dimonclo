import { handleOAuthStart } from './start';
import { handleOAuthCallback } from './callback';
import { handleTelegramStart, handleTelegramCallback } from './telegram';
import { handleMe, handleLinks } from './me';
import { handleLogout } from './logout';
import { handleOnboarding, handleOnboardingProfile } from './onboarding';
import { handleUnlinkProvider } from './unlink';
import { handleUpdateProfile } from './profile';

export async function handleAuth(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname
    .replace(/^\/api\/auth\//, '')
    .replace(/\/$/, '');

  const method = request.method;

  if (method === 'GET') {
    if (path === 'me') {
      return handleMe(request);
    }

    if (path === 'links') {
      return handleLinks(request);
    }

    if (path === 'onboarding') {
      return handleOnboardingProfile(request);
    }

    if (path === 'telegram/start') {
      return handleTelegramStart(request);
    }

    if (path === 'telegram/callback') {
      return handleTelegramCallback(request);
    }

    for (const provider of ['google', 'yandex'] as const) {
      if (path === `${provider}/start`) {
        return handleOAuthStart(provider, request);
      }

      if (path === `${provider}/callback`) {
        return handleOAuthCallback(provider, request);
      }
    }
  }

  if (method === 'POST') {
    if (path === 'logout') {
      return handleLogout(request);
    }

    if (path === 'onboarding') {
      return handleOnboarding(request);
    }
  }

  if (method === 'PATCH' && path === 'profile') {
    return handleUpdateProfile(request);
  }

  const unlink = /^links\/([^/]+)$/.exec(path);

  if (method === 'DELETE' && unlink) {
    return handleUnlinkProvider(request, unlink[1]!);
  }

  return Response.json(
    { error: 'not_found' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  );
}
