
'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// This is a simplified skeleton for the Storage page.
const StoragePageSkeleton = () => (
    <div className="container mx-auto py-10">
      <Skeleton className="h-9 w-1/2 mb-2" />
      <Skeleton className="h-5 w-3/4 mb-8" />
       <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-44" />
        </div>
        <div className="rounded-md border">
            <Skeleton className="h-[600px] w-full" />
        </div>
    </div>
);


export default function StorageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    // Redirect non-admins away once auth state is confirmed
    if (!loading && !isAdmin) {
      redirect('/');
    }
  }, [isAdmin, loading]);

  // Show a skeleton while loading auth state or for non-admins before redirect
  if (loading || !isAdmin) {
    return <StoragePageSkeleton />;
  }

  // Render the actual page content for authenticated admins
  return <>{children}</>;
}
