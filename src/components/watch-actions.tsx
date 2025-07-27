
'use client';

import type { Content } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Youtube, Download, ListPlus, Share2, Check, Loader2 } from 'lucide-react';
import { TriviaButton } from './trivia-button';
import { useMyList } from '@/hooks/use-my-list';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';
import { handleDownloadForOffline } from '@/lib/advanced-features';
import { CodecBadge } from './codec-badge';
import { logger } from '@/lib/logger';

export function WatchActions({ content }: { content: Content }) {
    const { isInMyList, addToMyList, removeFromMyList, loading: listLoading } = useMyList();
    const [isClient, setIsClient] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const isItemInList = isInMyList(content.id);

    const handleToggleMyList = async () => {
        try {
            if (isItemInList) {
                await removeFromMyList(content.id);
                toast.info('Removed from My List');
            } else {
                await addToMyList(content.id);
                toast.success('Added to My List');
            }
        } catch (error) {
            logger.error({error}, "Failed to update My List:", error);
            toast.error('Update Failed', { description: 'Could not update your list.' });
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: content.title,
            text: content.description,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if ((error as DOMException).name !== 'AbortError') {
                    logger.error({error}, 'Error sharing:', error);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link Copied!', { description: 'The link has been copied to your clipboard.' });
            } catch (error) {
                logger.error({error}, 'Failed to copy link:', error);
                toast.error('Copy Failed', { description: 'Could not copy link to clipboard.' });
            }
        }
    };
    
    const canBeDownloaded = content.canDownload && content.videoUrl && !content.videoUrl.includes('.m3u8');
    
    const handleOfflineDownload = useCallback(async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        toast.info('Starting Offline Download...', { description: 'Please keep this tab open.' });
        try {
            const result = await handleDownloadForOffline(content);
            toast.success('Download Complete!', { description: result });
        } catch(error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            logger.error({ error }, 'Offline download failed');
            toast.error('Download Failed', { description: message });
        } finally {
            setIsDownloading(false);
        }
    }, [content, isDownloading]);
    
    if (!isClient || listLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
                {content.trailerUrl && <Skeleton className="h-12 w-full" />}
                <Skeleton className="h-12 w-full" />
                {canBeDownloaded && <Skeleton className="h-12 w-full" />}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-center gap-2 flex-wrap">
              {(content.audioCodecs || []).map(codec => <CodecBadge key={codec} codec={codec} />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button size="lg" variant="secondary" className="w-full font-semibold" onClick={handleToggleMyList} disabled={listLoading}>
                    {listLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : isItemInList ? <Check className="mr-2 h-5 w-5" /> : <ListPlus className="mr-2 h-5 w-5" />}
                    {isItemInList ? 'In My List' : 'My List'}
                </Button>
                <Button size="lg" variant="secondary" className="w-full font-semibold" onClick={handleShare}>
                    <Share2 className="mr-2 h-5 w-5" />
                    Share
                </Button>
            </div>
            
             {content.trailerUrl && (
                <Button asChild size="lg" variant="outline" className="w-full font-semibold">
                    <a href={content.trailerUrl} target="_blank" rel="noopener noreferrer">
                        <Youtube className="mr-2 h-5 w-5" />
                        Watch Trailer
                    </a>
                </Button>
            )}
            
            <TriviaButton content={content} />

            {canBeDownloaded && (
              <Button size="lg" variant="secondary" className="w-full font-semibold" onClick={handleOfflineDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
        </div>
    )
}
