import type { ReactNode } from 'react';
import { card, muted } from './styles';

export function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section style={card}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>

      {subtitle && <p style={{ ...muted, margin: '6px 0 0' }}>{subtitle}</p>}

      <div style={{ marginTop: 20 }}>{children}</div>
    </section>
  );
}
