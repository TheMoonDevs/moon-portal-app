import type { ColumnType, GoogleFormQuestionType } from '../types';

export type WorksheetUiMeta = {
  type?: ColumnType;
  validationHint?: string;
  width?: number;
  pinned?: 'left' | 'right';
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
};

export type WorksheetComputedMeta = {
  pipeline?: string[];
  persist?: boolean;
};

export type WorksheetDbMeta = {
  index?: boolean;
  unique?: boolean;
};

export type WorksheetOptionsMeta =
  | { type: string; fnKey?: string }
  | {
      url: string;
      itemsPath?: string;
      labelKey?: string;
      valueKey?: string;
      queryParam?: string;
      fnKey?: string;
    }
  | {
      staticOptions: { label: string; value: string | number }[];
      fnKey?: string;
    };

export type WorksheetGoogleFormMeta = {
  questionTitle: string;
  questionType?: GoogleFormQuestionType;
};

export type WorksheetFieldMeta = {
  ui?: WorksheetUiMeta;
  db?: WorksheetDbMeta;
  options?: WorksheetOptionsMeta;
  googleForm?: WorksheetGoogleFormMeta;
  computed?: WorksheetComputedMeta;
};

export type WorksheetUiColumnMeta = {
  field: string;
  label?: string;
  type?: ColumnType;
  width?: number;
  pinned?: 'left' | 'right';
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
  order?: number;
  before?: string;
  after?: string;
  computed?: WorksheetComputedMeta;
  action?: {
    handlerKey: string;
  };
};

export type WorksheetSchemaMeta = {
  id: string;
  name: string;
  slug: string;
  googleFormSheet?: boolean;
  serialColumn?: {
    label?: string;
    width?: number;
  };
  idColumn?: false | { label?: string; width?: number };
  createdAtColumn?: false | { label?: string; width?: number };
  updatedAtColumn?: false | { label?: string; width?: number };
  uiColumns?: WorksheetUiColumnMeta[];
};
