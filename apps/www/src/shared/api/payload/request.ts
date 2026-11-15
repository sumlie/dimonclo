import 'server-only';
import { createPayloadRequest, getPayload } from 'payload';

export async function getAuthContext(request: Request) {
  const { default: config } = await import('@payload-config');
  const payload = await getPayload({ config });

  const req = await createPayloadRequest({
    payload,
    req: { headers: request.headers, url: request.url },
  });

  return { payload, req };
}

export async function authenticateRequest(request: Request) {
  const { payload, req } = await getAuthContext(request);

  const result = await payload.auth({
    canSetHeaders: true,
    headers: request.headers,
    req,
  });

  req.user = result.user;

  return { ...result, payload, req };
}
