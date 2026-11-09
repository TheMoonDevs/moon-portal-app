'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { signSans } from '@/components/screens/Sign/fonts';
import type { VerifyResult } from '@/lib/agreements/seal';
import { cn } from '@/lib/utils';
import { openPdf, sha256Hex } from '@/utils/helpers/pdfClient';

/*
 * Anyone handed a PDF signed in the Portal (a bank, a landlord, a new
 * employer) checks here that it is genuine and unchanged: the file's
 * SHA-256 is worked out in their browser and compared with the copy that
 * was issued when everyone signed. The file never leaves their device.
 */

const Symbol = ({ name, className }: { name: string; className?: string }) => {
  const px = className?.match(/text-\[(\d+(?:\.\d+)?)px\]/)?.[1];
  return (
    <span
      aria-hidden
      className={cn('material-symbols-outlined leading-none', className)}
      style={px ? { fontSize: `${px}px` } : undefined}
    >
      {name}
    </span>
  );
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : '—';

const ENVELOPE =
  /Envelope ID:?\s*([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{8,12})/i;

/** The Envelope ID printed on a signed PDF, when it can be read. */
async function envelopeIn(data: ArrayBuffer) {
  try {
    const doc = await openPdf(data);
    for (const n of [1, doc.numPages]) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((i) => ('str' in i ? i.str : ''))
        .join(' ');
      const m = ENVELOPE.exec(text);
      if (m) {
        doc.destroy();
        return m[1];
      }
    }
    doc.destroy();
  } catch {
    // A changed or broken file: the fingerprint still answers.
  }
  return null;
}

type Checked = {
  result: VerifyResult;
  fileName: string | null;
  hash: string | null;
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
    <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
    </dt>
    <dd className="min-w-0 text-[14px] text-slate-900">{children}</dd>
  </div>
);

const Banner = ({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'good' | 'bad' | 'info';
  icon: string;
  title: string;
  body: ReactNode;
}) => (
  <div
    className={cn(
      'flex items-start gap-4 px-6 py-5 sm:px-8',
      tone === 'good' && 'bg-emerald-700 text-white',
      tone === 'bad' && 'bg-rose-800 text-white',
      tone === 'info' && 'bg-[#0f1f38] text-white',
    )}
  >
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15">
      <Symbol name={icon} className="text-[26px]" />
    </span>
    <div className="min-w-0">
      <p className="text-[18px] font-semibold leading-snug">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-white/80">{body}</p>
    </div>
  </div>
);

const ResultCard = ({ checked }: { checked: Checked }) => {
  const r = checked.result;
  return (
    <section
      aria-live="polite"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_-16px_rgba(15,23,42,.25)]"
    >
      {r.match === 'file' ? (
        <>
          <Banner
            tone="good"
            icon="verified"
            title="Genuine and unchanged"
            body={`This is the exact PDF issued when everyone signed${checked.fileName ? `: ${checked.fileName}` : ''}. Not a single byte differs.`}
          />
          <dl className="divide-y divide-slate-100 px-6 sm:px-8">
            <Row label="Document">{r.title}</Row>
            <Row label="Issued by">{r.companyName}</Row>
            <Row label="Envelope ID">
              <span className="font-mono text-[13px]">{r.envelopeId}</span>
            </Row>
            <Row label="Completed">{when(r.completedAt)}</Row>
            <Row label="Signed by">
              <ul className="flex flex-col gap-1.5">
                {r.signers.map((s, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[13px] text-slate-500">
                      {s.role ? `${s.role} · ` : ''}
                      {when(s.signedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Row>
            <Row label="Fingerprint">
              <span className="break-all font-mono text-[12px] text-slate-600">
                SHA-256 {r.hash}
              </span>
            </Row>
          </dl>
        </>
      ) : r.match === 'envelope' && r.fileMismatch ? (
        <>
          <Banner
            tone="bad"
            icon="gpp_bad"
            title="This file doesn’t match the signed copy"
            body={
              r.canCheckFile
                ? 'The envelope is real, but this PDF is not the copy that was issued. It may have been edited, or it is a different document. Ask the sender for the original.'
                : 'The envelope is real, but no signed copy was issued for it yet, so this file can’t be confirmed.'
            }
          />
          <EnvelopeFacts r={r} />
        </>
      ) : r.match === 'envelope' ? (
        <>
          <Banner
            tone="info"
            icon="fact_check"
            title={
              r.status === 'COMPLETED'
                ? 'Envelope found: signed by everyone'
                : r.status === 'IN_PROGRESS'
                  ? 'Envelope found: still being signed'
                  : 'Envelope found: closed without every signature'
            }
            body={
              r.status === 'COMPLETED'
                ? 'To confirm a copy is genuine and unchanged, drop the PDF itself above.'
                : 'There is no completed signed copy of this envelope.'
            }
          />
          <EnvelopeFacts r={r} />
        </>
      ) : (
        <Banner
          tone="bad"
          icon="search_off"
          title={
            r.fileGiven
              ? 'Not a signed copy we issued'
              : 'No envelope with that ID'
          }
          body={
            r.fileGiven
              ? 'This PDF wasn’t issued by the Portal, or it was changed after signing. Even a small edit, or saving it again from another app, changes its fingerprint.'
              : 'Check the Envelope ID printed at the top of each page of the signed PDF, and try again.'
          }
        />
      )}
      {checked.hash && r.match !== 'file' && (
        <p className="border-t border-slate-100 px-6 py-3 font-mono text-[11px] text-slate-500 sm:px-8">
          This file’s SHA-256: <span className="break-all">{checked.hash}</span>
        </p>
      )}
    </section>
  );
};

const EnvelopeFacts = ({
  r,
}: {
  r: Extract<VerifyResult, { match: 'envelope' }>;
}) => (
  <dl className="divide-y divide-slate-100 px-6 sm:px-8">
    <Row label="Envelope ID">
      <span className="font-mono text-[13px]">{r.envelopeId}</span>
    </Row>
    <Row label="Issued by">{r.companyName}</Row>
    <Row label="Status">
      {r.status === 'COMPLETED'
        ? `Completed ${when(r.completedAt)}`
        : r.status === 'IN_PROGRESS'
          ? 'Out for signing'
          : 'Closed'}
    </Row>
    <Row label="Signatures">{r.signatures}</Row>
  </dl>
);

export const VerifyPage = ({ initialId }: { initialId: string }) => {
  const [id, setId] = useState(initialId);
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const check = useCallback(
    async (opts: { file?: File | null; id?: string }) => {
      setBusy(true);
      setError('');
      setChecked(null);
      try {
        const params = new URLSearchParams();
        let hash: string | null = null;
        let envelope = opts.id?.trim() || '';
        if (opts.file) {
          if (opts.file.size > 60 * 1024 * 1024)
            throw new Error('That file is too big to be a signed copy.');
          const data = await opts.file.arrayBuffer();
          hash = await sha256Hex(data);
          params.set('hash', hash);
          if (!envelope) envelope = (await envelopeIn(data)) ?? '';
        }
        if (envelope) params.set('id', envelope);
        if (!params.toString())
          throw new Error('Drop the signed PDF, or enter its Envelope ID.');
        const res = await fetch(`/api/verify?${params}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'The check failed.');
        setChecked({
          result: json.data.result,
          fileName: opts.file?.name ?? null,
          hash,
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialId) check({ id: initialId });
  }, [initialId, check]);

  const take = (f: File | undefined | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      setError('Drop the signed PDF.');
      return;
    }
    setFile(f);
    check({ file: f, id });
  };

  return (
    <div
      className={cn(
        signSans.variable,
        'min-h-dvh bg-[#f1f3f6] text-slate-800 antialiased [font-family:var(--sign-sans)]',
      )}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[880px] items-center gap-3 px-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-md bg-[#0f1f38] text-white">
            <Symbol name="verified_user" className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900">
              Document verification
            </p>
            <p className="text-[12px] text-slate-500">
              For PDFs signed in the Portal
            </p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 text-[12px] font-medium text-slate-600 sm:inline-flex">
            <Symbol name="lock" className="text-[16px] text-emerald-600" />
            Your file stays on your device
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">
            Check a signed document
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            Someone gave you a PDF signed in the Portal? Drop it here to confirm
            it is genuine and hasn&apos;t changed since everyone signed. Only
            its fingerprint is checked: the file itself is never uploaded.
          </p>
        </div>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-6 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              take(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition',
              over
                ? 'border-[#1d4ed8] bg-blue-50'
                : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50',
            )}
          >
            <Symbol
              name={file ? 'picture_as_pdf' : 'upload_file'}
              className={cn(
                'text-[30px]',
                file ? 'text-rose-700' : 'text-slate-400',
              )}
            />
            <span className="text-[14px] font-semibold text-slate-900">
              {file ? file.name : 'Drop the signed PDF here'}
            </span>
            <span className="text-[12.5px] text-slate-500">
              {file ? 'Drop another to check it' : 'or click to choose a file'}
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              take(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="flex items-center justify-center text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:flex-col">
            <span className="h-px flex-1 bg-slate-200 md:h-auto md:w-px" />
            <span className="px-3 py-2">or</span>
            <span className="h-px flex-1 bg-slate-200 md:h-auto md:w-px" />
          </div>
          <form
            className="flex flex-col justify-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFile(null);
              check({ id });
            }}
          >
            <label
              htmlFor="envelope"
              className="text-[13px] font-medium text-slate-700"
            >
              Envelope ID
            </label>
            <input
              id="envelope"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="6730F1A2-B3C4-D5E6-F7A8B9C0"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-[14px] uppercase text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-600/20"
            />
            <p className="text-[12px] text-slate-500">
              Printed at the top of every page of the signed PDF.
            </p>
            <button
              type="submit"
              disabled={busy || !id.trim()}
              className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1d4ed8] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1e40af] disabled:opacity-45"
            >
              {busy ? 'Checking…' : 'Look it up'}
            </button>
          </form>
        </section>

        {busy && (
          <p className="flex items-center gap-2 text-[14px] text-slate-600">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-[#1d4ed8] border-t-transparent" />
            Checking…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-800"
          >
            <Symbol name="error" className="text-[16px]" />
            {error}
          </p>
        )}
        {checked && <ResultCard checked={checked} />}

        <section className="grid gap-4 text-[13px] leading-relaxed text-slate-600 sm:grid-cols-3">
          {[
            {
              icon: 'fingerprint',
              title: 'How it works',
              body: 'When everyone has signed, the Portal issues the signed PDF and records its SHA-256 fingerprint. Any change to the file, even one character, gives a different fingerprint.',
            },
            {
              icon: 'shield_lock',
              title: 'Private by design',
              body: 'The fingerprint is worked out in your browser. Who signed is shown only to someone holding the exact file.',
            },
            {
              icon: 'help',
              title: 'It doesn’t match?',
              body: 'Printing to PDF or saving from another app makes a new file. Ask the sender for the copy they were emailed when it was signed.',
            },
          ].map((c) => (
            <div key={c.title} className="flex gap-3">
              <Symbol
                name={c.icon}
                className="mt-0.5 text-[18px] text-slate-400"
              />
              <div>
                <p className="font-semibold text-slate-900">{c.title}</p>
                <p className="mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
