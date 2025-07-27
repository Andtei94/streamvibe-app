
'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { FileVideo, FileAudio, FileImage, File as FileIcon, MoreHorizontal, Trash2, Wand2, Download, CircleDot, AlertTriangle, CheckCircle, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StorageFile } from './client';
import { format } from 'date-fns';
import { formatBytes, cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

type ColumnsProps = {
  onDelete: (file: StorageFile) => void;
  onAddToLibrary: (file: StorageFile) => void;
  isProcessing: Set<string>;
}

const MEDIA_FILE_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'ogg', 'flac']);
const IMAGE_FILE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);

const getFileIcon = (fileName: string): React.ReactNode => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />;
  
  if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
    return <FileAudio className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
  if (MEDIA_FILE_EXTENSIONS.has(extension)) {
    return <FileVideo className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
  if (IMAGE_FILE_EXTENSIONS.has(extension)) {
    return <FileImage className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
  return <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />;
};

const useIsMediaFile = (fileName: string): boolean => {
    return React.useMemo(() => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension ? MEDIA_FILE_EXTENSIONS.has(extension) : false;
    }, [fileName]);
};

const ActionsCell = ({ row, onDelete, onAddToLibrary, isProcessing }: { row: { original: StorageFile } } & ColumnsProps) => {
  const file = row.original;
  const isCurrentlyProcessing = isProcessing.has(file.id);
  const isMedia = useIsMediaFile(file.name);

  const actionButton = () => {
    if (file.isInLibrary && file.contentId) {
      const statusConfig = {
          published: { Icon: CheckCircle, variant: 'default', title: 'File is published in the library.', linkText: 'Edit Content', linkIcon: Pencil },
          review: { Icon: CircleDot, variant: 'secondary', title: 'File is in the library and awaiting review.', linkText: 'Review Now', linkIcon: Pencil },
          error: { Icon: AlertTriangle, variant: 'destructive', title: 'An error occurred during processing. Please edit to fix or delete.', linkText: 'Edit Content', linkIcon: Pencil },
          processing: { Icon: Loader2, variant: 'secondary', title: 'File is currently being processed...', linkText: 'View Status', linkIcon: Loader2 },
      } as const;
      const status = file.status || 'published';
      const { Icon, variant, title, linkText, linkIcon: LinkIcon } = statusConfig[status as keyof typeof statusConfig] || statusConfig.published;
      
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} size="sm" asChild className="w-40 justify-center capitalize">
              <Link href={`/admin?edit=${file.contentId}`}>
                <LinkIcon className={cn('mr-2 h-4 w-4', status === 'processing' && 'animate-spin')} />
                {status}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{title}</p></TooltipContent>
        </Tooltip>
      );
    } else {
      const isDisabled = !isMedia || isProcessing.size > 0;
      const tooltipContent = !isMedia ? "Only video and audio files can be added to the library."
        : (isProcessing.size > 0 && !isCurrentlyProcessing) ? "Another process is currently running."
        : "Process this file with AI to add it to your library.";

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='w-40'>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAddToLibrary(file); }}
                disabled={isDisabled || isCurrentlyProcessing}
                className="w-full"
              >
                {isCurrentlyProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isCurrentlyProcessing ? 'Processing...' : 'Process with AI'}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{tooltipContent}</p></TooltipContent>
        </Tooltip>
      );
    }
  };

  const dropdownMenu = () => (
     <AlertDialog>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()} disabled={isCurrentlyProcessing}>
            <span className="sr-only">Open menu</span>
            {isCurrentlyProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>More Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
            <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" /> Download
            </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialogTrigger asChild>
                <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
                </div>
            </AlertDialogTrigger>
        </DropdownMenuContent>
        </DropdownMenu>
         <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the file "{file.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(file)}>
                Yes, delete file
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="flex items-center justify-end gap-2" data-no-row-click="true">
      {actionButton()}
      {dropdownMenu()}
    </div>
  );
};


export const columns = ({ onDelete, onAddToLibrary, isProcessing }: ColumnsProps): ColumnDef<StorageFile>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ? true :
          table.getIsSomePageRowsSelected() ? "indeterminate" : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      stopPropagation: true,
    }
  },
  {
    accessorKey: 'name',
    header: 'File Name',
    cell: ({ row }) => {
        const file = row.original;
        return (
            <div className="flex items-center gap-3">
                {getFileIcon(file.name)}
                <span className="font-medium truncate max-w-sm">{file.name}</span>
            </div>
        )
    },
  },
  {
    accessorKey: 'modified',
    header: 'Date Modified',
    cell: ({ row }) => {
        const [isClient, setIsClient] = React.useState(false);
        React.useEffect(() => {
            setIsClient(true);
        }, []);

        const dateString = row.getValue('modified') as string;

        if (!isClient) {
            return <Skeleton className="h-4 w-36" />;
        }
        
        const date = new Date(dateString);
        return <div className="text-muted-foreground">{format(date, 'PP pp')}</div>;
    },
  },
  {
    accessorKey: 'size',
    header: () => <div className="text-right">Size</div>,
    cell: ({ row }) => <div className="text-right pr-4">{formatBytes(row.getValue('size'))}</div>,
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    meta: {
      stopPropagation: true,
    },
    cell: (props) => <ActionsCell {...props} onDelete={onDelete} onAddToLibrary={onAddToLibrary} isProcessing={isProcessing} />,
  },
];
