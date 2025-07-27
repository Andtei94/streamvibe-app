
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const filterItems = [
  { label: 'All', value: null },
  { label: 'Movies', value: 'movie' },
  { label: 'TV Shows', value: 'tv-show' },
  { label: 'Music', value: 'music' },
  { label: 'Sports', value: 'sports' },
];

export function GenreFilterNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type');
  const currentTitle = decodeURIComponent(pathname.split('/').pop() || '');

  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-card p-2">
      {filterItems.map((item) => {
        const params = new URLSearchParams();
        if (item.value) {
            params.set('type', item.value);
        }
        
        const href = `${pathname}?${params.toString()}`;
        const isActive = currentType === item.value || (!currentType && !item.value);

        return (
          <Button
            key={item.label}
            asChild
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
          >
            <Link href={href}>{item.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}
