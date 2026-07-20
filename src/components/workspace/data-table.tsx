"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  type ColumnResizeMode,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  enableSelection?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  bulkActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
};

export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  selectedId,
  enableSelection,
  onSelectionChange,
  bulkActions,
  toolbar,
  pageSize = 50,
  className,
  emptyMessage = "No rows",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");

  const cols = useMemo(() => {
    if (!enableSelection) return columns;
    const selectCol: ColumnDef<T, unknown> = {
      id: "select",
      size: 36,
      enableResizing: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
    };
    return [selectCol, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: cols,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        queueMicrotask(() => {
          if (onSelectionChange) {
            const selected = table.getRowModel().rows.filter((r) => next[r.id]).map((r) => r.original);
            onSelectionChange(selected);
          }
        });
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    enableColumnResizing: true,
    columnResizeMode,
    initialState: { pagination: { pageSize } },
  });

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-white/8 px-2 py-1.5 shrink-0">
        <div className="flex-1 min-w-0 flex items-center gap-2">{toolbar}</div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] cursor-pointer" />}>
            <Columns3 className="h-3.5 w-3.5" /> Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize cursor-pointer text-xs"
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] shrink-0">
          <span className="font-medium">{selectedCount} selected</span>
          {bulkActions}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <table className="w-full caption-bottom text-[12px]" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-10 bg-[var(--ws-panel)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-white/8">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-8 px-2 text-left align-middle font-medium text-muted-foreground relative"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 cursor-pointer",
                          header.column.getCanSort() && "hover:text-foreground"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          ({
                            asc: <ArrowUp className="h-3 w-3" />,
                            desc: <ArrowDown className="h-3 w-3" />,
                          }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-40" />)}
                      </button>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/40"
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const id = row.id;
                const selected = selectedId === id || row.getIsSelected();
                return (
                  <tr
                    key={row.id}
                    data-selected={selected}
                    className="ws-row border-b border-white/[0.04] cursor-pointer"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-1.5 align-middle truncate" style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/8 px-2 py-1 text-[11px] text-muted-foreground shrink-0">
        <span>
          {table.getFilteredRowModel().rows.length} rows
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount() || 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
