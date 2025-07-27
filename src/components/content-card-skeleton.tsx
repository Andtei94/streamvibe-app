
import { Skeleton } from "@/components/ui/skeleton";

export function ContentCardSkeleton() {
  return (
    <div className="flex flex-col space-y-2">
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
