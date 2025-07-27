
'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { logger } from '@/lib/logger';
import { firebaseConfigError } from '@/lib/firebase';
import { usePathname } from 'next/navigation';

const ConfigurationErrorDisplay = ({ error, title }: { error: string, title: string }) => (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
        <Alert variant="destructive" className="max-w-3xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
              {error}
            </pre>
          </AlertDescription>
        </Alert>
    </div>
);


export function AppContainer({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const pathname = usePathname();
  
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => logger.info('Service Worker registered with scope:', registration.scope))
          .catch((error) => logger.error({error},'Service Worker registration failed:'));
      });
    }
  }, []);
  
  if (firebaseConfigError) {
    return <ConfigurationErrorDisplay error={firebaseConfigError} title="Firebase Client Configuration Error" />;
  }

  if (authError) {
      return <ConfigurationErrorDisplay error={authError} title="Application Authentication Error" />;
  }
  
  // Show the login page without the main layout
  if (pathname === '/login') {
      return <>{children}</>;
  }

  // Show a full-screen loader while the initial user state is being determined
  if (authLoading || !user) {
    return (
       <div className="flex min-h-screen items-center justify-center p-8 bg-background">
         <div className="text-center text-foreground">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Initializing Streamvibe...</p>
         </div>
       </div>
    )
  }

  return (
    <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col md:ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
        <Footer />
        </div>
    </SidebarProvider>
  );
}
