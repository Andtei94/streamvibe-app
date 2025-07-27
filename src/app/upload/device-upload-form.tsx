
'use client';

import { useState, useRef, FormEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, type UploadTask, type FirebaseStorageError } from 'firebase/storage';
import { Upload, X, Loader2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { reprocessVideo } from '@/ai/actions';
import { cn, formatBytes } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { MAX_FILE_SIZE } from '@/lib/constants';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
interface UploadState {
  status: UploadStatus;
  progress: number;
  fileName: string | null;
  fileSize: number | null;
  validationError: string | null;
  uploadError: string | null;
  lastStoragePath: string | null;
}

const initialState: UploadState = {
    status: 'idle',
    progress: 0,
    fileName: null,
    fileSize: null,
    validationError: null,
    uploadError: null,
    lastStoragePath: null
}

export function DeviceUploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>(initialState);
  const { loading: authLoading, error: authError } = useAuth();

  const uploadTaskRef = useRef<UploadTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetAllState = useCallback(() => {
    setUploadState(initialState);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetAllState();
    const file = event.target.files?.[0] || null;

    if (!file) {
      setUploadState(prev => ({ ...prev, fileName: null, fileSize: null, validationError: null }));
      return;
    }
    
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        setUploadState(prev => ({ ...prev, validationError: 'Invalid file type. Please select a video or audio file.' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadState(prev => ({ ...prev, validationError: `File is too large. Max size is ${formatBytes(MAX_FILE_SIZE)}.` }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setUploadState(prev => ({ ...prev, fileName: file.name, fileSize: file.size, validationError: null }));
    }
  };

  const handleProcessFile = useCallback(async (storagePath: string, fileName: string) => {
    setUploadState(prev => ({ ...prev, status: 'processing', uploadError: null }));
    toast.info("Starting AI processing...", { description: `Analyzing ${fileName}... This can take a few minutes.` });

    try {
      const result = await reprocessVideo({ 
          storagePath, 
          fileName,
          isPlayable: true,
          isDownloadable: false,
      });

      setUploadState(prev => ({...prev, status: 'success'}));
      toast.success("Content Added Successfully!", {
        description: `"${result.title}" is now available in your library.`,
        duration: 8000,
        action: { label: 'View', onClick: () => window.open(`/watch/${result.contentId}`, '_blank')},
      });
      
      resetAllState();

    } catch (error: any) {
      logger.error({ error, stack: error.stack, storagePath, fileName }, "AI processing failed after device upload");
      const description = error.message || 'An unknown error occurred during AI processing.';
      setUploadState(prev => ({ ...prev, status: 'error', uploadError: description, lastStoragePath: storagePath }));
      toast.error('AI Processing Failed', { description: description, duration: 15000 });
    }
  }, [resetAllState]);

  const startUpload = async () => {
    if (authLoading || authError) return;
    const selectedFile = fileInputRef.current?.files?.[0];

    if (!selectedFile || !uploadState.fileName) {
        toast.error("No File", { description: "Please select a file to upload." });
        return;
    }

    setUploadState(prev => ({ ...prev, status: 'uploading', uploadError: null }));
    toast.info('Upload Started', { description: `Uploading ${selectedFile.name}...` });

    try {
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `uploads/${Date.now()}_${sanitizedFileName}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      uploadTaskRef.current = uploadTask;

      uploadTask.on(
        'state_changed',
        (snapshot) => setUploadState(prev => ({...prev, progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100})),
        (error: FirebaseStorageError) => {
          uploadTaskRef.current = null;
          let detailedError = 'An unknown storage error occurred.';
          switch (error.code) {
            case 'storage/unauthorized': detailedError = 'Permission Denied: Your security rules for Cloud Storage do not allow this upload.'; break;
            case 'storage/canceled': toast.info('Upload Canceled'); resetAllState(); return;
            case 'storage/quota-exceeded': detailedError = 'You have exceeded your Cloud Storage quota.'; break;
            default: logger.warn({ code: error.code, message: error.message }, 'Unhandled Firebase Storage error');
          }
          logger.error({ error, code: error.code }, "Firebase Storage upload error");
          setUploadState(prev => ({ ...prev, status: 'error', uploadError: detailedError, lastStoragePath: null }));
          toast.error('Upload Failed', { description: detailedError, duration: 10000 });
        },
        () => {
          uploadTaskRef.current = null;
          toast.success('Upload Complete!', {
            description: `${selectedFile.name} is now in Cloud Storage.`,
            action: { label: 'View in Storage', onClick: () => window.open('/storage', '_blank')},
          });
          handleProcessFile(storagePath, selectedFile.name);
        }
      );
    } catch (error) {
      logger.error({ error }, "Error during pre-upload setup");
      const errorMessage = error instanceof Error ? error.message : 'Could not initiate the upload.';
      setUploadState(prev => ({ ...prev, status: 'error', uploadError: errorMessage}));
      toast.error('Upload Failed', { description: errorMessage });
    }
  };


  const handleUploadSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (uploadState.status === 'error' && uploadState.lastStoragePath && uploadState.fileName) {
      handleProcessFile(uploadState.lastStoragePath, uploadState.fileName);
    } else {
      await startUpload();
    }
  };

  const handleCancelDuringUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
    }
  };
  
  const isUploading = uploadState.status === 'uploading';
  const isProcessing = uploadState.status === 'processing';
  const isError = uploadState.status === 'error';
  const isBusy = isUploading || isProcessing;
  
  return (
    <form onSubmit={handleUploadSubmit} className="space-y-4">
      {authError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="file-upload" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select Media File
        </label>
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isBusy || authLoading || !!authError}
          className="pt-2 h-auto"
        />
        {uploadState.validationError && <p className="mt-2 text-sm font-medium text-destructive">{uploadState.validationError}</p>}
        <p className="text-sm text-muted-foreground">
          Max {formatBytes(MAX_FILE_SIZE)}. Formats like MKV or AVI will be automatically processed in the background for web playback after upload.
        </p>
      </div>

      {uploadState.uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{uploadState.uploadError}</AlertDescription>
        </Alert>
      )}
      
      {(uploadState.status === 'idle' || isError) && (
        <Button type="submit" disabled={!uploadState.fileName || !!uploadState.validationError || authLoading || isBusy} className="w-full" size="lg">
            {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isError ? <RotateCcw className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
            {authLoading ? 'Initializing...' : isError ? `Retry ${uploadState.lastStoragePath ? 'Processing' : 'Upload'}` : 'Upload and Process'}
        </Button>
      )}

      {(isUploading || isProcessing) && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium flex items-center gap-2">
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isProcessing && <Sparkles className="h-4 w-4 animate-spin" />}
                <span>
                    {isUploading && 'Uploading'}
                    {isProcessing && 'Processing with AI'}...
                </span>
                <span className="text-muted-foreground font-normal ml-2 truncate max-w-xs">{uploadState.fileName}</span>
            </label>
            {isUploading && (
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelDuringUpload} className="text-muted-foreground hover:text-destructive h-auto p-1">
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                </Button>
            )}
          </div>
          <Progress value={isUploading ? uploadState.progress : 100} className={cn(isProcessing && "animate-pulse")} />
          {isUploading && <p className="text-sm text-muted-foreground text-center">{Math.round(uploadState.progress)}%</p>}
        </div>
      )}
    </form>
  );
}
