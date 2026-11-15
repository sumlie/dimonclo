import type { ReactNode } from 'react';
import { border } from './theme';

export function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section style={{ border, borderRadius: 4, overflow: 'hidden' }}>
      <header
        style={{
          padding: 16,
          borderBottom: border,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
