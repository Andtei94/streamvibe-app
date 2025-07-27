import Link from 'next/link';
import { Logo } from './logo';

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center text-center gap-6">
        <Link href="/" className="mb-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <p className="text-muted-foreground text-sm max-w-md">
          Discover a universe of movies and TV shows. Binge-watch your favorites anytime, anywhere. This platform is a demonstration of AI-powered development capabilities.
        </p>
        <p className="text-sm text-muted-foreground pt-6 border-t w-full">
          &copy; {new Date().getFullYear()} Streamvibe. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
