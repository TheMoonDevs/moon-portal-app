import { z } from "zod";
import type {
  WorksheetFieldMeta,
  WorksheetSchemaMeta,
  WorksheetUiColumnMeta,
} from "./db/zod-meta";
import type {
  ActionKey,
  ComputeKey,
  OptionsFnKey,
  OptionsTypeKey,
} from "@/lib/worksheets/registry";

type FieldShape = Record<string, z.ZodTypeAny>;

type BuiltField = {
  build: () => z.ZodTypeAny;
};

type UiOpts = {
  width?: number;
  pinned?: "left" | "right";
  hidden?: boolean;
  align?: "left" | "center" | "right";
};

export interface WorksheetDefinition<S extends FieldShape> {
  id: string;
  name: string;
  slug: string;
  googleFormSheet?: boolean;
  idColumn?: false | { label?: string; width?: number };
  createdAtColumn?: false | { label?: string; width?: number };
  updatedAtColumn?: false | { label?: string; width?: number };
  fields: (f: FieldBuilder) => Record<keyof S, BuiltField | z.ZodTypeAny>;
  columns?: (
    c: ColumnBuilder,
  ) => Array<ColumnBuilderResult | { build: () => ColumnBuilderResult }>;
}

export interface WorksheetDefinitionExport<S extends FieldShape> {
  schema: z.ZodObject<S>;
}

export interface WorksheetRuntimeBundle<S extends FieldShape = FieldShape> {
  schema: z.ZodObject<S>;
  actions: Record<string, (...args: any[]) => any>;
  computes: Record<string, (...args: any[]) => any>;
  options: Record<string, (...args: any[]) => any>;
}

export function defineWorksheetBundle<T extends WorksheetRuntimeBundle>(bundle: T): T {
  return bundle;
}

class BaseFieldBuilder<T extends z.ZodTypeAny> {
  constructor(private base: T, private meta: WorksheetFieldMeta = {}) {}

  required(): this {
    return this;
  }

  optional(): BaseFieldBuilder<any> {
    return new BaseFieldBuilder(this.base.optional() as any, this.meta);
  }

  minLength(n: number): this {
    if (this.base instanceof z.ZodString) {
      this.base = this.base.min(n) as any;
    }
    return this;
  }

  min(n: number): this {
    if (this.base instanceof z.ZodString) {
      this.base = this.base.min(n) as any;
    } else if (this.base instanceof z.ZodNumber) {
      this.base = this.base.min(n) as any;
    }
    return this;
  }

  max(n: number): this {
    if (this.base instanceof z.ZodString) {
      this.base = this.base.max(n) as any;
    } else if (this.base instanceof z.ZodNumber) {
      this.base = this.base.max(n) as any;
    }
    return this;
  }

  zod(apply: (schema: T) => z.ZodTypeAny): this {
    this.base = apply(this.base) as T;
    return this;
  }

  validationHint(hint: string): this {
    this.meta.ui = { ...(this.meta.ui || {}), validationHint: hint };
    return this;
  }

  indexed(): this {
    this.meta.db = { ...(this.meta.db || {}), index: true };
    return this;
  }

  unique(): this {
    this.meta.db = { ...(this.meta.db || {}), unique: true };
    return this;
  }

  ui(opts: UiOpts): this {
    this.meta.ui = { ...(this.meta.ui || {}), ...(opts || {}) };
    return this;
  }

  optionsType(type: OptionsTypeKey | (string & {})): this {
    this.meta.options = {
      ...(typeof this.meta.options === "object" ? this.meta.options : {}),
      type,
    } as any;
    return this;
  }

  optionsFn(key: OptionsFnKey | (string & {})): this {
    this.meta.options = {
      ...(typeof this.meta.options === "object" ? this.meta.options : {}),
      fnKey: key,
    } as any;
    return this;
  }

  staticOptions(options: { label: string; value: string | number }[]): this {
    const current = (typeof this.meta.options === "object" ? this.meta.options : {}) as Record<
      string,
      unknown
    >;
    this.meta.ui = { ...(this.meta.ui || {}), type: "enum" };
    this.meta.options = {
      ...current,
      staticOptions: options,
    } as any;
    return this;
  }

  optionsUrl(
    url: string,
    opts?: {
      itemsPath?: string;
      labelKey?: string;
      valueKey?: string;
      queryParam?: string;
    },
  ): this {
    const current = (typeof this.meta.options === "object" ? this.meta.options : {}) as Record<
      string,
      unknown
    >;
    this.meta.options = {
      ...current,
      url,
      ...(opts || {}),
    } as any;
    return this;
  }

  googleForm(binding: WorksheetFieldMeta["googleForm"]): this {
    this.meta.googleForm = binding;
    return this;
  }

  asAsyncSelect(): this {
    this.meta.ui = { ...(this.meta.ui || {}), type: "asyncSelect" };
    this.meta.options = { ...(this.meta.options as any), type: "__async_select__" };
    return this;
  }

  build(): z.ZodTypeAny {
    return this.base.meta(this.meta as WorksheetFieldMeta);
  }
}

export class FieldBuilder {
  text() {
    return new BaseFieldBuilder(z.string());
  }

  email() {
    return new BaseFieldBuilder(z.string().email());
  }

  number() {
    return new BaseFieldBuilder(z.coerce.number());
  }

  dateOrString() {
    return new BaseFieldBuilder(z.union([z.string(), z.date()]));
  }

  stringOrStringArray() {
    return new BaseFieldBuilder(
      z.union([z.string().min(1), z.array(z.string()).min(1)]),
    );
  }

