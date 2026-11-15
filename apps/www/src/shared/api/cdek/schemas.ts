import { z } from 'zod';

export const cdekTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional().catch(undefined),
});

export const cdekPointSchema = z.object({
  code: z.string(),
  is_handout: z.literal(true),
  location: z.object({ country_code: z.string(), city_code: z.number() }),
});

// A malformed unrelated item must not hide a valid matching point or tariff.
export const cdekPointsSchema = z.array(cdekPointSchema.nullable().catch(null));

const optionalNumber = z.number().nullish().catch(null);

export const cdekTariffSchema = z.object({
  delivery_sum: z.number().min(0),
  delivery_mode: optionalNumber,
  tariff_code: optionalNumber,
  tariff_name: z.string().nullish().catch(null),
  period_min: optionalNumber,
  period_max: optionalNumber,
});

export const cdekTariffListSchema = z.object({
  tariff_codes: z.array(cdekTariffSchema.nullable().catch(null)),
});
