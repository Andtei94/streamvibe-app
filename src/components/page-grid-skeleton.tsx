
import { ContentCardSkeleton } from "@/components/content-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface PageGridSkeletonProps {
    showTitle?: boolean;
    showSubtitle?: boolean;
    itemCount?: number;
}

export function PageGridSkeleton({ 
    showTitle = true, 
    showSubtitle = false, 
    itemCount = 18 
}: PageGridSkeletonProps) {
  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      {showTitle && <Skeleton className="h-9 w-1/2 md:w-1/4 mb-2" />}
      {showSubtitle && <Skeleton className="h-5 w-3/4 md:w-1/2 mb-8" />}
      {!showSubtitle && showTitle && <div className="mb-8" />}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <ContentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
