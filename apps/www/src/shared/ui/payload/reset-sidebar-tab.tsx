'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Payload persists the selected sidebar tab per user. A folder tab can
 * otherwise remain active while navigating through normal collections.
 */
export default function ResetSidebarTab() {
  const pathname = usePathname();
  useEffect(() => {
    const collectionMatch = pathname.match(/\/collections\/([^/?#]+)/);

    if (!collectionMatch || collectionMatch[1] === 'folders') {
      return;
    }

    const collectionsTab = document.querySelector<HTMLButtonElement>(
      '.sidebar-tabs__tab[id$="-tab-nav"]',
    );

    if (collectionsTab?.getAttribute('aria-selected') !== 'true') {
      collectionsTab?.click();
    }
  }, [pathname]);

  return null;
}
