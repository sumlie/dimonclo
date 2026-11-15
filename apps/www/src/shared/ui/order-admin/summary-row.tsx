import { MUTED_OPACITY } from '@/shared/ui/payload/theme';

export function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '16px',
        fontSize: '14px',
      }}
    >
      <span style={{ opacity: MUTED_OPACITY }}>{label}</span>
      <span style={{ fontWeight: 500, color }}>{value}</span>
    </div>
  );
}
