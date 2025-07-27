'use client';

import type { Content } from '@/lib/types';
import { ContentCard } from './content-card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

type ContentCarouselProps = {
  title?: string;
  items: Content[];
  priority?: boolean;
};

export function ContentCarousel({ title, items, priority = false }: ContentCarouselProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {title && <h2 className="text-2xl font-headline font-bold mb-4">{title}</h2>}
      <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {items.map((item, index) => (
            <CarouselItem key={item.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-4">
              <ContentCard content={item} priority={priority && index < 5} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="ml-14" />
        <CarouselNext className="mr-14" />
      </Carousel>
    </div>
  );
}
