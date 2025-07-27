
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  Row,
  RowSelectionState,
} from '@tanstack/react-table';
import { useState, useEffect } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Content } from '@/lib/types';
import { STORAGE_PAGE_SIZE } from '@/lib/constants';

export type FilterState = { type: string | null; status: string | null };
export type FilterAction = { type: 'SET_TYPE', payload: string | null } | { type: 'SET_STATUS', payload: string | null } | { type: 'RESET_ALL' };

interface DataTableProps<TData extends {id: string}, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  filters?: FilterState;
  onFilterChange?: React.Dispatch<FilterAction>;
  paginationControls?: React.ReactNode;
  toolbarButtons?: React.ReactNode;
  titleFilter: string;
  onTitleFilterChange: (value: string) => void;
  searchPlaceholder?: string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  onSelectedRowsChange?: (rows: Row<TData>[]) => void;
  emptyState?: React.ReactNode;
  onRowClick?: (rowData: TData) => void;
}

export function DataTable<TData extends {id: string}, TValue>({
  columns,
  data,
  isLoading = false,
  filters,
  onFilterChange,
  paginationControls,
  toolbarButtons,
  titleFilter,
  onTitleFilterChange,
  searchPlaceholder,
  rowSelection,
  onRowSelectionChange,
  onSelectedRowsChange,
  emptyState,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'title_lowercase', desc: false }]);
  const isRowSelectionEnabled = !!onRowSelectionChange;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: onRowSelectionChange,
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: isRowSelectionEnabled,
    getRowId: (row) => row.id,
    state: {
      sorting,
      ...(isRowSelectionEnabled && { rowSelection }),
    },
    globalFilterFn: (row, columnId, filterValue) => {
        const item = row.original as Partial<Content>;
        const title = item?.title?.toLowerCase() ?? '';
        return title.includes(filterValue.toLowerCase());
    },
  });

  useEffect(() => {
    if (onSelectedRowsChange) {
      onSelectedRowsChange(table.getSelectedRowModel().rows);
    }
  }, [rowSelection, table, onSelectedRowsChange]);

  const clearAllFilters = () => {
    if (onFilterChange) {
        onFilterChange({ type: 'RESET_ALL' });
        onTitleFilterChange('');
    }
  };
  
  const hasActiveFilters = (filters && (filters.type || filters.status)) || titleFilter !== '';

  const handleRowClick = (row: Row<TData>, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick || event.target instanceof HTMLInputElement) return;

    let target = event.target as HTMLElement | null;
    if (target?.closest('[data-no-row-click="true"]')) {
      return;
    }
    
    onRowClick(row.original);
  };

  return (
    <div>
      <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 flex-wrap min-w-[200px]">
            <Input
                placeholder={searchPlaceholder || "Search..."}
                value={titleFilter}
                onChange={(event) => onTitleFilterChange(event.target.value)}
                className="max-w-sm"
                disabled={isLoading}
            />
            
            {filters && onFilterChange && (
              <>
                <Select
                    value={filters.type ?? 'all'}
                    onValueChange={(value) =>
                        onFilterChange({ type: 'SET_TYPE', payload: value === 'all' ? null : value })
                    }
                    disabled={isLoading}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="movie">Movie</SelectItem>
                        <SelectItem value="tv-show">TV Show</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                    </SelectContent>
                </Select>
                
                 <Select 
                    value={filters.status ?? 'all'} 
                    onValueChange={(value) => {
                        onFilterChange({ type: 'SET_STATUS', payload: value === 'all' ? null : value })
                    }}
                    disabled={isLoading}
                 >
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                </Select>

                 {hasActiveFilters && (
                     <Button variant="ghost" onClick={clearAllFilters} disabled={isLoading}>
                         <X className="mr-2 h-4 w-4" />
                         Clear Filters
                     </Button>
                 )}
              </>
            )}
        </div>
        <div className="flex items-center gap-2">
            {toolbarButtons}
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className={cn(header.column.columnDef.meta?.className)}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={columns.length} className="h-auto p-0">
                    <div className="w-full flex flex-col">
                        {Array.from({ length: STORAGE_PAGE_SIZE }).map((_, i) => (
                          <div key={i} className="flex items-center w-full p-4 border-b">
                              {columns.map((col, j) => (
                                <Skeleton key={j} className="h-6 flex-1 mr-4" />
                              ))}
                          </div>
                        ))}
                    </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={isRowSelectionEnabled && row.getIsSelected() ? 'selected' : undefined}
                  onClick={(event) => handleRowClick(row, event)}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className={cn(cell.column.columnDef.meta?.className)}
                      data-column-id={cell.column.id}
                      {...(cell.column.columnDef.meta?.stopPropagation && { 'data-no-row-click': 'true' })}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center">
                        {emptyState || "No results found."}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
                {isRowSelectionEnabled && `${table.getSelectedRowModel().rows.length} of ${table.getCoreRowModel().rows.length} row(s) selected.`}
            </div>
            <div className="flex items-center gap-2">
                {paginationControls}
            </div>
       </div>
    </div>
  );
}
