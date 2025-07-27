
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceUploadForm } from './device-upload-form';
import { UrlUploadForm } from './url-upload-form';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { reprocessVideo, processExternalUrl } from '@/ai/actions';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isUrl } from '@/lib/utils';
import { sanitizeString } from '@/utils/sanitize-string';

export default function UploadClient() {
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [urlProcessingError, setUrlProcessingError] = useState<string | null>(null);

  const handleProcessUrl = async (title: string, videoUrl: string, isPlayable: boolean, isDownloadable: boolean): Promise<{success: boolean}> => {
    setIsProcessingUrl(true);
    setUrlProcessingError(null);
    
    if (!isUrl(videoUrl)) {
      const errorMessage = "Invalid video URL format provided.";
      setUrlProcessingError(errorMessage);
      toast.error("Processing Failed", { description: errorMessage });
      setIsProcessingUrl(false);
      return { success: false };
    }

    const sanitizedTitle = sanitizeString(title);
    
    try {
        // This is the new, robust 2-step process.
        // Step 1: Download the file from the URL to our own storage.
        toast.info("Downloading external file...", { description: "The server is fetching the media file. This may take a moment." });
        const downloadResult = await processExternalUrl({ mediaUrl: videoUrl });

        // Step 2: Process the now-local file from our storage.
        toast.info("Processing file...", { description: `AI is generating metadata for ${downloadResult.fileName}.` });
        const result = await reprocessVideo({ 
            storagePath: downloadResult.storagePath,
            fileName: downloadResult.fileName,
            isPlayable: true,
            isDownloadable: false,
        });

        toast.success("Content Added Successfully!", { 
            description: `\"${result.title}\" is now available in your library.`,
            duration: 5000,
            action: { label: 'View', onClick: () => window.open(`/watch/${result.contentId}`, '_blank')},
        });
        return { success: true };

    } catch (error: any) {
        logger.error({ error, stack: error.stack, url: videoUrl }, "Failed to process content from URL");
        
        let description = error.message || 'An unknown error occurred. Please check the browser console and server logs.';
        setUrlProcessingError(description);
        
        toast.error("Processing Failed", { 
            description: description,
            duration: 15000,
        });
        return { success: false };
    } finally {
        setIsProcessingUrl(false);
    }
  }
  
  return (
    <div className="relative">
      {isProcessingUrl && (
        <div className="absolute inset-0 bg-background/80 z-10 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-lg font-medium">Processing with AI...</p>
          <p className="text-sm text-muted-foreground">Please wait, this may take a moment.</p>
        </div>
      )}
      <Tabs defaultValue="device" className="max-w-xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="device" disabled={isProcessingUrl}>From Device</TabsTrigger>
            <TabsTrigger value="url" disabled={isProcessingUrl}>From URL</TabsTrigger>
        </TabsList>
        <TabsContent value="device">
            <Card>
            <CardHeader>
                <CardTitle>Upload from your device</CardTitle>
                <CardDescription>
                  Select a media file. After upload, AI will automatically process it.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DeviceUploadForm />
            </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="url">
            <Card>
            <CardHeader>
                <CardTitle>Add from URL</CardTitle>
                <CardDescription>
                  Paste a URL to a media file. The server will download it to your storage, then process it with AI.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {urlProcessingError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Last Attempt Failed</AlertTitle>
                        <AlertDescription>{urlProcessingError}</AlertDescription>
                    </Alert>
                )}
                <UrlUploadForm onProcess={handleProcessUrl} />
            </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
