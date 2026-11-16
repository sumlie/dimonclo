import { BORDER_COLOR, SUCCESS_COLOR } from '@/shared/ui/payload/theme';
import type { Bucket } from '@/entities/order/model/statistics/types';
import { formatMoney, formatCompact } from './format';
import { muted } from './styles';

const CHART_HEIGHT = 200;

export function RevenueChart({
  buckets,
  maxRevenue,
  wide,
}: {
  buckets: Bucket[];
  maxRevenue: number;
  wide: boolean;
}) {
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          minWidth: wide ? 760 : 480,
        }}
      >
        {/* Подписи оси Y */}
        <div
          style={{
            position: 'relative',
            width: 44,
            height: CHART_HEIGHT,
            flexShrink: 0,
          }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              style={{
                ...muted,
                position: 'absolute',
                right: 0,
                top: `${(1 - tick) * 100}%`,
                transform: 'translateY(-50%)',
                fontSize: 11,
              }}
            >
              {maxRevenue > 0 ? formatCompact(maxRevenue * tick) : 0}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Область графика */}
          <div
            style={{
              position: 'relative',
              height: CHART_HEIGHT,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4,
            }}
          >
            {ticks.map((tick) => (
              <div
                key={tick}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${(1 - tick) * 100}%`,
                  borderTop: `1px ${tick === 0 ? 'solid' : 'dashed'} ${BORDER_COLOR}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {buckets.map((bucket, index) => {
              const height =
                maxRevenue > 0 ? (bucket.revenue / maxRevenue) * 100 : 0;

              return (
                <div
                  key={`${bucket.label}-${index}`}
                  title={`${bucket.label}: ${formatMoney(bucket.revenue)}; заказов всего: ${bucket.orders}`}
                  style={{
                    position: 'relative',
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 36,
                      height: `${height}%`,
                      minHeight: bucket.revenue > 0 ? 3 : 0,
                      background: SUCCESS_COLOR,
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Подписи оси X */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {buckets.map((bucket, index) => (
              <span
                key={`${bucket.label}-${index}`}
                style={{
                  ...muted,
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'center',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                }}
              >
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
