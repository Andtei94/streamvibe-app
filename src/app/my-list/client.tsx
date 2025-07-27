
'use client';

import { ContentCard } from '@/components/content-card';
import { EmptyState } from '@/components/empty-state';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';
import { Button } from '@/components/ui/button';
import { useMyListContent } from '@/hooks/use-my-list-content';
import { ListVideo } from 'lucide-react';
import Link from 'next/link';

export default function MyListClient() {
  const { myListContent, loading } = useMyListContent();

  if (loading) {
    return <PageGridSkeleton showTitle={false} />;
  }

  if (!loading && myListContent.length === 0) {
    return (
      <EmptyState
        icon={ListVideo}
        title="Your list is empty"
        description="Add movies and shows to your list to see them here."
        action={
            <Button asChild>
                <Link href="/browse/movie">Browse Content</Link>
            </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {myListContent.map((item, index) => (
        <ContentCard key={item.id} content={item} priority={index < 12} />
      ))}
    </div>
  );
}
