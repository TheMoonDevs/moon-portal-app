import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from 'pdf-lib';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { CAVEAT_REGULAR, NOTO_SANS_BOLD, NOTO_SANS_REGULAR } from './pdfFonts';

/*
 * The signed copy as a PDF: the document as it was signed, every signature
 * in place, and a certificate page with the hash and the audit trail. It is
 * built from the frozen record each time, so it always matches what was
 * signed, and the same record always gives the same pages.
 */

export interface PdfSignature {
  name: string;
  method: 'typed' | 'drawn';
  image?: string | null;
  at: string;
  ip?: string | null;
  saved?: boolean | null;
}

export interface PdfSigner {
  name: string;
  email: string;
  role?: string | null;
  company?: boolean | null;
  status: string;
  signature?: PdfSignature | null;
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
}

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 56, top: 64, bottom: 64 };
const WIDTH = A4.w - M.x * 2;
const INK = rgb(0.09, 0.09, 0.1);
const MUTED = rgb(0.42, 0.42, 0.45);
const RULE = rgb(0.85, 0.85, 0.87);

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

  async init() {
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
    this.newPage();
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

function signatureBlock(
  w: Writer,
  s: PdfSigner,
  img: PDFImage | null,
  x: number,
  top: number,
  width: number,
) {
  const page = w.page;
  const boxH = 54;
  if (s.signature) {
    if (img) {
      const scale = Math.min(width / img.width, boxH / img.height, 1);
      page.drawImage(img, {
        x,
        y: top - boxH + (boxH - img.height * scale) / 2,
        width: img.width * scale,
        height: img.height * scale,
      });
    } else {
      const size = Math.min(
        28,
        (width /
          Math.max(1, w.script.widthOfTextAtSize(s.signature.name, 28))) *
          28,
      );
      page.drawText(clean(s.signature.name), {
        x,
        y: top - boxH + 14,
        size,
        font: w.script,
        color: rgb(0.07, 0.15, 0.4),
      });
    }
  } else {
    page.drawText(s.status === 'DECLINED' ? 'Declined' : 'Not signed', {
      x,
      y: top - boxH + 16,
      size: 10,
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
  if (s.signature) {
    lines.push([`Signed ${formatIst(s.signature.at)}`, w.regular, 8.5, MUTED]);
    if (s.signature.saved)
      lines.push(['Approved with a saved signature', w.regular, 8.5, MUTED]);
  }
  let ly = top - boxH - 18;
  for (const [t, font, size, color] of lines) {
    let str = clean(t);
    while (str.length > 3 && font.widthOfTextAtSize(str, size) > width)
      str = `${str.slice(0, -2)}…`;
    page.drawText(str, { x, y: ly, size, font, color });
    ly -= size + 4;
  }
}

export async function buildAgreementPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
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
  await w.init();

  // Title block.
  w.text(input.companyName.toUpperCase(), {
    size: 8.5,
    color: MUTED,
    bold: true,
  });
  w.gap(2);
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

  // Signatures, two to a row.
  w.gap(10);
  w.ensure(60);
  w.text('Signatures', { size: 13.5, bold: true, leading: 20 });
  w.gap(6);
  const images = await Promise.all(
    input.signers.map((s) => embedSignature(doc, s.signature?.image)),
  );
  const colW = (WIDTH - 28) / 2;
  for (let i = 0; i < input.signers.length; i += 2) {
    w.ensure(140);
    const top = w.y;
    for (let j = 0; j < 2 && i + j < input.signers.length; j++)
      signatureBlock(
        w,
        input.signers[i + j],
        images[i + j],
        M.x + j * (colW + 28),
        top,
        colW,
      );
    w.y = top - 140;
  }

  // Certificate of completion.
  w.newPage();
  w.text('Certificate of completion', { size: 17, bold: true, leading: 24 });
  w.text(
    'This page records how the document above was sent and signed through the Portal.',
    { size: 9.5, color: MUTED },
  );
  w.gap(8);
  const facts: Array<[string, string]> = [
    ['Document', input.title],
    ['Company', input.companyName],
    ['Reference', input.reference],
    ['Status', input.status],
    ['Sent', formatIst(input.sentAt)],
    ['Completed', formatIst(input.completedAt) || 'Not yet'],
    ['SHA-256 of the text', input.hash],
  ];
  for (const [k, v] of facts) {
    w.ensure(18);
    const top = w.y;
    w.page.drawText(k, {
      x: M.x,
      y: top - 10,
      size: 9,
      font: w.bold,
      color: MUTED,
    });
    w.runs([{ text: v }], { x: M.x + 120, size: 9.5, leading: 14 });
    w.y = Math.min(w.y, top - 16);
  }
  w.gap(8);
  w.text('Signers', { size: 12, bold: true, leading: 18 });
  for (const s of input.signers) {
    w.ensure(52);
    w.text(`${s.name}  ·  ${s.email}`, { size: 10, bold: true, leading: 15 });
    const sig = s.signature;
    w.text(
      sig
        ? `${s.role ? `${s.role}. ` : ''}Signed ${formatIst(sig.at)} by ${
            sig.saved
              ? 'approving with their saved signature in the Portal'
              : sig.method === 'drawn'
                ? 'drawing their signature'
                : 'typing their full name'
          }${sig.ip ? `, from IP ${sig.ip}` : ''}.`
        : `${s.role ? `${s.role}. ` : ''}${s.status === 'DECLINED' ? 'Declined.' : 'Not signed.'}`,
      { size: 9, color: MUTED, leading: 13 },
    );
    w.gap(5);
  }
  w.gap(6);
  w.text('Audit trail', { size: 12, bold: true, leading: 18 });
  for (const e of input.history) {
    w.ensure(14);
    const top = w.y;
    w.page.drawText(formatIst(e.at), {
      x: M.x,
      y: top - 9,
      size: 8.5,
      font: w.regular,
      color: MUTED,
    });
    w.runs([{ text: `${e.text}${e.ip ? ` (IP ${e.ip})` : ''}` }], {
      x: M.x + 132,
      size: 9,
      leading: 13,
    });
    w.y = Math.min(w.y, top - 13);
  }

  // Footer on every page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const footer = clean(
      `${input.title} · ${input.reference} · Page ${i + 1} of ${pages.length}`,
    );
    let str = footer;
    while (str.length > 8 && w.regular.widthOfTextAtSize(str, 7.5) > WIDTH)
      str = `…${str.slice(2)}`;
    p.drawText(str, {
      x: M.x,
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
