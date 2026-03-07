import { z } from "zod";

export type ColumnType = 
  | "text" 
  | "number" 
  | "date" 
  | "boolean" 
  | "email" 
  | "json" 
  | "enum" 
  | "computed" 
  | "actions" 
  | "asyncSelect";

export interface BaseColumnConfig {
  field: string;
  label: string;
  type: ColumnType;
  required?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: "left" | "right";
  hidden?: boolean;
  align?: "left" | "center" | "right";
  valueFormatter?: (value: any) => string;
  zodSchema?: z.ZodTypeAny; // Optional Zod schema for server-side validation
  /** Shown in sidebar so users know what validations apply (e.g. "Min 2 characters", "Valid email required") */
  validationHint?: string;
}

export interface TextColumnConfig extends BaseColumnConfig {
  type: "text" | "email";
}

export interface NumberColumnConfig extends BaseColumnConfig {
  type: "number";
  numberFormat?: "decimal" | "currency" | "percent";
  decimalPlaces?: number;
  /** When numberFormat is "currency", use this row field for currency code (e.g. "currency_code") */
  currencyField?: string;
}

export interface DateColumnConfig extends BaseColumnConfig {
  type: "date";
  dateFormat?: "short" | "medium" | "long" | "iso" | string;
}

export interface EnumColumnConfig extends BaseColumnConfig {
  type: "enum";
  options: string[] | { label: string; value: string | number }[];
}

export interface ComputedColumnConfig extends BaseColumnConfig {
  type: "computed";
  valueGetter: (row: Record<string, any>) => any;
}

export interface ActionDef {
  id: string;
  label: string;
  action: (row: Record<string, any>) => Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export interface ActionsColumnConfig extends BaseColumnConfig {
  type: "actions";
  actions: ActionDef[];
}

export interface AsyncSelectColumnConfig extends BaseColumnConfig {
  type: "asyncSelect";
  getOptions: (query: string) => Promise<{ label: string; value: string | number }[]>;
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
  id: string; // The code-defined form ID
  name: string;
  slug: string;
  webhookSecret?: string; // Secret for external webhooks
  indexKey?: string; // The key from data to store in DB as indexValue for fast queries
  columns: ColumnConfig[];
  /**
   * Optional serial number column shown as the first column in the grid.
   * This is a purely UI-level dynamic index (1,2,3,...) based on current sort/filter,
   * not stored in the database.
   */
  serialColumn?: {
    label?: string;
    width?: number;
  };
  /** Show ID column. Set to false to hide, or object to customize. */
  idColumn?: false | { label?: string; width?: number };
  /** Show Created column. Set to false to hide, or object to customize. */
  createdAtColumn?: false | { label?: string; width?: number };
  /** Show Updated column. Set to false to hide, or object to customize. */
  updatedAtColumn?: false | { label?: string; width?: number };
}
