
'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw, UploadCloud, ChevronLeft, ChevronRight, Trash2, ArchiveX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/app/admin/data-table';
import { columns } from './columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { storage, db } from '@/lib/firebase';
import { ref, list, getMetadata, deleteObject, type ListResult, type FirebaseStorageError } from 'firebase/storage';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { STORAGE_PAGE_SIZE } from '@/lib/constants';
import { EmptyState } from '@/components/empty-state';
import { reprocessVideo } from '@/ai/actions';
import type { Content } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/use-debounce';


export interface StorageFile {
  id: string;
  name: string;
  url: string; 
  size: number;
  modified: string;
  fullPath: string;
  isInLibrary: boolean;
  contentId?: string; 
  status?: Content['status'];
}

export default function StorageClient() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());
  
  // Simplified and robust pagination state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [prevPageTokens, setPrevPageTokens] = useState<(string | undefined)[]>([undefined]);
  
  const [rowSelection, setRowSelection] = useState({});
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebounce(filter, 300);
  const [triggerFetch, setTriggerFetch] = useState(0);
  const [isTransitioning, startTransition] = useTransition();

  const handleRefresh = useCallback(() => {
    setRowSelection({});
    if (currentPageIndex === 0) {
      setTriggerFetch(c => c + 1);
    } else {
      // Reset to the first page
      setCurrentPageIndex(0);
      setPrevPageTokens([undefined]);
      setNextPageToken(undefined);
    }
  }, [currentPageIndex]);
  
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setRowSelection({});
      
      const listRef = ref(storage, 'uploads/');
      const currentToken = prevPageTokens[currentPageIndex];
      
      try {
        const res: ListResult = await list(listRef, { 
            maxResults: STORAGE_PAGE_SIZE, 
            pageToken: currentToken
        });

        setNextPageToken(res.nextPageToken);

        if (res.items.length === 0 && currentPageIndex > 0) {
          // If the current page has no items (e.g., all deleted), go back.
          setCurrentPageIndex(p => Math.max(0, p - 1));
          setPrevPageTokens(p => p.slice(0, -1));
          setLoading(false);
          return;
        }

        const fileMetadataPromises = res.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          return { id: itemRef.fullPath, name: itemRef.name, size: metadata.size, modified: metadata.updated, fullPath: itemRef.fullPath };
        });
        const storageFiles = await Promise.all(fileMetadataPromises);
        const storagePaths = storageFiles.map(f => f.fullPath);
        
        let libraryMap = new Map<string, { id: string, status: Content['status'] }>();
        if (storagePaths.length > 0) {
            const q = query(collection(db, 'content'), where('sourceStoragePath', 'in', storagePaths));
            const librarySnapshot = await getDocs(q);
            librarySnapshot.docs.forEach(doc => {
              const data = doc.data() as Content;
              if (data.sourceStoragePath) {
                libraryMap.set(data.sourceStoragePath, { id: doc.id, status: data.status });
              }
            });
        }
        
        const fileList: StorageFile[] = storageFiles.map(file => {
            const libraryInfo = libraryMap.get(file.fullPath);
            return {
                ...file,
                url: `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(file.fullPath)}?alt=media`,
                isInLibrary: !!libraryInfo,
                contentId: libraryInfo?.id,
                status: libraryInfo?.status,
            };
        });

        fileList.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
        setFiles(fileList);

      } catch (error: any) {
        logger.error({ error, stack: error.stack }, "Firebase Storage Error");
        let description = 'Could not retrieve file list from Cloud Storage.';
        if (error.code === 'storage/unauthorized') {
          description = 'Permission Denied. Please ensure your Firebase Storage security rules are correctly configured and deployed.';
        }
        toast.error('Failed to Fetch Files', {
          description: description,
        });
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentPageIndex, triggerFetch, prevPageTokens]);

  const goToNextPage = () => {
    if (nextPageToken) {
      // Correctly save the token for the *next* page before incrementing the index
      setPrevPageTokens([...prevPageTokens, nextPageToken]);
      setCurrentPageIndex(prevIndex => prevIndex + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setPrevPageTokens(p => p.slice(0, -1)); // Remove the current page's token
      setCurrentPageIndex(prevIndex => prevIndex - 1);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!debouncedFilter) return files;
    return files.filter(file => file.name.toLowerCase().includes(debouncedFilter.toLowerCase()));
  }, [files, debouncedFilter]);

  
  const handleDelete = async (fileToDelete: StorageFile) => {
    setDeleting(true);
    try {
      const fileRef = ref(storage, fileToDelete.fullPath);
      await deleteObject(fileRef);

      toast.success('File deleted', {
        description: `${fileToDelete.name} has been successfully deleted.`,
      });
      handleRefresh();

    } catch (error: any) {
      logger.error({ error, stack: error.stack, fileName: fileToDelete.name }, "Error deleting file");
      toast.error('Deletion failed', {
        description: error.code === 'storage/unauthorized' ? 'Permission Denied: Your security rules do not allow deletion.' : `Could not delete ${fileToDelete.name}.`,
      });
    } finally {
      setDeleting(false);
    }
  };
  
  const handleBulkDelete = async () => {
    const selectedFiles = Object.keys(rowSelection)
        .map(id => files.find(f => f.id === id))
        .filter((f): f is StorageFile => !!f);

    if (selectedFiles.length === 0 || deleting || isProcessing.size > 0) return;

    setDeleting(true);
    const deletePromises = selectedFiles.map(file => {
        const fileRef = ref(storage, file.fullPath);
        return deleteObject(fileRef);
    });

    try {
        await Promise.all(deletePromises);

        toast.success(`${selectedFiles.length} files deleted`, {
            description: 'The selected files have been successfully deleted.',
        });
        handleRefresh();
    } catch (error: any) {
      logger.error({ error, stack: error.stack }, 'Error during bulk deletion');
        let description = 'Could not delete all selected files. Please try again.';
        if((error as FirebaseStorageError)?.code === 'storage/unauthorized') {
            description = 'Permission Denied: Your security rules do not allow deletion for some files.';
        }
        toast.error('Bulk Deletion Failed', {
            description: description,
        });
    } finally {
        setDeleting(false);
        setRowSelection({});
    }
  };

  const handleAddToLibrary = async (file: StorageFile) => {
    if(isProcessing.has(file.id)) return;
    setIsProcessing(prev => new Set(prev).add(file.id));
    toast.info('Processing file...', { description: `AI is generating metadata for ${file.name}. This may take a few minutes.` });
    
    try {
        const result = await reprocessVideo({ 
            storagePath: file.fullPath, 
            fileName: file.name,
            isPlayable: true,
            isDownloadable: false,
        });
        
        toast.success("Added to Library!", { 
            description: `"${result.title}" was processed and is now published.`,
            action: { label: 'Refresh', onClick: () => handleRefresh() },
        });
        
        handleRefresh();

    } catch(error: any) {
        logger.error({ error, stack: error.stack, file: file.name }, "Full error from AI flow");
        
        toast.error('Processing Failed', {
            description: error.message,
            duration: 15000,
        });
    } finally {
        setIsProcessing(prev => {
            const newSet = new Set(prev);
            newSet.delete(file.id);
            return newSet;
        });
    }
  };

  const numSelected = Object.keys(rowSelection).length;

  const toolbarButtons = (
    <div className="flex items-center gap-2">
      {numSelected > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting || isProcessing.size > 0}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete ({numSelected})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {numSelected} file(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete}>
                Yes, delete files
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload File
          </Link>
        </Button>
      )}
    </div>
  );

  const paginationControls = (
    <div className="flex items-center gap-2">
       <span className="text-sm text-muted-foreground">
        Page {currentPageIndex + 1}
      </span>
      <Button onClick={handleRefresh} disabled={loading || deleting || isProcessing.size > 0} variant="outline" size="icon" className="h-9 w-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevPage}
        disabled={currentPageIndex === 0 || loading || deleting || isProcessing.size > 0}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextPage}
        disabled={!nextPageToken || loading || deleting || isProcessing.size > 0}
      >
        Next
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={ArchiveX}
      title="Your Storage is Empty"
      description="Upload a file to get started managing your content."
      action={
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload File
          </Link>
        </Button>
      }
    />
  );

  return (
    <>
      <DataTable
        data={filteredFiles}
        columns={columns({ 
            onDelete: handleDelete,
            onAddToLibrary: handleAddToLibrary,
            isProcessing,
        })}
        isLoading={loading || isTransitioning}
        titleFilter={filter}
        onTitleFilterChange={(value) => {
            startTransition(() => {
                setFilter(value);
            });
        }}
        searchPlaceholder='Search file names...'
        toolbarButtons={toolbarButtons}
        paginationControls={paginationControls}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={emptyState}
      />
    </>
  );
}
