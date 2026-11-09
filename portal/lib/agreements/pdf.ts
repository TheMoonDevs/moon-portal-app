import fontkit from '@pdf-lib/fontkit';
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from 'pdf-lib';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { envelopeId, signatureMethod } from './envelope';
import { CAVEAT_REGULAR, NOTO_SANS_BOLD, NOTO_SANS_REGULAR } from './pdfFonts';

/*
 * The signed copy as a PDF: the document as it was signed, every signature
 * in place, and a certificate page with the hash and the audit trail. A
 * document written in the Portal is typeset from its text; an uploaded PDF
 * keeps its own pages, with the signatures, initials and dates drawn into
 * the boxes placed on them. Either way it is built from the frozen record.
 */

export interface PdfSignature {
  name: string;
  method: 'typed' | 'drawn';
  image?: string | null;
  at: string;
  ip?: string | null;
  saved?: boolean | null;
  /** Printed beside the signature, to match it to the audit trail. */
  signatureId?: string | null;
  /** For initials boxes; taken from the name when not set. */
  initials?: string | null;
  /** How they proved who they were, beyond the link. */
  verified?: 'email_code' | 'portal' | null;
}

/** A box on an uploaded page, for the signer at `signer` in `signers`. */
export interface PdfPlacement {
  kind: 'signature' | 'initials' | 'date';
  signer: number;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfSigner {
  name: string;
  email: string;
  role?: string | null;
  company?: boolean | null;
  status: string;
  signature?: PdfSignature | null;
  /** What they filled in before signing, as it reads. */
  details?: Array<{ label: string; text: string }> | null;
}

export interface PdfInput {
  /** Shown on every page and the certificate, e.g. the agreement id. */
  reference: string;
  title: string;
  companyName: string;
  body: string;
  hash: string;
  sentAt: string;
  completedAt?: string | null;
  status: string;
  signers: PdfSigner[];
  history: Array<{ at: string; text: string; ip?: string | null }>;
  /** An uploaded PDF signed as it is, and the boxes on its pages. */
  source?: { bytes: Uint8Array; placements: PdfPlacement[] } | null;
  /** Where anyone can check a copy is genuine. */
  verifyUrl?: string | null;
}

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 56, top: 64, bottom: 64 };
const WIDTH = A4.w - M.x * 2;
const INK = rgb(0.09, 0.09, 0.1);
const MUTED = rgb(0.42, 0.42, 0.45);
const RULE = rgb(0.85, 0.85, 0.87);
const NAVY = rgb(0.059, 0.122, 0.22);
const BLUE = rgb(0.114, 0.306, 0.847);
const SIGN_INK = rgb(0.043, 0.165, 0.42);
const GREEN = rgb(0.016, 0.42, 0.3);
const FILL = rgb(0.957, 0.965, 0.976);
const WHITE = rgb(1, 1, 1);

