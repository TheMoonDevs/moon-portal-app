# Worksheets Internal Architecture

This document explains how the worksheet system works internally: runtime flow, module responsibilities, validation, webhook behavior, options resolution, compute/actions execution, and where each concern lives.

For day-to-day worksheet authoring, use `README.builder.md`.

---

## 1) Architecture Goals

- Keep authoring simple and localized per worksheet.
- Keep runtime internals generic and reusable.
- Centralize manual registration in one place (`registry.ts`).
- Avoid circular runtime imports.
- Support both strict row APIs and lenient webhook ingestion.

---

## 2) Folder Responsibilities

### Authoring/runtime entry layer

- `registry.ts`
  - Single manual worksheet map (`worksheets`).
  - Source of type key unions (`ActionKey`, `ComputeKey`, `OptionsFnKey`, `OptionsTypeKey`).
- `functions.ts`
  - Builds runtime maps from registry + globals:
    - `ACTION_FNS`
    - `COMPUTE_FNS`
    - `OPTIONS_FNS`
    - `OPTIONS_TYPE_FNS`
  - Exposes shared function context types used across APIs/core.
- `index.ts`
  - Public runtime API for the worksheet system.
  - Exposes config access (`getWorksheetConfig`, `getAllWorksheetConfigs`).
  - Exposes options resolver (`resolveOptionsFetcher`, etc).

### Core engine layer (`core/*`)

- `core/worksheet-builder.ts`
  - Fluent authoring DSL (`defineWorksheet`) and bundle helper (`defineWorksheetBundle`).
  - Converts field/column builder calls into schema metadata.
- `core/schema-first.ts`
  - Derives runtime `ColumnConfig[]` from schema + metadata.
  - Wires computed/action column behavior.
- `core/functions/compute/pipeline.ts`
  - Executes compute pipelines by key order.
- `core/db/schema-builder.ts`
  - Builds row schema object and cache.
- `core/db/worksheet-repository.ts`
  - CRUD, persisted compute execution, strict/lenient insert paths.
- `core/db/zod-meta.ts`
  - Metadata shape definitions used in `.meta(...)`.
- `core/types.ts`
  - Runtime worksheet/column types used by APIs and UI.

### Worksheet folders (`<worksheet>/`)

- `index.ts`: worksheet schema + bundle (`schema/actions/computes/options`).
- `functions/actions.ts`, `functions/compute.ts`, `functions/options.ts`.
- `functions/index.ts`: one import surface for worksheet functions.

### Shared global function sets

- `global/actions.ts`
- `global/compute.ts`
- `global/options.ts`

---

## 3) Runtime Data Flow

### Config bootstrap

1. `registry.ts` exports `worksheets`.
2. `index.ts` calls `deriveWorksheetConfigFromSchema(...)` for each worksheet schema.
3. `index.ts` caches configs and returns derived columns via `deriveColumns(...)`.

### Function bootstrap

1. `functions.ts` merges global functions + worksheet function bundles.
2. Resulting maps are used by:
   - compute pipeline
   - action column wiring
   - options resolver API

### Request flow (rows)

- `POST /api/worksheets/[worksheetId]/rows` -> strict `createRow(...)`
- `PATCH/PUT row APIs` -> strict validation path
- strict paths fail request on invalid schema input

### Request flow (webhook)

- `POST /api/worksheets/webhook` -> lenient ingestion path:
  - maps Google Form answers to worksheet fields
  - applies safe coercion (boolean/number)
  - validates per-field and at schema level
  - stores row even with invalid fields
  - persists `validationErrors` in row for downstream visibility

---

## 4) Validation Model

Validation comes from Zod field schemas and schema metadata:

- Field-level Zod rules in builder (`email`, `min`, `max`, custom `.zod(...)`) are part of `rowSchema`.
- Strict APIs (`createRow`, `updateRow`) reject invalid payloads.
- Webhook lenient API stores payload and captures errors instead of dropping submission.
- UI cell styling checks field zod schemas and marks invalid values visually.

### Indexing and uniqueness

- Indexes are derived from field metadata (`db.index`, `db.unique`).
- `ensureIndexes(...)` creates Mongo indexes per field.
- Primary index display field is discovered dynamically (first indexed/unique field).

---

## 5) Compute Internals

Compute functions are key-based and pipeline-driven.

- Source map: `COMPUTE_FNS` in `functions.ts`.
- Runtime executor: `core/functions/compute/pipeline.ts`.
- Context includes:
  - `row`
  - `previous` (previous step output)
  - `worksheetId`
  - `field`
  - optional `window` (`allRows`, `rowIndex`, sorting info)

### Where computes run

- UI computed columns: executed in client grid valueGetter.
- Persisted computed fields (`persist: true`): executed on server in repository before save.

---

## 6) Action Internals

Action columns are derived in `core/schema-first.ts`:

- Metadata action handler key -> lookup in `ACTION_FNS`.
- Column action button invokes mapped handler and may return:
  - `{ type: "none" }`
  - `{ type: "patchRow", patch: Record<string, unknown> }`

Client currently invokes action handlers directly from derived column definitions; server behavior depends on action implementation (e.g., whether action calls an API route).

---

## 7) Options Internals

Options are resolved by `index.ts` (`resolveOptionsFetcher/getOptionsFetcher`).

Resolution order for a field:

1. `fnKey` (`optionsFn`)
2. `staticOptions`
3. `type` (`optionsType`)
4. `url` metadata mapping mode

`/api/worksheets/options` executes the resolved fetcher server-side and returns normalized `{ label, value }[]`.

---

## 8) Webhook Behavior Details

Webhook route supports:

- worksheet selection via query/body (`worksheetId` or `worksheetSlug`)
- optional secret validation
- Google Form answer map ingestion
- direct payload ingestion

Lenient insert path guarantees:

- row is not dropped because one/two fields fail validation
- full payload is retained
- parseable values are normalized
- validation issues are attached to row data

---

## 9) Circular Dependency Strategy

Current stable dependency direction:

- `registry.ts` -> worksheet modules and function exports (types)
- `functions.ts` -> `registry.ts` + global function modules
- `index.ts` -> `registry.ts` + `functions.ts` + core derivation
- `core/*` -> runtime maps/types (from non-core root modules), not worksheet-specific registries

This keeps core generic while preserving typed key autocomplete in builder.

---

## 10) File-Level Quick Map

- `registry.ts`: manual worksheet wiring and key unions.
- `functions.ts`: runtime function maps and contexts.
- `index.ts`: public runtime API/config/options resolver.
- `core/worksheet-builder.ts`: builder DSL + metadata generation.
- `core/schema-first.ts`: schema metadata -> runtime columns.
- `core/db/worksheet-repository.ts`: persistence/validation/compute-on-save.
- `app/api/worksheets/options/route.ts`: server options proxy endpoint.
- `app/api/worksheets/webhook/route.ts`: webhook ingestion endpoint.

---

## 11) When To Edit What

- Edit `core/*` only for engine/runtime capability changes.
- Edit worksheet folders for business logic/schema/features.
- Edit `registry.ts` when adding/removing worksheet modules.
- Edit `global/*` for shared reusable functions across worksheets.
