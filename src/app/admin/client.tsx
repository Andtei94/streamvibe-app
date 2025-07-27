
'use client';

import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Inbox, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckSquare, Trash2, Loader2 } from 'lucide-react';
import type { Content } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { columns } from '@/app/admin/columns';
import { DataTable, type FilterState, type FilterAction } from '@/app/admin/data-table';
import { db, storage } from '@/lib/firebase';
import { 
  collection,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  where,
  QueryConstraint,
  writeBatch,
  runTransaction,
  FirestoreError,
} from 'firebase/firestore';
import { ref, deleteObject, FirebaseStorageError } from 'firebase/storage';
import { toast } from 'sonner';
import { updateContentImageFlow } from '@/ai/actions';
import { STORAGE_PAGE_SIZE } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/use-debounce';
import { ContentForm, type ContentFormValues, ContentFormSchema } from '@/app/admin/content-form';
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
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { Row } from '@tanstack/react-table';

const safeParseInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : null;
};

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
    switch (action.type) {
        case 'SET_TYPE':
            return { ...state, type: action.payload, status: state.status };
        case 'SET_STATUS':
            return { ...state, type: state.type, status: action.payload };
        case 'RESET_ALL':
            return { type: null, status: null };
        default:
            return state;
    }
};

const AdminClient = () => {
  const [data, setData] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Partial<Content> | undefined>(undefined);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [pageTokens, setPageTokens] = useState<(DocumentSnapshot | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const [filters, dispatchFilters] = useReducer(filterReducer, { type: null, status: null });
  const hasReviewItems = useMemo(() => data.some(item => item.status === 'review'), [data]);
  
  const [titleFilter, setTitleFilter] = useState('');
  const debouncedTitleFilter = useDebounce(titleFilter, 500);

  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<Row<Content>[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRowSelection({});
    if (currentPage === 0) {
      setRefreshTrigger(c => c + 1);
    } else {
      setCurrentPage(0);
      setPageTokens([null]);
    }
  }, [currentPage]);
  
  const handleEdit = useCallback((content: Partial<Content>) => {
    setSelectedContent(content);
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !isFormOpen) {
        const fetchAndEdit = async () => {
          try {
            const docRef = doc(db, 'content', editId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                handleEdit({ id: docSnap.id, ...docSnap.data() } as Content);
            } else {
                 toast.error('Content Not Found', {
                    description: 'The content you are trying to edit does not exist.',
                });
                router.replace('/admin', { scroll: false });
            }
          } catch (e: any) {
            logger.error({ error: e, stack: e.stack, docId: editId }, "Failed to fetch doc for editing");
            toast.error('Error Fetching Document', {
              description: 'Could not retrieve the item for editing. Please check your connection and try again.'
            });
            router.replace('/admin', { scroll: false });
          }
        };
        fetchAndEdit();
    }
  }, [searchParams, handleEdit, router, isFormOpen]);

  useEffect(() => {
    const fetchContent = async () => {
        setLoading(true);

        try {
            const contentCollectionRef = collection(db, 'content');
            const constraints: QueryConstraint[] = [];

            if (debouncedTitleFilter) {
              const normalizedFilter = debouncedTitleFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
              const keywords = normalizedFilter.split(' ').filter(k => k.length > 1).slice(0, 10);
              if (keywords.length > 0) {
                constraints.push(where('keywords', 'array-contains-any', keywords));
              }
            }
            if (filters.type) constraints.push(where('type', '==', filters.type));
            if (filters.status) constraints.push(where('status', '==', filters.status));

            constraints.push(orderBy('title_lowercase', 'asc'));

            const cursor = pageTokens[currentPage];
            if (cursor) constraints.push(startAfter(cursor));
            
            constraints.push(limit(STORAGE_PAGE_SIZE));
            
            const q = query(contentCollectionRef, ...constraints);
            const snapshot = await getDocs(q);

            setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Content[]);
            
            const newLastDoc = snapshot.empty ? null : snapshot.docs[snapshot.docs.length - 1];

            setPageTokens(prevTokens => {
                const newTokens = [...prevTokens];
                newTokens[currentPage + 1] = newLastDoc;
                return newTokens;
            });

        } catch (error: any) {
            logger.error({ error, stack: error.stack }, "Error fetching content.");
            let description = "Could not retrieve the library. Please check your connection and permissions.";
            if (error instanceof FirestoreError && error.code === 'failed-precondition') {
                description = "A required database index is missing. To use this filter combination, you must create a composite index in Firebase. Open your browser's developer console for a direct link to create it."
            }
            toast.error('Failed to Fetch Content', {
              description: description,
            });
            setData([]);
        } finally {
            setLoading(false);
        }
    };
    
    fetchContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitleFilter, filters, currentPage, refreshTrigger]);
  

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && pageTokens[currentPage + 1] !== undefined) {
        setCurrentPage(p => p + 1);
    } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(p => Math.max(0, p - 1));
    }
  };
  
  const handleAddNew = () => {
    setSelectedContent(undefined);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'content', id);
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          throw new FirestoreError("not-found", "Document does not exist.");
        }

        const dataToDelete = docSnap.data() as Content;
        transaction.delete(docRef);

        if (dataToDelete.sourceStoragePath) {
          try {
            const fileRef = ref(storage, dataToDelete.sourceStoragePath);
            await deleteObject(fileRef);
          } catch (storageError: any) {
              if (storageError.code !== 'storage/object-not-found') {
                logger.error({ error: storageError, path: dataToDelete.sourceStoragePath }, 'Storage deletion failed during transaction.');
                throw new Error(`Failed to delete storage file: ${storageError.message}`);
              }
              logger.warn({ path: dataToDelete.sourceStoragePath }, "Associated storage file not found, but proceeding with DB deletion.");
          }
        }
      });
      
      toast.success("Content Deleted", { description: `"${title}" has been removed.` });
      handleRefresh();

    } catch (error: any) {
      logger.error({ error, stack: error.stack }, "Failed to delete content.");
      let description = `Could not remove "${title}".`;
      if (error instanceof FirestoreError) {
        description = `Database Error: ${error.code}`;
      } else if (error instanceof Error) {
         description = error.message;
      }
      toast.error("Delete Failed", { description });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const parseStringToArray = (input: string | undefined): string[] => {
    if (!input || typeof input !== 'string') return [];
    return input.split(',').map(s => s.trim()).filter(Boolean);
  };

  const prepareContentForFirestore = (values: ContentFormValues): Partial<Content> => {
      const parsedValues = ContentFormSchema.parse(values);
      return {
        ...parsedValues,
        genres: parseStringToArray(parsedValues.genres),
        actors: parseStringToArray(parsedValues.actors),
        directors: parseStringToArray(parsedValues.directors),
        keywords: parseStringToArray(parsedValues.keywords),
        audioCodecs: parseStringToArray(parsedValues.audioCodecs),
        subtitles: JSON.parse(parsedValues.subtitles),
        dubbedAudioTracks: JSON.parse(parsedValues.dubbedAudioTracks),
        releaseDate: new Date(parsedValues.releaseDate).toISOString(),
        title_lowercase: parsedValues.title.toLowerCase(),
        seasonNumber: safeParseInt(parsedValues.seasonNumber),
        episodeNumber: safeParseInt(parsedValues.episodeNumber),
        introStart: safeParseInt(parsedValues.introStart),
        introEnd: safeParseInt(parsedValues.introEnd),
      };
  };

  const updateContent = async (docId: string, payload: Partial<Content>) => {
    const docRef = doc(db, 'content', docId);
    await updateDoc(docRef, payload);
  };

  const addContent = async (payload: Partial<Content>) => {
    const newDocRef = await addDoc(collection(db, 'content'), payload as Content);
    return newDocRef.id;
  };

  const showSuccessToast = (values: ContentFormValues, docId: string, isEditing: boolean) => {
    const message = isEditing ? (selectedContent?.status === 'review' ? "Content Reviewed & Published" : "Content Updated") : "Content Added";
    const description = `"${values.title}" has been successfully ${isEditing ? 'saved' : 'added'} to the library`;
    toast.success(message, {
      description,
      action: { label: 'View', onClick: () => router.push(`/watch/${docId}`) },
    });
  };

  const handleFormSubmit = async (values: ContentFormValues) => {
    const isEditing = !!(selectedContent && selectedContent.id);
    let docId = selectedContent?.id;
    
    try {
      const payload = prepareContentForFirestore(values);
      if (isEditing && docId) {
        await updateContent(docId, payload);
      } else {
        docId = await addContent(payload);
      }
      showSuccessToast(values, docId!, isEditing);
      setIsFormOpen(false);
      setSelectedContent(undefined);
      handleRefresh();
      
      if (searchParams.get('edit')) {
          router.replace('/admin', { scroll: false });
      }

    } catch (error: any) {
        const operation = isEditing ? 'update' : 'add';
        let description = error instanceof Error ? error.message : `Could not ${operation} content.`;
        if (error instanceof z.ZodError) {
          description = error.issues.map(issue => `${issue.path.join('.')} - ${issue.message}`).join('; ');
        }
        toast.error(`${isEditing ? "Update" : "Save"} Failed`, { description, duration: 10000 });
        logger.error({ error, isEditing }, `Failed to ${operation} content.`);
    }
  };


  const handleGenerateImage = async (content: Content) => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(content.id);
    toast.info("Generating Poster...", { description: `The AI is creating a new poster for "${content.title}".` });

    try {
      const result = await updateContentImageFlow({ 
        contentId: content.id, 
        prompt: content.aiHint || content.title
      });
      setData(prev => prev.map(item => item.id === content.id ? { ...item, imageUrl: result.imageUrl } : item));
      toast.success("Poster Updated!", { description: "The new image has been generated and saved." });
    } catch (error: any) {
      logger.error({ error, stack: error.stack, contentId: content.id }, "Failed to generate and update image.");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error('Image Generation Failed', {
        description: errorMessage,
        duration: 10000,
      });
    } finally {
      setIsGeneratingImage(null);
    }
  };

  const onFormOpenChange = (isOpen: boolean) => {
    setIsFormOpen(isOpen);
    if (!isOpen) {
      setSelectedContent(undefined);
      if (searchParams.get('edit')) {
        router.replace('/admin', { scroll: false });
      }
    }
  };
    
  const numSelected = selectedRows.length;

  const handleBulkDelete = async () => {
    if (isDeleting || numSelected === 0) return;
    setIsDeleting(true);
    const batch = writeBatch(db);
    const failedDeletes: { title: string; error: string }[] = [];
    const itemsToDelete = selectedRows.map(row => row.original);

    const storageDeletions = itemsToDelete.map(async (content) => {
        batch.delete(doc(db, 'content', content.id));
        if (content.sourceStoragePath) {
            try {
                const fileRef = ref(storage, content.sourceStoragePath);
                await deleteObject(fileRef);
            } catch (storageError: any) {
                if ((storageError as FirebaseStorageError).code !== 'storage/object-not-found') {
                    failedDeletes.push({ title: content.title, error: storageError.message });
                    logger.error({ error: storageError }, `Failed to delete storage object for ${content.title}`);
                }
            }
        }
    });

    await Promise.all(storageDeletions);

    try {
        await batch.commit();
    } catch (dbError: any) {
        logger.error({ error: dbError }, 'Failed to commit bulk delete to Firestore');
        if (dbError instanceof FirestoreError) {
          failedDeletes.push({ title: 'Batch Database Delete', error: `Code: ${dbError.code}, Message: ${dbError.message}` });
        } else if (dbError instanceof Error) {
          failedDeletes.push({ title: 'Batch Database Delete', error: dbError.message });
        }
    }

    if (failedDeletes.length > 0) {
        toast.error(`Bulk Deletion Partially Failed`, {
            description: `Failed to delete ${failedDeletes.length} item(s). Check logs for details.`,
        });
    } else {
        toast.success(`Deleted ${itemsToDelete.length} item(s) successfully.`);
    }

    handleRefresh();
    setIsDeleting(false);
  };
  
  const handleBulkPublish = async () => {
    const itemsToPublish = selectedRows.map(row => row.original).filter(item => item.status === 'review');
    if (itemsToPublish.length === 0) {
      toast.info('No Action Taken', { description: 'None of the selected items were awaiting review.' });
      return;
    }

    const batch = writeBatch(db);
    itemsToPublish.forEach(item => {
        const docRef = doc(db, 'content', item.id);
        batch.update(docRef, { status: 'published' });
    });
    
    try {
      await batch.commit();
      toast.success('Content Published', { description: `${itemsToPublish.length} item(s) have been successfully published.` });
      handleRefresh();
    } catch (error: any) {
      logger.error({ error, stack: error.stack }, 'Bulk publish failed');
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error('Bulk Publish Failed', { description: `Could not publish all selected items. Error: ${errorMessage}` });
    } finally {
      setRowSelection({});
    }
  };

  const isLastPage = data.length < STORAGE_PAGE_SIZE && pageTokens[currentPage+1] === null;

  const paginationControls = (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page {currentPage + 1}</span>
        <Button onClick={handleRefresh} disabled={loading || isDeleting} variant="outline" size="icon" className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={currentPage === 0 || loading}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={isLastPage || loading}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
  );

  const toolbarButtons = (
      <div className="flex items-center gap-2">
        {numSelected > 0 ? (
          <>
            <Button onClick={handleBulkPublish} size="sm" variant="outline" disabled={isDeleting}>
              <CheckSquare className="mr-2 h-4 w-4" /> Publish ({selectedRows.filter(r => r.original.status === 'review').length})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                   Delete ({numSelected})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {numSelected} content item(s) and their associated files from storage. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/admin/import">
                <Inbox className="mr-2 h-4 w-4" /> Batch Import
              </Link>
            </Button>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Content
            </Button>
          </>
        )}
      </div>
  );

  return (
    <>
      {hasReviewItems && (
        <Alert className="mb-4 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Action Required</AlertTitle>
          <AlertDescription>
            You have content waiting for review. Find items with the "Review" status below, click to edit, and then publish them.
          </AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns({ onEdit: handleEdit, onDelete: handleDelete, onGenerateImage: handleGenerateImage, isGeneratingImage })}
        data={data}
        isLoading={loading}
        filters={filters}
        onFilterChange={dispatchFilters}
        paginationControls={paginationControls}
        toolbarButtons={toolbarButtons}
        titleFilter={titleFilter}
        onTitleFilterChange={setTitleFilter}
        searchPlaceholder="Search all content by title..."
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onSelectedRowsChange={setSelectedRows}
        onRowClick={handleEdit}
      />
      <ContentForm
        isOpen={isFormOpen}
        onOpenChange={onFormOpenChange}
        onSubmit={handleFormSubmit}
        initialData={selectedContent}
      />
    </>
  );
};

export default AdminClient;
