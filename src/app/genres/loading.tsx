import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
        <Skeleton className="h-9 w-64 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, index) => (
                <Skeleton key={index} className="aspect-video rounded-lg" />
            ))}
        </div>
    </div>
  );
}
