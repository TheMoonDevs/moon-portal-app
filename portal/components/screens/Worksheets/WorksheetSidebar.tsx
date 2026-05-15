'use client';

import {
  Eye,
  EyeOff,
  MousePointer2,
  Pin,
  PinOff,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select as SelectUI,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WorksheetFieldMeta } from '@/lib/worksheets/core/db/zod-meta';
import type {
  ColumnConfig,
  ComputedColumnConfig,
  WorksheetConfig,
} from '@/lib/worksheets/core/types';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import { useWorksheetStore } from './useWorksheetStore';

interface WorksheetSidebarProps {
  worksheetConfig: WorksheetConfig;
  rowData?: Record<string, unknown> | null;
  fullRowData?: Record<string, unknown> | null;
  selectedRowIds?: string[];
  allRowIds?: string[];
  onDeleteRows?: (ids: string[]) => void | Promise<void>;
  onCellValueChange?: (
    rowId: string,
    field: string,
    value: any,
  ) => void | Promise<void>;
  onBulkValueChange?: (
    updates: { rowId: string; field: string; value: any }[],
  ) => void | Promise<void>;
  onRunActions?: (
    field: string,
    actionId: string,
    rowIds: string[],
  ) => void | Promise<void>;
}

const DEFAULT_UI_STATE = {
  rowHeights: {} as Record<string, number>,
  pinnedRows: [] as string[],
  pinnedCols: [] as string[],
  hiddenRows: [] as string[],
  hiddenCols: [] as string[],
  cellStyles: {} as Record<string, Record<string, any>>,
  columnWidths: {} as Record<string, number>,
};

