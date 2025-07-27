
'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Info, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { logger } from '@/lib/logger';
import { isUrl } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

const formSchema = z.object({
  source: z.string().trim().min(10, 'Please enter a valid URL.')
    .refine(s => {
      const trimmed = s.trim();
      if (!isUrl(trimmed)) return false;
      if (/<script/i.test(trimmed)) return false; 
      return true; 
    }, 'Input must be a valid URL starting with http or https.'),
});


type UrlFormValues = z.infer<typeof formSchema>;

interface UrlInfo {
    url: string;
    title: string;
    error?: string;
}

const cleanTitleFromPath = (path: string) => {
    try {
        return decodeURIComponent(path)
            .replace(/\.[^/.]+$/, '')
            .replace(/[._-]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase())
            .trim();
    } catch (e) {
        return path.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ').trim();
    }
};

const analyzeSource = (source: string): UrlInfo => {
    source = DOMPurify.sanitize(source.trim(), { USE_PROFILES: { html: false } });
    let url = source;
    let title = 'Web Content';

    if (!isUrl(url)) {
      return { url: '', title: '', error: 'Invalid URL format.' };
    }

    try {
        const parsedUrl = new URL(url);
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const rawPath = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        
        title = cleanTitleFromPath(rawPath);
        if (title.length < 2) {
            title = 'Web Content';
        }
        
    } catch (e) {
        logger.warn({ error: e, source }, "Could not parse URL in analyzeSource");
        return { url: '', title: '', error: 'Invalid URL could not be parsed.' };
    }

    return { url, title };
};


interface UrlUploadFormProps {
  onProcess: (title: string, videoUrl: string, isPlayable: boolean, isDownloadable: boolean) => Promise<{success: boolean}>
}

export function UrlUploadForm({ onProcess }: UrlUploadFormProps) {
  const { loading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<UrlFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { source: '' },
    mode: 'onChange',
  });
  
  const sourceValue = useWatch({ control: form.control, name: 'source' });

  const detectedInfo = useMemo(() => {
    if (!sourceValue || sourceValue.trim().length < 10 || form.getFieldState('source').invalid) {
        return null;
    }
    return analyzeSource(sourceValue);
  }, [sourceValue, form]);

  const handleProcess = async (values: UrlFormValues) => {
    setIsProcessing(true);
    try {
      if (!detectedInfo || detectedInfo.error) {
        throw new Error(detectedInfo?.error || "Could not analyze the provided source. Please check the URL.");
      }
      
      const result = await onProcess(detectedInfo.title, detectedInfo.url, true, false);
      
      if(result.success) {
          form.reset();
      }
    } catch (e: any) {
      logger.error({ error: e, stack: e.stack }, "URL Processing Handoff Error");
       toast.error('Processing Failed', {
        description: e.message || 'An unknown error occurred during processing.',
      });
    } finally {
        setIsProcessing(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleProcess)} className="space-y-6">
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Textarea
                    placeholder="Paste a direct link to a media file (.mp4, .mp3, etc.)..."
                    rows={5}
                    {...field}
                    disabled={isProcessing || authLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {detectedInfo && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Info className="w-4 h-4"/>Analysis Preview</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Detected Title:</strong> <span className="font-mono text-foreground break-all">{detectedInfo.title}</span></p>
                    {detectedInfo.error && <p className="text-destructive font-semibold">{detectedInfo.error}</p>}
                </div>
            </div>
        )}
        
        <Button type="submit" disabled={isProcessing || !form.formState.isValid || authLoading} className="w-full" size="lg">
            {isProcessing || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {authLoading ? 'Initializing...' : isProcessing ? 'Processing...' : 'Download and Process'}
        </Button>
      </form>
    </Form>
  );
}
