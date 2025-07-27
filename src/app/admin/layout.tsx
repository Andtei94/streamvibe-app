
'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, user, loading } = useAuth();

  useEffect(() => {
    // Only redirect when loading is complete and we are sure the user is not an admin.
    if (!loading && !isAdmin) {
      redirect('/');
    }
  }, [isAdmin, user, loading]);

  // While loading, or if the user is not an admin (before the redirect kicks in),
  // show a high-fidelity skeleton that matches the final page structure.
  // This prevents the page content from flickering or disappearing.
  if (loading || !isAdmin) {
    return (
        <div className="container mx-auto py-10">
          <Skeleton className="h-9 w-1/2 mb-6" />
          <div className="flex justify-end mb-4 gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-44" />
          </div>
          <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 flex-wrap min-w-[200px]">
                <Skeleton className="h-10 w-full max-w-sm" />
                <Skeleton className="h-10 w-full sm:w-[180px]" />
                <Skeleton className="h-10 w-full sm:w-[180px]" />
              </div>
          </div>
          <div className="rounded-md border">
              <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
    );
  }

  // Only render children if loading is complete and the user is an admin.
  return <>{children}</>;
}
