import type { z } from 'zod';

export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'email'
  | 'json'
  | 'enum'
  | 'computed'
  | 'actions'
  | 'asyncSelect';

export type GoogleFormQuestionType =
  | 'shortText'
  | 'paragraph'
  | 'checkboxes'
  | 'dropdown'
  | 'date'
  | 'fileUpload'
  | 'multipleChoice';

export interface GoogleFormBinding {
  questionTitle: string;
  questionType?: GoogleFormQuestionType;
}

export interface BaseColumnConfig {
  field: string;
  label: string;
  type: ColumnType;
  valueFormatter?: (value: any) => string;
  zodSchema?: z.ZodTypeAny;
  width?: number;
  pinned?: 'left' | 'right';
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
  order?: number;
  before?: string;
  after?: string;
}

export interface TextColumnConfig extends BaseColumnConfig {
  type: 'text' | 'email';
}

export interface NumberColumnConfig extends BaseColumnConfig {
  type: 'number';
  numberFormat?: 'decimal' | 'currency' | 'percent';
  decimalPlaces?: number;
  currencyField?: string;
}

export interface DateColumnConfig extends BaseColumnConfig {
  type: 'date';
  dateFormat?: 'short' | 'medium' | 'long' | 'iso' | string;
}

export interface EnumColumnConfig extends BaseColumnConfig {
  type: 'enum';
  options: string[] | { label: string; value: string | number }[];
}

export interface ComputedColumnConfig extends BaseColumnConfig {
  type: 'computed';
  valueGetter: (
    row: Record<string, any>,
    ctx?: {
      window?: {
        allRows: Record<string, unknown>[];
        rowIndex: number;
        sortedBy?: string;
        sortOrder?: 'asc' | 'desc';
      };
    },
  ) => any;
}

export interface ActionDef {
  id: string;
  label: string;
  action: (
    row: Record<string, any>,
    ctx?: { worksheetId?: string; selection?: { rowIds: string[] } },
  ) => Promise<
    | { type: 'none' }
    | { type: 'patchRow'; patch: Record<string, unknown> }
    | void
  >;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

export interface ActionsColumnConfig extends BaseColumnConfig {
  type: 'actions';
  actions: ActionDef[];
}

export interface AsyncSelectColumnConfig extends BaseColumnConfig {
  type: 'asyncSelect';
}

export type ColumnConfig =
  | TextColumnConfig
  | NumberColumnConfig
  | DateColumnConfig
  | EnumColumnConfig
  | ComputedColumnConfig
  | ActionsColumnConfig
  | AsyncSelectColumnConfig
  | BaseColumnConfig;

export interface WorksheetConfig {
  id: string;
  name: string;
  slug: string;
  webhookSecret?: string;
  rowSchema: z.ZodObject<any>;
  columns?: ColumnConfig[];
  extraColumns?: ColumnConfig[];
  serialColumn?: {
    label?: string;
    width?: number;
  };
  idColumn?: false | { label?: string; width?: number };
  createdAtColumn?: false | { label?: string; width?: number };
  updatedAtColumn?: false | { label?: string; width?: number };
}
