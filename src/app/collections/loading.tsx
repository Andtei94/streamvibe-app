
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
        <Skeleton className="h-9 w-3/4 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        
        <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={`letter-skeleton-${i}`}>
                    <Skeleton className="h-8 w-12 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
