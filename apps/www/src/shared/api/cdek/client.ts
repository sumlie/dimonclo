import { cdekTokenSchema } from './schemas';

const CDEK_API = 'https://api.cdek.ru/v2';

export class CdekError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'CdekError';
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

export async function getCdekToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  if (tokenRequest) {
    return tokenRequest;
  }

  tokenRequest = (async () => {
    const clientId = process.env.CDEK_CLIENT_ID;
    const clientSecret = process.env.CDEK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new CdekError('CDEK credentials are not configured', 500);
    }

    const response = await fetch(`${CDEK_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new CdekError(`CDEK authorization failed: ${response.status}`);
    }

    const parsed = cdekTokenSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new CdekError('CDEK returned an invalid token');
    }

    const data = parsed.data;

    const expiresIn =
      typeof data.expires_in === 'number' && data.expires_in > 60
        ? data.expires_in - 60
        : 240;

    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return data.access_token;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

type CdekRequestInit = {
  method: 'GET' | 'POST';
  params?: Record<string, string>;
  body?: unknown;
};

export async function cdekFetch(
  path: string,
  { method, params, body }: CdekRequestInit,
): Promise<unknown> {
  const query = params ? `?${new URLSearchParams(params)}` : '';

  const send = async () =>
    fetch(`${CDEK_API}${path}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getCdekToken()}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

  let response = await send();

  if (response.status === 401) {
    cachedToken = null;
    response = await send();
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');

    throw new CdekError(
      `CDEK ${path} returned HTTP ${response.status}: ${details.slice(0, 500)}`,
    );
  }

  return response.json();
}
