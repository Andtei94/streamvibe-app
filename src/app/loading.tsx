
import { ContentCarouselSkeleton } from "@/components/content-carousel-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero Section Skeleton */}
      <div className="relative h-[50vh] md:h-[80vh] w-full">
        <Skeleton className="absolute inset-0" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 md:pb-24">
          <div className="max-w-xl space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-14" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Carousels Skeleton */}
      <div className="py-8 sm:py-12 lg:py-16 space-y-12">
        <ContentCarouselSkeleton />
        <ContentCarouselSkeleton />
        <ContentCarouselSkeleton />
      </div>
    </div>
  );
}
