
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCardSkeleton } from "./content-card-skeleton";

export function ContentCarouselSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-1/4 mb-4" />
      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 shrink-0">
            <ContentCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
