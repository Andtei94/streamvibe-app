
import { TooltipProvider } from '@/components/ui/tooltip';
import StorageClient from './client';

export default function StoragePage() {
  return (
    <TooltipProvider>
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold font-headline mb-2">Cloud Storage</h1>
            <p className="text-muted-foreground mb-8">View and manage raw media files in your Firebase Storage bucket before they are added to the library.</p>
            <StorageClient />
        </div>
    </TooltipProvider>
  );
}
