
/**
 * @fileOverview
 * This file extends the default TypeScript definitions for the TanStack Table library.
 * It adds custom properties to the `ColumnMeta` interface, allowing for more
 * detailed configuration of table columns, such as adding specific CSS classes
 * or controlling event propagation behavior.
 */

import '@tanstack/react-table'
import { RowData } from '@tanstack/react-table';

declare module '@tanstack/table-core' {
  // TData is the type of data for the row
  // TValue is the type of value for the column
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
    stopPropagation?: boolean;
  }
}
