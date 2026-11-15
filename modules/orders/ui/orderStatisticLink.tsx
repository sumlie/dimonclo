'use client'

import { useConfig } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function OrderStatisticLink() {
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()

  const statisticHref = `${admin}/order-statistic`
  const ordersHref = `${admin}/collections/orders`
  const isStatisticActive = usePathname().startsWith(statisticHref)
  const isOrderActive = usePathname().startsWith(ordersHref)
  
  return (
    <div className="nav-group">
      <div className="nav-group__content">
        <Link className="nav__link" href={ordersHref} prefetch={false}>
          {isOrderActive && <div className="nav__link-indicator" />}
          <span className="nav__link-label">Orders</span>
        </Link>
        <Link className="nav__link" href={statisticHref} prefetch={false}>
          {isStatisticActive && <div className="nav__link-indicator" />}
          <span className="nav__link-label">Orders Statistic</span>
        </Link>
      </div>
    </div>
  )
}