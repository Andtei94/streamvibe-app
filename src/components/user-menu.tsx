
'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, User, ShieldCheck, LogIn, Loader2, MoreVertical, Settings } from 'lucide-react';
import { useSidebar } from './ui/sidebar';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';

interface UserMenuProps {
    isMobile?: boolean;
}

export function UserMenu({ isMobile = false }: UserMenuProps) {
  const { user, isAdmin, loading, logout, attemptLoginAsAdmin, isAdminSdkConfigured } = useAuth();
  const { state } = useSidebar();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const handleLoginAsAdmin = async () => {
    setIsLoggingIn(true);
    
    const result = await attemptLoginAsAdmin();

    if (result.success) {
        toast.success('Admin Access Granted!', {
            description: 'You now have full administrative privileges.',
        });
    } else {
        const isConfigError = result.message.toLowerCase().includes('sdk');
        toast.error(isConfigError ? 'Configuration Incomplete' : 'Admin Login Failed', {
            description: result.message,
            duration: 10000,
        });
    }
    setIsLoggingIn(false);
  };


  if (loading || !user) {
    return (
        <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1.5" style={{ opacity: state === 'expanded' ? 1 : 0 }}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    )
  }
  
  const AdminLoginMenuItem = () => {
    // Show button only for authenticated, non-admin users if the SDK is configured
    if (isAdmin || user.isAnonymous || !isAdminSdkConfigured) return null;

    return (
        <DropdownMenuItem onClick={handleLoginAsAdmin} disabled={isLoggingIn}>
            {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            <span>Become Admin</span>
        </DropdownMenuItem>
    );
  };
  
  const handleLoginRedirect = () => {
    router.push('/login');
  }

  const menuContent = (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">{user.name}</p>
          <p className="text-xs leading-none text-muted-foreground">
            {isAdmin ? "Administrator" : user.isAnonymous ? "Guest" : "User"}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings &amp; Tools</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
       <DropdownMenuSeparator />
       {user.isAnonymous ? (
           <DropdownMenuItem onClick={handleLoginRedirect}>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Sign In / Sign Up</span>
           </DropdownMenuItem>
       ) : (
         <>
          <AdminLoginMenuItem />
          <DropdownMenuItem onClick={logout} disabled={loading}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
         </>
       )}
    </>
  );

  if (isMobile) {
    return menuContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("w-full justify-start h-auto p-2", state === 'collapsed' && 'size-10')}
          disabled={loading}
          aria-label="User menu"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {isAdmin ? <ShieldCheck className="w-5 h-5" /> : (user?.name ? user.name.charAt(0) : <User className="w-5 h-5" />) }
              </AvatarFallback>
            </Avatar>
            <div
              className={cn("flex flex-col items-start transition-opacity duration-200 ease-in-out", state === 'expanded' ? 'opacity-100' : 'opacity-0')}
            >
              <span className="font-semibold text-sm truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{isAdmin ? "Administrator" : user.isAnonymous ? "Guest" : "User"}</span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {menuContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
