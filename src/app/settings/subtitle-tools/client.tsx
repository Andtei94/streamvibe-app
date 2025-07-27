
'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { synchronizeSubtitles, translateSubtitles } from '@/ai/actions';
import { Languages, Timer, UploadCloud, Download, Loader2, FileWarning } from 'lucide-react';
import { logger } from '@/lib/logger';

const MAX_SUBTITLE_SIZE = 5 * 1024 * 1024; // 5 MB

const formSchema = z.object({
  file: z.instanceof(File).refine(file => file.size <= MAX_SUBTITLE_SIZE, `File size cannot exceed 5MB.`),
  operation: z.enum(['translate', 'synchronize']),
  targetLanguage: z.string().optional(),
}).refine(data => {
  if (data.operation === 'translate') {
    return !!data.targetLanguage;
  }
  return true;
}, {
  message: "Target language is required for translation.",
  path: ['targetLanguage'],
});

type SubtitleFormValues = z.infer<typeof formSchema>;

export default function SubtitleToolsClient() {
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SubtitleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operation: 'translate',
      targetLanguage: 'Romanian',
    },
  });

  const operation = useWatch({ control: form.control, name: 'operation' });

  const handleFormSubmit = async (values: SubtitleFormValues) => {
    setIsLoading(true);
    setResultContent(null);
    try {
      const subtitleContent = await values.file.text();
      let result;

      if (values.operation === 'translate') {
        if (!values.targetLanguage) throw new Error("Target language is missing.");
        toast.info("Translating Subtitles...", { description: `AI is translating to ${values.targetLanguage}.` });
        result = await translateSubtitles({ subtitleContent, targetLanguage: values.targetLanguage });
        if(result.success && result.translatedSrtContent) {
            setResultContent(result.translatedSrtContent);
            toast.success("Translation Complete!", { description: `Successfully translated the subtitle file.` });
        } else {
            throw new Error(result.error?.message || "AI translation failed for an unknown reason.");
        }
      } else {
        toast.info("Synchronizing Subtitles...", { description: `AI is correcting the timestamps.` });
        const fileExtension = values.file.name.split('.').pop()?.toLowerCase() || 'vtt';
        const format = fileExtension === 'srt' ? 'srt' : 'vtt';
        result = await synchronizeSubtitles({ subtitleContent, subtitleFormat: format });
        setResultContent(result.synchronizedSrtContent);
        toast.success("Synchronization Complete!", { description: `Successfully synchronized the subtitle file.` });
      }
    } catch (error: any) {
      logger.error({ error }, "Subtitle tool operation failed");
      toast.error("Operation Failed", {
        description: error.message || "An unknown error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultContent) return;
    const blob = new Blob([resultContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_subtitle.${operation === 'translate' ? 'vtt' : 'srt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardHeader>
              <CardTitle>Subtitle Processor</CardTitle>
              <CardDescription>Upload a file, choose an operation, and let the AI do the work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Subtitle File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".vtt,.srt"
                        onChange={(e) => onChange(e.target.files?.[0])}
                        {...rest}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>Max file size: 5MB. Accepts .vtt or .srt files.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an operation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="translate">
                          <div className="flex items-center gap-2"><Languages /> Translate</div>
                        </SelectItem>
                        <SelectItem value="synchronize">
                          <div className="flex items-center gap-2"><Timer /> Synchronize</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {operation === 'translate' && (
                <FormField
                  control={form.control}
                  name="targetLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Romanian">Romanian</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Italian">Italian</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Process File
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>The processed subtitle content will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Textarea
            readOnly
            value={resultContent || ''}
            placeholder="Awaiting processing..."
            className="flex-1 h-64"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleDownload} disabled={!resultContent}>
            <Download className="mr-2 h-4 w-4" />
            Download Result
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
