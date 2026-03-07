'use client';

import { useState, useCallback } from 'react';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

export interface WorksheetRowData {
  id: string;
  worksheetId: string;
  rawPayload: Record<string, unknown>;
  indexedFields: Record<string, unknown>;
  validationErrors?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseWorksheetRowsResult {
  data: WorksheetRowData[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  fetchRows: (worksheetId: string, opts?: { cursor?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; limit?: number }) => void;
  updateRow: (id: string, rawPayload: Partial<Record<string, unknown>>) => Promise<void>;
  bulkUpdateRows: (worksheetId: string, updates: { id: string; rawPayload: Partial<Record<string, unknown>> }[]) => Promise<void>;
  addRow: (worksheetId: string, rawPayload?: Record<string, unknown>) => Promise<WorksheetRowData | null>;
  deleteRows: (ids: string[]) => Promise<void>;
}

export function useWorksheetRows(): UseWorksheetRowsResult {
  const [data, setData] = useState<WorksheetRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchRows = useCallback(
    async (
      worksheetId: string,
      opts?: { cursor?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; limit?: number }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts?.limit) params.set('limit', String(opts.limit));
        if (opts?.cursor) params.set('cursor', opts.cursor);
        if (opts?.sortBy) params.set('sortBy', opts.sortBy);
        if (opts?.sortOrder) params.set('sortOrder', opts.sortOrder ?? 'desc');
        const url = `/api/worksheets/${worksheetId}/rows?${params.toString()}`;
        const res = await PortalSdk.getData(url, null);
        setData(res.data ?? []);
        setNextCursor(res.nextCursor ?? null);
        setHasMore(res.hasMore ?? false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load rows');
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateRow = useCallback(async (id: string, rawPayload: Partial<Record<string, unknown>>) => {
    // Optimistic update: merge payload into row immediately so grid re-renders with new value
    setData((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              rawPayload: { ...(row.rawPayload || {}), ...rawPayload },
              indexedFields: { ...(row.indexedFields || {}), ...rawPayload },
            }
          : row
      )
    );
    const res = await fetch(`/api/worksheets/rows/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        tmd_portal_api_key: TMD_PORTAL_API_KEY,
      },
      body: JSON.stringify({ rawPayload }),
    });
    if (!res.ok) throw new Error('Failed to update');
    const json = await res.json();
    if (json?.data) {
      setData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...json.data } : row))
      );
    }
  }, []);

  const bulkUpdateRows = useCallback(async (worksheetId: string, updates: { id: string; rawPayload: Partial<Record<string, unknown>> }[]) => {
    if (!updates.length) return;
    const res = await fetch(`/api/worksheets/${worksheetId}/rows/bulk`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        tmd_portal_api_key: TMD_PORTAL_API_KEY,
      },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) throw new Error('Failed to bulk update');
    const json = await res.json();
    if (json?.data && Array.isArray(json.data)) {
      setData((prev) => {
        const next = [...prev];
        json.data.forEach((updatedRow: any) => {
          const idx = next.findIndex(r => r.id === updatedRow.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...updatedRow };
          }
        });
        return next;
      });
    }
  }, []);

  const addRow = useCallback(
    async (worksheetId: string, rawPayload?: Record<string, unknown>): Promise<WorksheetRowData | null> => {
      const res = await fetch(`/api/worksheets/${worksheetId}/rows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify(rawPayload ?? {}),
      });
      if (!res.ok) throw new Error('Failed to add row');
      const json = await res.json();
      const row = json?.data as WorksheetRowData | undefined;
      if (row) setData((prev) => [row, ...prev]);
      return row ?? null;
    },
    []
  );

  const deleteRows = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/worksheets/rows/${id}`, {
          method: 'DELETE',
          headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
        })
      )
    );
    setData((prev) => prev.filter((r) => !ids.includes(r.id)));
  }, []);

  return {
    data,
    loading,
    error,
    nextCursor,
    hasMore,
    fetchRows,
    updateRow,
    bulkUpdateRows,
    addRow,
    deleteRows,
  };
}