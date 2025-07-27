
'use client';

import Link from 'next/link';
import { 
    Home, Film, Tv, Library, Settings, Upload, Cloud, 
    LayoutGrid, Music, Wand2, FolderKanban, Trophy, Inbox, ListVideo, HardDrive, Sparkles, FileText, Bookmark
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
  SidebarFooter,
  sidebarMenuButtonVariants,
} from '@/components/ui/sidebar';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import React from 'react';
import { useIsActivePath } from '@/hooks/use-is-active-path';
import { useAuth } from '@/hooks/use-auth';
import { UserMenu } from './user-menu';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type NavItem = {
    name: string;
    href: string;
    icon: React.ElementType;
    description?: string;
    activeCheckPath?: string;
}

const AdminMenuSkeleton = () => (
    <>
        <SidebarSeparator />
        <SidebarMenu>
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                Admin Tools
            </p>
            {Array.from({ length: 4 }).map((_, i) => (
                <SidebarMenuItem key={`admin-skeleton-${i}`}>
                    <div className={cn(sidebarMenuButtonVariants(), 'justify-start gap-4')}>
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-24 rounded group-data-[collapsible=icon]:hidden" />
                    </div>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    </>
);

export function AppSidebar() {
  const { state } = useSidebar();
  const isActive = useIsActivePath();
  const { isAdmin, loading } = useAuth();

  const primaryNavItems: NavItem[] = [
    { name: 'Home', href: '/', icon: Home, description: 'Go to Homepage' },
    { name: 'My List', href: '/my-list', icon: ListVideo, description: 'View your saved content' },
    { name: 'Live TV', href: '/live-tv', icon: Tv, description: 'Watch Live TV Channels' },
  ];
  
  const libraryNavItems: NavItem[] = [
    { name: 'Browse', href: '/browse/movie', icon: LayoutGrid, description: 'Browse all content', activeCheckPath: '/browse' },
    { name: 'Genres', href: '/genres', icon: Bookmark, description: 'Browse by genre', activeCheckPath: '/genres' },
    { name: 'Collections', href: '/collections', icon: Library, description: 'Browse by collection', activeCheckPath: '/collections' },
  ];

  const adminNavItems: NavItem[] = [
    { name: 'Content', href: '/admin', icon: FileText, description: 'Manage your library' },
    { name: 'Storage', href: '/storage', icon: HardDrive, description: 'Manage cloud storage' },
    { name: 'AI Studio', href: '/ai-studio', icon: Sparkles, description: 'Generate AI content' },
    { name: 'Settings', href: '/settings', icon: Settings, description: 'Configure application' },
  ];
  
  const renderMenuItems = (items: NavItem[]) => {
    return items.map((item) => (
      <SidebarMenuItem key={item.name}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(sidebarMenuButtonVariants({ size: 'default' }), 'justify-start')}
              data-active={isActive(item.activeCheckPath || item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span className="ml-4 transition-opacity duration-300 text-sm group-data-[state=expanded]:opacity-100 group-data-[state=collapsed]:opacity-0">{item.name}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {item.description || item.name}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    ));
  }

  const AdminMenus = () => {
    if (loading) return <AdminMenuSkeleton />;
    if (!isAdmin) return null;
    
    return (
        <>
            <SidebarSeparator />
            <SidebarMenu>
                <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                    Admin Tools
                </p>
                {renderMenuItems(adminNavItems)}
            </SidebarMenu>
        </>
    );
  };
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-20 border-b border-white/10">
        <Link href="/" aria-label="Go to homepage">
          <Logo className={cn("transition-all", state === 'expanded' ? "w-28" : "w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2")} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider group-data-[collapsible=icon]:hidden">Menu</p>
          {renderMenuItems(primaryNavItems)}
        </SidebarMenu>

        <SidebarSeparator />
        
        <SidebarMenu>
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                Library
            </p>
            {renderMenuItems(libraryNavItems)}
        </SidebarMenu>
        
        <AdminMenus />

      </SidebarContent>
      <SidebarFooter className="border-t border-white/10">
        <div className="hidden group-data-[collapsible=icon]:block">
             <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
