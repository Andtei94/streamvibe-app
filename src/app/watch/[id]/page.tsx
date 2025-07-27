
'use client';

import { doc, onSnapshot, collection, getDocs, query, where, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content, Review } from '@/lib/types';
import { notFound } from 'next/navigation';
import { documentToPlainObject, cn } from '@/lib/utils';
import { WatchActions } from '@/components/watch-actions';
import { Badge } from '@/components/ui/badge';
import { ContentCarousel } from '@/components/content-carousel';
import { useState, useEffect, useMemo, useCallback }from 'react';
import { EpisodeSelector } from '@/components/episode-selector';
import { Loader2, AlertTriangle, Tv, FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import WatchPageLoading from './loading';
import { ScenePlayer } from '@/components/scene-player';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { AdminQuickEdit } from '@/components/admin-quick-edit';
import { getRecommendations } from '@/ai/actions';
import { logger } from '@/lib/logger';
import { ReviewsSection } from '@/components/reviews/reviews-section';

const NextLevelPlayer = dynamic(() => import('@/components/next-level-player').then(mod => mod.NextLevelPlayer), {
  ssr: false, 
  loading: () => <Skeleton className="aspect-video w-full rounded-lg" />, 
});

const fetchRelatedContent = async (content: Content | null): Promise<{ relatedContent: Content[], nextEpisode: Content | null }> => {
  if (!content?.collection) {
    return { relatedContent: [], nextEpisode: null };
  }

  try {
    const contentCollectionRef = collection(db, 'content');
    const q = query(contentCollectionRef, where('collection', '==', content.collection));
    const snapshot = await getDocs(q);
    const allItems = snapshot.docs.map(doc => documentToPlainObject(doc) as Content);

    const sortedItems = [...allItems].sort((a, b) => {
      if (a.type === 'tv-show' && b.type === 'tv-show') {
        const seasonA = a.seasonNumber || 0;
        const seasonB = b.seasonNumber || 0;
        if (seasonA !== seasonB) return seasonA - seasonB;
        
        const episodeA = a.episodeNumber || 0;
        const episodeB = b.episodeNumber || 0;
        if (episodeA !== episodeB) return episodeA - episodeB;
      }
      try {
        if (!a.releaseDate || !b.releaseDate) return 0;
        return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
      } catch {
        return 0;
      }
    });

    const currentIndex = sortedItems.findIndex(item => item.id === content.id);
    const nextEp = currentIndex > -1 && currentIndex < sortedItems.length - 1 ? sortedItems[currentIndex + 1] : null;
    const related = sortedItems.filter(item => item.id !== content.id);

    return { relatedContent: content.type === 'tv-show' ? sortedItems : related, nextEpisode: nextEp };
  } catch (error) {
    logger.error({ error, collectionName: content.collection }, `Failed to fetch collection data for ${content.collection}.`);
    return { relatedContent: [], nextEpisode: null };
  }
};


type PageProps = {
  params: { id: string };
};

export default function WatchPage({ params }: PageProps) {
  const [content, setContent] = useState<Content | null>(null);
  const [relatedContent, setRelatedContent] = useState<Content[]>([]);
  const [nextEpisode, setNextEpisode] = useState<Content | null>(null);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, user, uid } = useAuth();

  useEffect(() => {
    const docRef = doc(db, 'content', params.id);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const currentContent = documentToPlainObject(docSnap) as Content;
        setContent(currentContent);
        
        const { relatedContent, nextEpisode } = await fetchRelatedContent(currentContent);
        setRelatedContent(relatedContent);
        setNextEpisode(nextEpisode);

      } else {
        setContent(null);
      }
      setLoading(false);
    }, (error) => {
        logger.error({ error, docId: params.id }, "Error listening to content changes");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [params.id]);

  useEffect(() => {
      const fetchRecommendations = async () => {
          if (!uid || loading) return;
          try {
            const result = await getRecommendations({ userId: uid });
            if (result.recommendations) {
                setRecommendations(result.recommendations);
            }
          } catch (error) {
            logger.error({ error, uid }, "Failed to get AI recommendations");
          }
      };
      
      if(uid) fetchRecommendations();
  }, [loading, uid]);

  if (loading) {
    return <WatchPageLoading />;
  }

  if (!content) {
    notFound();
  }
  
  const PlayerStatusDisplay = ({ icon: Icon, title, description, buttonLink, buttonText }: { icon: React.ElementType, title: string, description: string, buttonLink?: string, buttonText?: string }) => (
     <div className="aspect-video w-full rounded-lg bg-secondary/30 border border-dashed flex flex-col items-center justify-center text-center p-8">
        <Icon className={cn("w-16 h-16 mb-4", title === "Processing Failed" ? "text-destructive" : "text-muted-foreground", title === "Video is Processing" && "text-primary animate-spin")} />
        <h2 className="text-2xl font-bold font-headline">{title}</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{description}</p>
        {isAdmin && buttonLink && buttonText && (
          <Button asChild variant={title === "Processing Failed" ? "destructive" : "secondary"} className="mt-4">
            <Link href={buttonLink}>{buttonText}</Link>
          </Button>
        )}
      </div>
  );

  let playerContent;
  const isSceneBased = content.scenes && content.scenes.length > 0;
  const isPlayable = content.canPlay && content.videoUrl;

  switch (content.status) {
    case 'error':
        playerContent = <PlayerStatusDisplay icon={AlertTriangle} title="Processing Failed" description="An error occurred while processing this content. Please go to the admin panel to fix or delete this item." buttonLink={`/admin?edit=${content.id}`} buttonText="Go to Content Management" />;
        break;
    case 'processing':
        playerContent = <PlayerStatusDisplay icon={Loader2} title="Video is Processing" description="This content is being prepared for playback and will be available shortly. Please check back in a few moments." buttonLink="/storage" buttonText="View Status in Storage" />;
        break;
    default:
        if (isPlayable) {
            playerContent = isSceneBased ? <ScenePlayer content={content} /> : <NextLevelPlayer content={content} nextEpisode={nextEpisode} />;
        } else {
            playerContent = <PlayerStatusDisplay icon={Tv} title="Content Not Playable" description="This content is not yet available for playback. Please check its status in the admin panel." buttonLink={`/admin?edit=${content.id}`} buttonText="Go to Content Management" />;
        }
  }

  const RatingDisplay = () => {
    if (content.averageRating === undefined || content.reviewCount === undefined || content.reviewCount < 1) {
        return null;
    }
    return (
        <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-lg">{content.averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({content.reviewCount} reviews)</span>
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        {playerContent}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex justify-between items-start gap-4">
                <h1 className="text-3xl lg:text-4xl font-bold font-headline mb-2 flex-1">{content.title}</h1>
                {isAdmin && <AdminQuickEdit contentId={content.id} />}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4 flex-wrap">
              <span>{content.releaseDate ? new Date(content.releaseDate).getFullYear() : 'N/A'}</span>
              <span>&bull;</span>
              <span>{content.duration || 'N/A'}</span>
              <span>&bull;</span>
              <Badge variant="outline">{content.rating || 'N/A'}</Badge>
               {content.reviewCount && content.reviewCount > 0 && <span>&bull;</span>}
              <RatingDisplay />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {content.genres?.map((genre) => (
                <Badge key={genre} variant="secondary">{genre}</Badge>
              ))}
            </div>
            <p className="text-foreground/80 leading-relaxed">{content.longDescription || 'No description available.'}</p>
          </div>
          
           {content.type === 'tv-show' && relatedContent.length > 0 && (
            <EpisodeSelector episodes={relatedContent} currentContentId={content.id} />
          )}

          <ReviewsSection contentId={content.id} />
        </div>
        
        <div className="space-y-4">
          <WatchActions content={content} />
        </div>
      </div>

      <div className="mt-16 space-y-12">
        {relatedContent.length > 0 && content.type !== 'tv-show' && content.collection && (
            <ContentCarousel title={`More from ${content.collection}`} items={relatedContent.filter(item => item.id !== content?.id)} />
        )}
        {recommendations.length > 0 && (
            <ContentCarousel title="Recommended for You" items={recommendations} />
        )}
      </div>
    </div>
  );
}
