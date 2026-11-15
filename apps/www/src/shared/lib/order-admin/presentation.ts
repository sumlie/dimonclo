import type { PayloadRequest } from 'payload';
import { formatPrice } from '@/shared/lib/format';

export const STATUS_UPDATE_URL = '/api/orders/:id/update-status';

export const PAYMENT_STATUS_UPDATE_URL =
  '/api/orders/:id/update-payment-status';

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  pickup: 'Самовывоз',
  cdek: 'СДЭК',
  belmail: 'Белпочта',
  euromail: 'Европочта',
};

export const DELIVERY_REGION_LABELS: Record<string, string> = {
  belarus: 'Беларусь',
  russia: 'Россия',
  cis: 'Страны СНГ',
  world: 'Остальной мир',
};

export const DISCOUNT_COLOR = '#e56b6f';

export function getOptions(req: PayloadRequest, name: string) {
  const field = req.payload.collections.orders.config.fields.find(
    (item) => 'name' in item && item.name === name,
  ) as { options?: ({ label: unknown; value: string } | string)[] } | undefined;

  return (field?.options ?? []).map((option) =>
    typeof option === 'string'
      ? { label: option, value: option }
      : { label: String(option.label), value: option.value },
  );
}

export function getLabel(
  value: string | null | undefined,
  labels: Record<string, string>,
): string {
  if (!value) {
    return '—';
  }

  return labels[value] ?? value;
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatOptionalPrice(value: unknown): string {
  if (!isNumber(value)) {
    return '—';
  }

  return formatPrice(value) ?? '—';
}

export function formatByn(value: unknown): string | null {
  if (!isNumber(value) || value <= 0) {
    return null;
  }

  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} BYN`;
}

export function formatPriceWithByn(rub: unknown, byn: unknown): string {
  const rubText = formatOptionalPrice(rub);
  const bynText = formatByn(byn);

  return bynText ? `${rubText} · ${bynText}` : rubText;
}
