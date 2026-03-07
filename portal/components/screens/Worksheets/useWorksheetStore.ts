import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SelectionType = 'cell' | 'column' | 'row' | 'range' | 'none';

export interface SelectionState {
  type: SelectionType;
  rowId?: string;
  field?: string;
  rowIds?: string[];
  fields?: string[];
  // Store specifically selected cells if disjoint or range based
  selectedCells?: { rowId: string; field: string }[];
}

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
}

export interface RowStyle {
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderAllCells?: string; // special property to apply border to all cells in the row
}

export interface WorksheetUIState {
  rowHeights: Record<string, number>;
  rowStyles: Record<string, RowStyle>;
  pinnedRows: string[];
  pinnedCols: string[];
  hiddenRows: string[];
  hiddenCols: string[]; // User-toggled hidden columns
  cellStyles: Record<string, Record<string, CellStyle>>; // rowId -> field -> style
  columnWidths: Record<string, number>;
}

interface WorksheetStore {
  selection: SelectionState;
  uiStateByWorksheet: Record<string, WorksheetUIState>;
  setSelection: (selection: SelectionState) => void;
  clearSelection: () => void;
  updateUIState: (worksheetId: string, updates: Partial<WorksheetUIState>) => void;
  setCellStyles: (worksheetId: string, rowId: string, field: string, style: Partial<CellStyle>) => void;
  bulkSetCellStyles: (worksheetId: string, updates: { rowId: string; field: string }[], style: Partial<CellStyle>) => void;
  setRowStyles: (worksheetId: string, rowId: string, style: Partial<RowStyle>) => void;
  bulkSetRowStyles: (worksheetId: string, rowIds: string[], style: Partial<RowStyle>) => void;
  setRowHeight: (worksheetId: string, rowId: string, height: number) => void;
  bulkSetRowHeights: (worksheetId: string, rowIds: string[], height: number) => void;
  togglePinnedRow: (worksheetId: string, rowId: string) => void;
  togglePinnedCol: (worksheetId: string, field: string) => void;
  bulkTogglePinnedCols: (worksheetId: string, fields: string[], pin: boolean) => void;
  toggleHiddenRow: (worksheetId: string, rowId: string) => void;
  toggleHiddenCol: (worksheetId: string, field: string) => void;
  setServerUIState: (worksheetId: string, uiState: WorksheetUIState) => void;
}

const defaultUIState: WorksheetUIState = {
  rowHeights: {},
  rowStyles: {},
  pinnedRows: [],
  pinnedCols: [],
  hiddenRows: [],
  hiddenCols: [],
  cellStyles: {},
  columnWidths: {},
};

