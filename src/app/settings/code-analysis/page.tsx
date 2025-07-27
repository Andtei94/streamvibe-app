
import { TooltipProvider } from '@/components/ui/tooltip';
import CodeAnalysisClient from './client';

export const metadata = {
    title: 'Code Health Dashboard | Streamvibe',
    description: 'Run analysis on the project\'s codebase to get insights, statistics, and run AI-powered fixes.'
};

export default function CodeAnalysisPage() {
  return (
    <TooltipProvider>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold font-headline mb-2">Code Health Dashboard</h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Run analysis on the project's codebase to get insights, statistics, and run AI-powered fixes.
        </p>
        <CodeAnalysisClient />
      </div>
    </TooltipProvider>
  );
}