  asyncSelect() {
    return new BaseFieldBuilder(z.string()).asAsyncSelect();
  }

  enum(options: { label: string; value: string | number }[]) {
    return new BaseFieldBuilder(z.string()).staticOptions(options);
  }
}

export class ColumnBuilderResult {
  kind: "serial" | "computed" | "actions";
  field: string;
  label?: string;
  width?: number;
  align?: "left" | "center" | "right";
  pinned?: "left" | "right";
  computeKeys?: string[];
  persist?: boolean;
  actionKey?: string;
  order?: number;
  before?: string;
  after?: string;

  constructor(kind: ColumnBuilderResult["kind"], field: string) {
    this.kind = kind;
    this.field = field;
  }
}

export class ColumnBuilder {
  serial() {
    const res = new ColumnBuilderResult("serial", "__srno__");
    const api = {
      label(label: string) {
        res.label = label;
        return api;
      },
      width(width: number) {
        res.width = width;
        return api;
      },
      order(order: number) {
        res.order = order;
        return api;
      },
      build() {
        return res;
      },
    };
    return api;
  }

  computed(field?: string) {
    const autoField = "__computed__";
    const res = new ColumnBuilderResult("computed", field ?? autoField);
    const api = {
      fromFields(..._fields: string[]) {
        return api;
      },
      compute(key: ComputeKey | (string & {})) {
        res.computeKeys = [...(res.computeKeys ?? []), key];
        if (res.field === autoField && res.computeKeys.length === 1) {
          res.field = `computed_${String(key).replace(/[^\w]+/g, "_")}`;
        }
        return api;
      },
      pipeline(...keys: Array<ComputeKey | (string & {})>) {
        res.computeKeys = [...keys];
        if (res.field === autoField && keys.length > 0) {
          res.field = `computed_${String(keys[0]).replace(/[^\w]+/g, "_")}`;
        }
        return api;
      },
      persist() {
        res.persist = true;
        return api;
      },
      label(label: string) {
        res.label = label;
        return api;
      },
      ui(opts: UiOpts) {
        if (opts.width != null) res.width = opts.width;
        if (opts.align) res.align = opts.align;
        if (opts.pinned) res.pinned = opts.pinned;
        return api;
      },
      before(fieldName: string) {
        res.before = fieldName;
        return api;
      },
      after(fieldName: string) {
        res.after = fieldName;
        return api;
      },
      order(order: number) {
        res.order = order;
        return api;
      },
      build() {
        return res;
      },
    };
    return api;
  }

  actions(field?: string) {
    const res = new ColumnBuilderResult("actions", field ?? "__actions");
    const api = {
      pinRight() {
        res.pinned = "right";
        return api;
      },
      pinLeft() {
        res.pinned = "left";
        return api;
      },
      width(width: number) {
        res.width = width;
        return api;
      },
      add(key: ActionKey | (string & {}), opts?: { label: string; variant?: string }) {
        res.actionKey = key;
        if (opts?.label) res.label = opts.label;
        return api;
      },
      order(order: number) {
        res.order = order;
        return api;
      },
      build() {
        return res;
      },
    };
    return api;
  }
}

function toUiColumn(col: ColumnBuilderResult): WorksheetUiColumnMeta {
  if (col.kind === "serial") {
    return {
      field: col.field,
      label: col.label ?? "Sr. No",
      type: "computed",
      width: col.width ?? 70,
      order: col.order ?? 0,
      before: col.before,
      after: col.after,
      computed: { pipeline: ["__builtin.serial"], persist: false },
    };
  }
  if (col.kind === "computed") {
    return {
      field: col.field,
      label: col.label,
      type: "computed",
      width: col.width,
      align: col.align,
      pinned: col.pinned,
      order: col.order,
      before: col.before,
      after: col.after,
      computed: col.computeKeys?.length
        ? { pipeline: col.computeKeys, persist: !!col.persist }
        : undefined,
    };
  }
  return {
    field: col.field,
    label: col.label,
    type: "actions",
    width: col.width,
    pinned: col.pinned,
    order: col.order,
    before: col.before,
    after: col.after,
    action: col.actionKey ? { handlerKey: col.actionKey } : undefined,
  };
}

export function defineWorksheet<S extends FieldShape>(
  def: WorksheetDefinition<S>,
): WorksheetDefinitionExport<S> {
  const fb = new FieldBuilder();
  const rawShape = def.fields(fb) as Record<string, BuiltField | z.ZodTypeAny>;
  const shape = Object.fromEntries(
    Object.entries(rawShape).map(([k, v]) => [
      k,
      v && typeof (v as BuiltField).build === "function"
        ? (v as BuiltField).build()
        : (v as z.ZodTypeAny),
    ]),
  ) as S;

  const cb = new ColumnBuilder();
  const uiColumns = (def.columns ? def.columns(cb) : [])
    .map((c) => (c && typeof (c as any).build === "function" ? (c as any).build() : c))
    .map((c) => toUiColumn(c as ColumnBuilderResult))
    .sort((a, b) => {
      const av = (a as any).order ?? Number.MAX_SAFE_INTEGER;
      const bv = (b as any).order ?? Number.MAX_SAFE_INTEGER;
      return av - bv;
    });

  const schema = z.object(shape).meta({
    id: def.id,
    name: def.name,
    slug: def.slug,
    googleFormSheet: def.googleFormSheet,
    idColumn: def.idColumn,
    createdAtColumn: def.createdAtColumn,
    updatedAtColumn: def.updatedAtColumn,
    uiColumns,
  } satisfies WorksheetSchemaMeta);

  return { schema };
}
