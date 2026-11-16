import { BORDER_COLOR } from '@/shared/ui/payload/theme';
import { muted } from './styles';
import { Block } from './block';

const FALLBACK_COLOR = 'rgba(128, 128, 128, 0.6)';

export function Breakdown({
  title,
  counts,
  meta,
}: {
  title: string;
  counts: Record<string, number>;
  meta: Record<string, { label: string; color: string }>;
}) {
  const rows = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const total = rows.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Block title={title}>
      {rows.length === 0 ? (
        <p style={{ ...muted, margin: 0 }}>Нет данных</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rows.map(([key, count]) => {
            const color = meta[key]?.color ?? FALLBACK_COLOR;
            const percent = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={key} style={{ display: 'grid', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                      }}
                    />
                    {meta[key]?.label ?? key}
                  </span>

                  <span>
                    <strong>{count}</strong>
                    <span style={{ ...muted, marginLeft: 8 }}>
                      {Math.round(percent)}%
                    </span>
                  </span>
                </div>

                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: BORDER_COLOR,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Block>
  );
}
