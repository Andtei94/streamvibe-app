
'use server';

import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { HeroSection } from "@/components/hero-section";
import { documentToPlainObject } from '@/lib/utils';
import { HomeCarousels } from '@/components/home-carousels';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const getHomePageContent = async (): Promise<{
  initialContent: Content[];
} | null> => {
  try {
    const contentCollectionRef = collection(db, 'content');
    
    const q = query(
        contentCollectionRef, 
        orderBy('title_lowercase'), 
        limit(50)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { initialContent: [] };
    }

    const allContent = snapshot.docs.map(doc => documentToPlainObject(doc) as Content);
    
    return { initialContent: allContent };
  } catch (error: any) {
    logger.error({ error, stack: error.stack }, "A critical error occurred while fetching content for the homepage. This might be a permissions or indexing issue.");
    // Return null to indicate a critical failure that should be handled by the UI.
    return null;
  }
};


export default async function Home() {
    const homePageData = await getHomePageContent();
    
    // Final safety check: If data fetching failed critically, show a clear error state.
    if (!homePageData) {
        return (
            <div className="container mx-auto py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <Alert variant="destructive" className="max-w-2xl text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Could Not Load Page Content</AlertTitle>
                    <AlertDescription>
                        There was an error fetching content for the homepage. This might be due to a missing Firestore index or a permissions issue. Please check the server logs for more details.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { initialContent } = homePageData;
    const publishedContent = initialContent.filter(item => item.status === 'published');
    
    // Sort by release date descending after fetching
    publishedContent.sort((a, b) => {
        try {
            return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        } catch {
            return 0;
        }
    });

    const featuredContent = publishedContent.find(item => item.featured) || publishedContent[0] || null;

    if (!featuredContent) {
        return (
            <div className="container mx-auto py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <EmptyState
                    icon={LayoutDashboard}
                    title="Your Library is Empty"
                    description="Welcome to your personal streaming service! Go to the admin panel to start adding movies and shows."
                    action={
                        <Button asChild>
                            <Link href="/admin">Go to Content Management</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <HeroSection content={featuredContent} />
            <div className="py-8 sm:py-12 lg:py-16 space-y-12">
                <HomeCarousels initialContent={publishedContent} />
            </div>
        </div>
    );
}
