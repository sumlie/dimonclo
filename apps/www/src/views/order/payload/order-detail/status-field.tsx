import type { ReactNode } from 'react';
import { MUTED_OPACITY } from '@/shared/ui/payload/theme';

export function StatusField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '12px', opacity: MUTED_OPACITY }}>{label}</span>
      <div style={{ position: 'relative', width: 'fit-content' }}>
        {children}
      </div>
    </div>
  );
}
