
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle, Info } from 'lucide-react';
import type { Content } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_POSTER_URL } from '@/lib/constants';

type HeroSectionProps = {
  content: Content;
};

// Helper to validate the image URL
const getValidImageUrl = (url?: string) => {
  if (!url) {
    return DEFAULT_POSTER_URL; 
  }
  try {
    // This allows data URIs and valid web URLs.
    new URL(url); 
    return url;
  } catch (error) {
      return DEFAULT_POSTER_URL;
  }
};

export function HeroSection({ content }: HeroSectionProps) {
  const imageUrl = getValidImageUrl(content.imageUrl);

  return (
    <div className="relative h-[50vh] md:h-[80vh] w-full">
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={content.title}
          fill
          className="object-cover"
          priority
          {...(content.aiHint && { 'data-ai-hint': content.aiHint })}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 md:pb-24">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-white drop-shadow-lg">
            {content.title}
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="outline">{content.rating}</Badge>
            <span className="text-muted-foreground">{new Date(content.releaseDate).getFullYear()}</span>
            <span className="text-muted-foreground">{content.duration}</span>
          </div>
          <p className="mt-4 text-sm md:text-base text-foreground/80 drop-shadow-md line-clamp-3">
            {content.description}
          </p>
          <div className="mt-6 flex gap-4">
            <Button asChild size="lg" className="font-semibold">
              <Link href={`/watch/${content.id}`} aria-label={`Play ${content.title}`}>
                <PlayCircle className="mr-2 h-6 w-6" />
                Play
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm">
               <Link href={`/watch/${content.id}`}>
                <Info className="mr-2 h-6 w-6" />
                More Info
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
