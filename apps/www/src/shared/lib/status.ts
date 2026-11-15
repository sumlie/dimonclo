export type StatusMeta = { label: string; color: string };

export function toOptions(statuses: Record<string, StatusMeta>) {
  return Object.entries(statuses).map(([value, { label }]) => ({
    label,
    value,
  }));
}
