'use client';

import type {
  CellClickedEvent,
  CellValueChangedEvent,
  ColDef,
  GridReadyEvent,
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import type { WorksheetFieldMeta } from '@/lib/worksheets/core/db/zod-meta';
import type {
  ColumnConfig,
  WorksheetConfig,
} from '@/lib/worksheets/core/types';

import type { WorksheetRowData } from './useWorksheetRows';
import { useWorksheetStore } from './useWorksheetStore';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface WorksheetGridProps {
  worksheetConfig: WorksheetConfig;
  rows: WorksheetRowData[];
  loading: boolean;
  quickFilterText?: string;
  rowHeight?: number;
  onSelectionChange?: (
    cellOrRange: {
      rowId?: string;
      field?: string;
      rowIds?: string[];
      fields?: string[];
      selectedCells?: { rowId: string; field: string }[];
    } | null,
  ) => void;
  onCellValueChange?: (
    rowId: string,
    rawPayload: Partial<Record<string, unknown>>,
  ) => void | Promise<void>;
  onGridReady?: () => void;
  gridRef?: React.RefObject<AgGridReact | null>;
}

function buildRowData(rows: WorksheetRowData[]) {
  return rows.map((r) => ({
    id: r.id,
    worksheetId: r.worksheetId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.rawPayload as Record<string, any>),
  }));
}

const DEFAULT_UI_STATE = {
  rowHeights: {},
  pinnedRows: [],
  pinnedCols: [],
  hiddenCols: [] as string[],
  cellStyles: {},
  columnWidths: {},
};

