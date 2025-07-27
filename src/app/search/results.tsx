
'use client';

import { useState, useEffect, useReducer, useTransition, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Content } from '@/lib/types';
import { ContentCard } from '@/components/content-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X, FilterX, Search as SearchIcon, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import Link from 'next/link';

interface SearchResultsProps {
  initialResults: Content[];
  genres: string[];
}

interface FilterState {
  type: string;
  genre: string;
}

type FilterAction =
  | { type: 'SET_TYPE'; payload: string }
  | { type: 'SET_GENRE'; payload: string }
  | { type: 'RESET_FILTERS' };

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_TYPE':
      return { ...state, type: action.payload };
    case 'SET_GENRE':
      return { ...state, genre: action.payload };
    case 'RESET_FILTERS':
      return { type: 'all', genre: 'all' };
    default:
      return state;
  }
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function SearchResults({ initialResults, genres }: SearchResultsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, startTransition] = useTransition();

  const initialState: FilterState = {
    type: searchParams.get('type') || 'all',
    genre: searchParams.get('genre') || 'all',
  };

  const [filters, dispatch] = useReducer(filterReducer, initialState);
  
  const shuffledGenres = useMemo(() => shuffleArray(genres), [genres]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.type !== 'all') {
        params.set('type', filters.type);
    } else {
        params.delete('type');
    }

    if (filters.genre !== 'all') {
        params.set('genre', filters.genre);
    } else {
        params.delete('genre');
    }
    
    startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
    
  }, [filters, pathname, router, searchParams]);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);
  
  const hasQueryOrFilters = searchParams.has('q') || searchParams.has('type') || searchParams.has('genre');
  const hasActiveFilters = filters.type !== 'all' || filters.genre !== 'all';
  
  const renderEmptyStateSuggestions = () => {
    if (hasQueryOrFilters || genres.length === 0) return null;
    
    return (
        <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Try browsing by a popular genre:</p>
            <div className="flex flex-wrap gap-2 justify-center">
                {shuffledGenres.slice(0, 5).map(genre => (
                    <Button key={genre} variant="outline" size="sm" asChild>
                        <Link href={`/genres/${encodeURIComponent(genre)}`}>{genre}</Link>
                    </Button>
                ))}
            </div>
        </div>
    );
};

  return (
    <div>
        <div className="mb-8 p-4 border rounded-lg bg-card flex flex-col md:flex-row gap-4 items-center">
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground hidden md:block" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Select value={filters.type} onValueChange={(value) => dispatch({ type: 'SET_TYPE', payload: value })} disabled={isLoading}>
                    <SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="movie">Movie</SelectItem>
                        <SelectItem value="tv-show">TV Show</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.genre} onValueChange={(value) => dispatch({ type: 'SET_GENRE', payload: value })} disabled={isLoading}>
                    <SelectTrigger><SelectValue placeholder="Filter by Genre" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Genres</SelectItem>
                        {genres.map(genre => (<SelectItem key={genre} value={genre}>{genre}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
            {hasActiveFilters && (<Button variant="ghost" onClick={resetFilters} disabled={isLoading}><X className="mr-2 h-4 w-4" /> Reset</Button>)}
        </div>
        
        <div className="relative">
            {isLoading && (
                <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && initialResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {initialResults.map((item, index) => (
                    <ContentCard key={item.id} content={item} priority={index < 12} />
                ))}
                </div>
            )}

            {!isLoading && initialResults.length === 0 && (
                hasQueryOrFilters ? (
                    <EmptyState
                        icon={FilterX}
                        title="No results match your search"
                        description="We couldn't find anything matching your search. Try a different keyword or broaden your filters."
                        action={hasActiveFilters ? <Button onClick={resetFilters} disabled={isLoading}><X className="mr-2 h-4 w-4" />Clear All Filters</Button> : null}
                        className="py-10"
                    />
                ) : (
                    <EmptyState
                        icon={SearchIcon}
                        title="Start your search"
                        description="Use the search bar in the header or the filters above to find what you're looking for."
                        action={renderEmptyStateSuggestions()}
                        className="py-20"
                    />
                )
            )}
        </div>
    </div>
  );
}
