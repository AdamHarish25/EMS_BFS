'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AuditRouteListener() {
  const pathname = usePathname();

  useEffect(() => {
    // Abaikan logging untuk halaman api atau internal next
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return;

    const recordPageNavigation = async () => {
      try {
        await fetch('/api/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'VIEW',
            module: 'PAGE_NAVIGATION',
            description: `Membuka halaman ${pathname}`,
            routePath: pathname,
            // userId: dapat diambil dari global context / zustand store jika ada
          }),
        });
      } catch (error) {
        console.error('Failed to log page navigation:', error);
      }
    };

    recordPageNavigation();
  }, [pathname]);

  return null; // Komponen ini tidak merender UI apapun
}
