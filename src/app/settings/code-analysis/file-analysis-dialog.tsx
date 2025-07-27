
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { getProjectFiles, analyzeFile } from '@/ai/actions';
import type { ProjectFile, AnalyzeFileOutput, Issue } from '@/ai/schemas';
import { toast } from 'sonner';
import { Loader2, Search, BrainCircuit, FileCode, AlertCircle, CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface FileAnalysisDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';
type AnalysisResult = {
    status: AnalysisStatus;
    data: AnalyzeFileOutput | null;
    error: string | null;
};

export function FileAnalysisDialog({ isOpen, onOpenChange }: FileAnalysisDialogProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});

  useEffect(() => {
    if (isOpen) {
      const fetchFiles = async () => {
        setIsLoadingFiles(true);
        try {
          const result = await getProjectFiles();
          setFiles(result.files);
        } catch (e: any) {
          logger.error({ error: e }, "Failed to fetch project files for dialog.");
          toast.error("Failed to load files", { description: e.message });
        } finally {
          setIsLoadingFiles(false);
        }
      };
      fetchFiles();
    }
  }, [isOpen]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter(file => file.path.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  const handleAnalyzeFile = async (file: ProjectFile) => {
    setAnalysisResults(prev => ({ ...prev, [file.path]: { status: 'loading', data: null, error: null } }));
    try {
        const result = await analyzeFile({ filePath: file.path, fileContent: file.content });
        setAnalysisResults(prev => ({ ...prev, [file.path]: { status: 'success', data: result, error: null } }));
        toast.success(`Analysis complete for ${file.path}`, { description: `Found ${result.issues.length} issues.` });
    } catch(e: any) {
        const errorMessage = e.message || "An unknown error occurred.";
        logger.error({ error: e, filePath: file.path }, "Failed to analyze file.");
        setAnalysisResults(prev => ({ ...prev, [file.path]: { status: 'error', data: null, error: errorMessage } }));
        toast.error(`Analysis failed for ${file.path}`, { description: errorMessage });
    }
  };
  
  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Analyze Individual File</DialogTitle>
          <DialogDescription>Select a file from your project to run a focused AI analysis.</DialogDescription>
        </DialogHeader>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoadingFiles}
            />
        </div>
        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6">
            {isLoadingFiles ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <Accordion type="multiple" className="w-full">
                    {filteredFiles.map(file => {
                        const result = analysisResults[file.path];
                        return (
                            <AccordionItem key={file.path} value={file.path}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2 justify-between w-full">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="font-mono text-sm truncate">{file.path}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pr-2">
                                            {result && result.status === 'success' && (
                                                <Badge variant={result.data?.issues.length === 0 ? "default" : "secondary"}>
                                                    {result.data?.issues.length} issues
                                                </Badge>
                                            )}
                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAnalyzeFile(file); }} disabled={result?.status === 'loading'}>
                                                {result?.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin"/> : <BrainCircuit className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {result?.status === 'error' && (
                                        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{result.error}</AlertDescription></Alert>
                                    )}
                                    {result?.status === 'success' && result.data && (
                                        result.data.issues.length > 0 ? (
                                            <div className="space-y-2">
                                                {result.data.issues.map((issue, index) => (
                                                    <div key={index} className="p-3 border rounded-md bg-muted/50">
                                                        <p className="font-semibold flex items-center gap-2">
                                                            <span className={getSeverityColor(issue.severity)}>{issue.severity}</span> at Line {issue.lineNumber}
                                                        </p>
                                                        <p className="text-sm mt-1">{issue.description}</p>
                                                        <p className="text-sm text-muted-foreground mt-1"><strong>Suggestion:</strong> {issue.suggestion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                             <Alert className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                                <AlertTitle>No Issues Found</AlertTitle>
                                                <AlertDescription>The AI analysis did not find any issues in this file.</AlertDescription>
                                             </Alert>
                                        )
                                    )}
                                    {!result && <p className="text-sm text-center text-muted-foreground py-4">Click "Analyze" to see the results.</p>}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
