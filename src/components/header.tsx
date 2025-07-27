
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, Film, Tv, Music, Trophy, Loader2, Home, ListVideo, LayoutGrid, Bookmark, Library, FileText, UploadCloud, Database, HardDrive, Wand2, Settings, MoreVertical, Menu, Sparkles, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { getSearchSuggestions } from '@/app/search/actions';
import type { Content } from '@/lib/types';
import { cn, formatContentType } from '@/lib/utils';
import Image from 'next/image';
import { DEFAULT_POSTER_URL } from '@/lib/constants';
import { UserMenu } from '@/components/user-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';

type Suggestion = Pick<Content, 'id' | 'title' | 'type' | 'imageUrl'>;

const pageConfig: Record<string, { icon: React.ElementType; title: string; subtitle: string; color: string; bgColor: string; }> = {
    'home': { icon: Home, title: 'Home', subtitle: 'Your Personalized Dashboard', color: 'text-indigo-400', bgColor: 'bg-indigo-600/20' },
    'my-list': { icon: ListVideo, title: 'My List', subtitle: 'Your Curated Collection', color: 'text-green-400', bgColor: 'bg-green-600/20' },
    'live-tv': { icon: Tv, title: 'Live TV', subtitle: 'Interactive Program Guide', color: 'text-red-400', bgColor: 'bg-red-600/20' },
    'browse': { icon: LayoutGrid, title: 'Browse Library', subtitle: 'Explore All Available Content', color: 'text-teal-400', bgColor: 'bg-teal-600/20' },
    'genres': { icon: Bookmark, title: 'Genres', subtitle: 'Discover Content by Genre', color: 'text-rose-400', bgColor: 'bg-rose-600/20' },
    'collections': { icon: Library, title: 'Collections', subtitle: 'Explore Curated Collections & Sagas', color: 'text-amber-400', bgColor: 'bg-amber-600/20' },
    'admin': { icon: FileText, title: 'Content Management', subtitle: 'Manage Your Entire Media Library', color: 'text-sky-400', bgColor: 'bg-sky-600/20' },
    'import': { icon: Inbox, title: 'Batch Import', subtitle: 'Add Multiple Items from a List', color: 'text-cyan-400', bgColor: 'bg-cyan-600/20' },
    'upload': { icon: UploadCloud, title: 'Upload Content', subtitle: 'Add New Media to Your Library', color: 'text-blue-400', bgColor: 'bg-blue-600/20' },
    'storage': { icon: HardDrive, title: 'Cloud Storage', subtitle: 'Manage Raw Uploaded Files', color: 'text-lime-400', bgColor: 'bg-lime-600/20' },
    'ai-studio': { icon: Sparkles, title: 'AI Studio', subtitle: 'Generate New Content with AI', color: 'text-purple-400', bgColor: 'bg-purple-600/20' },
    'settings': { icon: Settings, title: 'Settings & Tools', subtitle: 'Configure the Platform & Analyze Code', color: 'text-yellow-400', bgColor: 'bg-yellow-600/20' },
    'search': { icon: Search, title: 'Search', subtitle: 'Find Anything in Your Library', color: 'text-pink-400', bgColor: 'bg-pink-600/20' },
    'default': { icon: Film, title: 'Streamvibe', subtitle: 'Your Personal Streaming Service', color: 'text-gray-400', bgColor: 'bg-gray-600/20' }
};

const getConfigForPath = (path: string) => {
    const segments = path.split('/');
    if (segments.length > 2 && segments[1] === 'admin' && segments[2] === 'import') {
        return pageConfig.import;
    }
    const primarySegment = segments[1] || 'home';
    
    const configMap: Record<string, keyof typeof pageConfig> = {
        'home': 'home',
        'my-list': 'my-list',
        'live-tv': 'live-tv',
        'browse': 'browse',
        'genres': 'genres',
        'collections': 'collections',
        'admin': 'admin',
        'upload': 'upload',
        'storage': 'storage',
        'ai-studio': 'ai-studio',
        'settings': 'settings',
        'search': 'search'
    };

    return pageConfig[configMap[primarySegment] || 'default'];
};


export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const popoverContentRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const currentConfig = getConfigForPath(pathname);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.trim().length > 1) {
        setIsLoading(true);
        setActiveIndex(-1);
        try {
            const results = await getSearchSuggestions(debouncedSearchQuery);
            setSuggestions(results);
            setIsPopoverOpen(results.length > 0);
        } catch (error) {
            console.error("Failed to fetch search suggestions:", error);
            setSuggestions([]);
            setIsPopoverOpen(false);
        } finally {
            setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setIsPopoverOpen(false);
      }
    };
    fetchSuggestions();
  }, [debouncedSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
        router.push(`/watch/${suggestions[activeIndex].id}`);
        setIsPopoverOpen(false);
        return;
    }
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      inputRef.current?.blur();
      setIsPopoverOpen(false);
    }
  };
  
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== searchQuery) {
        setSearchQuery(urlQuery);
    }
  }, [searchParams, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && popoverContentRef.current) {
        const activeElement = popoverContentRef.current.children[activeIndex] as HTMLElement;
        activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const HeaderInfo = () => (
    <div className="flex items-center space-x-3">
         <div className={cn('p-2 rounded-lg', currentConfig.bgColor, isMobile && 'hidden')}>
            <span className={currentConfig.color}><currentConfig.icon size={28} /></span>
        </div>
        <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wider">{currentConfig.title}</h1>
            <p className={cn('text-xs md:text-sm font-medium', currentConfig.color)}>{currentConfig.subtitle}</p>
        </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/10 bg-background/80 px-4 backdrop-blur-sm sm:h-20 sm:px-6">
      <div className="flex-1 flex items-center gap-4">
        {isMobile && <SidebarTrigger><Menu/></SidebarTrigger>}
        <HeaderInfo />
      </div>
      
      <div className="flex flex-none items-center justify-end gap-2 sm:gap-4">
        <form onSubmit={handleSearchSubmit}>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="search"
                  placeholder="Search..."
                  className="pl-8 sm:w-[200px] lg:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Search for content"
                  aria-autocomplete="list"
                  aria-expanded={isPopoverOpen}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="end">
              {isLoading && (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              )}
              {!isLoading && suggestions.length > 0 && (
                <ul className="space-y-1 p-2" ref={popoverContentRef}>
                  {suggestions.map((suggestion, index) => {
                    return (
                      <li key={suggestion.id}>
                        <Link
                          href={`/watch/${suggestion.id}`}
                          onClick={() => setIsPopoverOpen(false)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-sm",
                            index === activeIndex && "bg-accent"
                          )}
                        >
                          <div className="relative w-10 aspect-[2/3] shrink-0 rounded-sm overflow-hidden bg-muted">
                            <Image
                              src={suggestion.imageUrl || DEFAULT_POSTER_URL}
                              alt={`Poster for ${suggestion.title}`}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground">{formatContentType(suggestion.type)}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!isLoading && suggestions.length === 0 && debouncedSearchQuery.trim().length > 1 && (
                <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
              )}
            </PopoverContent>
          </Popover>
        </form>
        
        <div className={cn(isMobile && "hidden")}>
          <UserMenu />
        </div>
        
         {isMobile && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical/></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <UserMenu isMobile={true} />
                </DropdownMenuContent>
            </DropdownMenu>
         )}
      </div>
    </header>
  );
}
