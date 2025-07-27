
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminClient from './client';

export default function AdminPage() {
  return (
    <TooltipProvider>
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold font-headline mb-6">Content Management</h1>
            <AdminClient />
        </div>
    </TooltipProvider>
  );
}
