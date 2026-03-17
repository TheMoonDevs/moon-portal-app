'use client';

import { useState, useCallback } from 'react';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

export interface WorksheetRowData {
  id: string;
  worksheetId: string;
  rawPayload: Record<string, unknown>;
  indexedFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UseWorksheetRowsResult {
  data: WorksheetRowData[];
  loading: boolean;
  error: string | null;
  dbUnavailable: boolean;
  nextCursor: string | null;
  hasMore: boolean;
  fetchRows: (worksheetId: string, opts?: { cursor?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; limit?: number }) => void;
  updateRow: (id: string, rawPayload: Partial<Record<string, unknown>>, worksheetId: string) => Promise<void>;
  bulkUpdateRows: (worksheetId: string, updates: { id: string; rawPayload: Partial<Record<string, unknown>> }[]) => Promise<void>;
  addRow: (worksheetId: string, rawPayload?: Record<string, unknown>) => Promise<WorksheetRowData | null>;
  deleteRows: (ids: string[], worksheetId: string) => Promise<void>;
}

export function useWorksheetRows(): UseWorksheetRowsResult {
  const normalizeApiError = (message: string, fallback: string) => {
    const msg = (message || '').trim();
    if (!msg) return fallback;
    if (/querySrv ENOTFOUND|MongoNetworkError|ECONNREFUSED/i.test(msg)) {
      return 'Database is currently unreachable. Please check your DB URL/DNS/network and try again.';
    }
    return msg;
  };

  const readApiError = async (res: Response, fallback: string) => {
    try {
      const json = await res.json();
      return normalizeApiError((json?.error as string) || '', fallback);
    } catch {
      return fallback;
    }
  };

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
        setError(
          normalizeApiError(
            e instanceof Error ? e.message : '',
            'Failed to load rows',
          ),
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateRow = useCallback(async (id: string, rawPayload: Partial<Record<string, unknown>>, worksheetId: string) => {
    try {
      // Optimistic update: merge payload into row immediately so grid re-renders with new value
      setData((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                rawPayload: { ...(row.rawPayload || {}), ...rawPayload },
              }
            : row
        )
      );
      const res = await fetch(`/api/worksheets/${encodeURIComponent(worksheetId)}/rows/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify({ rawPayload }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update'));
      const json = await res.json();
      if (json?.data) {
        setData((prev) =>
          prev.map((row) => (row.id === id ? { ...row, ...json.data } : row))
        );
      }
      setError(null);
    } catch (e) {
      const msg = normalizeApiError(
        e instanceof Error ? e.message : '',
        'Failed to update',
      );
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const bulkUpdateRows = useCallback(async (worksheetId: string, updates: { id: string; rawPayload: Partial<Record<string, unknown>> }[]) => {
    if (!updates.length) return;
    try {
      const res = await fetch(`/api/worksheets/${worksheetId}/rows/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to bulk update'));
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
      setError(null);
    } catch (e) {
      const msg = normalizeApiError(
        e instanceof Error ? e.message : '',
        'Failed to bulk update',
      );
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const addRow = useCallback(
    async (worksheetId: string, rawPayload?: Record<string, unknown>): Promise<WorksheetRowData | null> => {
      try {
        const res = await fetch(`/api/worksheets/${worksheetId}/rows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
          body: JSON.stringify(rawPayload ?? {}),
        });
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to add row'));
        const json = await res.json();
        const row = json?.data as WorksheetRowData | undefined;
        if (row) setData((prev) => [row, ...prev]);
        setError(null);
        return row ?? null;
      } catch (e) {
        const msg = normalizeApiError(
          e instanceof Error ? e.message : '',
          'Failed to add row',
        );
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const deleteRows = useCallback(async (ids: string[], worksheetId: string) => {
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/worksheets/${encodeURIComponent(worksheetId)}/rows/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
          })
        )
      );
      const failed = responses.find((res) => !res.ok);
      if (failed) {
        throw new Error(await readApiError(failed, 'Failed to delete row(s)'));
      }
      setData((prev) => prev.filter((r) => !ids.includes(r.id)));
      setError(null);
    } catch (e) {
      const msg = normalizeApiError(
        e instanceof Error ? e.message : '',
        'Failed to delete row(s)',
      );
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  return {
    data,
    loading,
    error,
    dbUnavailable:
      !!error &&
      /Database is currently unreachable|querySrv ENOTFOUND|MongoNetworkError|ECONNREFUSED/i.test(
        error,
      ),
    nextCursor,
    hasMore,
    fetchRows,
    updateRow,
    bulkUpdateRows,
    addRow,
    deleteRows,
  };
}