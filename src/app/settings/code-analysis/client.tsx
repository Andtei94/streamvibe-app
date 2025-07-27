
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, Loader2, AlertTriangle, FileUp, BrainCircuit, Code, FileCode2, Wrench, CheckCircle, Bug, ShieldCheck, TrendingUp, Brush, SlidersHorizontal, BarChart2, FileWarning, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { runStaticAnalysis, countLinesOfCode, fixAllIssues, fixSelectedIssues, getProjectFiles } from '@/ai/actions';
import type { StaticAnalysisReport, AnalysisResult, AnalysisCategory, CountLinesOfCodeOutput, FixAllIssuesInFileOutput } from '@/ai/schemas';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileAnalysisDialog } from './file-analysis-dialog';
import { cn } from '@/lib/utils';

const categoryConfig: Record<AnalysisCategory, { icon: React.ElementType, title: string, description: string }> = {
    codeIntegrity: { icon: Bug, title: 'Code Integrity', description: 'Issues related to code correctness, standards, and maintainability.' },
    errorAnalysis: { icon: FileWarning, title: 'Error Analysis', description: 'Potential runtime errors or unhandled edge cases.' },
    performance: { icon: TrendingUp, title: 'Performance', description: 'Opportunities to improve app speed and resource usage.' },
    security: { icon: ShieldCheck, title: 'Security', description: 'Potential vulnerabilities and security best practices.' },
    uiUx: { icon: Brush, title: 'UI/UX', description: 'Suggestions for improving the user interface and experience.' },
    other: { icon: CheckCircle, title: 'General', description: 'General suggestions and observations.' },
};

