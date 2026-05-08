import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ChevronsUpDown, Trash2, Tag } from 'lucide-react';
import type { Transaction, CategoryDef } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getCategoryBadgeClass } from '../../lib/categories';

interface TransactionsDataTableProps {
  transactions: Transaction[];
  currency: string;
  customCategories?: CategoryDef[];
  onRowClick: (tx: Transaction) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkRecategorize: (ids: string[]) => void;
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 rounded border-border-base bg-surface accent-[rgb(var(--accent))] cursor-pointer"
    />
  );
}

export function TransactionsDataTable({
  transactions,
  currency,
  customCategories,
  onRowClick,
  onBulkDelete,
  onBulkRecategorize,
}: TransactionsDataTableProps): React.ReactElement {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={(v) => table.toggleAllPageRowsSelected(v)}
            ariaLabel="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
            ariaLabel="Select row"
          />
        ),
        enableSorting: false,
        size: 32,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-foreground-muted tabular-nums text-xs">
            {String(getValue() ?? '')}
          </span>
        ),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => {
          const tx = row.original;
          return (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {tx.merchant_name || tx.description}
              </p>
              {tx.merchant_name && tx.description !== tx.merchant_name && (
                <p className="text-[10px] text-foreground-subtle truncate">
                  {tx.description}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const cat = String(getValue() ?? '');
          const cls = getCategoryBadgeClass(cat, customCategories);
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
            >
              {cat}
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => {
          const amt = Number(getValue() ?? 0);
          return (
            <span
              className={`tabular-nums text-sm font-medium ${
                amt < 0 ? 'text-expense' : 'text-income'
              }`}
            >
              {formatCurrency(amt, currency)}
            </span>
          );
        },
        sortingFn: 'basic',
      },
    ],
    [currency, customCategories]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="rounded-xl border border-border-base bg-surface overflow-hidden">
      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border-b border-border-base bg-surface-raised px-3 py-2 text-xs">
          <span className="text-foreground-muted">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onBulkRecategorize(selectedIds);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border-base bg-surface px-2 py-1 text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <Tag className="h-3 w-3" />
              Recategorize
            </button>
            <button
              type="button"
              onClick={() => {
                onBulkDelete(selectedIds);
                setRowSelection({});
              }}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-foreground-subtle hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border-base bg-surface-raised/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.getSize?.() ?? undefined }}
                      className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle"
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-xs text-foreground-subtle"
                >
                  No transactions match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className="border-b border-border-base last:border-b-0 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border-base px-3 py-2 text-xs text-foreground-muted">
        <span>
          {totalRows === 0 ? '0' : `${startRow}–${endRow}`} of {totalRows}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded-md border border-border-base bg-surface px-2 py-1 text-foreground"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-border-base px-2 py-1 disabled:opacity-40 hover:bg-surface-hover transition-colors"
          >
            Prev
          </button>
          <span>
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-border-base px-2 py-1 disabled:opacity-40 hover:bg-surface-hover transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
