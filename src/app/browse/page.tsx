
'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AdminLayout from '@/app/admin/layout';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';

export default function BrowseRedirectPage() {
  const { loading: authLoading, user } = useAuth();

  if (authLoading || !user) {
    return <PageGridSkeleton />;
  }
  
  // Default to browsing movies if no specific type is given
  redirect('/browse/movie');

  // This return is needed for type consistency, but will not be reached
  // due to the redirect above.
  return null;
}
