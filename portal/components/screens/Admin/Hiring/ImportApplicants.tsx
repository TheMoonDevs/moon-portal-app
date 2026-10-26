'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { APPLICATION_STAGES, isValidEmail } from '@/lib/hiring/forms';
import {
  type DateOrder,
  detectDateOrder,
  type ImportRow,
  type ImportTarget,
  MAX_FILE_ROWS,
  parseCsv,
  sheetDateToDay,
  sheetDateToIso,
  suggestTargets,
} from '@/lib/hiring/importRows';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  type FormField,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  NativeSelect,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { STAGE_META } from './hiringMeta';

/** Rows per request, well under the server's limit and the body size cap. */
const CHUNK = 200;
const SHOWN_SKIPS = 30;

interface Sheet {
  fileName: string;
  headers: string[];
  rows: string[][];
}

interface Skip {
  /** The row number as the spreadsheet shows it (the header is row 1). */
  row: number;
  name: string;
  email: string;
  reason: string;
}

type Prepared = ImportRow & { sheetRow: number; key: string };

/** Day or month first, as this browser writes dates. */
const localDateOrder = (): DateOrder => {
  try {
    const parts = new Intl.DateTimeFormat().formatToParts(
      new Date(2000, 11, 31),
    );
    const day = parts.findIndex((p) => p.type === 'day');
    const month = parts.findIndex((p) => p.type === 'month');
    return month >= 0 && month < day ? 'MDY' : 'DMY';
  } catch {
    return 'DMY';
  }
};

const firstValue = (sheet: Sheet, column: number) =>
  sheet.rows.find((r) => r[column]?.trim())?.[column]?.trim() ?? '';

/** The sheet's rows as applicants, in the shape the server takes. */
function prepareRows(
  sheet: Sheet,
  targets: ImportTarget[],
  fields: FormField[],
  order: DateOrder,
): Prepared[] {
  return sheet.rows.map((cells, index) => {
    const names: string[] = [];
    const notes: string[] = [];
    const answers: Record<string, string> = {};
    const row: Prepared = { sheetRow: index + 2, key: '', answers };

    targets.forEach((target, column) => {
      const value = cells[column]?.trim() ?? '';
      if (!value || target === 'skip') return;
      if (target === 'name') names.push(value);
      else if (target === 'email') row.email = value;
      else if (target === 'submittedAt')
        row.submittedAt = sheetDateToIso(value, order) ?? value;
      else if (target === 'stage') row.stage = value;
      else if (target === 'notes')
        notes.push(`${sheet.headers[column].trim()}: ${value}`);
      else {
        const field = fields.find((f) => `field:${f.id}` === target);
        if (!field) return;
        const answer =
          field.type === FORM_FIELD_TYPE.DATE
            ? (sheetDateToDay(value, order) ?? value)
            : value;
        answers[field.id] = answers[field.id]
          ? `${answers[field.id]}, ${answer}`
          : answer;
      }
    });
    row.name = names.join(' ');
    row.notes = notes.join('\n');
    row.key = String(row.email ?? '')
      .trim()
      .toLowerCase();
    return row;
  });
}

/**
 * Brings in people who applied before the portal, from a sheet downloaded as
 * CSV. Columns are matched to the opening's questions by their label, so a
 * Google Form's response sheet lines up with an opening copied from it.
 */
