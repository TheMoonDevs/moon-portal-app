'use client';

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { fetchPdf, openPdf } from '@/utils/helpers/pdfClient';

/*
 * A PDF's pages, drawn one below the other as they scroll into view, each
 * with a layer on top for boxes (where to sign, or what was signed). Boxes
 * sit in fractions of the page, so they stay put at any width.
 */

export type PdfSource = { url: string } | { data: ArrayBuffer } | null;

/** The PDF behind a link or bytes, opened once. */
export function usePdf(source: PdfSource) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = !source
    ? ''
    : 'url' in source
      ? source.url
      : `bytes:${source.data.byteLength}`;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const current = sourceRef.current;
    if (!current) return;
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;
    setDoc(null);
    setError(null);
    (async () => {
      try {
        const data =
          'url' in current ? await fetchPdf(current.url) : current.data;
        opened = await openPdf(data);
        if (cancelled) opened.destroy();
        else setDoc(opened);
      } catch (e) {
        if (!cancelled)
          setError((e as Error)?.message || 'The PDF can’t be opened.');
      }
    })();
    return () => {
      cancelled = true;
      opened?.destroy();
    };
  }, [key]);

  return { doc, error };
}

const PageCanvas = ({
  doc,
  index,
  width,
}: {
  doc: PDFDocumentProxy;
  index: number;
  width: number;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = canvas.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setVisible(true),
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !width || !canvas.current) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await doc.getPage(index + 1);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const viewport = page.getViewport({
        scale: (width * ratio) / base.width,
      });
      const el = canvas.current;
      if (!el) return;
      el.width = Math.floor(viewport.width);
      el.height = Math.floor(viewport.height);
      const ctx = el.getContext('2d');
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport });
      await task.promise.catch(() => undefined);
      if (!cancelled) setDrawn(true);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, index, width, visible]);

  return (
    <>
      {!drawn && (
        <span className="absolute inset-0 animate-pulse bg-neutral-100" />
      )}
      <canvas
        ref={canvas}
        className={cn(
          'absolute inset-0 size-full transition-opacity',
          drawn ? 'opacity-100' : 'opacity-0',
        )}
      />
    </>
  );
};

export const PdfPages = ({
  source,
  pages,
  overlay,
  onPageClick,
  className,
  pageClassName,
  label = 'Page',
}: {
  source: PdfSource;
  /** Each page's size in points, as shown (after rotation). */
  pages: Array<{ w: number; h: number }>;
  overlay?: (page: number) => ReactNode;
  /** A click on an empty spot of a page, in fractions of the page. */
  onPageClick?: (page: number, at: { x: number; y: number }) => void;
  className?: string;
  pageClassName?: string;
  label?: string;
}) => {
  const { doc, error } = usePdf(source);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setWidth((old) => (old === w ? old : w)), 120);
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => {
      ro.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={wrap} className={cn('flex w-full flex-col gap-4', className)}>
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {pages.map((p, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div
            className={cn(
              'relative w-full overflow-hidden bg-white shadow-md ring-1 ring-black/10',
              pageClassName,
            )}
            style={{ aspectRatio: `${p.w} / ${p.h}` }}
            onPointerDown={
              onPageClick
                ? (e) => {
                    // Only empty spots: not a box already on the page.
                    const t = e.target as HTMLElement;
                    if (
                      t !== e.currentTarget.lastElementChild &&
                      !t.hasAttribute('data-layer')
                    )
                      return;
                    const r = e.currentTarget.getBoundingClientRect();
                    onPageClick(i, {
                      x: (e.clientX - r.left) / r.width,
                      y: (e.clientY - r.top) / r.height,
                    });
                  }
                : undefined
            }
          >
            {doc && <PageCanvas doc={doc} index={i} width={width} />}
            <div className="absolute inset-0">{overlay?.(i)}</div>
          </div>
          <p className="text-center text-[11px] text-neutral-500">
            {label} {i + 1} of {pages.length}
          </p>
        </div>
      ))}
    </div>
  );
};
