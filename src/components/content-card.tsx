
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import type { Content, PlaybackProgress } from '@/lib/types';
import { cn, formatContentType } from '@/lib/utils';
import { DEFAULT_POSTER_URL } from '@/lib/constants';

type ContentCardProps = {
  content: Content & Partial<Pick<PlaybackProgress, 'progressPercent'>>;
  className?: string;
  priority?: boolean;
};

const getValidImageUrl = (url?: string): string => {
  if (!url) {
    return DEFAULT_POSTER_URL;
  }
  try {
    const parsedUrl = new URL(url);
    // Allow data URIs and valid web URLs.
    if (parsedUrl.protocol === 'data:' || parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return url;
    }
    return DEFAULT_POSTER_URL;
  } catch (error) {
    // If new URL() fails, it's not a valid absolute URL.
    return DEFAULT_POSTER_URL;
  }
};


const ContentCardComponent = ({ content, className, priority = false }: ContentCardProps) => {
  const typeLabel = content.type ? formatContentType(content.type) : 'Media';
  let year: number | null = null;
  
  if (content.releaseDate) {
    try {
        const parsedYear = new Date(content.releaseDate).getFullYear();
        if (!isNaN(parsedYear)) {
          year = parsedYear;
        }
    } catch (e) {
        // Invalid date format, year will remain null
    }
  }

  const imageUrl = getValidImageUrl(content.imageUrl);

  return (
    <Link
      href={`/watch/${content.id}`}
      aria-label={`Watch ${content.title}`}
      className={cn("group block overflow-hidden rounded-lg relative", className)}
    >
      <div className="aspect-[2/3] w-full bg-muted">
        <Image
          src={imageUrl}
          alt={`Poster for ${content.title}`}
          fill
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16.6vw"
          data-ai-hint={content.aiHint || content.title}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {content.progressPercent === undefined && (
         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <PlayCircle className="w-16 h-16 text-white/80" strokeWidth={1} />
         </div>
      )}
     
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {content.progressPercent !== undefined && content.progressPercent > 0 && (
            <div className="relative h-1 bg-black/30 rounded-full overflow-hidden mb-1">
                <div 
                    className="h-full bg-primary" 
                    role="progressbar" 
                    aria-valuenow={content.progressPercent} 
                    aria-valuemin={0} 
                    aria-valuemax={100} 
                    aria-label={`${content.progressPercent}% watched`} 
                    style={{ width: `${content.progressPercent}%` }} 
                />
            </div>
        )}
        <h3 className="font-headline font-semibold text-white text-lg drop-shadow-md truncate">{content.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-white/80 drop-shadow">
          <span>{typeLabel}</span>
          {year && <span>&bull;</span>}
          {year && <span>{year}</span>}
        </div>
      </div>
    </Link>
  );
};

export const ContentCard = React.memo(ContentCardComponent);
