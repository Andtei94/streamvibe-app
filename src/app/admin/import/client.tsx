
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, FileWarning, Sparkles, FilePlus, ExternalLink, Loader2, SkipForward } from 'lucide-react';
import { batchImportFromTitles } from '@/ai/actions';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { BatchImportOutput } from '@/ai/schemas';
import { logger } from '@/lib/logger';

const formSchema = z.object({
  titles: z.string()
    .trim()
    .min(3, 'Please enter at least one title.')
    .refine(val => val.split('\n').every(t => t.trim().length > 0 && t.length < 200), "Each title must be non-empty and under 200 characters."),
});

type FormValues = z.infer<typeof formSchema>;

export default function BatchImportClient() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchImportOutput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { titles: '' },
    mode: 'onBlur',
  });

  const handleSubmit = async (values: FormValues) => {
    setIsProcessing(true);
    setResults(null);
    const titleArray = values.titles.split('\n').map(t => t.trim()).filter(Boolean);
    const titleCount = titleArray.length;
    
    toast.info('Batch Import Started', {
      description: `The AI is now processing ${titleCount} titles. This may take a moment...`,
    });
    
    try {
        const result = await batchImportFromTitles({ titles: titleArray });
        setResults(result);
        toast.success('Batch Import Complete!', {
            description: `${result.addedCount} added, ${result.skippedCount} skipped, ${result.failedItems.length} failed.`,
        });
        if (result.addedCount > 0) {
            form.reset();
        }

    } catch (error: any) {
        logger.error({ error, stack: error.stack }, "[BATCH_IMPORT_ERROR]");
        toast.error('Batch Import Failed', {
            description: error.message || 'An unknown server error occurred.',
            duration: 10000,
        });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const titlesValue = form.watch('titles');
  const titleCount = titlesValue ? titlesValue.split('\n').filter(t => t.trim()).length : 0;

  return (
    <Card className="max-w-4xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardHeader>
            <CardTitle>Paste Titles</CardTitle>
            <CardDescription>Enter one title per line. The AI will process the entire batch in a single, optimized operation to generate metadata and add new items to your library.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="titles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Titles</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="The Matrix&#10;Blade Runner 2049&#10;A Space Odyssey"
                      rows={10}
                      {...field}
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between items-center">
             <p className="text-sm text-muted-foreground">{titleCount} title(s) entered</p>
            <Button type="submit" disabled={isProcessing || titleCount === 0 || !form.formState.isValid}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Processing Batch...' : 'Start AI Import'}
            </Button>
          </CardFooter>
        </form>
      </Form>
      
      {results && (
        <>
          <Separator />
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Import Summary</h3>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Added: {results.addedCount}</div>
                <div className="flex items-center gap-2"><SkipForward className="h-4 w-4 text-amber-500" /> Skipped (duplicates): {results.skippedCount}</div>
                <div className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-destructive" /> Failed: {results.failedItems.length}</div>
            </div>
            
            <div className="space-y-4">
                {results.addedCount > 0 && (
                     <Alert variant="default" className="border-green-500/50">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Successfully Added</AlertTitle>
                        <AlertDescription>
                            {results.addedTitles.join(', ')}
                        </AlertDescription>
                    </Alert>
                )}

                {results.failedItems.length > 0 && (
                    <Alert variant="destructive">
                        <FileWarning className="h-4 w-4" />
                        <AlertTitle>Failed Items</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5">
                            {results.failedItems.map((item, index) => (
                                <li key={`${item.title}-${index}`}>
                                    <strong>{item.title}:</strong> {item.error}
                                </li>
                            ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
