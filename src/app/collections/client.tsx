
'use client';

import type { CollectionsIndex } from './page';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CollectionsClientProps {
  collectionsIndex: CollectionsIndex | null;
  loading: boolean;
}

export default function CollectionsClient({ collectionsIndex, loading }: CollectionsClientProps) {
  if (loading) {
      return (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`}>
                    <Skeleton className="h-8 w-12 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            ))}
        </div>
      );
  }

  const sortedKeys = collectionsIndex ? Object.keys(collectionsIndex).sort() : [];

  return (
    <div className="space-y-8">
      {sortedKeys.map((letter) => (
        <div key={letter}>
          <h2 className="text-2xl font-bold font-headline pb-4 border-b mb-4">{letter}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionsIndex?.[letter]?.map((collection) => (
              <Link
                key={collection.name}
                href={`/collection/${encodeURIComponent(collection.name)}`}
                className="group block"
              >
                <Card className="p-4 flex justify-between items-center transition-all duration-200 hover:bg-secondary hover:border-primary/50 hover:shadow-lg">
                  <div>
                    <h3 className="font-semibold">{collection.name}</h3>
                    <p className="text-sm text-muted-foreground">{collection.items.length} Titles</p>
                  </div>
                   <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
