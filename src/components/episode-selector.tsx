
'use client';

import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Content } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlayCircle, Tv } from 'lucide-react';
import { DEFAULT_POSTER_URL } from '@/lib/constants';
import { EmptyState } from './empty-state';

interface EpisodeSelectorProps {
  episodes: Content[];
  currentContentId: string;
}

// Helper to validate the image URL
const getValidImageUrl = (url?: string) => {
  try {
    if (!url || new URL(url).hostname.includes('imdb.com')) {
      return DEFAULT_POSTER_URL;
    }
    return url;
  } catch (e) {
      return DEFAULT_POSTER_URL;
  }
};

export function EpisodeSelector({ episodes, currentContentId }: EpisodeSelectorProps) {
  const seasons = episodes.reduce((acc, episode) => {
    const season = episode.seasonNumber || 1;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(episode);
    return acc;
  }, {} as Record<number, Content[]>);

  const seasonNumbers = Object.keys(seasons).map(Number).sort((a, b) => a - b);
  const currentEpisode = episodes.find(e => e.id === currentContentId);
  const defaultTab = currentEpisode?.seasonNumber ? `season-${currentEpisode.seasonNumber}` : `season-${seasonNumbers[0]}`;

  if (seasonNumbers.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>Episodes</CardTitle></CardHeader>
            <CardContent>
                <EmptyState
                    icon={Tv}
                    title="No Other Episodes Found"
                    description="This content does not appear to be part of a series."
                    className="py-10"
                />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Episodes</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(seasonNumbers.length, 6)}, 1fr)` }}>
            {seasonNumbers.map(seasonNum => (
              <TabsTrigger key={seasonNum} value={`season-${seasonNum}`}>
                Season {seasonNum}
              </TabsTrigger>
            ))}
          </TabsList>
          {seasonNumbers.map(seasonNum => (
            <TabsContent key={seasonNum} value={`season-${seasonNum}`}>
              <ScrollArea className="h-80 w-full pr-4">
                <div className="space-y-2">
                  {seasons[seasonNum].map(episode => {
                    const isActive = episode.id === currentContentId;
                    const imageUrl = getValidImageUrl(episode.imageUrl);
                    return (
                      <Link key={episode.id} href={`/watch/${episode.id}`} className="block group rounded-md" scroll={false}>
                        <div
                          className={cn(
                            "flex gap-4 p-2 rounded-md transition-colors",
                            isActive ? "bg-secondary" : "hover:bg-muted/50"
                          )}
                        >
                           <div className="relative w-32 shrink-0 aspect-video rounded-md overflow-hidden">
                                <Image
                                    src={imageUrl}
                                    alt={`Poster for ${episode.title}`}
                                    fill
                                    sizes="128px"
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <PlayCircle className="w-8 h-8 text-white" />
                                </div>
                                {isActive && (
                                    <div className="absolute inset-0 ring-2 ring-offset-2 ring-offset-background ring-primary rounded-md" />
                                )}
                            </div>
                          <div className="flex-1">
                            <h4 className={cn("font-semibold", isActive && "text-primary")}>E{episode.episodeNumber}: {episode.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{episode.description}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
