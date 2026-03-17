# Worksheet Builder Guide (Authoring)

This guide explains how to create and maintain worksheets with the builder API: fields, columns, actions, compute pipelines, options, validations, Google Form mapping, and runtime registration.

Use this doc for implementation.  
Use `README.md` for internal engine/runtime architecture details.

---

## 1) Authoring Structure

```txt
lib/worksheets/
  <worksheet>/
    index.ts
    functions/
      actions.ts
      compute.ts
      options.ts
      index.ts
  global/
    actions.ts
    compute.ts
    options.ts
  registry.ts
```

### File intent

- `<worksheet>/index.ts`:
  - declare schema with `defineWorksheet(...)`
  - declare UI columns
  - export default bundle using `defineWorksheetBundle(...)`
- `<worksheet>/functions/*.ts`:
  - worksheet-specific behavior
- `<worksheet>/functions/index.ts`:
  - one import surface for actions/computes/options
- `registry.ts`:
  - register worksheet module once

---

## 2) Minimal Worksheet Template

```ts
import { defineWorksheet, defineWorksheetBundle } from "@/lib/worksheets/core";
import {
  myActions,
  myComputes,
  myOptions,
} from "./functions";

export default defineWorksheetBundle({
  schema: defineWorksheet({
    id: "my_sheet_v1",
    name: "My Sheet",
    slug: "my-sheet",
    fields: (f) => ({
      email: f.email().required().indexed(),
    }),
    columns: (c) => [c.serial().label("Sr. No").width(70)],
  }).schema,
  actions: myActions,
  computes: myComputes,
  options: myOptions,
});
```

---

## 3) Field Builder Features

All field definitions go inside `fields: (f) => ({ ... })`.

### Core types

- `f.text()`
- `f.email()`
- `f.number()`
- `f.dateOrString()`
- `f.stringOrStringArray()`
- `f.asyncSelect()` (dynamic options)
- `f.enum([...])` (static options)

### Common modifiers

- `.required()`
- `.optional()`
- `.indexed()`
- `.unique()`
- `.ui({ width, pinned, hidden, align, validationHint })`
- `.googleForm({ questionTitle, questionType })`

### Validation helpers

- `.minLength(n)` (string)
- `.min(n)` (string length or number minimum)
- `.max(n)` (string length or number maximum)
- `.zod((schema) => schema.<any zod chain>)` for advanced validations

Example:

```ts
score: f
  .number()
  .min(0)
  .max(100)
  .zod((s) => s.refine((v) => v % 5 === 0, "Score must be multiple of 5"))
```

---

## 4) Options Features (Select-like fields)

For select-like input behavior, choose one model:

### A) Shared global type source

Use when many fields share one source:

```ts
country: f.asyncSelect().optionsType("country")
```

### B) Worksheet-specific function source

Use when custom fetch/transform is needed:

```ts
company: f.asyncSelect().optionsFn("lead.options.companyInternalApi")
```

### C) Static enum options

Use fixed local options:

```ts
currency: f.enum([
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
])
```

### D) URL metadata source

Use direct endpoint mapping without custom function:

```ts
category: f
  .asyncSelect()
  .optionsUrl("https://api.example.com/items", {
    itemsPath: "data.records",
    labelKey: "title",
    valueKey: "id",
    queryParam: "q",
  })
```

### Options resolution precedence

If multiple are set, runtime resolves in this order:

1. `optionsFn`
2. `staticOptions`
3. `optionsType`
4. `optionsUrl` metadata

---

## 5) Column Builder Features

Columns live in `columns: (c) => [ ... ]`.

### Serial column

```ts
c.serial().label("Sr. No").width(70).order(0)
```

### Computed column

Single function:

```ts
c.computed().compute("my.compute.key").label("Computed")
```

Pipeline:

```ts
c.computed()
  .pipeline("my.step.raw", "my.step.band", "my.step.label")
  .label("Priority")
```

Persist to DB:

```ts
c.computed().compute("my.persisted.value").persist()
```

Layout controls:

- `.ui({ width, pinned, align })`
- `.order(n)`, `.before("field")`, `.after("field")`

### Action column

```ts
c.actions().pinRight().width(150).add("my.action.key", { label: "Actions" })
```

---

## 6) Compute Function Authoring

Location: `<worksheet>/functions/compute.ts`

Pattern:

```ts
import type { ComputeContext } from "@/lib/worksheets/functions";

type Row = { score?: number | string | null };
type Ctx<TPrev = unknown> = Omit<ComputeContext, "row" | "previous"> & {
  row: Row;
  previous?: TPrev;
};

export const myComputes = {
  "my.score.toNumber": ({ row }: Ctx) => Number(row.score) || 0,
  "my.score.toBand": ({ previous }: Ctx<number>) => (previous > 80 ? "High" : "Low"),
} as const;
```

Notes:

- Compute pipeline is sync.
- `previous` carries previous step output.
- `window` is available for cross-row logic (e.g., serial/running values).

---

## 7) Action Function Authoring

Location: `<worksheet>/functions/actions.ts`

Pattern:

```ts
import type { ActionContext } from "@/lib/worksheets/functions";

export const myActions = {
  "my.sendEmail": async ({ row }: ActionContext) => {
    await fetch("/api/worksheets/actions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row }),
    });
    return { type: "patchRow", patch: { last_email_sent_at: new Date().toISOString() } };
  },
} as const;
```

Action result shapes:

- `{ type: "none" }`
- `{ type: "patchRow", patch }`

---

## 8) Options Function Authoring

Location: `<worksheet>/functions/options.ts`

Pattern:

```ts
import type { OptionsContext } from "@/lib/worksheets/functions";

export const myOptions = {
  "my.options.key": async (query: string, _ctx: OptionsContext) => {
    const res = await fetch(`https://api.example.com/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];
    return items.map((it: any) => ({ label: String(it.name), value: String(it.id) }));
  },
} as const;
```

Contract:

- input: `(query, ctx)`
- output: `Promise<{ label; value }[]>`

---

## 9) Google Form Integration

Use `.googleForm(...)` on fields:

```ts
email: f.email().googleForm({ questionTitle: "Email", questionType: "shortText" })
```

And enable at schema level:

```ts
googleFormSheet: true
```

Webhook maps incoming answer titles to these field mappings.

Generated Apps Script files are written to:

- `lib/worksheets/<worksheet>/GoogleAppsScript-<slug>.gs`

---

## 10) Registering a New Worksheet

1. Create worksheet folder + `index.ts`.
2. Create `functions/actions.ts`, `functions/compute.ts`, `functions/options.ts`.
3. Create `functions/index.ts` re-exporting all three.
4. Export default bundle from worksheet `index.ts`.
5. Add worksheet import + map entry in `registry.ts`.

That is the only manual registration step required.

---

## 11) Best Practices

- Keep field keys stable once data exists.
- Prefer `c.computed()` and `c.actions()` shorthand.
- Use `optionsType` for shared datasets; `optionsFn` for custom sources.
- Keep compute functions pure and deterministic.
- Keep actions side-effect oriented, and return `patchRow` for updates.
- Use `.zod(...)` for non-trivial rules and document custom messages.
- Add `.ui({ validationHint })` for end-user guidance.

