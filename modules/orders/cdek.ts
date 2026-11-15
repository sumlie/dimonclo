// Shared server-side CDEK client: auth, point lookup, delivery cost quote.

const CDEK_API = "https://api.cdek.ru/v2";

export type CdekFromLocation = {
  country_code: string;
  city: string;
  address: string;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Габариты коробки фиксированные (env), вес — из заказа (граммы).
function getBox(weightGrams: number) {
  return {
    weight: weightGrams,
    length: envNumber("CDEK_BOX_XS_LENGTH_CM", 25),
    width: envNumber("CDEK_BOX_XS_WIDTH_CM", 15),
    height: envNumber("CDEK_BOX_XS_HEIGHT_CM", 10),
  };
}

const PICKUP_POINT_MODE = 4;
const CURRENCY_RUB = 1;
const QUOTE_TTL_MS = 10 * 60 * 1000;

export class CdekError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "CdekError";
  }
}

type CdekTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
};

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

export async function getCdekToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const clientId = process.env.CDEK_CLIENT_ID;
    const clientSecret = process.env.CDEK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new CdekError("CDEK credentials are not configured", 500);
    }

    const response = await fetch(`${CDEK_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new CdekError(`CDEK authorization failed: ${response.status}`);
    }

    const data: CdekTokenResponse = await response.json();

    if (typeof data.access_token !== "string" || !data.access_token) {
      throw new CdekError("CDEK returned an invalid token");
    }

    const expiresIn =
      typeof data.expires_in === "number" && data.expires_in > 60
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
  method: "GET" | "POST";
  params?: Record<string, string>;
  body?: unknown;
};

export async function cdekFetch(
  path: string,
  { method, params, body }: CdekRequestInit,
): Promise<unknown> {
  const query = params ? `?${new URLSearchParams(params)}` : "";

  const send = async () =>
    fetch(`${CDEK_API}${path}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getCdekToken()}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

  let response = await send();

  if (response.status === 401) {
    cachedToken = null;
    response = await send();
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new CdekError(
      `CDEK ${path} returned HTTP ${response.status}: ${details.slice(0, 500)}`,
    );
  }

  return response.json();
}

export type CdekPointInfo = {
  code: string;
  country: string;
  cityCode: number;
};

async function getPointInfo(pointCode: string): Promise<CdekPointInfo> {
  const data = await cdekFetch("/deliverypoints", {
    method: "GET",
    params: { code: pointCode },
  });

  if (!Array.isArray(data)) {
    throw new CdekError("Invalid CDEK deliverypoints response");
  }

  const office = (data as Record<string, any>[]).find(
    (item) => item?.code === pointCode,
  );

  const location = office?.location;

  if (
    !office ||
    office.is_handout !== true ||
    typeof location?.country_code !== "string" ||
    typeof location?.city_code !== "number"
  ) {
    throw new CdekError("CDEK pickup point not found", 404);
  }

  return {
    code: pointCode,
    country: location.country_code,
    cityCode: location.city_code,
  };
}

export type CdekQuote = {
  country: string;
  priceRub: number;
  tariffCode: number | null;
  tariffName: string | null;
  periodMin: number | null;
  periodMax: number | null;
};

const quoteCache = new Map<string, { quote: CdekQuote; expiresAt: number }>();

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Вес входит в ключ кэша, иначе цена «залипает» на первом запросе.
function quoteCacheKey(pointCode: string, weightGrams: number): string {
  const bucket = Math.max(1, Math.round(weightGrams / 100)) * 100;
  return `${pointCode}:${bucket}`;
}

export async function getCdekQuote(
  pointCode: string,
  weightGrams: number,
  fromLocation: CdekFromLocation,
): Promise<CdekQuote> {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new CdekError("Invalid weight for delivery quote", 400);
  }

  const key = quoteCacheKey(pointCode, weightGrams);
  const cached = quoteCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const point = await getPointInfo(pointCode);

  let quote: CdekQuote;

  if (point.country === "BY") {
    quote = {
      country: "BY",
      priceRub: 0,
      tariffCode: null,
      tariffName: null,
      periodMin: null,
      periodMax: null,
    };
  } else {
    const common = {
      currency: CURRENCY_RUB,
      from_location: fromLocation,
      to_location: { code: point.cityCode },
      packages: [getBox(weightGrams)],
    };

    const fixedTariff = Number(process.env.CDEK_TARIFF_CODE);

    if (Number.isInteger(fixedTariff) && fixedTariff > 0) {
      const data = (await cdekFetch("/calculator/tariff", {
        method: "POST",
        body: { ...common, tariff_code: fixedTariff },
      })) as Record<string, any>;

      if (typeof data?.delivery_sum !== "number") {
        throw new CdekError("CDEK could not calculate the tariff");
      }

      quote = {
        country: point.country,
        priceRub: roundMoney(data.delivery_sum),
        tariffCode: fixedTariff,
        tariffName: null,
        periodMin: data.period_min ?? null,
        periodMax: data.period_max ?? null,
      };
    } else {
      const data = (await cdekFetch("/calculator/tarifflist", {
        method: "POST",
        body: { ...common, lang: "rus" },
      })) as Record<string, any>;

      const tariffs = Array.isArray(data?.tariff_codes)
        ? (data.tariff_codes as Record<string, any>[])
        : [];

      const best = tariffs
        .filter(
          (tariff) =>
            tariff.delivery_mode === PICKUP_POINT_MODE &&
            typeof tariff.delivery_sum === "number" &&
            Number.isFinite(tariff.delivery_sum) &&
            tariff.delivery_sum >= 0,
        )
        .sort((a, b) => a.delivery_sum - b.delivery_sum)[0];

      if (!best) {
        throw new CdekError("No CDEK pickup point tariff available", 422);
      }

      quote = {
        country: point.country,
        priceRub: roundMoney(best.delivery_sum),
        tariffCode: best.tariff_code ?? null,
        tariffName: best.tariff_name ?? null,
        periodMin: best.period_min ?? null,
        periodMax: best.period_max ?? null,
      };
    }
  }

  quoteCache.set(key, { quote, expiresAt: Date.now() + QUOTE_TTL_MS });
  return quote;
}