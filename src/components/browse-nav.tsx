
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { BrowseNavData } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

const generalItems = [
  { label: 'Movies', href: '/browse/movie' },
  { label: 'TV Shows', href: '/browse/tv-show' },
  { label: 'Music', href: '/browse/music' },
  { label: 'Sports', href: '/browse/sports' },
];

interface BrowseNavProps {
    navData: BrowseNavData;
}

const BrowseNavComponent = ({ navData }: BrowseNavProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isActive = (href: string) => pathname.startsWith(href);
  
  const movieGenreItems = navData.movieGenres.map(genre => ({
    label: genre,
    href: `/genres/${encodeURIComponent(genre)}?type=movie&title=${encodeURIComponent(genre)}`
  }));

  const tvShowGenreItems = navData.tvShowGenres.map(genre => ({
    label: genre,
    href: `/genres/${encodeURIComponent(genre)}?type=tv-show&title=${encodeURIComponent(genre)}`
  }));
  
  const specialGenreItems = navData.specialGenres.map(genre => ({
      label: genre.replace('Dublat in Romana', 'Dubbed'),
      href: `/genres/${encodeURIComponent(genre)}`
  }));

  const studioItems = navData.studios.map(name => ({
    label: name,
    href: `/collection/${encodeURIComponent(name)}`
  }));

  const renderNavButtons = (items: {label: string, href: string}[]) => {
      if (items.length === 0) {
          return <p className="text-sm text-muted-foreground text-center p-4">No items available in this category yet.</p>
      }
      return (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-card p-2">
              {items.map((item, index) => (
                  <Button
                      key={`${item.href}-${index}`}
                      asChild
                      variant={isActive(item.href) ? 'secondary' : 'ghost'}
                      size="sm"
                  >
                      <Link href={item.href}>{item.label}</Link>
                  </Button>
              ))}
          </div>
      );
  }

  if (isMobile) {
      const allNavItems = [
        { label: "--- General ---", value: "header-general", disabled: true }, ...generalItems.map(i => ({...i, value: i.href})),
        { label: "--- Movie Genres ---", value: "header-movies", disabled: true }, ...movieGenreItems.map(i => ({...i, value: i.href})),
        { label: "--- TV Show Genres ---", value: "header-tv", disabled: true }, ...tvShowGenreItems.map(i => ({...i, value: i.href})),
        { label: "--- Special ---", value: "header-special", disabled: true }, ...specialGenreItems.map(i => ({...i, value: i.href})),
        { label: "--- Studios ---", value: "header-studios", disabled: true }, ...studioItems.map(i => ({...i, value: i.href})),
      ];
      
      return (
        <div className="mb-8">
            <Select onValueChange={(value) => router.push(value)} defaultValue={pathname}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Navigate to..." />
                </SelectTrigger>
                <SelectContent>
                    {allNavItems.map(item => (
                        <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      );
  }

  return (
    <div className="mb-8">
      <Tabs defaultValue="general" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="movie-genres">Movie Genres</TabsTrigger>
                <TabsTrigger value="tv-show-genres">TV Show Genres</TabsTrigger>
                <TabsTrigger value="special">Special</TabsTrigger>
                <TabsTrigger value="studios">Studios & Collections</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <TabsContent value="general" className="mt-4">
          {renderNavButtons(generalItems)}
        </TabsContent>
        <TabsContent value="movie-genres" className="mt-4">
          {renderNavButtons(movieGenreItems)}
        </TabsContent>
        <TabsContent value="tv-show-genres" className="mt-4">
          {renderNavButtons(tvShowGenreItems)}
        </TabsContent>
        <TabsContent value="special" className="mt-4">
          {renderNavButtons(specialGenreItems)}
        </TabsContent>
        <TabsContent value="studios" className="mt-4">
          {renderNavButtons(studioItems)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const BrowseNav = React.memo(BrowseNavComponent);
