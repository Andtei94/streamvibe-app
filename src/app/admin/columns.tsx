
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Film, Tv, Music, Trophy, Star, Trash2, Wand2, CircleDot, CheckCircle, AlertTriangle, Edit, Loader2, Minus, Eye, Copy, Pencil } from 'lucide-react';
import type { Content } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
import { cn, formatContentType } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';
import { useState } from 'react';

type ColumnsProps = {
  onEdit: (content: Content) => void;
  onDelete: (id: string, title: string) => void;
  onGenerateImage: (content: Content) => void;
  isGeneratingImage: string | null;
}

const ActionsCell = ({ row, onEdit, onDelete, onGenerateImage, isGeneratingImage }: { row: { original: Content } } & Pick<ColumnsProps, 'onEdit'|'onDelete'|'onGenerateImage'|'isGeneratingImage'>) => {
    const content = row.original;
    const isCurrentlyProcessing = isGeneratingImage === content.id;

    const copyId = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(content.id);
            toast.success("Copied!", { description: "Content ID copied to clipboard." });
        } catch (err) {
            toast.error("Copy Failed", { description: "Could not copy ID to clipboard."});
            logger.error({error: err}, "Failed to copy content ID to clipboard");
        }
    };

    return (
        <div data-no-row-click="true">
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isCurrentlyProcessing}>
                            <span className="sr-only">Open menu</span>
                            {isCurrentlyProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(content); }}><Edit className="mr-2 h-4 w-4" />Edit / Review</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/watch/${content.id}`} target="_blank" onClick={(e) => e.stopPropagation()}><Eye className="mr-2 h-4 w-4" />View Content</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGenerateImage(content); }}><Wand2 className="mr-2 h-4 w-4" />Generate Poster</DropdownMenuItem>
                        <DropdownMenuItem onClick={copyId}><Copy className="mr-2 h-4 w-4" />Copy Content ID</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive-foreground flex w-full items-center">
                               <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the{' '}
                        <span className="font-semibold text-foreground">{formatContentType(content.type)}</span>{' '}
                        titled <span className="font-semibold text-foreground">&quot;{content.title}&quot;</span>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => onDelete(content.id, content.title)}>Yes, delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export const columns = ({ onEdit, onDelete, onGenerateImage, isGeneratingImage }: ColumnsProps): ColumnDef<Content>[] => [
   {
    id: 'select',
    header: ({ table }) => (
      <div data-no-row-click="true">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div data-no-row-click="true">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
   {
    accessorKey: 'featured',
    header: '',
    cell: ({ row }) => (
      row.getValue('featured') ? <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> : <span className="w-4" />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'title_lowercase',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
  },
  {
    accessorKey: 'canPlay',
    header: '',
    cell: ({ row }) => {
        const isPlayable = !!row.original.canPlay && !!row.original.videoUrl;
        const isPublished = row.original.status === 'published';
        const hasProblem = isPublished && !isPlayable;
        
        return (
            <Tooltip>
                <TooltipTrigger>
                    {hasProblem ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    )}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{hasProblem ? "Warning: Published but not playable. Check video URL." : "Content is configured correctly."}</p>
                </TooltipContent>
            </Tooltip>
        );
    },
    enableSorting: false,
   },
  {
    accessorKey: 'type',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = (row.getValue('type') as string) || 'unknown';
      const Icon = type === 'movie' ? Film : type === 'tv-show' ? Tv : type === 'music' ? Music : Trophy;
      return (
        <Badge variant="outline" className="capitalize">
          <Icon className="mr-2 h-4 w-4" />
          {formatContentType(type)}
        </Badge>
      );
    },
  },
   {
    accessorKey: 'status',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = (row.getValue('status') as string | undefined) ?? 'unknown';

      const statusConfig = {
        published: { Icon: CheckCircle, variant: "default", title: "Published: This content is live and visible to users." },
        review: { Icon: CircleDot, variant: "secondary", title: "Awaiting Review: This content was auto-generated and needs manual approval before being published." },
        error: { Icon: AlertTriangle, variant: "destructive", title: "Error: An error occurred during processing. Please edit to fix or delete." },
        processing: { Icon: Loader2, variant: "secondary", title: "Processing: This file is currently being processed by the system." },
        unknown: { Icon: Minus, variant: "secondary", title: "Unknown status." },
      } as const;

      const { Icon, variant, title } = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
      
      return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant={variant} className="capitalize">
                    <Icon className={cn("mr-2 h-3 w-3", status === 'processing' && "animate-spin")} />
                    <span className="capitalize">{status}</span>
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <p>{title}</p>
            </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: 'releaseDate',
    header: ({ column }) => {
       return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Year
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dateString = row.getValue('releaseDate') as string;
      if (!dateString) return <div className="text-center">-</div>;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          logger.error({ dateString, rowId: row.original.id }, `Invalid releaseDate format`);
          return <div className="text-center text-destructive" title={`Invalid date: ${dateString}`}>Invalid</div>;
        }
        return <div className="text-center">{date.getFullYear()}</div>
      } catch (e) {
        logger.error({ error: e, dateString, rowId: row.original.id }, `Error parsing releaseDate`);
        return <div className="text-center text-destructive" title={`Invalid date: ${dateString}`}>Error</div>;
      }
    },
    sortingFn: 'datetime',
  },
   {
    id: 'actions',
    cell: (props) => <ActionsCell {...props} onEdit={onEdit} onDelete={onDelete} onGenerateImage={onGenerateImage} isGeneratingImage={isGeneratingImage} />,
  },
];