export const formatIst = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })} IST`;
};

type Run = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

/** Characters the fonts don't carry, swapped for ones they do. */
const clean = (s: string) =>
  s
    .replace(/\t/g, '    ')
    .replace(/[✓✔✅]/g, 'Yes')
    .replace(/[●▪■]/g, '•')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  regular!: PDFFont;
  bold!: PDFFont;
  script!: PDFFont;

  constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  async init(firstPage = true) {
    this.doc.registerFontkit(fontkit);
    const [regular, bold, script] = await Promise.all([
      this.doc.embedFont(Buffer.from(NOTO_SANS_REGULAR, 'base64'), {
        subset: true,
      }),
      this.doc.embedFont(Buffer.from(NOTO_SANS_BOLD, 'base64'), {
        subset: true,
      }),
      this.doc.embedFont(Buffer.from(CAVEAT_REGULAR, 'base64'), {
        subset: true,
      }),
    ]);
    this.regular = regular;
    this.bold = bold;
    this.script = script;
    if (firstPage) this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - M.top;
  }

  ensure(height: number) {
    if (this.y - height < M.bottom) this.newPage();
  }

  gap(h: number) {
    this.y -= h;
  }

  font(run: Run) {
    return run.bold ? this.bold : this.regular;
  }

  /** Lays runs out in lines no wider than `width`. */
  wrap(runs: Run[], size: number, width: number) {
    type Piece = Run & { w: number };
    const lines: Piece[][] = [[]];
    let lineW = 0;
    const push = (p: Piece) => {
      lines[lines.length - 1].push(p);
      lineW += p.w;
    };
    const breakLine = () => {
      const line = lines[lines.length - 1];
      while (line.length && !line[line.length - 1].text.trim()) line.pop();
      lines.push([]);
      lineW = 0;
    };
    for (const run of runs) {
      const font = this.font(run);
      const parts = clean(run.text).split('\n');
      parts.forEach((part, pi) => {
        if (pi) breakLine();
        for (const token of part.split(/(\s+)/)) {
          if (!token) continue;
          const isSpace = /^\s+$/.test(token);
          const t = isSpace ? ' ' : token;
          let w = font.widthOfTextAtSize(t, size);
          if (isSpace && !lineW) continue;
          if (!isSpace && lineW + w > width && lineW > 0) breakLine();
          if (!isSpace && w > width) {
            // A word longer than the line (a hash, a URL): split it.
            let rest = t;
            while (rest) {
              let n = rest.length;
              while (
                n > 1 &&
                font.widthOfTextAtSize(rest.slice(0, n), size) > width - lineW
              )
                n--;
              const chunk = rest.slice(0, n);
              push({
                ...run,
                text: chunk,
                w: font.widthOfTextAtSize(chunk, size),
              });
              rest = rest.slice(n);
              if (rest) breakLine();
            }
            continue;
          }
          w = font.widthOfTextAtSize(t, size);
          push({ ...run, text: t, w });
        }
      });
    }
    return lines.filter((l, i) => l.length || i < lines.length - 1);
  }

  /** Writes a block of runs, page-breaking between lines. */
  runs(
    runs: Run[],
    opts: {
      size?: number;
      x?: number;
      width?: number;
      color?: any;
      leading?: number;
    } = {},
  ) {
    const size = opts.size ?? 10.5;
    const x = opts.x ?? M.x;
    const width = opts.width ?? WIDTH - (x - M.x);
    const leading = opts.leading ?? size * 1.5;
    for (const line of this.wrap(runs, size, width)) {
      this.ensure(leading);
      let cx = x;
      for (const p of line) {
        this.page.drawText(p.text, {
          x: cx,
          y: this.y - size,
          size,
          font: this.font(p),
          color: p.code ? MUTED : (opts.color ?? INK),
        });
        cx += p.w;
      }
      this.y -= leading;
    }
  }

  text(
    t: string,
    opts: Parameters<Writer['runs']>[1] & { bold?: boolean } = {},
  ) {
    this.runs([{ text: t, bold: opts.bold }], opts);
  }

  rule(color = RULE) {
    this.ensure(10);
    this.page.drawLine({
      start: { x: M.x, y: this.y },
      end: { x: A4.w - M.x, y: this.y },
      thickness: 0.6,
      color,
    });
    this.y -= 10;
  }
}

/* -------------------------------- markdown -------------------------------- */

const md = unified().use(remarkParse).use(remarkGfm);

function inline(nodes: any[], marks: Omit<Run, 'text'> = {}): Run[] {
  const out: Run[] = [];
  for (const n of nodes ?? []) {
    if (n.type === 'text') out.push({ text: n.value, ...marks });
    else if (n.type === 'strong')
      out.push(...inline(n.children, { ...marks, bold: true }));
    else if (n.type === 'emphasis')
      out.push(...inline(n.children, { ...marks, italic: true }));
    else if (n.type === 'delete') out.push(...inline(n.children, marks));
    else if (n.type === 'inlineCode')
      out.push({ text: n.value, ...marks, code: true });
    else if (n.type === 'break') out.push({ text: '\n', ...marks });
    else if (n.type === 'link') {
      const label = inline(n.children, marks);
      out.push(...label);
      const said = label.map((r) => r.text).join('');
      const url = String(n.url ?? '').replace(/^mailto:/, '');
      if (url && url !== said && /^(https?:|mailto:)/.test(n.url))
        out.push({ text: ` (${url})`, ...marks });
    } else if (n.children) out.push(...inline(n.children, marks));
  }
  return out;
}

const HEADING_SIZE: Record<number, number> = { 1: 17, 2: 13.5, 3: 12, 4: 11 };

function blocks(w: Writer, nodes: any[], indent = 0) {
  const x = M.x + indent;
  for (const n of nodes ?? []) {
    switch (n.type) {
      case 'heading': {
        const size = HEADING_SIZE[n.depth] ?? 10.5;
        w.ensure(size * 3);
        w.gap(n.depth <= 2 ? 10 : 6);
        w.runs(inline(n.children, { bold: true }), {
          size,
          x,
          leading: size * 1.35,
        });
        w.gap(3);
        break;
      }
      case 'paragraph':
        w.runs(inline(n.children), { x });
        w.gap(6);
        break;
      case 'list': {
        let i = typeof n.start === 'number' ? n.start : 1;
        for (const item of n.children ?? []) {
          const marker = n.ordered ? `${i++}.` : '•';
          w.ensure(16);
          const markerY = w.y;
          const page = w.page;
          const first = item.children?.[0];
          if (first?.type === 'paragraph') {
            w.runs(inline(first.children), { x: x + 16 });
            blocks(w, item.children.slice(1), indent + 16);
          } else blocks(w, item.children, indent + 16);
          page.drawText(marker, {
            x,
            y: markerY - 10.5,
            size: 10.5,
            font: w.regular,
            color: INK,
          });
          w.gap(2);
        }
        w.gap(4);
        break;
      }
      case 'blockquote': {
        const top = w.y;
        const page = w.page;
        blocks(w, n.children, indent + 14);
        if (w.page === page)
          page.drawLine({
            start: { x: x + 3, y: top },
            end: { x: x + 3, y: w.y + 6 },
            thickness: 2,
            color: RULE,
          });
        break;
      }
      case 'thematicBreak':
        w.gap(4);
        w.rule();
        break;
      case 'code':
        w.runs([{ text: n.value, code: true }], { x: x + 8, size: 9.5 });
        w.gap(6);
        break;
      case 'table': {
        const cols = n.children?.[0]?.children?.length || 1;
        const colW = (WIDTH - indent) / cols;
        n.children.forEach((row: any, ri: number) => {
          const cells = row.children.map((c: any) =>
            w.wrap(inline(c.children, { bold: ri === 0 }), 9.5, colW - 8),
          );
          const height =
            Math.max(1, ...cells.map((c: any[]) => c.length)) * 13 + 6;
          w.ensure(height);
          cells.forEach((lines: any[], ci: number) => {
            lines.forEach((line, li) => {
              let cx = x + ci * colW + 4;
              for (const p of line) {
                w.page.drawText(p.text, {
                  x: cx,
                  y: w.y - 12 - li * 13,
                  size: 9.5,
                  font: w.font(p),
                  color: INK,
                });
                cx += p.w;
              }
            });
          });
          w.y -= height;
          w.page.drawLine({
            start: { x, y: w.y + 2 },
            end: { x: A4.w - M.x, y: w.y + 2 },
            thickness: 0.5,
            color: RULE,
          });
        });
        w.gap(8);
        break;
      }
      default:
        if (n.children) blocks(w, n.children, indent);
    }
  }
}

/* -------------------------------- the PDF --------------------------------- */

async function embedSignature(doc: PDFDocument, image?: string | null) {
  if (!image) return null;
  try {
    return await doc.embedPng(
      Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64'),
    );
  } catch {
    return null;
  }
}

/**
 * A signature in its frame: a bracket, "Signed by:", the signature, and the
 * signature id that ties it to the audit trail. Returns the height used.
 */
function signatureFrame(
  w: Writer,
  page: PDFPage,
  sig: PdfSignature,
  img: PDFImage | null,
  x: number,
  top: number,
  width: number,
) {
  const h = 60;
  const bracket = { thickness: 1.2, color: BLUE };
  page.drawLine({ start: { x, y: top }, end: { x, y: top - h }, ...bracket });
  page.drawLine({
    start: { x, y: top },
    end: { x: x + 7, y: top },
    ...bracket,
  });
  page.drawLine({
    start: { x, y: top - h },
    end: { x: x + 7, y: top - h },
    ...bracket,
  });
  const ix = x + 9;
  const inner = width - 12;
  page.drawText('SIGNED BY:', {
    x: ix,
    y: top - 9,
    size: 6,
    font: w.bold,
    color: MUTED,
  });
  const area = { top: top - 13, h: 34 };
  if (img) {
    const scale = Math.min(inner / img.width, area.h / img.height, 1);
    page.drawImage(img, {
      x: ix,
      y: area.top - area.h + (area.h - img.height * scale) / 2,
      width: img.width * scale,
      height: img.height * scale,
    });
  } else {
    const size = Math.min(
      26,
      (inner / Math.max(1, w.script.widthOfTextAtSize(clean(sig.name), 26))) *
        26,
    );
    page.drawText(clean(sig.name), {
      x: ix,
      y: area.top - area.h + 8,
      size,
      font: w.script,
      color: SIGN_INK,
    });
  }
  if (sig.signatureId)
    page.drawText(sig.signatureId, {
      x: ix,
      y: top - h + 4,
      size: 6.5,
      font: w.regular,
      color: MUTED,
    });
  return h;
}

function signatureBlock(
  w: Writer,
  s: PdfSigner,
  img: PDFImage | null,
  x: number,
  top: number,
  width: number,
) {
  const page = w.page;
  const boxH = 62;
  if (s.signature) {
    signatureFrame(w, page, s.signature, img, x, top, width);
  } else {
    page.drawRectangle({
      x,
      y: top - boxH + 6,
      width: Math.min(width, 200),
      height: boxH - 12,
      borderColor: RULE,
      borderWidth: 0.8,
      borderDashArray: [3, 2],
    });
    page.drawText(s.status === 'DECLINED' ? 'Declined to sign' : 'Not signed', {
      x: x + 10,
      y: top - boxH / 2 - 3,
      size: 9,
      font: w.regular,
      color: MUTED,
    });
  }
  page.drawLine({
    start: { x, y: top - boxH - 4 },
    end: { x: x + width, y: top - boxH - 4 },
    thickness: 0.7,
    color: INK,
  });
  const lines: Array<[string, PDFFont, number, any]> = [
    [s.name, w.bold, 10, INK],
    [s.role || (s.company ? 'For the company' : 'Signer'), w.regular, 9, MUTED],
    [s.email, w.regular, 9, MUTED],
  ];
  if (s.signature)
    lines.push([`Signed ${formatIst(s.signature.at)}`, w.regular, 8.5, MUTED]);
  let ly = top - boxH - 18;
  for (const [t, font, size, color] of lines) {
    let str = clean(t);
    while (str.length > 3 && font.widthOfTextAtSize(str, size) > width)
      str = `${str.slice(0, -2)}…`;
    page.drawText(str, { x, y: ly, size, font, color });
    ly -= size + 4;
  }
}

/** A line of text cut to fit `width`. */
const fit = (font: PDFFont, t: string, size: number, width: number) => {
  let str = clean(t);
  while (str.length > 3 && font.widthOfTextAtSize(str, size) > width)
    str = `${str.slice(0, -2)}…`;
  return str;
};

/** Labelled facts in columns, label above value. */
function factGrid(w: Writer, items: Array<[string, string]>, cols = 2) {
  const gutter = 24;
  const colW = (WIDTH - 32 - gutter * (cols - 1)) / cols;
  for (let i = 0; i < items.length; i += cols) {
    w.ensure(34);
    const rowTop = w.y;
    let low = w.y;
    for (let j = 0; j < cols && i + j < items.length; j++) {
      const [k, v] = items[i + j];
      const x = M.x + 16 + j * (colW + gutter);
      w.page.drawText(k.toUpperCase(), {
        x,
        y: rowTop - 7,
        size: 6.5,
        font: w.bold,
        color: MUTED,
      });
      w.y = rowTop - 11;
      w.runs([{ text: v }], { x, width: colW, size: 9, leading: 12.5 });
      low = Math.min(low, w.y);
      w.y = rowTop;
    }
    w.y = low - 7;
  }
}

/** A table's header row on a light fill. */
function tableHead(w: Writer, cols: Array<[string, number]>) {
  w.ensure(40);
  w.page.drawRectangle({
    x: M.x,
    y: w.y - 18,
    width: WIDTH,
    height: 18,
    color: FILL,
  });
  for (const [label, x] of cols)
    w.page.drawText(label.toUpperCase(), {
      x,
      y: w.y - 12,
      size: 6.5,
      font: w.bold,
      color: MUTED,
    });
  w.y -= 24;
}

function sectionTitle(w: Writer, t: string) {
  w.ensure(60);
  w.text(t, { size: 11, bold: true, leading: 16, color: NAVY });
  w.gap(4);
}

/** What each signer filled in before signing. */
function writeDetails(w: Writer, signers: PdfSigner[]) {
  const filled = signers.filter((s) => s.details?.length);
  if (filled.length) {
    w.gap(10);
    w.ensure(60);
    w.text('Details filled in', { size: 13.5, bold: true, leading: 20 });
    for (const s of filled) {
      w.gap(4);
      w.ensure(40);
      w.text(`By ${s.name}`, { size: 10, bold: true, leading: 15 });
      w.gap(2);
      for (const d of s.details!) {
        const label = [{ text: d.label }];
        const value = [{ text: d.text }];
        // Keep a label and its answer together when they fit on a page.
        w.ensure(
          Math.min(
            Math.max(
              w.wrap(label, 9, 150).length * 13,
              w.wrap(value, 10, WIDTH - 160).length * 14,
            ),
            A4.h - M.top - M.bottom,
          ),
        );
        const page = w.page;
        const top = w.y;
        w.runs(label, {
          x: M.x,
          size: 9,
          leading: 13,
          width: 150,
          color: MUTED,
        });
        const afterLabel = w.y;
        w.y = top;
        w.runs(value, {
          x: M.x + 160,
          size: 10,
          leading: 14,
          width: WIDTH - 160,
        });
        w.y = (w.page === page ? Math.min(w.y, afterLabel) : w.y) - 4;
      }
    }
  }
}

/** The signature blocks, two to a row, under a written document. */
function writeSignatures(
  w: Writer,
  signers: PdfSigner[],
  images: Array<PDFImage | null>,
) {
  w.gap(10);
  w.ensure(60);
  w.text('Signatures', { size: 13.5, bold: true, leading: 20 });
  w.gap(6);
  const colW = (WIDTH - 28) / 2;
  for (let i = 0; i < signers.length; i += 2) {
    w.ensure(140);
    const top = w.y;
    for (let j = 0; j < 2 && i + j < signers.length; j++)
      signatureBlock(
        w,
        signers[i + j],
        images[i + j],
        M.x + j * (colW + 28),
        top,
        colW,
      );
    w.y = top - 140;
  }
}

/** The certificate of completion: summary, signer events and audit trail. */
function writeCertificate(
  w: Writer,
  input: PdfInput,
  images: Array<PDFImage | null>,
  docPages: number,
) {
  const done = input.status === 'COMPLETED';
  w.newPage();
  {
    const top = w.y + 6;
    const bandH = 62;
    w.page.drawRectangle({
      x: M.x,
      y: top - bandH,
      width: WIDTH,
      height: bandH,
      color: NAVY,
    });
    w.page.drawText('Certificate of Completion', {
      x: M.x + 18,
      y: top - 29,
      size: 16,
      font: w.bold,
      color: WHITE,
    });
    w.page.drawText(`Envelope ID: ${envelopeId(input.reference)}`, {
      x: M.x + 18,
      y: top - 47,
      size: 8.5,
      font: w.regular,
      color: rgb(0.72, 0.78, 0.87),
    });
    const status = done ? 'COMPLETED' : input.status.toUpperCase();
    const sw = w.bold.widthOfTextAtSize(status, 8);
    w.page.drawRectangle({
      x: M.x + WIDTH - 18 - sw - 18,
      y: top - 40,
      width: sw + 18,
      height: 18,
      color: done ? GREEN : rgb(0.4, 0.42, 0.46),
    });
    w.page.drawText(status, {
      x: M.x + WIDTH - 18 - sw - 9,
      y: top - 34,
      size: 8,
      font: w.bold,
      color: WHITE,
    });
    w.y = top - bandH - 16;
  }
  const signed = input.signers.filter((s) => s.signature).length;
  const summaryTop = w.y;
  w.y -= 12;
  factGrid(w, [
    ['Subject', input.title],
    ['Originator', input.companyName],
    ['Document pages', String(docPages)],
    ['Sent', formatIst(input.sentAt)],
    ['Signatures', `${signed} of ${input.signers.length}`],
    ['Completed', formatIst(input.completedAt) || 'Not yet'],
    ['Status', done ? 'Completed' : input.status.toLowerCase()],
    ['Time zone', 'India Standard Time (UTC+05:30)'],
  ]);
  factGrid(
    w,
    [
      [
        input.source
          ? 'Document fingerprint (SHA-256 of the original PDF)'
          : 'Document fingerprint (SHA-256 of the text)',
        input.hash,
      ],
    ],
    1,
  );
  w.page.drawRectangle({
    x: M.x,
    y: w.y,
    width: WIDTH,
    height: summaryTop - w.y,
    borderColor: RULE,
    borderWidth: 0.6,
  });
  w.gap(20);

  // Signer events.
  sectionTitle(w, 'Signer events');
  const c1 = M.x + 10;
  const c2 = M.x + 190;
  const c3 = M.x + 376;
  tableHead(w, [
    ['Signer', c1],
    ['Signature', c2],
    ['Timestamp', c3],
  ]);
  for (let i = 0; i < input.signers.length; i++) {
    const s = input.signers[i];
    w.ensure(104);
    const page = w.page;
    const top = w.y;
    let low = top;
    const left: Array<[string, PDFFont, number, any]> = [
      [s.name, w.bold, 9.5, INK],
      [s.email, w.regular, 8.5, INK],
      [
        s.role || (s.company ? 'For the company' : 'Signer'),
        w.regular,
        8,
        MUTED,
      ],
      [securityLevel(s.signature), w.regular, 7.5, MUTED],
    ];
    let ly = top - 9;
    for (const [t, font, size, color] of left) {
      page.drawText(fit(font, t, size, c2 - c1 - 12), {
        x: c1,
        y: ly,
        size,
        font,
        color,
      });
      ly -= size + 4.5;
    }
    low = Math.min(low, ly);
    const sig = s.signature;
    if (sig) {
      const h = signatureFrame(w, page, sig, images[i], c2, top, c3 - c2 - 16);
      let sy = top - h - 12;
      for (const t of [
        `Adoption: ${signatureMethod(sig)}`,
        ...(sig.ip ? [`Using IP address: ${sig.ip}`] : []),
      ]) {
        page.drawText(fit(w.regular, t, 7.5, c3 - c2 - 12), {
          x: c2,
          y: sy,
          size: 7.5,
          font: w.regular,
          color: MUTED,
        });
        sy -= 11;
      }
      low = Math.min(low, sy);
      page.drawText('Signed', {
        x: c3,
        y: top - 9,
        size: 7.5,
        font: w.bold,
        color: MUTED,
      });
      page.drawText(formatIst(sig.at), {
        x: c3,
        y: top - 20,
        size: 8.5,
        font: w.regular,
        color: INK,
      });
    } else {
      page.drawText(s.status === 'DECLINED' ? 'Declined' : 'Not signed', {
        x: c2,
        y: top - 9,
        size: 9,
        font: w.regular,
        color: MUTED,
      });
      low = Math.min(low, top - 20);
    }
    w.y = low - 6;
    page.drawLine({
      start: { x: M.x, y: w.y },
      end: { x: A4.w - M.x, y: w.y },
      thickness: 0.4,
      color: RULE,
    });
    w.y -= 8;
  }
  w.gap(14);

  // Audit trail.
  sectionTitle(w, 'Audit trail');
  const a1 = M.x + 10;
  const a2 = M.x + 132;
  const a3 = M.x + WIDTH - 78;
  tableHead(w, [
    ['Time', a1],
    ['Event', a2],
    ['IP address', a3],
  ]);
  input.history.forEach((e, i) => {
    const lines = w.wrap([{ text: e.text }], 8.5, a3 - a2 - 12);
    const h = lines.length * 12 + 7;
    w.ensure(h);
    if (i % 2)
      w.page.drawRectangle({
        x: M.x,
        y: w.y - h,
        width: WIDTH,
        height: h,
        color: FILL,
      });
    const top = w.y;
    w.page.drawText(formatIst(e.at), {
      x: a1,
      y: top - 11,
      size: 7.5,
      font: w.regular,
      color: MUTED,
    });
    if (e.ip)
      w.page.drawText(fit(w.regular, e.ip, 7.5, A4.w - M.x - a3), {
        x: a3,
        y: top - 11,
        size: 7.5,
        font: w.regular,
        color: MUTED,
      });
    w.y = top - 3;
    w.runs([{ text: e.text }], {
      x: a2,
      width: a3 - a2 - 12,
      size: 8.5,
      leading: 12,
    });
    w.y = top - h;
  });
  w.gap(18);
  w.text(
    `This certificate was produced by the Portal from the signed record of envelope ${envelopeId(input.reference)}. The SHA-256 fingerprint identifies the exact ${input.source ? 'file' : 'text'} that was signed; any change to it gives a different fingerprint.${input.verifyUrl ? ` Anyone can check that a copy of this PDF is genuine and unchanged at ${input.verifyUrl}.` : ''}`,
    { size: 7.5, color: MUTED, leading: 11 },
  );
}

/** The running header and footer, on the pages the Portal wrote. */
function runningChrome(w: Writer, input: PdfInput, from: number) {
  const all = w.doc.getPages();
  const env = `Envelope ID: ${envelopeId(input.reference)}`;
  all.forEach((p, i) => {
    if (i < from) return;
    const company = fit(w.bold, input.companyName.toUpperCase(), 7, WIDTH / 2);
    p.drawText(company, {
      x: M.x,
      y: A4.h - 36,
      size: 7,
      font: w.bold,
      color: MUTED,
    });
    p.drawText(env, {
      x: A4.w - M.x - w.regular.widthOfTextAtSize(env, 7),
      y: A4.h - 36,
      size: 7,
      font: w.regular,
      color: MUTED,
    });
    p.drawLine({
      start: { x: M.x, y: A4.h - 44 },
      end: { x: A4.w - M.x, y: A4.h - 44 },
      thickness: 0.4,
      color: RULE,
    });
    const pageNo = `Page ${i + 1} of ${all.length}`;
    const pw = w.regular.widthOfTextAtSize(pageNo, 7.5);
    p.drawText(fit(w.regular, input.title, 7.5, WIDTH - pw - 24), {
      x: M.x,
      y: 34,
      size: 7.5,
      font: w.regular,
      color: MUTED,
    });
    p.drawText(pageNo, {
      x: A4.w - M.x - pw,
      y: 34,
      size: 7.5,
      font: w.regular,
      color: MUTED,
    });
    p.drawLine({
      start: { x: M.x, y: 46 },
      end: { x: A4.w - M.x, y: 46 },
      thickness: 0.4,
      color: RULE,
    });
  });
}

/** The security level line of a signer, in the certificate. */
const securityLevel = (sig: PdfSignature | null | undefined) =>
  sig?.verified === 'email_code'
    ? 'Security level: email, personal link, email code'
    : sig?.verified === 'portal'
      ? 'Security level: email, signed in to the Portal'
      : 'Security level: email, personal link';

/* ------------------------------ uploaded PDFs ----------------------------- */

type PageBox = { x0: number; y0: number; W: number; H: number; rot: number };

const rotationOf = (angle: number) =>
  (((Math.round(angle / 90) * 90) % 360) + 360) % 360;

const boxOf = (page: PDFPage): PageBox => {
  const b = page.getCropBox();
  return {
    x0: b.x,
    y0: b.y,
    W: b.width,
    H: b.height,
    rot: rotationOf(page.getRotation().angle),
  };
};

/** The page as it shows: rotated pages swap width and height. */
const shownSize = (b: PageBox) =>
  b.rot === 90 || b.rot === 270 ? { w: b.H, h: b.W } : { w: b.W, h: b.H };

/** A point on the page as it shows (from its top left) in PDF space. */
export function shownToPdf(b: PageBox, u: number, v: number) {
  switch (b.rot) {
    case 90:
      return { x: b.x0 + v, y: b.y0 + u };
    case 180:
      return { x: b.x0 + b.W - u, y: b.y0 + v };
    case 270:
      return { x: b.x0 + b.W - v, y: b.y0 + b.H - u };
    default:
      return { x: b.x0 + u, y: b.y0 + b.H - v };
  }
}

/**
 * Drawing inside one box on a page as it shows: `dx` from the box's left,
 * `dy` up from its bottom. Text and images are turned with the page, so
 * they read upright on a rotated page.
 */
function frame(
  page: PDFPage,
  b: PageBox,
  rect: { u: number; v: number; w: number; h: number },
) {
  const at = (dx: number, dy: number) =>
    shownToPdf(b, rect.u + dx, rect.v + rect.h - dy);
  const rotate = degrees(b.rot);
  return {
    text(
      t: string,
      dx: number,
      dy: number,
      size: number,
      font: PDFFont,
      color = INK,
    ) {
      page.drawText(t, { ...at(dx, dy), size, font, color, rotate });
    },
    image(
      img: PDFImage,
      dx: number,
      dy: number,
      width: number,
      height: number,
    ) {
      page.drawImage(img, { ...at(dx, dy), width, height, rotate });
    },
    line(
      a: [number, number],
      z: [number, number],
      thickness: number,
      color: any,
    ) {
      page.drawLine({ start: at(...a), end: at(...z), thickness, color });
    },
  };
}

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/** The signatures, initials and dates, in the boxes on the uploaded pages. */
function stampPlacements(
  w: Writer,
  input: PdfInput,
  images: Array<PDFImage | null>,
) {
  const pages = w.doc.getPages();
  const env = `Envelope ID: ${envelopeId(input.reference)}`;
  pages.forEach((page) => {
    // Like a stamp at the top of every page, so a page can't be passed off
    // as from another document.
    const b = boxOf(page);
    const size = shownSize(b);
    const f = frame(page, b, { u: 0, v: 0, w: size.w, h: size.h });
    f.text(env, 14, size.h - 14, 6.5, w.regular, MUTED);
  });
  for (const p of input.source?.placements ?? []) {
    const signer = input.signers[p.signer];
    const sig = signer?.signature;
    const page = pages[p.page];
    if (!sig || !page) continue;
    const b = boxOf(page);
    const size = shownSize(b);
    const rect = {
      u: p.x * size.w,
      v: p.y * size.h,
      w: p.w * size.w,
      h: p.h * size.h,
    };
    const f = frame(page, b, rect);
    if (p.kind === 'date') {
      const t = shortDay(sig.at);
      const fs = Math.max(
        5,
        Math.min(
          10,
          rect.h * 0.6,
          (rect.w / w.regular.widthOfTextAtSize(t, 10)) * 10,
        ),
      );
      f.text(t, 2, (rect.h - fs * 0.72) / 2, fs, w.regular);
      continue;
    }
    if (p.kind === 'initials') {
      const t = clean(sig.initials || initialsFrom(sig.name)) || '·';
      const fs = Math.max(
        6,
        Math.min(
          rect.h * 0.85,
          (rect.w / w.script.widthOfTextAtSize(t, 20)) * 20 * 0.9,
        ),
      );
      const tw = w.script.widthOfTextAtSize(t, fs);
      f.text(
        t,
        Math.max(1, (rect.w - tw) / 2),
        rect.h * 0.18,
        fs,
        w.script,
        SIGN_INK,
      );
      continue;
    }
    // A signature: the blue bracket, "Signed by", the signature, its id.
    const roomy = rect.h >= 30;
    f.line([0, 0], [0, rect.h], 1, BLUE);
    f.line([0, rect.h], [5, rect.h], 1, BLUE);
    f.line([0, 0], [5, 0], 1, BLUE);
    const top = roomy ? 8 : 1;
    const bottom = roomy && sig.signatureId ? 8 : 1;
    if (roomy) f.text('Signed by:', 4, rect.h - 6.5, 5.5, w.bold, MUTED);
    if (roomy && sig.signatureId)
      f.text(sig.signatureId, 4, 1.8, 5, w.regular, MUTED);
    const area = { w: rect.w - 7, h: Math.max(4, rect.h - top - bottom) };
    const img = images[p.signer];
    if (img) {
      const scale = Math.min(area.w / img.width, area.h / img.height);
      f.image(
        img,
        5,
        bottom + (area.h - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
    } else {
      const name = clean(sig.name);
      const fs = Math.max(
        6,
        Math.min(
          area.h * 0.95,
          (area.w / Math.max(1, w.script.widthOfTextAtSize(name, 20))) * 20,
        ),
      );
      f.text(
        name,
        5,
        bottom + Math.max(0, (area.h - fs * 0.7) / 2),
        fs,
        w.script,
        SIGN_INK,
      );
    }
  }
}

/** "Asha K. Verma" → "AKV". */
const initialsFrom = (name: string) =>
  name
    .split(/\s+/)
    .map((x) => x.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 4);

export async function buildAgreementPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = input.source
    ? await PDFDocument.load(input.source.bytes, { updateMetadata: false })
    : await PDFDocument.create();
  doc.setTitle(input.title);
  doc.setAuthor(input.companyName);
  doc.setSubject(`Signed copy, SHA-256 ${input.hash}`);
  doc.setProducer('Portal e-signing');
  doc.setCreator('Portal');
  const fixed = new Date(input.completedAt || input.sentAt);
  if (!Number.isNaN(fixed.getTime())) {
    doc.setCreationDate(fixed);
    doc.setModificationDate(fixed);
  }
  const w = new Writer(doc);
  await w.init(!input.source);
  const images = await Promise.all(
    input.signers.map((s) => embedSignature(doc, s.signature?.image)),
  );

  let docPages: number;
  if (input.source) {
    // The uploaded pages as they are, with what each signer put in the boxes.
    stampPlacements(w, input, images);
    docPages = doc.getPageCount();
    if (input.signers.some((s) => s.details?.length)) {
      w.newPage();
      writeDetails(w, input.signers);
    }
  } else {
    // Title block.
    w.text(input.title, { size: 19, bold: true, leading: 25 });
    w.text(
      input.completedAt
        ? `Signed by everyone on ${formatIst(input.completedAt)}`
        : `Sent ${formatIst(input.sentAt)} · ${input.status.toLowerCase()}`,
      { size: 9, color: MUTED },
    );
    w.gap(6);
    w.rule();
    w.gap(4);

    // The text as it was signed, without a first heading that repeats the title.
    const tree = md.parse(input.body ?? '').children as any[];
    const first = tree[0];
    const firstText =
      first?.type === 'heading'
        ? inline(first.children)
            .map((r) => r.text)
            .join('')
            .trim()
            .toLowerCase()
        : null;
    blocks(
      w,
      firstText && firstText === input.title.trim().toLowerCase()
        ? tree.slice(1)
        : tree,
    );
    writeDetails(w, input.signers);
    writeSignatures(w, input.signers, images);
    docPages = doc.getPageCount();
  }

  writeCertificate(w, input, images, docPages);
  runningChrome(w, input, input.source ? docPages : 0);
  return doc.save({ useObjectStreams: true });
}

export const pdfFileName = (title: string) =>
  `${
    title
      .replace(/[^\w\s.-]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'document'
  }-signed.pdf`;
