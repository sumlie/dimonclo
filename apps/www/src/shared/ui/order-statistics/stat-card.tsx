import { border } from '@/shared/ui/payload/theme';
import { card, muted } from './styles';

export function StatCard({
  label,
  value,
  hint,
  accent,
  large,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  large?: boolean;
}) {
  return (
    <div
      style={{
        ...card,
        borderLeft: accent ? `3px solid ${accent}` : border,
      }}
    >
      <div style={muted}>{label}</div>

      <div
        style={{
          marginTop: 10,
          fontSize: large ? 30 : 24,
          fontWeight: 700,
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>

      {hint && (
        <div style={{ ...muted, marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
