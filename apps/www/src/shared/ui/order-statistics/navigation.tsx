'use client';

import { useConfig } from '@payloadcms/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OrderStatisticsLink() {
  const {
    config: {
      routes: { admin },
    },
  } = useConfig();

  const href = `${admin}/order-statistic`;
  const active = usePathname().startsWith(href);

  return (
    <Link className="nav__link" href={href} prefetch={false}>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Orders Statistic</span>
    </Link>
  );
}