export function WorksheetSidebar({
  worksheetConfig,
  rowData,
  fullRowData = null,
  selectedRowIds = [],
  allRowIds = [],
  onDeleteRows,
  onCellValueChange,
  onBulkValueChange,
  onRunActions,
}: WorksheetSidebarProps) {
  const store = useWorksheetStore();
  const selection = store.selection;

  const selectedCell =
    selection.type === 'cell' && selection.rowId && selection.field
      ? { rowId: selection.rowId, field: selection.field }
      : null;

  const selectedRange =
    selection.type === 'row' && selection.rowIds && selection.fields
      ? { rowIds: selection.rowIds, fields: selection.fields }
      : null;

  const uiState =
    store.uiStateByWorksheet[worksheetConfig.id] || DEFAULT_UI_STATE;

  const safeUiState = {
    ...uiState,
    rowHeights: uiState.rowHeights || {},
    pinnedRows: uiState.pinnedRows || [],
    hiddenRows: uiState.hiddenRows || [],
    hiddenCols: uiState.hiddenCols || [],
    cellStyles: uiState.cellStyles || {},
  };

  const hasSelection =
    !!selectedCell ||
    (selectedRange && selectedRange.rowIds.length > 0) ||
    (selection.selectedCells && selection.selectedCells.length > 0);

  const isMulti =
    (selectedRange && selectedRange.rowIds.length > 0) ||
    (selection.selectedCells && selection.selectedCells.length > 1);

  const selectedCells: { rowId: string; field: string }[] =
    selection.selectedCells || (selectedCell ? [selectedCell] : []);

  const uniqueFields = Array.from(new Set(selectedCells.map((c) => c.field)));

  const columns = uniqueFields
    .map((f) => (worksheetConfig.columns ?? []).find((c) => c.field === f))
    .filter(Boolean) as ColumnConfig[];

  const column = columns.length === 1 ? columns[0] : null;

  const getColumnMeta = useCallback(
    (col?: ColumnConfig | null): WorksheetFieldMeta | undefined => {
      if (!col || !('zodSchema' in col)) return undefined;
      const zodSchema = (col as { zodSchema?: z.ZodTypeAny }).zodSchema;
      return (
        zodSchema as unknown as { meta?: () => unknown } | undefined
      )?.meta?.() as WorksheetFieldMeta | undefined;
    },
    [],
  );

  const isComputedOnly =
    columns.length > 0 && columns.every((c) => c.type === 'computed');
  const isActionsOnly =
    columns.length > 0 && columns.every((c) => c.type === 'actions');

  const rawVal =
    !isMulti && column && rowData ? rowData[column.field] : undefined;

  const validationResult = useMemo(() => {
    if (!column || column.type === 'computed' || column.type === 'actions')
      return { error: null, hasSchema: false };
    const schema =
      'zodSchema' in column
        ? (column as { zodSchema?: z.ZodTypeAny }).zodSchema
        : undefined;
    if (!schema) return { error: null, hasSchema: false };
    if (!rowData) return { error: null, hasSchema: true };
    const result = schema.safeParse(rowData[column.field]);
    if (result.success) return { error: null, hasSchema: true };
    const err = result.error;
    const messages = err.issues?.length
      ? err.issues.map((e: { message: string }) => e.message).filter(Boolean)
      : [err.message || 'Validation failed'];
    return { error: messages.join(' • '), hasSchema: true };
  }, [column, rowData]);

  const columnMeta = useMemo(
    () => getColumnMeta(column),
    [column, getColumnMeta],
  );

  const validationHint: string | null = columnMeta?.ui?.validationHint ?? null;

  const computedCellValue = useMemo(() => {
    if (column?.type !== 'computed' || !fullRowData) return undefined;
    try {
      const v = (column as ComputedColumnConfig).valueGetter(
        fullRowData as Record<string, any>,
      );
      return v === undefined || v === null ? '' : String(v);
    } catch {
      return undefined;
    }
  }, [column, fullRowData]);

  const formattedCurrentValue = useMemo(() => {
    if (rawVal === undefined || rawVal === null) return '';
    if (column?.type === 'date') {
      try {
        const d = new Date(rawVal as string);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch {
        // ignore
      }
    }
    return String(rawVal);
  }, [rawVal, column]);

  const [editValue, setEditValue] = useState<string>('');

  const selectionKey = selectedCells
    .map((c) => `${c.rowId}-${c.field}`)
    .join('|');

  useEffect(() => {
    setEditValue(formattedCurrentValue);
  }, [formattedCurrentValue, selectionKey]);

  const [asyncOptions, setAsyncOptions] = useState<
    { label: string; value: string | number }[]
  >([]);
  const [asyncLoading, setAsyncLoading] = useState(false);

  useEffect(() => {
    if (column?.type === 'asyncSelect') {
      const fetchOpts = async () => {
        setAsyncLoading(true);
        try {
          const res = await fetch(
            `/api/worksheets/options?worksheetId=${encodeURIComponent(
              worksheetConfig.id,
            )}&field=${encodeURIComponent(column.field)}&query=`,
            {
              headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
            },
          );
          const json = await res.json();
          if (!res.ok)
            throw new Error(json?.error || 'Failed to fetch options');
          setAsyncOptions(
            (json?.options ?? []) as {
              label: string;
              value: string | number;
            }[],
          );
        } catch (e) {
          console.error('Failed to fetch async options', e);
          setAsyncOptions([]);
        } finally {
          setAsyncLoading(false);
        }
      };
      fetchOpts();
    } else {
      setAsyncOptions([]);
    }
  }, [column]);

  const handleSaveEdit = async () => {
    if (isMulti && onBulkValueChange && selectedCells.length > 0) {
      const updates = selectedCells.map((c) => {
        const colDef = (worksheetConfig.columns ?? []).find(
          (col) => col.field === c.field,
        );
        let finalValue: any = editValue;
        if (colDef?.type === 'number') {
          finalValue = editValue === '' ? null : Number(editValue);
        }
        return { rowId: c.rowId, field: c.field, value: finalValue };
      });
      try {
        await onBulkValueChange(updates);
      } catch (e) {
        console.error('Failed to save bulk edit:', e);
        alert('Failed to save values.');
      }
    } else if (selectedCell && onCellValueChange) {
      let finalValue: any = editValue;
      if (column?.type === 'number') {
        finalValue = editValue === '' ? null : Number(editValue);
      }
      try {
        await onCellValueChange(
          selectedCell.rowId,
          selectedCell.field,
          finalValue,
        );
      } catch (e) {
        console.error('Failed to save edit:', e);
        alert('Failed to save value.');
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'record' | 'columns'>('record');

  const allColumnsForTab: {
    field: string;
    label: string;
    googleForm?: { questionTitle: string; questionType?: string };
  }[] = useMemo(() => {
    const cols: {
      field: string;
      label: string;
      googleForm?: { questionTitle: string; questionType?: string };
    }[] = [];
    (worksheetConfig.columns ?? []).forEach((c) => {
      const meta = getColumnMeta(c);
      cols.push({
        field: c.field,
        label: c.label,
        googleForm: meta?.googleForm,
      });
    });
    if (worksheetConfig.idColumn !== false) {
      cols.push({
        field: 'id',
        label:
          typeof worksheetConfig.idColumn === 'object'
            ? (worksheetConfig.idColumn?.label ?? 'ID')
            : 'ID',
      });
    }
    if (worksheetConfig.createdAtColumn !== false) {
      cols.push({
        field: 'createdAt',
        label:
          typeof worksheetConfig.createdAtColumn === 'object'
            ? (worksheetConfig.createdAtColumn?.label ?? 'Created')
            : 'Created',
      });
    }
    if (worksheetConfig.updatedAtColumn !== false) {
      cols.push({
        field: 'updatedAt',
        label:
          typeof worksheetConfig.updatedAtColumn === 'object'
            ? (worksheetConfig.updatedAtColumn?.label ?? 'Updated')
            : 'Updated',
      });
    }
    return cols;
  }, [worksheetConfig, getColumnMeta]);

  return (
    <div className="flex size-full flex-col bg-white font-sans text-black">
      {/* Tabs header */}
      <div className="flex border-b border-black">
        <button
          className={`flex-1 border-r border-black py-2 text-xs font-bold uppercase tracking-widest last:border-r-0 ${
            activeTab === 'record'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('record')}
        >
          Record
        </button>
        <button
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest ${
            activeTab === 'columns'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('columns')}
        >
          Columns
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'columns' ? (
          <div className="flex flex-col gap-6">
            <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Label className="mb-2 block text-xs font-bold uppercase">
                Columns
              </Label>
              <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                {allColumnsForTab.map((col) => {
                  const isHidden = safeUiState.hiddenCols.includes(col.field);
                  const isPinned = safeUiState.pinnedCols.includes(col.field);
                  return (
                    <div
                      key={col.field}
                      className="flex flex-col gap-0.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {col.label}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-16 rounded-none px-1 text-[10px]"
                            onClick={() =>
                              store.toggleHiddenCol(
                                worksheetConfig.id,
                                col.field,
                              )
                            }
                          >
                            {isHidden ? (
                              <>
                                <EyeOff className="mr-1 size-3" />
                                Show
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 size-3" />
                                Hide
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-20 rounded-none px-1 text-[10px]"
                            onClick={() =>
                              store.togglePinnedCol(
                                worksheetConfig.id,
                                col.field,
                              )
                            }
                          >
                            {isPinned ? (
                              <>
                                <PinOff className="mr-1 size-3" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="mr-1 size-3" />
                                Pin
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {col.googleForm && (
                        <p className="text-[10px] text-blue-700">
                          Form: {col.googleForm.questionTitle}
                          {col.googleForm.questionType
                            ? ` (${col.googleForm.questionType})`
                            : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {!hasSelection ? (
              <div className="flex h-full flex-col items-center justify-center border border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <MousePointer2
                  className="mb-3 size-10 text-black"
                  strokeWidth={1}
                />
                <p className="text-xs font-medium uppercase tracking-wider">
                  Select a cell to view/edit
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Cell / Group Properties */}
                <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="mb-4 border-b border-black pb-2 text-sm font-bold uppercase tracking-widest">
                    {isMulti ? 'Group Properties' : 'Cell Properties'}
                  </h3>

                  {column && (
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <Label className="text-xs font-bold uppercase">
                          Column
                        </Label>
                        <span className="text-xs font-medium">
                          {column.label}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <Label className="text-xs font-bold uppercase">
                          Field
                        </Label>
                        <span className="border border-black bg-gray-100 px-1 font-mono text-xs">
                          {column.field}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <Label className="text-xs font-bold uppercase">
                          Type
                        </Label>
                        <span className="border border-black px-1 text-xs uppercase tracking-wider">
                          {column.type}
                        </span>
                      </div>

                      {columnMeta?.googleForm && (
                        <div className="rounded border border-black bg-blue-50/80 p-2">
                          <Label className="mb-1 block text-xs font-bold uppercase text-blue-900">
                            Google Form mapping
                          </Label>
                          <div className="flex flex-col gap-1 text-xs text-blue-900">
                            <span>
                              <span className="font-medium">Question:</span>{' '}
                              {columnMeta.googleForm.questionTitle}
                            </span>
                            <span>
                              <span className="font-medium">Type:</span>{' '}
                              {columnMeta.googleForm.questionType ?? '—'}
                            </span>
                          </div>
                        </div>
                      )}

                      {validationResult.hasSchema && selectedCell && (
                        <div className="mt-4 space-y-2">
                          <div className="rounded border border-black bg-gray-50 p-2">
                            <Label className="mb-1 block text-xs font-bold uppercase">
                              Validation rules
                            </Label>
                            <p className="text-xs text-gray-800">
                              {validationHint ||
                                'This field has validation rules.'}
                            </p>
                          </div>
                          {validationResult.error && (
                            <div className="rounded border-2 border-red-500 bg-red-50 p-3">
                              <Label className="mb-1 block text-xs font-bold uppercase text-red-700">
                                Validation error
                              </Label>
                              <p className="text-xs text-red-800">
                                {validationResult.error}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {(selectedCell || (isMulti && column)) &&
                        !isComputedOnly &&
                        !isActionsOnly && (
                          <div className="mt-4 flex flex-col gap-2 border-t border-black pt-4">
                            <Label className="text-xs font-bold uppercase">
                              {isMulti
                                ? 'Bulk Edit Value (same for all)'
                                : 'Edit Value'}
                            </Label>
                            <div className="flex flex-col gap-2">
                              {column.type === 'enum' && 'options' in column ? (
                                <SelectUI
                                  value={editValue}
                                  onValueChange={setEditValue}
                                >
                                  <SelectTrigger className="h-8 rounded-none border-black text-xs focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-none border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    {(
                                      (column.options as {
                                        label: string;
                                        value: string | number;
                                      }[]) || []
                                    ).map((v) => {
                                      const valStr =
                                        typeof v === 'object'
                                          ? String(v.value)
                                          : String(v);
                                      const labelStr =
                                        typeof v === 'object'
                                          ? v.label
                                          : String(v);
                                      return (
                                        <SelectItem
                                          key={valStr}
                                          value={valStr}
                                          className="rounded-none text-xs focus:bg-black focus:text-white"
                                        >
                                          {labelStr}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </SelectUI>
                              ) : column.type === 'asyncSelect' ? (
                                <div className="flex gap-2">
                                  <SelectUI
                                    value={editValue}
                                    onValueChange={setEditValue}
                                  >
                                    <SelectTrigger className="h-8 rounded-none border-black text-xs focus:ring-0 focus:ring-offset-0">
                                      <SelectValue
                                        placeholder={
                                          asyncLoading
                                            ? 'Loading...'
                                            : 'Select...'
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                      {(asyncOptions || []).map((v) => (
                                        <SelectItem
                                          key={String(v.value)}
                                          value={String(v.value)}
                                          className="rounded-none text-xs focus:bg-black focus:text-white"
                                        >
                                          {v.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </SelectUI>
                                  {asyncLoading && (
                                    <RefreshCw className="my-auto size-4 animate-spin" />
                                  )}
                                </div>
                              ) : (
                                <Input
                                  type={
                                    column.type === 'number'
                                      ? 'number'
                                      : column.type === 'date'
                                        ? 'date'
                                        : column.type === 'email'
                                          ? 'email'
                                          : 'text'
                                  }
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit();
                                    }
                                  }}
                                  className="h-8 rounded-none border-black text-xs focus-visible:border-black focus-visible:ring-0"
                                />
                              )}
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveEdit}
                                className="mt-2 h-8 rounded-none border-2 border-black bg-white text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white"
                              >
                                <Save className="mr-2 size-3" />
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        )}

                      {selectedCell && isComputedOnly && (
                        <div className="mt-4 border-t border-black pt-4">
                          <Label className="mb-1 block text-xs font-bold uppercase">
                            Value (read-only)
                          </Label>
                          <div className="rounded border border-black bg-gray-100 px-2 py-1.5 font-mono text-xs">
                            {computedCellValue !== undefined
                              ? computedCellValue
                              : '—'}
                          </div>
                          <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
                            Computed cell (read-only)
                          </p>
                        </div>
                      )}

                      {column?.type === 'actions' && isActionsOnly && (
                        <div className="mt-4 border-t border-black pt-4">
                          <Label className="mb-2 block text-xs font-bold uppercase">
                            Actions
                          </Label>
                          <p className="mb-2 text-[11px] text-gray-600">
                            {isMulti
                              ? 'Run actions for all selected rows.'
                              : 'Run actions for this row.'}
                          </p>
                          <div className="flex flex-col gap-2">
                            {(column as any).actions?.map((action: any) => {
                              const actionRowIds = Array.from(
                                new Set(
                                  (selectedCells || [])
                                    .filter((c) => c.field === column.field)
                                    .map((c) => c.rowId),
                                ),
                              );
                              const targetRowIds =
                                actionRowIds.length > 0
                                  ? actionRowIds
                                  : selectedRowIds.length > 0
                                    ? selectedRowIds
                                    : selectedCell
                                      ? [selectedCell.rowId]
                                      : [];
                              const count = targetRowIds.length;
                              const disabled = !onRunActions || count === 0;
                              return (
                                <Button
                                  key={action.id}
                                  type="button"
                                  size="sm"
                                  disabled={disabled}
                                  onClick={() => {
                                    if (!onRunActions || count === 0) return;
                                    onRunActions(
                                      column.field,
                                      action.id,
                                      targetRowIds,
                                    );
                                  }}
                                  className="h-8 rounded-none border-2 border-black bg-white text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
                                >
                                  {isMulti && count > 1
                                    ? `Run ${action.label} for ${count} row${
                                        count > 1 ? 's' : ''
                                      }`
                                    : `Run ${action.label}`}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {hasSelection && (
                        <div className="mt-4 border-t border-black pt-4">
                          <Label className="text-xs font-bold uppercase">
                            {isMulti ? 'Bulk Cell Styling' : 'Cell Styling'}
                          </Label>
                          <div className="mt-2 flex flex-col gap-3">
                            <div className="flex gap-2">
                              <div className="flex flex-1 flex-col gap-1">
                                <Label className="text-[10px] uppercase">
                                  Background
                                </Label>
                                <div className="flex gap-2">
                                  <ColorPicker
                                    color={
                                      safeUiState.cellStyles[
                                        selectedCell?.rowId || ''
                                      ]?.[selectedCell?.field || '']
                                        ?.backgroundColor || ''
                                    }
                                    defaultColor="#ffffff"
                                    onChange={(color) => {
                                      if (isMulti)
                                        store.bulkSetCellStyles(
                                          worksheetConfig.id,
                                          selectedCells,
                                          { backgroundColor: color },
                                        );
                                      else if (selectedCell)
                                        store.setCellStyles(
                                          worksheetConfig.id,
                                          selectedCell.rowId,
                                          selectedCell.field,
                                          { backgroundColor: color },
                                        );
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-8 rounded-none border-black text-[10px]"
                                    onClick={() => {
                                      if (isMulti)
                                        store.bulkSetCellStyles(
                                          worksheetConfig.id,
                                          selectedCells,
                                          { backgroundColor: '' },
                                        );
                                      else if (selectedCell)
                                        store.setCellStyles(
                                          worksheetConfig.id,
                                          selectedCell.rowId,
                                          selectedCell.field,
                                          { backgroundColor: '' },
                                        );
                                    }}
                                    title="Clear color"
                                  >
                                    X
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-1 flex-col gap-1">
                                <Label className="text-[10px] uppercase">
                                  Text Color
                                </Label>
                                <div className="flex gap-2">
                                  <ColorPicker
                                    color={
                                      safeUiState.cellStyles[
                                        selectedCell?.rowId || ''
                                      ]?.[selectedCell?.field || '']?.color ||
                                      ''
                                    }
                                    defaultColor="#000000"
                                    onChange={(color) => {
                                      if (isMulti)
                                        store.bulkSetCellStyles(
                                          worksheetConfig.id,
                                          selectedCells,
                                          { color },
                                        );
                                      else if (selectedCell)
                                        store.setCellStyles(
                                          worksheetConfig.id,
                                          selectedCell.rowId,
                                          selectedCell.field,
                                          { color },
                                        );
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-8 rounded-none border-black text-[10px]"
                                    onClick={() => {
                                      if (isMulti)
                                        store.bulkSetCellStyles(
                                          worksheetConfig.id,
                                          selectedCells,
                                          { color: '' },
                                        );
                                      else if (selectedCell)
                                        store.setCellStyles(
                                          worksheetConfig.id,
                                          selectedCell.rowId,
                                          selectedCell.field,
                                          { color: '' },
                                        );
                                    }}
                                    title="Clear text color"
                                  >
                                    X
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <div className="flex flex-1 flex-col gap-1">
                                <Label className="text-[10px] uppercase">
                                  Font Size (px)
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="Auto"
                                  className="h-8 w-full rounded-none border-black text-xs focus-visible:border-black focus-visible:ring-0"
                                  value={
                                    safeUiState.cellStyles[
                                      selectedCell?.rowId || ''
                                    ]?.[selectedCell?.field || '']?.fontSize ||
                                    ''
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value
                                      ? Number(e.target.value)
                                      : undefined;
                                    if (isMulti)
                                      store.bulkSetCellStyles(
                                        worksheetConfig.id,
                                        selectedCells,
                                        { fontSize: val },
                                      );
                                    else if (selectedCell)
                                      store.setCellStyles(
                                        worksheetConfig.id,
                                        selectedCell.rowId,
                                        selectedCell.field,
                                        { fontSize: val },
                                      );
                                  }}
                                />
                              </div>
                              <div className="flex flex-1 flex-col gap-1">
                                <Label className="text-[10px] uppercase">
                                  Font Family
                                </Label>
                                <SelectUI
                                  value={
                                    safeUiState.cellStyles[
                                      selectedCell?.rowId || ''
                                    ]?.[selectedCell?.field || '']
                                      ?.fontFamily || 'default'
                                  }
                                  onValueChange={(val) => {
                                    const family =
                                      val === 'default' ? undefined : val;
                                    if (isMulti)
                                      store.bulkSetCellStyles(
                                        worksheetConfig.id,
                                        selectedCells,
                                        { fontFamily: family },
                                      );
                                    else if (selectedCell)
                                      store.setCellStyles(
                                        worksheetConfig.id,
                                        selectedCell.rowId,
                                        selectedCell.field,
                                        { fontFamily: family },
                                      );
                                  }}
                                >
                                  <SelectTrigger className="h-8 rounded-none border-black bg-white text-[10px] focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Font" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-none border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <SelectItem
                                      value="default"
                                      className="rounded-none text-[10px]"
                                    >
                                      Default
                                    </SelectItem>
                                    <SelectItem
                                      value="Arial, sans-serif"
                                      className="rounded-none text-[10px]"
                                    >
                                      Arial
                                    </SelectItem>
                                    <SelectItem
                                      value="'Courier New', Courier, monospace"
                                      className="rounded-none text-[10px]"
                                    >
                                      Courier New
                                    </SelectItem>
                                    <SelectItem
                                      value="'Times New Roman', Times, serif"
                                      className="rounded-none text-[10px]"
                                    >
                                      Times New Roman
                                    </SelectItem>
                                    <SelectItem
                                      value="Georgia, serif"
                                      className="rounded-none text-[10px]"
                                    >
                                      Georgia
                                    </SelectItem>
                                  </SelectContent>
                                </SelectUI>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']?.fontWeight ===
                                  'bold'
                                    ? 'default'
                                    : 'outline'
                                }
                                className={`h-8 flex-1 rounded-none border-black text-xs font-bold ${
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']?.fontWeight ===
                                  'bold'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black'
                                }`}
                                onClick={() => {
                                  const isBold =
                                    safeUiState.cellStyles[
                                      selectedCell?.rowId || ''
                                    ]?.[selectedCell?.field || '']
                                      ?.fontWeight === 'bold';
                                  if (isMulti)
                                    store.bulkSetCellStyles(
                                      worksheetConfig.id,
                                      selectedCells,
                                      {
                                        fontWeight: isBold ? undefined : 'bold',
                                      },
                                    );
                                  else if (selectedCell)
                                    store.setCellStyles(
                                      worksheetConfig.id,
                                      selectedCell.rowId,
                                      selectedCell.field,
                                      {
                                        fontWeight: isBold ? undefined : 'bold',
                                      },
                                    );
                                }}
                              >
                                B
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']?.fontStyle ===
                                  'italic'
                                    ? 'default'
                                    : 'outline'
                                }
                                className={`h-8 flex-1 rounded-none border-black text-xs italic ${
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']?.fontStyle ===
                                  'italic'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black'
                                }`}
                                onClick={() => {
                                  const isItalic =
                                    safeUiState.cellStyles[
                                      selectedCell?.rowId || ''
                                    ]?.[selectedCell?.field || '']
                                      ?.fontStyle === 'italic';
                                  if (isMulti)
                                    store.bulkSetCellStyles(
                                      worksheetConfig.id,
                                      selectedCells,
                                      {
                                        fontStyle: isItalic
                                          ? undefined
                                          : 'italic',
                                      },
                                    );
                                  else if (selectedCell)
                                    store.setCellStyles(
                                      worksheetConfig.id,
                                      selectedCell.rowId,
                                      selectedCell.field,
                                      {
                                        fontStyle: isItalic
                                          ? undefined
                                          : 'italic',
                                      },
                                    );
                                }}
                              >
                                I
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']
                                    ?.textDecoration === 'underline'
                                    ? 'default'
                                    : 'outline'
                                }
                                className={`h-8 flex-1 rounded-none border-black text-xs underline ${
                                  safeUiState.cellStyles[
                                    selectedCell?.rowId || ''
                                  ]?.[selectedCell?.field || '']
                                    ?.textDecoration === 'underline'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black'
                                }`}
                                onClick={() => {
                                  const isUnderline =
                                    safeUiState.cellStyles[
                                      selectedCell?.rowId || ''
                                    ]?.[selectedCell?.field || '']
                                      ?.textDecoration === 'underline';
                                  if (isMulti)
                                    store.bulkSetCellStyles(
                                      worksheetConfig.id,
                                      selectedCells,
                                      {
                                        textDecoration: isUnderline
                                          ? undefined
                                          : 'underline',
                                      },
                                    );
                                  else if (selectedCell)
                                    store.setCellStyles(
                                      worksheetConfig.id,
                                      selectedCell.rowId,
                                      selectedCell.field,
                                      {
                                        textDecoration: isUnderline
                                          ? undefined
                                          : 'underline',
                                      },
                                    );
                                }}
                              >
                                U
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasSelection && (
                        <div className="mt-4 border-t border-black pt-4">
                          <Label className="mb-2 block text-xs font-bold uppercase">
                            {isMulti ? 'Bulk Cell Borders' : 'Cell Borders'}
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-none border-black bg-white text-[10px] uppercase text-black hover:bg-gray-100"
                              onClick={() => {
                                const style = {
                                  borderTop: '1px solid black',
                                  borderBottom: '1px solid black',
                                };
                                if (isMulti)
                                  store.bulkSetCellStyles(
                                    worksheetConfig.id,
                                    selectedCells,
                                    style,
                                  );
                                else if (selectedCell)
                                  store.setCellStyles(
                                    worksheetConfig.id,
                                    selectedCell.rowId,
                                    selectedCell.field,
                                    style,
                                  );
                              }}
                            >
                              Top & Bottom
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-none border-black bg-white text-[10px] uppercase text-black hover:bg-gray-100"
                              onClick={() => {
                                const style = {
                                  border: '1px solid black',
                                };
                                if (isMulti)
                                  store.bulkSetCellStyles(
                                    worksheetConfig.id,
                                    selectedCells,
                                    style,
                                  );
                                else if (selectedCell)
                                  store.setCellStyles(
                                    worksheetConfig.id,
                                    selectedCell.rowId,
                                    selectedCell.field,
                                    style,
                                  );
                              }}
                            >
                              All Sides
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-none border-black bg-white text-[10px] uppercase text-black hover:bg-gray-100"
                              onClick={() => {
                                const style = {
                                  borderTop: undefined,
                                  borderBottom: undefined,
                                  border: undefined,
                                  borderLeft: undefined,
                                  borderRight: undefined,
                                };
                                if (isMulti)
                                  store.bulkSetCellStyles(
                                    worksheetConfig.id,
                                    selectedCells,
                                    style,
                                  );
                                else if (selectedCell)
                                  store.setCellStyles(
                                    worksheetConfig.id,
                                    selectedCell.rowId,
                                    selectedCell.field,
                                    style,
                                  );
                              }}
                            >
                              Clear Borders
                            </Button>
                          </div>
                        </div>
                      )}

                      {column &&
                        uniqueFields.length >= 1 &&
                        allRowIds.length > 0 && (
                          <div className="mt-4 flex flex-col gap-1 border-t border-black pt-4">
                            <Label className="text-[10px] uppercase">
                              Select all cells of column
                            </Label>
                            <Button
                              size="sm"
                              type="button"
                              className="h-8 w-full rounded-none border-2 border-black bg-white text-[11px] font-medium uppercase text-black hover:bg-black hover:text-white"
                              onClick={() => {
                                const field = uniqueFields[0];
                                const cells = allRowIds.map((rowId) => ({
                                  rowId,
                                  field,
                                }));
                                store.setSelection({
                                  type: 'range',
                                  selectedCells: cells,
                                });
                              }}
                            >
                              Select column cells
                            </Button>
                          </div>
                        )}

                      {isMulti && (
                        <div className="mt-4 border-t border-black pt-4 text-center text-xs font-bold uppercase tracking-widest">
                          Multiple cells selected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Row Properties */}
                {selectedRowIds.length > 0 && (
                  <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="mb-3 border-b border-black pb-2 text-sm font-bold uppercase tracking-widest">
                      Row Properties
                    </h3>
                    <p className="mb-3 text-[11px] uppercase text-gray-600">
                      {selectedRowIds.length} row
                      {selectedRowIds.length > 1 ? 's' : ''} selected
                    </p>
                    <div className="flex flex-col gap-3 text-xs">
                      {onDeleteRows && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-full rounded-none border-2 border-red-600 text-xs font-bold uppercase"
                          onClick={() => {
                            if (
                              confirm(`Delete ${selectedRowIds.length} row(s)?`)
                            ) {
                              onDeleteRows(selectedRowIds);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 size-3" />
                          Delete {selectedRowIds.length} Row(s)
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 rounded-none border-2 border-black bg-white text-[11px] uppercase text-black hover:bg-black hover:text-white"
                          onClick={() => {
                            selectedRowIds.forEach((id) =>
                              store.togglePinnedRow(worksheetConfig.id, id),
                            );
                          }}
                        >
                          {selectedRowIds.every((id) =>
                            safeUiState.pinnedRows.includes(id),
                          )
                            ? 'Unpin Rows'
                            : 'Pin Rows'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 rounded-none border-2 border-black bg-white text-[11px] uppercase text-black hover:bg-black hover:text-white"
                          onClick={() => {
                            selectedRowIds.forEach((id) =>
                              store.toggleHiddenRow(worksheetConfig.id, id),
                            );
                          }}
                        >
                          {selectedRowIds.every((id) =>
                            safeUiState.hiddenRows.includes(id),
                          )
                            ? 'Unhide Rows'
                            : 'Hide Rows'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
