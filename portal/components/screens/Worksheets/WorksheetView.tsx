'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { WorksheetGrid } from './WorksheetGrid';
import { WorksheetSidebar } from './WorksheetSidebar';
import { useWorksheetRows } from './useWorksheetRows';
import { useWorksheetStore, WorksheetUIState } from './useWorksheetStore';
import { FileSpreadsheet, Save } from 'lucide-react';
import { getAllWorksheetConfigs } from '@/lib/worksheets';
import type { WorksheetConfig } from '@/lib/worksheets/core/types';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { z } from 'zod';

export default function WorksheetView() {
  const worksheets: WorksheetConfig[] = getAllWorksheetConfigs();
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string | null>(worksheets[0]?.id || null);
  const gridRef = useRef<AgGridReact>(null);
  
  const store = useWorksheetStore();
  const selection = store.selection;
  const setSelection = store.setSelection;
  const clearSelection = store.clearSelection;

  const sidebarSelection = selection.type === 'cell' && selection.rowId && selection.field
    ? { rowId: selection.rowId, field: selection.field } 
    : selection.type === 'range' && selection.selectedCells && selection.selectedCells.length > 0
    ? { rowId: selection.selectedCells[0].rowId, field: selection.selectedCells[0].field }
    : null;
  const sidebarRange = selection.type === 'row' && selection.rowIds && selection.fields
    ? { rowIds: selection.rowIds, fields: selection.fields } : null;

  const [addingRow, setAddingRow] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    data: rows,
    loading,
    error: rowsError,
    dbUnavailable,
    fetchRows,
    addRow,
    updateRow,
    bulkUpdateRows,
    deleteRows,
  } = useWorksheetRows();

  // Load UI state from server
  useEffect(() => {
    if (selectedWorksheetId) {
      fetchRows(selectedWorksheetId);
      
      // Fetch UI State
      fetch(`/api/worksheets/${selectedWorksheetId}/state`, {
        headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY }
      })
      .then(res => res.json())
      .then(json => {
        // Merge server state; when null/undefined, keep existing (e.g. from persist)
        store.setServerUIState(selectedWorksheetId, (json?.data ?? {}) as WorksheetUIState);
      })
      .catch(err => console.error("Failed to load UI state:", err));
    }
  }, [selectedWorksheetId, fetchRows]); // purposely excluding store.setServerUIState to avoid loops

  const selectedWorksheet = worksheets.find((f) => f.id === selectedWorksheetId);

  useEffect(() => {
    if (!worksheets.length) {
      setSelectedWorksheetId(null);
      return;
    }
    if (!selectedWorksheetId || !worksheets.some((w) => w.id === selectedWorksheetId)) {
      setSelectedWorksheetId(worksheets[0].id);
    }
  }, [selectedWorksheetId, worksheets]);
  const hiddenRowsCount =
    selectedWorksheetId && store.uiStateByWorksheet[selectedWorksheetId]?.hiddenRows
      ? store.uiStateByWorksheet[selectedWorksheetId]!.hiddenRows!.length
      : 0;

  const handleSelectionChange = useCallback(
    (cellOrRange: { rowId?: string; field?: string; rowIds?: string[]; fields?: string[]; selectedCells?: { rowId: string; field: string }[] } | null) => {
      if (!cellOrRange) {
        clearSelection();
        return;
      }
      
      if (cellOrRange.selectedCells && cellOrRange.selectedCells.length > 0) {
        if (cellOrRange.selectedCells.length === 1) {
          setSelection({ 
            type: 'cell', 
            rowId: cellOrRange.selectedCells[0].rowId, 
            field: cellOrRange.selectedCells[0].field 
          });
        } else {
          setSelection({ 
            type: 'range', 
            selectedCells: cellOrRange.selectedCells 
          });
        }
      } else if (cellOrRange.rowId && cellOrRange.field) {
        setSelection({ type: 'cell', rowId: cellOrRange.rowId, field: cellOrRange.field });
      } else if (cellOrRange.rowIds && cellOrRange.fields) {
        setSelection({ type: 'row', rowIds: cellOrRange.rowIds, fields: cellOrRange.fields });
      }
    },
    [setSelection, clearSelection]
  );

  const selectedRowData = sidebarSelection
    ? rows.find((r) => r.id === sidebarSelection.rowId)?.rawPayload as Record<string, unknown> | undefined
    : null;

  const fullRowData = sidebarSelection
    ? (() => {
        const r = rows.find((x) => x.id === sidebarSelection!.rowId);
        return r
          ? {
              id: r.id,
              worksheetId: r.worksheetId,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
              ...(r.rawPayload || {}),
            }
          : null;
      })()
    : null;

  const uniqueRowIds = (() => {
    if (selection.type === 'cell' && selection.rowId) return [selection.rowId];
    if (selection.type === 'range' && selection.selectedCells?.length) {
      return Array.from(new Set(selection.selectedCells.map((c) => c.rowId)));
    }
    if (selection.type === 'row' && selection.rowIds?.length) return selection.rowIds;
    return [];
  })();

  const hasSelection =
    !!sidebarSelection ||
    (!!sidebarRange && sidebarRange.rowIds.length > 0);

  const buildDraftPayloadFromSchema = useCallback((worksheet: WorksheetConfig): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    const shape = ((worksheet.rowSchema as unknown as { shape?: Record<string, z.ZodTypeAny> }).shape) ?? {};

    const candidatesFor = (field: string) => [
      `new ${field}`,
      `new-${Date.now()}@example.com`,
      '',
      0,
      false,
      new Date().toISOString(),
      [],
      {},
      null,
    ];

    Object.entries(shape).forEach(([field, schema]) => {
      const acceptsUndefined = schema.safeParse(undefined).success;
      if (acceptsUndefined) return;
      for (const candidate of candidatesFor(field)) {
        if (schema.safeParse(candidate).success) {
          payload[field] = candidate;
          return;
        }
      }
    });

    return payload;
  }, []);

  const handleAddRow = useCallback(async () => {
    if (!selectedWorksheetId || !selectedWorksheet) return;
    setAddingRow(true);
    try {
      const draftPayload = buildDraftPayloadFromSchema(selectedWorksheet);
      await addRow(selectedWorksheetId, draftPayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add row';
      console.error('Add row failed', e);
      alert(msg);
    } finally {
      setAddingRow(false);
    }
  }, [selectedWorksheetId, selectedWorksheet, addRow, buildDraftPayloadFromSchema]);

  const handleSaveState = useCallback(async () => {
    if (!selectedWorksheetId) return;
    setSavingState(true);
    try {
      const uiState = store.uiStateByWorksheet[selectedWorksheetId];
      if (uiState) {
        await fetch(`/api/worksheets/${selectedWorksheetId}/state`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify({ uiState }),
        });
      }
    } catch (e) {
      console.error("Failed to save state", e);
    } finally {
      setSavingState(false);
    }
  }, [selectedWorksheetId, store.uiStateByWorksheet]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-white text-black font-sans">
      {/* Top Ribbon */}
      <header className="flex flex-col border-b border-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-black">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="font-bold text-sm tracking-tight uppercase">WORKSHEET</span>
            </div>
            <div className="flex items-center gap-1 border-l border-black pl-4">
              {selectedWorksheet && (
                <>
                  <button 
                    onClick={handleAddRow}
                    disabled={addingRow || dbUnavailable}
                    className="px-3 py-1 border border-transparent hover:border-black text-xs font-medium uppercase transition-colors disabled:opacity-50"
                  >
                    {addingRow ? 'Adding...' : 'Add Row'}
                  </button>
                  {hiddenRowsCount > 0 && selectedWorksheetId && (
                    <button
                      onClick={() => {
                        store.updateUIState(selectedWorksheetId, {
                          hiddenRows: [],
                        });
                      }}
                      className="px-3 py-1 border border-transparent hover:border-black text-xs font-medium uppercase transition-colors"
                    >
                      Show {hiddenRowsCount} Hidden Row
                      {hiddenRowsCount > 1 ? 's' : ''}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="search"
                placeholder="Search..."
                className="h-8 w-40 rounded-none border border-black px-2 text-xs outline-none focus:border-black"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
              />
            </div>
            <button 
              onClick={handleSaveState}
              disabled={savingState || !selectedWorksheetId}
              className="px-3 py-1 flex items-center gap-2 border border-black bg-white hover:bg-black hover:text-white text-xs font-medium uppercase transition-colors disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {savingState ? 'Saving...' : 'Save State'}
            </button>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`px-3 py-1 border text-xs font-medium uppercase transition-colors ${!isSidebarCollapsed ? 'border-black bg-black text-white' : 'border-transparent hover:border-black'}`}
            >
              Toggle Sidebar
            </button>
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden min-h-0 bg-gray-100">
        {rowsError && (
          <div className="mx-4 mt-3 rounded border border-red-700 bg-red-50 px-3 py-2 text-xs text-red-900">
            {rowsError}
          </div>
        )}
        {!selectedWorksheet ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white m-4 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <FileSpreadsheet className="h-12 w-12 text-black mb-4" strokeWidth={1} />
            <p className="text-black text-sm mb-4 uppercase tracking-widest font-medium">
              No active sheet
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-black">
              <WorksheetGrid
                gridRef={gridRef}
                worksheetConfig={selectedWorksheet}
                rows={rows}
                loading={loading}
                quickFilterText={quickFilterText}
                onSelectionChange={handleSelectionChange}
                onCellValueChange={(id, payload) => {
                  const api = gridRef.current?.api;
                  if (api) {
                    const rowNode = api.getRowNode(id);
                    if (rowNode && rowNode.data) {
                      rowNode.updateData({ ...rowNode.data, ...payload });
                    }
                  }
                  return selectedWorksheetId ? updateRow(id, payload, selectedWorksheetId) : Promise.resolve();
                }}
              />
            </div>

            {/* Right Sidebar */}
            {!isSidebarCollapsed && (
              <div className="w-[350px] flex-shrink-0 bg-white flex flex-col border-l border-black overflow-hidden z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
                <WorksheetSidebar
                  worksheetConfig={selectedWorksheet}
                  rowData={selectedRowData ?? null}
                  fullRowData={fullRowData}
                  selectedRowIds={uniqueRowIds}
                  allRowIds={rows.map((r) => r.id)}
                  onDeleteRows={async (ids) => {
                    if (selectedWorksheetId) await deleteRows(ids, selectedWorksheetId);
                    clearSelection();
                  }}
                  onCellValueChange={(rowId, field, value) => {
                    const api = gridRef.current?.api;
                    if (api) {
                      const rowNode = api.getRowNode(rowId);
                      if (rowNode && rowNode.data) {
                        rowNode.updateData({ ...rowNode.data, [field]: value });
                      }
                      api.refreshCells({ force: true });
                    }
                    return selectedWorksheetId ? updateRow(rowId, { [field]: value }, selectedWorksheetId) : Promise.resolve();
                  }}
                  onBulkValueChange={(updates) => {
                    if (gridRef.current?.api) {
                      const updatedNodes: any[] = [];
                      updates.forEach(u => {
                        const rowNode = gridRef.current!.api.getRowNode(u.rowId);
                        if (rowNode && rowNode.data) {
                          const existingIdx = updatedNodes.findIndex(n => n.id === u.rowId);
                          if (existingIdx >= 0) {
                            updatedNodes[existingIdx][u.field] = u.value;
                          } else {
                            updatedNodes.push({ ...rowNode.data, [u.field]: u.value });
                          }
                        }
                      });
                      if (updatedNodes.length > 0) {
                        gridRef.current.api.applyTransaction({ update: updatedNodes });
                        gridRef.current.api.refreshCells({ force: true });
                      }
                    }

                    const groupedByRow: Record<string, any> = {};
                    updates.forEach(u => {
                      if (!groupedByRow[u.rowId]) groupedByRow[u.rowId] = {};
                      groupedByRow[u.rowId][u.field] = u.value;
                    });
                    const bulkUpdates = Object.keys(groupedByRow).map(id => ({
                      id,
                      rawPayload: groupedByRow[id]
                    }));
                    return bulkUpdateRows(selectedWorksheet.id, bulkUpdates);
                  }}
                  onRunActions={async (field, actionId, rowIds) => {
                    if (!selectedWorksheet) return;
                    const col = (selectedWorksheet.columns ?? []).find(
                      (c) => c.field === field && c.type === 'actions',
                    ) as any;
                    if (!col || !col.actions) return;
                    const actionDef = col.actions.find(
                      (a: any) => a.id === actionId,
                    );
                    if (!actionDef) return;
                    const targetRows = rows.filter((r) => rowIds.includes(r.id));
                    for (const r of targetRows) {
                      try {
                        const payload = {
                          id: r.id,
                          worksheetId: r.worksheetId,
                          createdAt: r.createdAt,
                          updatedAt: r.updatedAt,
                          ...(r.rawPayload || {}),
                        };
                        const result = await actionDef.action(payload, {
                          worksheetId: selectedWorksheet.id,
                          selection: { rowIds },
                        });
                        if (
                          result &&
                          typeof result === 'object' &&
                          (result as any).type === 'patchRow' &&
                          (result as any).patch &&
                          selectedWorksheetId
                        ) {
                          await updateRow(
                            r.id,
                            (result as { patch: Record<string, unknown> }).patch,
                            selectedWorksheetId,
                          );
                        }
                      } catch (err) {
                        console.error('Action failed', err);
                        alert(
                          'Action failed: ' + (err as Error).message,
                        );
                        break;
                      }
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Tabs (Sheets) */}
      <footer className="h-10 border-t border-black bg-gray-100 flex items-end px-2 gap-1 overflow-x-auto select-none">
        {worksheets.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedWorksheetId(f.id)}
            className={`
              px-6 py-1.5 border border-black border-b-0 text-xs font-medium uppercase tracking-wider
              translate-y-[1px] transition-colors whitespace-nowrap min-w-[120px] max-w-[200px] truncate
              ${selectedWorksheetId === f.id 
                ? 'bg-white text-black shadow-[0_-2px_0_0_black_inset]' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-50'}
            `}
          >
            {f.name}
          </button>
        ))}
      </footer>
    </div>
  );
}