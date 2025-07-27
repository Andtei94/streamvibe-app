
'use client';

import type { Content } from '@/lib/types';
import { ContentCarousel } from './content-carousel';
import { ContentCarouselSkeleton } from './content-carousel-skeleton';
import { useContinueWatching } from '@/hooks/use-continue-watching';
import { useMyListContent } from '@/hooks/use-my-list-content';
import { useAuth } from '@/hooks/use-auth';
import { getRecommendations } from '@/ai/actions';
import { useEffect, useState, useMemo } from 'react';
import { logger } from '@/lib/logger';

interface HomePageCarouselsProps {
    initialContent?: Content[];
}

export function HomeCarousels({ initialContent = [] }: HomePageCarouselsProps) {
    const { continueWatchingItems, loading: loadingContinueWatching } = useContinueWatching();
    const { myListContent, loading: loadingMyList } = useMyListContent();
    const { uid, loading: authLoading } = useAuth();
    const [recommendations, setRecommendations] = useState<Content[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!uid || authLoading) return;
            setLoadingRecommendations(true);
            try {
                const result = await getRecommendations({ userId: uid });
                if (result.recommendations) {
                    setRecommendations(result.recommendations);
                }
            } catch (error) {
                logger.error({ error, uid }, "Failed to get AI recommendations for homepage.");
            } finally {
                setLoadingRecommendations(false);
            }
        };
        
        fetchRecommendations();
    }, [uid, authLoading]);
    
    const { trending, movies, tvShows } = useMemo(() => {
        // All filtering now happens on the client-side based on the safe, pre-fetched data.
        const publishedContent = initialContent.filter(item => item.status === 'published');
        
        const trending = [...publishedContent].sort((a,b) => {
             try {
                return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            } catch {
                return 0;
            }
        });
        const movies = publishedContent.filter(item => item.type === 'movie');
        const tvShows = publishedContent.filter(item => item.type === 'tv-show');
        
        return { trending, movies, tvShows };
    }, [initialContent]);

    let priorityApplied = false;

    const renderCarousel = (title: string, items: Content[], isLoading = false) => {
        if (isLoading) {
            return <ContentCarouselSkeleton />;
        }
        if (!items || items.length === 0) return null;
        
        const hasPriority = !priorityApplied;
        if (hasPriority) {
            priorityApplied = true;
        }

        return <ContentCarousel title={title} items={items} priority={hasPriority} />;
    };

    return (
        <>
            {renderCarousel("Continue Watching", continueWatchingItems, loadingContinueWatching)}
            {renderCarousel("My List", myListContent, loadingMyList)}
            {renderCarousel("Recommended for You", recommendations, loadingRecommendations)}
            {renderCarousel("Trending Now", trending)}
            {renderCarousel("Movies", movies)}
            {renderCarousel("TV Shows", tvShows)}
        </>
    );
}
