import { ContentCarouselSkeleton } from "@/components/content-carousel-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchPageLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Player Skeleton */}
      <Skeleton className="aspect-video w-full rounded-lg mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <div className="flex items-center gap-4 flex-wrap">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
        
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
      </div>

       <div className="mt-16 space-y-8">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-40 w-full" />
      </div>
      
      <div className="mt-16">
        <ContentCarouselSkeleton />
      </div>
    </div>
  );
}