export const ImportApplicants = ({
  open,
  onOpenChange,
  openingId,
  openingTitle,
  fields,
  existingEmails,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openingId: string;
  openingTitle: string;
  fields: FormField[];
  existingEmails: string[];
  onImported: () => void;
}) => {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [targets, setTargets] = useState<ImportTarget[]>([]);
  const [stage, setStage] = useState<APPLICATION_STAGE>(
    APPLICATION_STAGE.APPLIED,
  );
  const [dateOrder, setDateOrder] = useState<DateOrder>('DMY');
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: Skip[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSheet(null);
    setTargets([]);
    setStage(APPLICATION_STAGE.APPLIED);
    setFileError(null);
    setProgress(null);
    setResult(null);
  }, [open, openingId]);

  const readFile = async (file: File) => {
    setFileError(null);
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setFileError(
        'Choose a .csv file. In Google Sheets: File → Download → Comma-separated values.',
      );
      return;
    }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setFileError('This file has no rows under its header.');
      return;
    }
    if (rows.length - 1 > MAX_FILE_ROWS) {
      setFileError(
        `This file has ${rows.length - 1} rows. Split it into files of up to ${MAX_FILE_ROWS}.`,
      );
      return;
    }
    const [headers, ...body] = rows;
    const next: Sheet = { fileName: file.name, headers, rows: body };
    const suggested = suggestTargets(headers, fields);
    const dateColumns = suggested
      .map((t, i) => {
        const field = fields.find((f) => `field:${f.id}` === t);
        return t === 'submittedAt' || field?.type === FORM_FIELD_TYPE.DATE
          ? i
          : -1;
      })
      .filter((i) => i >= 0);
    setDateOrder(
      detectDateOrder(
        dateColumns.flatMap((i) => body.map((r) => r[i] ?? '')),
      ) ?? localDateOrder(),
    );
    setSheet(next);
    setTargets(suggested);
  };

  const setTarget = (column: number, target: ImportTarget) =>
    setTargets((current) =>
      current.map((t, i) => {
        if (i === column) return target;
        // One column per question, email, date and stage; names can be two.
        const single =
          target !== 'skip' && target !== 'notes' && target !== 'name';
        return single && t === target ? 'notes' : t;
      }),
    );

  /* -------------------------------- preview -------------------------------- */

  const plan = useMemo(() => {
    if (!sheet) return null;
    const rows = prepareRows(sheet, targets, fields, dateOrder);
    const taken = new Set(existingEmails.map((e) => e.toLowerCase()));
    const skipped: Skip[] = [];
    const latest = new Map<string, Prepared>();

    for (const row of rows) {
      const skip = (reason: string) =>
        skipped.push({
          row: row.sheetRow,
          name: String(row.name ?? ''),
          email: row.key,
          reason,
        });
      if (!row.key) skip('No email');
      else if (!isValidEmail(row.key)) skip('Email doesn’t look right');
      else if (taken.has(row.key)) skip('Already in this opening');
      else {
        const earlier = latest.get(row.key);
        const keepEarlier =
          earlier &&
          String(earlier.submittedAt ?? '') > String(row.submittedAt ?? '');
        if (earlier) {
          skipped.push({
            row: keepEarlier ? row.sheetRow : earlier.sheetRow,
            name: String(row.name ?? ''),
            email: row.key,
            reason: 'Applied more than once; kept the latest',
          });
        }
        if (!keepEarlier) latest.set(row.key, row);
      }
    }
    return {
      rows: Array.from(latest.values()),
      skipped: skipped.sort((a, b) => a.row - b.row),
      already: skipped.filter((s) => s.reason === 'Already in this opening')
        .length,
    };
  }, [sheet, targets, fields, dateOrder, existingEmails]);

  const hasEmail = targets.includes('email');
  const hasDates =
    targets.includes('submittedAt') ||
    targets.some((t) =>
      fields.some(
        (f) => `field:${f.id}` === t && f.type === FORM_FIELD_TYPE.DATE,
      ),
    );
  const unmatched = fields.filter((f) => !targets.includes(`field:${f.id}`));

  /* -------------------------------- import --------------------------------- */

  const runImport = async () => {
    if (!sheet || !plan?.rows.length) return;
    setProgress(0);
    const skipped = [...plan.skipped];
    let imported = 0;
    try {
      for (let start = 0; start < plan.rows.length; start += CHUNK) {
        const chunk = plan.rows.slice(start, start + CHUNK);
        const res = await PortalSdk.postData(
          `/api/hiring/openings/${openingId}/import`,
          {
            rows: chunk.map(({ sheetRow: _row, key: _key, ...row }) => row),
            stage,
            source: sheet.fileName,
          },
        );
        imported += res.data.imported;
        for (const skip of res.data.skipped as Skip[])
          skipped.push({ ...skip, row: chunk[skip.row - 1]?.sheetRow ?? 0 });
        setProgress(start + chunk.length);
      }
      setResult({
        imported,
        skipped: skipped.sort((a, b) => a.row - b.row),
      });
      toast.success(
        imported === 1 ? 'Added 1 applicant' : `Added ${imported} applicants`,
      );
    } catch (err) {
      toast.error(errorText(err, 'The import stopped.'));
      if (imported) setResult({ imported, skipped });
    } finally {
      setProgress(null);
      if (imported) onImported();
    }
  };

  /* -------------------------------- render --------------------------------- */

  const importing = progress !== null;
  const footer = result ? (
    <AdminButton size="sm" tone="primary" onClick={() => onOpenChange(false)}>
      Done
    </AdminButton>
  ) : sheet ? (
    <>
      <AdminButton
        size="sm"
        tone="ghost"
        disabled={importing}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </AdminButton>
      <AdminButton
        size="sm"
        tone="primary"
        icon="upload"
        loading={importing}
        disabled={!hasEmail || !plan?.rows.length}
        onClick={runImport}
      >
        {importing
          ? `Adding ${progress} of ${plan?.rows.length}…`
          : `Add ${plan?.rows.length ?? 0} applicant${plan?.rows.length === 1 ? '' : 's'}`}
      </AdminButton>
    </>
  ) : null;

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !importing && onOpenChange(next)}
      size="lg"
      icon="upload_file"
      title="Import applicants from a sheet"
      description={`Adds people who applied before to ${openingTitle}. Nobody is emailed.`}
      footer={footer}
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm text-neutral-200">
            <Icon
              name="check_circle"
              className="text-[20px] text-emerald-400"
            />
            Added {result.imported} applicant
            {result.imported === 1 ? '' : 's'} from {sheet?.fileName}.
          </p>
          {result.skipped.length > 0 && (
            <SkipList skipped={result.skipped} title="Left out" />
          )}
        </div>
      ) : !sheet ? (
        <div className="flex flex-col gap-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
              dragging
                ? 'border-white/40 bg-white/[0.06]'
                : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]',
            )}
          >
            <Icon name="table_view" className="text-[30px] text-neutral-500" />
            <span className="text-sm text-neutral-200">
              Drop a .csv file here, or click to choose one
            </span>
            <span className="text-xs text-neutral-500">
              In Google Sheets: File → Download → Comma-separated values (.csv).
              Download each tab on its own.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.target.value = '';
              }}
            />
          </label>
          {fileError && (
            <p className="flex items-center gap-1 text-xs text-rose-400">
              <Icon name="error" className="text-[14px]" />
              {fileError}
            </p>
          )}
          <p className="text-xs text-neutral-500">
            Columns are matched to this opening’s questions by name, so a Google
            Form’s response sheet lines up with an opening copied from that
            form. You can change any match before importing.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-300">
            <Icon name="description" className="text-[18px] text-neutral-500" />
            <span className="font-medium text-neutral-100">
              {sheet.fileName}
            </span>
            <span className="text-neutral-500">
              · {sheet.rows.length} row{sheet.rows.length === 1 ? '' : 's'}
            </span>
            <AdminButton
              size="sm"
              tone="ghost"
              className="ml-auto"
              disabled={importing}
              onClick={() => setSheet(null)}
            >
              Choose another file
            </AdminButton>
          </div>

          <Field label="Columns">
            <div className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
              {sheet.headers.map((header, column) => (
                <div
                  key={column}
                  className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-100">
                      {header.trim() || `Column ${column + 1}`}
                    </p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {firstValue(sheet, column) || 'Empty'}
                    </p>
                  </div>
                  <NativeSelect
                    aria-label={`Where “${header.trim() || `Column ${column + 1}`}” goes`}
                    value={targets[column]}
                    disabled={importing}
                    onChange={(e) =>
                      setTarget(column, e.target.value as ImportTarget)
                    }
                    className={cn(
                      'h-8 text-xs',
                      targets[column] === 'skip' && 'text-neutral-500',
                    )}
                  >
                    <optgroup label="Applicant">
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="submittedAt">Applied on</option>
                      <option value="stage">Stage</option>
                      <option value="notes">Add to notes</option>
                      <option value="skip">Leave out</option>
                    </optgroup>
                    {fields.length > 0 && (
                      <optgroup label="Questions">
                        {fields.map((f) => (
                          <option key={f.id} value={`field:${f.id}`}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </NativeSelect>
                </div>
              ))}
            </div>
          </Field>

          {!hasEmail && (
            <p className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <Icon name="warning" className="text-[15px]" />
              Choose the column that holds each person’s email.
            </p>
          )}
          {unmatched.length > 0 && (
            <p className="text-xs text-neutral-500">
              Not in this sheet, so left blank:{' '}
              {unmatched.map((f) => f.label).join(', ')}.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                targets.includes('stage') ? 'Other rows go to' : 'Add them to'
              }
              hint={
                targets.includes('stage')
                  ? 'For rows whose stage column doesn’t name a stage.'
                  : undefined
              }
            >
              <NativeSelect
                value={stage}
                disabled={importing}
                onChange={(e) => setStage(e.target.value as APPLICATION_STAGE)}
              >
                {APPLICATION_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {hasDates && (
              <Field label="Dates are written">
                <NativeSelect
                  value={dateOrder}
                  disabled={importing}
                  onChange={(e) => setDateOrder(e.target.value as DateOrder)}
                >
                  <option value="DMY">Day first (31/12/2025)</option>
                  <option value="MDY">Month first (12/31/2025)</option>
                </NativeSelect>
              </Field>
            )}
          </div>

          {plan && hasEmail && (
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-sm text-neutral-200">
                {plan.rows.length} will be added
                {plan.already > 0 && `, ${plan.already} already here`}
                {plan.skipped.length - plan.already > 0 &&
                  `, ${plan.skipped.length - plan.already} left out`}
                .
              </p>
              {plan.skipped.length > plan.already && (
                <SkipList
                  skipped={plan.skipped.filter(
                    (s) => s.reason !== 'Already in this opening',
                  )}
                />
              )}
            </div>
          )}
        </div>
      )}
    </AdminModal>
  );
};

const SkipList = ({ skipped, title }: { skipped: Skip[]; title?: string }) => (
  <div className="flex flex-col gap-1.5">
    {title && (
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </p>
    )}
    <ul className="custom-scrollbar flex max-h-48 flex-col gap-1 overflow-y-auto text-xs text-neutral-400">
      {skipped.slice(0, SHOWN_SKIPS).map((s, i) => (
        <li key={`${s.row}-${i}`} className="flex gap-2">
          <span className="w-14 shrink-0 text-neutral-600">Row {s.row}</span>
          <span className="min-w-0 flex-1 truncate">
            {s.name || s.email || 'No name'}
            {s.name && s.email ? ` · ${s.email}` : ''}
          </span>
          <span className="shrink-0 text-neutral-500">{s.reason}</span>
        </li>
      ))}
      {skipped.length > SHOWN_SKIPS && (
        <li className="text-neutral-600">
          and {skipped.length - SHOWN_SKIPS} more
        </li>
      )}
    </ul>
  </div>
);