export default function CodeAnalysisClient() {
  const [staticReport, setStaticReport] = useState<StaticAnalysisReport | null>(null);
  const [isStaticScanning, setIsStaticScanning] = useState(false);
  const [staticError, setStaticError] = useState<string | null>(null);
  const [stats, setStats] = useState<CountLinesOfCodeOutput | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  
  const [isTransitioning, startTransition] = useTransition();

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStats(true);
      try {
        const statsResult = await countLinesOfCode();
        setStats(statsResult);
      } catch (e: any) {
        logger.error({ error: e }, "Failed to fetch project stats.");
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleRunStaticScan = async () => {
    setIsStaticScanning(true);
    setStaticError(null);
    setStaticReport(null);
    setSelectedIssues(new Set());
    try {
      const result = await runStaticAnalysis();
      setStaticReport(result);
      const totalIssues = Object.values(result || {}).reduce((acc, issues) => acc + (issues?.length || 0), 0);
      toast.success('Scan Complete!', {
        description: `Found ${totalIssues} potential items for review.`,
      });
    } catch (e: any) {
      logger.error({ error: e }, "Static analysis failed.");
      let message = e.message || 'An unexpected error occurred during the scan.';
      if (message.includes('overloaded')) {
          message = 'The AI model is temporarily overloaded. Please try again in a few moments.'
      }
      setStaticError(message);
      toast.error('Scan Failed', {
        description: message,
      });
    } finally {
      setIsStaticScanning(false);
    }
  };
  
    const handleIssueSelection = (issueId: string, isSelected: boolean) => {
        setSelectedIssues(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(issueId);
            } else {
                newSet.delete(issueId);
            }
            return newSet;
        });
    };
    
    const handleSelectAllInCategory = (category: AnalysisCategory, select: boolean) => {
        if (!staticReport) return;
        const issuesInCategory = staticReport[category] || [];
        
        setSelectedIssues(prev => {
            const newSet = new Set(prev);
            if (select) {
                issuesInCategory.forEach(issue => newSet.add(issue.id));
            } else {
                issuesInCategory.forEach(issue => newSet.delete(issue.id));
            }
            return newSet;
        });
    };
    
   const handleFixSelected = async () => {
    if (selectedIssues.size === 0 || !staticReport) {
      toast.info("No issues selected", { description: "Please select one or more issues to fix." });
      return;
    }

    setIsFixing(true);
    toast.info(`Fixing ${selectedIssues.size} selected issue(s)...`, { description: "The AI is working. This may take a moment." });

    const allIssuesFromReport: AnalysisResult[] = Object.values(staticReport).flat().filter(Boolean) as AnalysisResult[];
    const issuesToFix = allIssuesFromReport.filter(issue => selectedIssues.has(issue.id));

    try {
        const result = await fixSelectedIssues({
            issues: issuesToFix,
            allowedDirs: ['src/app', 'src/components', 'src/lib', 'src/hooks', 'src/ai'],
        });

        toast.success("Fix Operation Complete", {
            description: result.summary,
        });

        if (result.success) {
            setSelectedIssues(new Set());
            await handleRunStaticScan();
        }

    } catch (error: any) {
        logger.error({ error }, `Critical error during fixSelectedIssues flow`);
        toast.error("Fix Operation Failed", {
            description: `A critical error occurred: ${error.message}`
        });
    } finally {
        setIsFixing(false);
    }
};

  const getSeverityBadge = (severity: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch (severity) {
        case 'Critical': return <Badge variant="destructive">Critical</Badge>;
        case 'High': return <Badge variant="destructive">High</Badge>;
        case 'Medium': return <Badge variant="secondary">Medium</Badge>;
        case 'Low': return <Badge variant="outline">Low</Badge>;
        default: return <Badge variant="secondary">{severity}</Badge>;
    }
  }

  const totalIssueCount = staticReport ? Object.values(staticReport).reduce((acc, cat) => acc + (cat?.length || 0), 0) : 0;
  
  const allCategoryIssues = useMemo(() => {
    if (!staticReport) return new Map();
    return new Map(Object.entries(staticReport).map(([key, value]) => [key, (value || []).map(i => i.id)]));
  }, [staticReport]);


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card onClick={() => { if (stats && stats.fileCount > 0) setIsFileDialogOpen(true) }} className={cn(stats && stats.fileCount > 0 && "cursor-pointer hover:bg-muted/50 transition-colors")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats?.fileCount ?? 'N/A'}</div>}
            <p className="text-xs text-muted-foreground">in the project source.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lines of Code</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats?.totalLines.toLocaleString() ?? 'N/A'}</div>}
            <p className="text-xs text-muted-foreground">total lines detected.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Analysis</CardTitle>
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <Button onClick={handleRunStaticScan} disabled={isStaticScanning} className="w-full">
                {isStaticScanning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</>
                ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Run Full Static Scan</>
                )}
            </Button>
          </CardContent>
        </Card>
      </div>

       {staticError && (
            <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Global Scan Error</AlertTitle>
                <AlertDescription>{staticError}</AlertDescription>
            </Alert>
        )}
      
      {isStaticScanning && !staticReport && (
         <Card className="mb-6">
            <CardHeader>
                <CardTitle>Full Project Static Scan Report</CardTitle>
                <CardDescription>The AI is scanning all project files. This may take a moment...</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
         </Card>
      )}

      {staticReport && (
        <>
        <Card className="mb-6">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Full Project Static Scan Report</CardTitle>
                        <CardDescription>Found {totalIssueCount} potential items for review with actionable suggestions across the entire project.</CardDescription>
                    </div>
                    {totalIssueCount > 0 && (
                        <Button onClick={handleFixSelected} disabled={isFixing || selectedIssues.size === 0}>
                            {isFixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                            Fix Selected ({selectedIssues.size})
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {totalIssueCount > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(categoryConfig)}>
                    {Object.entries(staticReport).map(([categoryKey, issues]) => {
                        const category = categoryKey as AnalysisCategory;
                        if (!issues || issues.length === 0) return null;
                        
                        const config = categoryConfig[category] || categoryConfig.other;
                        const allInCategory = allCategoryIssues.get(category) || [];
                        const selectedInCategory = allInCategory.filter(id => selectedIssues.has(id));
                        const areAllSelected = allInCategory.length > 0 && selectedInCategory.length === allInCategory.length;

                        return (
                        <Card key={category} className="overflow-hidden">
                            <AccordionItem value={category} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <config.icon className="h-5 w-5" />
                                        <h3 className="font-semibold">{config.title}</h3>
                                        <Badge variant="secondary">{issues.length}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                                        <Checkbox 
                                           id={`select-all-${category}`}
                                           checked={areAllSelected} 
                                           onCheckedChange={(checked) => handleSelectAllInCategory(category, !!checked)} 
                                           onClick={(e) => e.stopPropagation()}
                                        />
                                        <label htmlFor={`select-all-${category}`}>Select All</label>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4">
                                <div className="space-y-4">
                                    {issues.map(issue => (
                                    <div key={issue.id} className="p-3 rounded-md border bg-background flex gap-4 items-start">
                                        <Checkbox 
                                          className="mt-1"
                                          checked={selectedIssues.has(issue.id)}
                                          onCheckedChange={(checked) => handleIssueSelection(issue.id, !!checked)}
                                        />
                                        <div className="flex-1">
                                          <p className="font-mono text-sm text-muted-foreground break-all">{issue.filePath}</p>
                                          <p className="font-medium mt-1">{issue.description}</p>
                                          {issue.suggestion && <p className="text-sm text-muted-foreground mt-1"><strong>Suggestion:</strong> {issue.suggestion}</p>}
                                        </div>
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
        </Card>
        </>
      )}

      <FileAnalysisDialog isOpen={isFileDialogOpen} onOpenChange={setIsFileDialogOpen} />
    </>
  );
}
