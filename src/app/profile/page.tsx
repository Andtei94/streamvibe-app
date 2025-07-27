
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useContinueWatching } from '@/hooks/use-continue-watching';
import { useMyListContent } from '@/hooks/use-my-list-content';
import { ContentCard } from '@/components/content-card';
import { EmptyState } from '@/components/empty-state';
import { History, ListVideo, LogOut, ShieldCheck, User as UserIcon, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ProfilePageSkeleton = () => (
  <div className="container mx-auto py-10 max-w-5xl space-y-12">
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-2 text-center sm:text-left mt-4 sm:mt-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
    </div>
    <div>
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />)}
      </div>
    </div>
    <div>
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />)}
      </div>
    </div>
  </div>
);


export default function ProfilePage() {
    const { user, logout, loading: authLoading, isAdmin } = useAuth();
    const { continueWatchingItems, loading: continueWatchingLoading } = useContinueWatching();
    const { myListContent, loading: myListLoading } = useMyListContent();
    const router = useRouter();

    const isLoading = authLoading || continueWatchingLoading || myListLoading;

    if (isLoading || !user) {
        return <ProfilePageSkeleton />;
    }
    
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : '?';
    const isGuest = user.isAnonymous;

    const handleLoginRedirect = () => {
        router.push('/login');
    }

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12">
                <Avatar className="h-24 w-24 text-4xl">
                    <AvatarFallback>
                      {isAdmin ? <ShieldCheck className="w-10 h-10" /> : <UserIcon className="w-8 h-8"/>}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-3xl font-bold font-headline">{user.name}</h1>
                    <p className="text-muted-foreground">{user.email || 'No email associated'}</p>
                    {isGuest ? (
                        <Button onClick={handleLoginRedirect} className="mt-2">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In or Create Account
                        </Button>
                    ) : (
                         <Button variant="ghost" onClick={logout} className="mt-2" disabled={authLoading}>
                             <LogOut className="mr-2 h-4 w-4" />
                             Log Out
                         </Button>
                    )}
                </div>
            </div>

            <section className="space-y-4 mb-12">
                <h2 className="text-2xl font-bold font-headline">Continue Watching</h2>
                {continueWatchingItems.length > 0 ? (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {continueWatchingItems.map((item, index) => (
                            <ContentCard key={item.id} content={item} priority={index < 6} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={History}
                        title="No Viewing History"
                        description="Start watching something to see it here."
                        className="py-10 border rounded-lg bg-card"
                    />
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">My List</h2>
                {myListContent.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {myListContent.map((item, index) => (
                            <ContentCard key={item.id} content={item} priority={index < 12} />
                        ))}
                    </div>
                ) : (
                     <EmptyState
                        icon={ListVideo}
                        title="Your list is empty"
                        description="Add movies and shows to your list to see them here."
                        action={
                            <Button asChild>
                                <Link href="/browse/movie">Browse Content</Link>
                            </Button>
                        }
                        className="py-10 border rounded-lg bg-card"
                    />
                )}
            </section>
        </div>
    );
}
