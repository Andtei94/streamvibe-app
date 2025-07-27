
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, Loader2, AlertTriangle, FileWarning, CheckCircle, Bug, ShieldCheck, TrendingUp, Brush } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { runStaticAnalysis } from '@/ai/actions';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { StaticAnalysisReport, AnalysisResult, AnalysisCategory } from '@/ai/schemas';
import { logger } from '@/lib/logger';


const categoryConfig: Record<AnalysisCategory, { icon: React.ElementType, title: string, description: string }> = {
    codeIntegrity: { icon: Bug, title: 'Code Integrity', description: 'Issues related to code correctness, standards, and maintainability.' },
    errorAnalysis: { icon: FileWarning, title: 'Error Analysis', description: 'Potential runtime errors or unhandled edge cases.' },
    performance: { icon: TrendingUp, title: 'Performance', description: 'Opportunities to improve app speed and resource usage.' },
    security: { icon: ShieldCheck, title: 'Security', description: 'Potential vulnerabilities and security best practices.' },
    uiUx: { icon: Brush, title: 'UI/UX', description: 'Suggestions for improving the user interface and experience.' },
    other: { icon: CheckCircle, title: 'General', description: 'General suggestions and observations.' },
};

export default function DiagnosticsClient() {
  const [report, setReport] = useState<StaticAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunScan = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await runStaticAnalysis();
      setReport(result);
      const totalIssues = Object.values(result).reduce((acc, issues) => acc + (issues?.length || 0), 0);
      toast.success('Scan Complete!', {
        description: `Found ${totalIssues} potential items for review.`,
      });
    } catch (e: any) {
      logger.error({ error: e, stack: e.stack }, "Static analysis failed.");
      let message = 'An unknown error occurred during the scan.';
      if (e.message) {
          message = e.message;
      }
      setError(message);
      toast.error('Scan Failed', {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalIssueCount = report ? Object.values(report).reduce((acc, issues) => acc + (issues?.length || 0), 0) : 0;

  return (
    <>
        <Button onClick={handleRunScan} disabled={isLoading}>
            {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning Project...</>
            ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Run Static Scan</>
            )}
        </Button>

        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Scan Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      
      {report && (
        <div className="mt-6">
            <CardHeader className="p-0 mb-4">
                <CardTitle>Scan Report</CardTitle>
                <CardDescription>Found {totalIssueCount} potential items for review with actionable suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {totalIssueCount > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4">
                    {Object.entries(report).map(([categoryKey, issues]) => {
                        const category = categoryKey as AnalysisCategory;
                        if (!issues || issues.length === 0) return null;
                        
                        const config = categoryConfig[category] || categoryConfig.other;

                        return (
                        <Card key={category} className="overflow-hidden">
                            <AccordionItem value={category} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <config.icon className="h-5 w-5" />
                                        <h3 className="font-semibold">{config.title}</h3>
                                        <Badge variant="secondary">{issues.length}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4">
                                <div className="space-y-4">
                                    {issues.map(issue => (
                                    <div key={issue.id} className="p-3 rounded-md border bg-background">
                                        <p className="font-mono text-sm text-muted-foreground break-all">{issue.filePath}</p>
                                        <p className="font-medium mt-1">{issue.description}</p>
                                        {issue.suggestion && <p className="text-sm text-muted-foreground mt-1"><strong>Suggestion:</strong> {issue.suggestion}</p>}
                                    </div>
                                    ))}
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                        )
                    })}
                    </Accordion>
                ) : (
                    <Alert className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>No Issues Found!</AlertTitle>
                        <AlertDescription>The static analysis scan completed without finding any issues to report.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </div>
      )}
    </>
  );
}