export const useWorksheetStore = create<WorksheetStore>()(
  persist(
    (set) => ({
      selection: { type: 'none' },
      uiStateByWorksheet: {},
      setSelection: (selection) => set({ selection }),
      clearSelection: () => set({ selection: { type: 'none' } }),
      updateUIState: (worksheetId, updates) => set((state) => ({
        uiStateByWorksheet: {
          ...state.uiStateByWorksheet,
          [worksheetId]: {
            ...(state.uiStateByWorksheet[worksheetId] || defaultUIState),
            ...updates,
          }
        }
      })),
      setCellStyles: (worksheetId, rowId, field, style) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const rowStyles = wsState.cellStyles[rowId] || {};
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              cellStyles: {
                ...wsState.cellStyles,
                [rowId]: {
                  ...rowStyles,
                  [field]: { ...rowStyles[field], ...style }
                }
              }
            }
          }
        };
      }),
      bulkSetCellStyles: (worksheetId, updates, style) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const newCellStyles = { ...wsState.cellStyles };
        updates.forEach(({ rowId, field }) => {
          const rowStyles = newCellStyles[rowId] || {};
          newCellStyles[rowId] = {
            ...rowStyles,
            [field]: { ...rowStyles[field], ...style }
          };
        });
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              cellStyles: newCellStyles
            }
          }
        };
      }),
      setRowStyles: (worksheetId, rowId, style) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              rowStyles: {
                ...(wsState.rowStyles || {}),
                [rowId]: { ...(wsState.rowStyles?.[rowId] || {}), ...style }
              }
            }
          }
        };
      }),
      bulkSetRowStyles: (worksheetId, rowIds, style) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const newRowStyles = { ...(wsState.rowStyles || {}) };
        rowIds.forEach(rowId => {
          newRowStyles[rowId] = { ...(newRowStyles[rowId] || {}), ...style };
        });
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              rowStyles: newRowStyles
            }
          }
        };
      }),
      setRowHeight: (worksheetId, rowId, height) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              rowHeights: { ...wsState.rowHeights, [rowId]: height }
            }
          }
        };
      }),
      bulkSetRowHeights: (worksheetId, rowIds, height) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const newRowHeights = { ...wsState.rowHeights };
        rowIds.forEach(rowId => {
          newRowHeights[rowId] = height;
        });
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              rowHeights: newRowHeights
            }
          }
        };
      }),
      togglePinnedRow: (worksheetId, rowId) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const isPinned = wsState.pinnedRows.includes(rowId);
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              pinnedRows: isPinned 
                ? wsState.pinnedRows.filter(id => id !== rowId)
                : [...wsState.pinnedRows, rowId]
            }
          }
        };
      }),
      togglePinnedCol: (worksheetId, field) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const isPinned = wsState.pinnedCols.includes(field);
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              pinnedCols: isPinned 
                ? wsState.pinnedCols.filter(f => f !== field)
                : [...wsState.pinnedCols, field]
            }
          }
        };
      }),
      bulkTogglePinnedCols: (worksheetId, fields, pin) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        let newPinnedCols = [...wsState.pinnedCols];
        if (pin) {
          fields.forEach(f => {
            if (!newPinnedCols.includes(f)) newPinnedCols.push(f);
          });
        } else {
          newPinnedCols = newPinnedCols.filter(f => !fields.includes(f));
        }
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              pinnedCols: newPinnedCols
            }
          }
        };
      }),
      toggleHiddenRow: (worksheetId, rowId) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const hiddenRows = wsState.hiddenRows || [];
        const isHidden = hiddenRows.includes(rowId);
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              hiddenRows: isHidden ? hiddenRows.filter(id => id !== rowId) : [...hiddenRows, rowId]
            }
          }
        };
      }),
      toggleHiddenCol: (worksheetId, field) => set((state) => {
        const wsState = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const hiddenCols = wsState.hiddenCols || [];
        const isHidden = hiddenCols.includes(field);
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: {
              ...wsState,
              hiddenCols: isHidden ? hiddenCols.filter(f => f !== field) : [...hiddenCols, field]
            }
          }
        };
      }),
      setServerUIState: (worksheetId, serverState) => set((state) => {
        const existing = state.uiStateByWorksheet[worksheetId] || defaultUIState;
        const merged: WorksheetUIState = {
          ...defaultUIState,
          ...existing,
          ...(serverState && typeof serverState === 'object' ? serverState : {}),
          pinnedCols: Array.isArray(serverState?.pinnedCols) ? serverState.pinnedCols : existing.pinnedCols,
          hiddenCols: Array.isArray(serverState?.hiddenCols) ? serverState.hiddenCols : existing.hiddenCols,
          hiddenRows: Array.isArray(serverState?.hiddenRows) ? serverState.hiddenRows : existing.hiddenRows,
        };
        return {
          uiStateByWorksheet: {
            ...state.uiStateByWorksheet,
            [worksheetId]: merged,
          },
        };
      }),
    }),
    {
      name: 'worksheet-storage',
      partialize: (state) => ({ uiStateByWorksheet: state.uiStateByWorksheet }),
    }
  )
);