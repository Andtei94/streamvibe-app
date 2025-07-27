
'use client';

import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { AppContainer } from '@/components/app-container';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => logger.info('Service Worker registered with scope:', registration.scope))
        .catch((error) => logger.error('Service Worker registration failed:', error));
    }
  }, []);

  return (
    <html lang="en" className={cn(inter.variable, spaceGrotesk.variable)} suppressHydrationWarning>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#111827" />
      </head>
      <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <AppContainer>{children}</AppContainer>
            </AuthProvider>
            <Toaster richColors closeButton />
          </ThemeProvider>
      </body>
    </html>
  );
}
