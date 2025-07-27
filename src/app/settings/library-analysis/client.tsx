
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Sparkles, PieChart, Film, Tv, Music, Trophy, AlertTriangle, BarChartIcon } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeLibrary } from '@/ai/actions';
import type { AnalyzeLibraryOutput } from '@/ai/schemas';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LibraryAnalysisClient() {
  const [report, setReport] = useState<AnalyzeLibraryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setReport(null);
    try {
      const result = await analyzeLibrary();
      setReport(result);

      if (result.totalItems > 0) {
        toast.success('Analysis Complete!', {
            description: 'The library report has been successfully generated.',
        });
      } else {
        toast.info('Analysis Complete', {
            description: 'Your library is empty. Add some content to get a full report.',
        });
      }
      
    } catch (error) {
      console.error("Failed to run library analysis:", error);
      toast.error('Analysis Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const genreChartConfig = {
    count: { label: 'Titles', color: 'hsl(var(--primary))' },
  };
  
  const decadeChartConfig = {
    count: { label: 'Titles', color: 'hsl(var(--accent))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Library Report</CardTitle>
        <CardDescription>Click the button to generate a detailed report of your content library using AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleRunAnalysis} disabled={isLoading} size="lg">
          <Sparkles className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analyzing Library...' : 'Generate AI Report'}
        </Button>

        {isLoading && <AnalysisSkeleton />}

        {report && (
          <div className="space-y-8">
            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BrainCircuit className="w-5 h-5" />
                  AI Analyst Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{report.aiSummary}</p>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.totalItems}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Movies</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.totalMovies}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">TV Shows</CardTitle>
                        <Tv className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.totalTvShows}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Music</CardTitle>
                         <Music className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.totalMusic}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sports</CardTitle>
                         <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.totalSports}</div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Genre Chart */}
            {report.topGenres.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                     <BarChartIcon className="w-5 h-5" />
                     Genre Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <ChartContainer config={genreChartConfig} className="h-[250px] w-full">
                     <ResponsiveContainer>
                       <BarChart data={report.topGenres} layout="vertical" margin={{ left: 20 }}>
                         <XAxis type="number" hide />
                         <YAxis dataKey="genre" type="category" tickLine={false} axisLine={false} width={100} tick={{ fill: 'hsl(var(--foreground))' }} />
                         <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                         <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                       </BarChart>
                     </ResponsiveContainer>
                   </ChartContainer>
                </CardContent>
              </Card>
            )}

             {/* Decade Chart */}
            {report.itemsPerDecade.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                     <BarChartIcon className="w-5 h-5" />
                     Content by Decade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <ChartContainer config={decadeChartConfig} className="h-[250px] w-full">
                     <ResponsiveContainer>
                       <BarChart data={report.itemsPerDecade.sort((a,b) => a.decade.localeCompare(b.decade))}>
                         <XAxis dataKey="decade" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--foreground))' }}/>
                         <YAxis hide/>
                         <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                         <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                       </BarChart>
                     </ResponsiveContainer>
                   </ChartContainer>
                </CardContent>
              </Card>
            )}
            
          </div>
        )}
      </CardContent>
    </Card>
  );
}


const AnalysisSkeleton = () => (
    <div className="space-y-8 pt-4">
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Card>
            <CardHeader>
                 <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    </div>
);
