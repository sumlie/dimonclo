const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

const dateTime = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Minsk',
});

export function formatPrice(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${money.format(value)} ₽`
    : null;
}

export function formatDateTime(value: string | undefined): string {
  const date = value ? new Date(value) : null;

  return date && Number.isFinite(date.getTime()) ? dateTime.format(date) : '—';
}

export function getRelativeTime(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  const seconds = (new Date(value).getTime() - Date.now()) / 1000;

  if (!Number.isFinite(seconds)) {
    return '—';
  }

  const formatter = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' });

  if (Math.abs(seconds) < 3600) {
    return formatter.format(Math.round(seconds / 60), 'minute');
  }

  if (Math.abs(seconds) < 86400) {
    return formatter.format(Math.round(seconds / 3600), 'hour');
  }

  return formatter.format(Math.round(seconds / 86400), 'day');
}
