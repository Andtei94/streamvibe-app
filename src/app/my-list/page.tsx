
'use client';
import { useAuth } from '@/hooks/use-auth';
import MyListClient from './client';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';


export default function MyListPage() {
  const { loading: authLoading } = useAuth();
  
  if (authLoading) {
    return <PageGridSkeleton showTitle={false} />;
  }
  
  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <h1 className="text-3xl font-bold font-headline mb-8">My List</h1>
      <MyListClient />
    </div>
  );
}