export function WorksheetGrid({
  worksheetConfig,
  rows,
  loading,
  quickFilterText,
  rowHeight = 40,
  onSelectionChange,
  onCellValueChange,
  onGridReady,
  gridRef: externalGridRef,
}: WorksheetGridProps) {
  const internalGridRef = useRef<AgGridReact>(null);
  const gridRef = externalGridRef || internalGridRef;

  const uiState = useWorksheetStore(
    (state) => state.uiStateByWorksheet[worksheetConfig.id] || DEFAULT_UI_STATE,
  );
  const selection = useWorksheetStore((state) => state.selection);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const [anchorCell, setAnchorCell] = useState<{
    rowIndex: number;
    colId: string;
    rowId: string;
    field: string;
  } | null>(null);
  const [asyncSelectOptionsByField, setAsyncSelectOptionsByField] = useState<
    Record<string, { label: string; value: string | number }[]>
  >({});

  useEffect(() => {
    const asyncCols = (worksheetConfig.columns ?? []).filter(
      (c) => c.type === 'asyncSelect',
    );
    if (!asyncCols.length) {
      setAsyncSelectOptionsByField({});
      return;
    }

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        asyncCols.map(async (col) => {
          try {
            const url = new URL(
              '/api/worksheets/options',
              window.location.origin,
            );
            url.searchParams.set('worksheetId', worksheetConfig.id);
            url.searchParams.set('field', col.field);
            url.searchParams.set('query', '');
            const res = await fetch(url.toString());
            if (!res.ok) return [col.field, []] as const;
            const data = (await res.json()) as {
              options?: { label: string; value: string | number }[];
            };
            return [col.field, data.options ?? []] as const;
          } catch {
            return [col.field, []] as const;
          }
        }),
      );
      if (cancelled) return;
      setAsyncSelectOptionsByField(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [worksheetConfig.id, worksheetConfig.columns]);

  const columnConfigToAgGrid = useCallback(
    (col: ColumnConfig): ColDef => {
      const hiddenCols = uiState.hiddenCols || [];
      const zodSchema =
        'zodSchema' in col
          ? (col as { zodSchema?: z.ZodTypeAny }).zodSchema
          : undefined;
      const meta = (
        zodSchema as unknown as { meta?: () => unknown } | undefined
      )?.meta?.() as WorksheetFieldMeta | undefined;
      const uiMeta = meta?.ui;

      const defaultPinned = uiMeta?.pinned;
      const isPinned = uiState.pinnedCols.includes(col.field)
        ? 'left'
        : defaultPinned;
      const customWidth = uiState.columnWidths[col.field];

      const baseColDef: ColDef = {
        field: col.field,
        headerName: col.label,
        width: customWidth ?? col.width ?? uiMeta?.width ?? 150,
        pinned: isPinned,
        hide:
          !!col.hidden || !!uiMeta?.hidden || hiddenCols.includes(col.field),
        editable: col.type !== 'computed' && col.type !== 'actions', // Inline editing enabled
        sortable: col.type !== 'actions',
        filter: col.type !== 'actions',
        headerClass:
          (col.align ?? uiMeta?.align)
            ? `ag-${col.align ?? uiMeta?.align}-aligned-header text-${col.align ?? uiMeta?.align}`
            : undefined,
        cellClassRules: {
          'bg-blue-100/30 outline outline-1 outline-blue-500/50 z-10 relative':
            (params) => {
              const rowId = params.data?.id;
              const field = col.field;
              if (!rowId) return false;
              const sel = selectionRef.current;
              if (sel.type === 'cell')
                return sel.rowId === rowId && sel.field === field;
              if (sel.type === 'range' && sel.selectedCells?.length) {
                return sel.selectedCells.some(
                  (c) => c.rowId === rowId && c.field === field,
                );
              }
              return false;
            },
        },
        cellStyle: (params) => {
          const rowId = params.data?.id;
          const field = col.field;
          if (!rowId) return null;
          const sel = selectionRef.current;
          const isSelected =
            sel.type === 'cell'
              ? sel.rowId === rowId && sel.field === field
              : !!(
                  sel.type === 'range' &&
                  sel.selectedCells?.some(
                    (c) => c.rowId === rowId && c.field === field,
                  )
                );

          const style: any = {};
          if (col.align ?? uiMeta?.align) {
            style.textAlign = col.align ?? uiMeta?.align;
          }

          if (isSelected) {
            style.border = '1px solid rgba(59, 130, 246, 0.5)';
          }

          const cStyle = uiState.cellStyles[rowId]?.[col.field];
          if (cStyle) {
            if (cStyle.backgroundColor)
              style.backgroundColor = cStyle.backgroundColor;
            if (cStyle.color) style.color = cStyle.color;
            if (cStyle.fontSize) style.fontSize = `${cStyle.fontSize}px`;
            if (cStyle.fontFamily) style.fontFamily = cStyle.fontFamily;
            if (cStyle.fontWeight) style.fontWeight = cStyle.fontWeight;
            if (cStyle.fontStyle) style.fontStyle = cStyle.fontStyle;
            if (cStyle.textDecoration)
              style.textDecoration = cStyle.textDecoration;
            if (cStyle.borderTop) style.borderTop = cStyle.borderTop;
            if (cStyle.borderRight) style.borderRight = cStyle.borderRight;
            if (cStyle.borderBottom) style.borderBottom = cStyle.borderBottom;
            if (cStyle.borderLeft) style.borderLeft = cStyle.borderLeft;
            if (cStyle.border && !isSelected) style.border = cStyle.border;
          }

          if (
            !isSelected &&
            col.type !== 'computed' &&
            col.type !== 'actions' &&
            col.zodSchema &&
            params.data
          ) {
            const value = params.data[col.field];
            const result = col.zodSchema.safeParse(value);
            if (!result.success) {
              style.border = '2px solid rgb(239 68 68)';
            }
          }

          return Object.keys(style).length > 0 ? style : null;
        },
      };

      if (col.type === 'number') {
        baseColDef.cellEditor = 'agNumberCellEditor';
      } else if (col.type === 'date') {
        baseColDef.cellEditor = 'agDateCellEditor';
      } else if (col.type === 'enum') {
        baseColDef.cellEditor = 'agSelectCellEditor';
        const options = (
          col as import('@/lib/worksheets/core/types').EnumColumnConfig
        ).options;
        if (options) {
          baseColDef.cellEditorParams = {
            values: options.map((o: any) =>
              typeof o === 'object' ? o.value : o,
            ),
          };
        }
      } else if (col.type === 'text' || col.type === 'email') {
        baseColDef.cellEditor = 'agTextCellEditor';
      } else if (col.type === 'asyncSelect') {
        baseColDef.cellEditor = 'agSelectCellEditor';
        const options = asyncSelectOptionsByField[col.field] ?? [];
        baseColDef.cellEditorParams = {
          values: options.map((o) => String(o.value)),
        };
        baseColDef.valueFormatter = (p) => {
          const value = p.value == null ? '' : String(p.value);
          const match = options.find((o) => String(o.value) === value);
          return match?.label ?? value;
        };
      }

      if (col.type === 'computed') {
        baseColDef.valueGetter = (params) => {
          if (!params.data) return undefined;
          try {
            const rowIndex =
              typeof params.node?.rowIndex === 'number'
                ? params.node.rowIndex
                : -1;
            const allRows: Record<string, unknown>[] = [];
            const rowCount = params.api.getDisplayedRowCount();
            for (let i = 0; i < rowCount; i += 1) {
              const node = params.api.getDisplayedRowAtIndex(i);
              if (node?.data)
                allRows.push(node.data as Record<string, unknown>);
            }
            return (
              col as import('@/lib/worksheets/core/types').ComputedColumnConfig
            ).valueGetter(params.data, {
              window: {
                allRows,
                rowIndex: Math.max(0, rowIndex),
              },
            });
          } catch (e) {
            console.error('Computed column error', e);
            return null;
          }
        };
        return baseColDef;
      }

      if (col.type === 'actions') {
        baseColDef.cellRenderer = (params: any) => {
          if (!params.data) return null;
          return (
            <div className="flex h-full items-center gap-2 px-1">
              {(
                col as import('@/lib/worksheets/core/types').ActionsColumnConfig
              ).actions.map((actionDef) => (
                <button
                  key={actionDef.id}
                  type="button"
                  className={`cursor-default rounded-none border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    actionDef.variant === 'destructive'
                      ? 'bg-red-600 text-white'
                      : 'bg-black text-white'
                  }`}
                >
                  {actionDef.label}
                </button>
              ))}
            </div>
          );
        };
        return baseColDef;
      }

      if (col.type === 'json') {
        baseColDef.cellRenderer = (params: any) => {
          const value = params.value;
          if (value == null) return '';
          return (
            `<span class="text-xs text-muted-foreground font-mono truncate block max-w-full">` +
            (typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)) +
            `</span>`
          );
        };
      }

      // Add value formatter if configured by code
      if (col.valueFormatter) {
        baseColDef.valueFormatter = (p) => col.valueFormatter!(p.value);
      } else if (col.type === 'number') {
        const numCol =
          col as import('@/lib/worksheets/core/types').NumberColumnConfig;
        if (numCol.numberFormat) {
          baseColDef.valueFormatter = (p) => {
            if (p.value == null || p.value === '') return '';
            const num = Number(p.value);
            if (isNaN(num)) return String(p.value);
            if (numCol.numberFormat === 'currency') {
              const currency =
                numCol.currencyField && p.data
                  ? p.data[numCol.currencyField] || 'USD'
                  : 'USD';
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: String(currency),
                maximumFractionDigits: numCol.decimalPlaces ?? 2,
              }).format(num);
            } else if (numCol.numberFormat === 'percent') {
              return new Intl.NumberFormat('en-US', {
                style: 'percent',
                maximumFractionDigits: numCol.decimalPlaces ?? 2,
              }).format(num / 100);
            } else {
              return new Intl.NumberFormat('en-US', {
                maximumFractionDigits: numCol.decimalPlaces ?? 2,
              }).format(num);
            }
          };
        }
      } else if (col.type === 'date') {
        const dateCol =
          col as import('@/lib/worksheets/core/types').DateColumnConfig;
        if (dateCol.dateFormat) {
          baseColDef.valueFormatter = (p) => {
            if (!p.value) return '';
            try {
              const date = new Date(p.value);
              if (isNaN(date.getTime())) return p.value;
              if (dateCol.dateFormat === 'iso') return date.toISOString();
              return new Intl.DateTimeFormat('en-US', {
                dateStyle: dateCol.dateFormat as
                  | 'short'
                  | 'medium'
                  | 'long'
                  | 'full',
              }).format(date);
            } catch (e) {
              return p.value;
            }
          };
        }
      }

      return baseColDef;
    },
    [uiState, asyncSelectOptionsByField],
  );

  const columnDefs = useMemo<ColDef[]>(() => {
    const pinnedCols = uiState.pinnedCols || [];
    const hiddenCols = uiState.hiddenCols || [];

    const idCol: ColDef | null =
      worksheetConfig.idColumn !== false
        ? {
            field: 'id',
            headerName:
              typeof worksheetConfig.idColumn === 'object'
                ? (worksheetConfig.idColumn.label ?? 'ID')
                : 'ID',
            width:
              typeof worksheetConfig.idColumn === 'object'
                ? (worksheetConfig.idColumn.width ?? 140)
                : 140,
            pinned: pinnedCols.includes('id') ? 'left' : undefined,
            hide: hiddenCols.includes('id'),
            editable: false,
            sortable: true,
            filter: true,
          }
        : null;

    const createdAtCol: ColDef | null =
      worksheetConfig.createdAtColumn !== false
        ? {
            field: 'createdAt',
            headerName:
              typeof worksheetConfig.createdAtColumn === 'object'
                ? (worksheetConfig.createdAtColumn.label ?? 'Created')
                : 'Created',
            width:
              typeof worksheetConfig.createdAtColumn === 'object'
                ? (worksheetConfig.createdAtColumn.width ?? 170)
                : 170,
            editable: false,
            sortable: true,
            filter: true,
            pinned: pinnedCols.includes('createdAt') ? 'left' : undefined,
            hide: hiddenCols.includes('createdAt'),
          }
        : null;

    const updatedAtCol: ColDef | null =
      worksheetConfig.updatedAtColumn !== false
        ? {
            field: 'updatedAt',
            headerName:
              typeof worksheetConfig.updatedAtColumn === 'object'
                ? (worksheetConfig.updatedAtColumn.label ?? 'Updated')
                : 'Updated',
            width:
              typeof worksheetConfig.updatedAtColumn === 'object'
                ? (worksheetConfig.updatedAtColumn.width ?? 170)
                : 170,
            editable: false,
            sortable: true,
            filter: true,
            pinned: pinnedCols.includes('updatedAt') ? 'left' : undefined,
            hide: hiddenCols.includes('updatedAt'),
          }
        : null;

    const dataCols = (worksheetConfig.columns ?? []).map(columnConfigToAgGrid);
    const cols: ColDef[] = [];
    cols.push(...dataCols);
    if (idCol) cols.push(idCol);
    if (createdAtCol) cols.push(createdAtCol);
    if (updatedAtCol) cols.push(updatedAtCol);
    return cols;
  }, [
    worksheetConfig,
    columnConfigToAgGrid,
    uiState.pinnedCols,
    uiState.hiddenCols,
  ]);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || !columnDefs.length) return;
    const pinnedCols = uiState.pinnedCols || [];
    const state = columnDefs
      .filter((c) => c.colId != null || c.field != null)
      .map((c) => {
        const id = (c.colId ?? c.field) as string;
        const pinned: 'left' | 'right' | null = pinnedCols.includes(id)
          ? 'left'
          : null;
        return { colId: id, pinned };
      });
    api.applyColumnState({ state, applyOrder: true });
  }, [uiState.pinnedCols, columnDefs]);

  const rowDataRaw = useMemo(() => buildRowData(rows), [rows]);
  const hiddenRows = uiState.hiddenRows || [];

  const pinnedTopRowData = useMemo(() => {
    return rowDataRaw.filter(
      (r) => uiState.pinnedRows.includes(r.id) && !hiddenRows.includes(r.id),
    );
  }, [rowDataRaw, uiState.pinnedRows, hiddenRows]);

  const rowData = useMemo(() => {
    return rowDataRaw.filter(
      (r) => !uiState.pinnedRows.includes(r.id) && !hiddenRows.includes(r.id),
    );
  }, [rowDataRaw, uiState.pinnedRows, hiddenRows]);

  const handleCellClicked = useCallback(
    (event: CellClickedEvent) => {
      if (!event.data?.id || !event.colDef.field || !event.api) return;

      const rowId = String(event.data.id);
      const field = event.colDef.field;
      const rowIndex = event.rowIndex;

      if (rowIndex === null) return;

      const ev = event.event as MouseEvent | undefined;
      const isCtrl = ev?.ctrlKey || ev?.metaKey;
      const isShift = ev?.shiftKey;

      let newSelectedCells = selection.selectedCells
        ? [...selection.selectedCells]
        : [];

      if (isShift && anchorCell) {
        // Calculate range
        const allCols = event.api.getColumns() || [];
        const colIds = allCols.map((c) => c.getColId());
        const anchorColIdx = colIds.indexOf(anchorCell.colId);
        const targetColIdx = colIds.indexOf(field);

        const minColIdx = Math.min(anchorColIdx, targetColIdx);
        const maxColIdx = Math.max(anchorColIdx, targetColIdx);
        const minRowIdx = Math.min(anchorCell.rowIndex, rowIndex);
        const maxRowIdx = Math.max(anchorCell.rowIndex, rowIndex);

        const rangeCells: { rowId: string; field: string }[] = [];
        for (let r = minRowIdx; r <= maxRowIdx; r++) {
          const rowNode = event.api.getDisplayedRowAtIndex(r);
          if (rowNode && rowNode.data) {
            for (let c = minColIdx; c <= maxColIdx; c++) {
              rangeCells.push({
                rowId: String(rowNode.data.id),
                field: colIds[c],
              });
            }
          }
        }

        if (isCtrl) {
          // Append range to current selection
          rangeCells.forEach((rc) => {
            if (
              !newSelectedCells.some(
                (sc) => sc.rowId === rc.rowId && sc.field === rc.field,
              )
            ) {
              newSelectedCells.push(rc);
            }
          });
        } else {
          newSelectedCells = rangeCells;
        }
      } else if (isCtrl) {
        setAnchorCell({ rowIndex, colId: field, rowId, field });

        // If we only had a single cell selection before, make sure it's in the array
        if (selection.type === 'cell' && selection.rowId && selection.field) {
          if (
            !newSelectedCells.some(
              (sc) =>
                sc.rowId === selection.rowId && sc.field === selection.field,
            )
          ) {
            newSelectedCells.push({
              rowId: selection.rowId,
              field: selection.field,
            });
          }
        }

        const existingIdx = newSelectedCells.findIndex(
          (sc) => sc.rowId === rowId && sc.field === field,
        );
        if (existingIdx >= 0) {
          newSelectedCells.splice(existingIdx, 1);
        } else {
          newSelectedCells.push({ rowId, field });
        }
      } else {
        setAnchorCell({ rowIndex, colId: field, rowId, field });
        newSelectedCells = [{ rowId, field }];
      }

      onSelectionChange?.({
        selectedCells: newSelectedCells,
      });
    },
    [selection, anchorCell, onSelectionChange],
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (
        event.data?.id &&
        event.colDef.field &&
        event.newValue !== event.oldValue
      ) {
        onCellValueChange?.(String(event.data.id), {
          [event.colDef.field]: event.newValue,
        });
        // Re-run cellStyle so validation border updates when value becomes valid
        event.api.refreshCells({ rowNodes: [event.node], force: true });
      }
    },
    [onCellValueChange],
  );

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      onGridReady?.();
    },
    [onGridReady],
  );

  const gridKey =
    selection.type === 'cell' && selection.rowId && selection.field
      ? `sel-${selection.rowId}-${selection.field}`
      : selection.type === 'range' && selection.selectedCells?.length
        ? `sel-${selection.selectedCells
            .map((c) => `${c.rowId}-${c.field}`)
            .sort()
            .join('|')}`
        : 'sel-none';

  return (
    <div className="size-full bg-white">
      <AgGridReact
        key={gridKey}
        ref={gridRef as React.RefObject<AgGridReact>}
        rowData={rowData}
        pinnedTopRowData={pinnedTopRowData}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        rowHeight={rowHeight}
        headerHeight={30}
        rowSelection="multiple"
        cellSelection={true}
        // suppressRowClickSelection={true}
        // enableRangeSelection={true}
        onCellClicked={handleCellClicked}
        onCellValueChanged={handleCellValueChanged}
        onGridReady={handleGridReady}
        quickFilterText={quickFilterText}
        loading={loading}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
        }}
      />
    </div>
  );
}
