'use client';

import type * as PdfJsModule from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/*
 * PDFs and Word files in the browser: pages drawn with pdf.js (for placing
 * signature boxes, and for signers to read the document as it is), the text
 * of a PDF for search, a Word file turned into editable text, and a file's
 * SHA-256 worked out without it leaving the browser. Loaded only when used.
 */

type PdfJs = typeof PdfJsModule;

let loading: Promise<PdfJs> | null = null;

/** pdf.js, with its worker, the first time it's needed. */
export function pdfjs(): Promise<PdfJs> {
  if (!loading)
    loading = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url,
      ).toString();
      return lib;
    });
  return loading;
}

/** Opens a PDF from its bytes. */
export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  // pdf.js takes ownership of the buffer it's given: hand it a copy.
  return lib.getDocument({
    data: new Uint8Array(data.slice(0)),
    isEvalSupported: false,
  }).promise;
}

/** The bytes behind a link, as the Portal's routes give them. */
export async function fetchPdf(url: string): Promise<ArrayBuffer> {
  let res = await fetch(url, { credentials: 'same-origin' });
  // Our routes answer with a short-lived storage link.
  if (res.headers.get('content-type')?.includes('application/json')) {
    const json = await res.json().catch(() => null);
    const link = json?.data?.url ?? json?.url;
    if (!res.ok || typeof link !== 'string')
      throw new Error(
        json?.message || json?.error || 'The PDF can’t be opened.',
      );
    res = await fetch(link);
  }
  if (!res.ok) throw new Error('The PDF can’t be opened.');
  return res.arrayBuffer();
}

/**
 * The text of a PDF, page by page, for search. Scanned pages have none.
 */
export async function pdfText(doc: PDFDocumentProxy, max = 200_000) {
  const pages: string[] = [];
  let length = 0;
  for (let i = 1; i <= doc.numPages && length < max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trimEnd());
        line = '';
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    const text = lines
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    pages.push(text);
    length += text.length;
    page.cleanup();
  }
  return pages.filter(Boolean).join('\n\n').slice(0, max);
}

/** A file's SHA-256, in hex, worked out in the browser. */
export async function sha256Hex(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* --------------------------------- Word ---------------------------------- */

const inline = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.textContent ?? '').replace(/\s+/g, ' ');
  if (!(node instanceof HTMLElement)) return '';
  const inner = Array.from(node.childNodes).map(inline).join('');
  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (!inner.trim()) return inner;
  const lead = inner.match(/^\s*/)?.[0] ?? '';
  const trail = inner.match(/\s*$/)?.[0] ?? '';
  const core = inner.trim();
  if (tag === 'strong' || tag === 'b') return `${lead}**${core}**${trail}`;
  if (tag === 'em' || tag === 'i') return `${lead}*${core}*${trail}`;
  return inner;
};

const blocks = (root: Element, out: string[], depth = 0) => {
  for (const node of Array.from(root.children)) {
    const tag = node.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(3, Number(tag[1]));
      const text = inline(node).replace(/\*\*/g, '').trim();
      if (text) out.push(`${'#'.repeat(level)} ${text}`);
    } else if (tag === 'p') {
      const text = inline(node).trim();
      if (text) out.push(text);
    } else if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      Array.from(node.children).forEach((li, i) => {
        const own = Array.from(li.childNodes)
          .filter(
            (c) => !(c instanceof HTMLElement && /^(ul|ol)$/i.test(c.tagName)),
          )
          .map(inline)
          .join('')
          .trim();
        const mark = tag === 'ol' ? `${i + 1}.` : '-';
        if (own) items.push(`${'   '.repeat(depth)}${mark} ${own}`);
        const nested: string[] = [];
        blocks(li, nested, depth + 1);
        items.push(...nested.filter((n) => /^\s*(-|\d+\.)\s/.test(n)));
      });
      if (items.length) out.push(items.join('\n'));
    } else if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'))
        .map((tr) =>
          Array.from(tr.children)
            .map((td) => inline(td).trim())
            .filter(Boolean)
            .join(' · '),
        )
        .filter(Boolean);
      if (rows.length) out.push(rows.join('\n\n'));
    } else {
      blocks(node, out, depth);
    }
  }
};

/** A Word file as the agreement text: headings, paragraphs, lists, bold. */
export async function wordToText(data: ArrayBuffer) {
  // @ts-expect-error The browser build has no types of its own.
  const mod = await import('mammoth/mammoth.browser');
  const mammoth = (mod.default ?? mod) as {
    convertToHtml: (
      input: { arrayBuffer: ArrayBuffer },
      options?: { ignoreEmptyParagraphs?: boolean },
    ) => Promise<{ value: string; messages: unknown[] }>;
  };
  const { value } = await mammoth.convertToHtml({ arrayBuffer: data });
  const doc = new DOMParser().parseFromString(
    `<body>${value}</body>`,
    'text/html',
  );
  const out: string[] = [];
  blocks(doc.body, out);
  return out
    .join('\n\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
