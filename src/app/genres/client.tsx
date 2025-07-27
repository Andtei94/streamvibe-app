'use client';

import Link from 'next/link';
import { ContentCarousel } from '@/components/content-carousel';
import type { GenreShowcase } from './page';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface GenresClientProps {
  genres: GenreShowcase[];
}

export default function GenresClient({ genres }: GenresClientProps) {
  return (
    <div className="space-y-12">
      {genres.map(({ genre, items }, index) => (
        <div key={genre}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-headline font-bold">
                    {genre}
                </h2>
                <Button variant="ghost" asChild>
                    <Link href={`/genres/${encodeURIComponent(genre)}`}>
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
            <ContentCarousel items={items} priority={index < 2} />
        </div>
      ))}
    </div>
  );
}
