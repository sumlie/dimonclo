import {
  cdekPointsSchema,
  cdekTariffSchema,
  cdekTariffListSchema,
} from './schemas';
import { cdekFetch, CdekError } from './client';

export type CdekFromLocation = {
  country_code: string;
  city: string;
  address: string;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getBox(weightGrams: number) {
  return {
    weight: weightGrams,
    length: envNumber('CDEK_BOX_XS_LENGTH_CM', 25),
    width: envNumber('CDEK_BOX_XS_WIDTH_CM', 15),
    height: envNumber('CDEK_BOX_XS_HEIGHT_CM', 10),
  };
}

const PICKUP_POINT_MODE = 4;
const CURRENCY_RUB = 1;
const QUOTE_TTL_MS = 10 * 60 * 1000;

export type CdekPointInfo = {
  code: string;
  country: string;
  cityCode: number;
};

async function getPointInfo(pointCode: string): Promise<CdekPointInfo> {
  const data = await cdekFetch('/deliverypoints', {
    method: 'GET',
    params: { code: pointCode },
  });

  const parsed = cdekPointsSchema.safeParse(data);

  if (!parsed.success) {
    throw new CdekError('Invalid CDEK deliverypoints response');
  }

  const office = parsed.data.find((item) => item?.code === pointCode);

  if (!office) {
    throw new CdekError('CDEK pickup point not found', 404);
  }

  const location = office.location;

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

function quoteCacheKey(
  pointCode: string,
  weightGrams: number,
  from: CdekFromLocation,
): string {
  return JSON.stringify([
    pointCode,
    weightGrams,
    from.country_code,
    from.city,
    from.address,
  ]);
}

export async function getCdekQuote(
  pointCode: string,
  weightGrams: number,
  fromLocation: CdekFromLocation,
): Promise<CdekQuote> {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new CdekError('Invalid weight for delivery quote', 400);
  }

  const key = quoteCacheKey(pointCode, weightGrams, fromLocation);
  const cached = quoteCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const point = await getPointInfo(pointCode);

  let quote: CdekQuote;

  if (point.country === 'BY') {
    quote = {
      country: 'BY',
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
      const data = await cdekFetch('/calculator/tariff', {
        method: 'POST',
        body: { ...common, tariff_code: fixedTariff },
      });

      const parsed = cdekTariffSchema.safeParse(data);

      if (!parsed.success) {
        throw new CdekError('CDEK could not calculate the tariff');
      }

      quote = {
        country: point.country,
        priceRub: roundMoney(parsed.data.delivery_sum),
        tariffCode: fixedTariff,
        tariffName: null,
        periodMin: parsed.data.period_min ?? null,
        periodMax: parsed.data.period_max ?? null,
      };
    } else {
      const data = await cdekFetch('/calculator/tarifflist', {
        method: 'POST',
        body: { ...common, lang: 'rus' },
      });

      const parsed = cdekTariffListSchema.safeParse(data);
      const tariffs = parsed.success ? parsed.data.tariff_codes : [];

      const best = tariffs
        .filter((tariff) => tariff !== null)
        .filter((tariff) => tariff.delivery_mode === PICKUP_POINT_MODE)
        .sort((a, b) => a.delivery_sum - b.delivery_sum)[0];

      if (!best) {
        throw new CdekError('No CDEK pickup point tariff available', 422);
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
