import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type JsonArray,
  type JsonValue,
  type Loose,
  type Nullable,
} from './shared/base';

export type WorkLogs = Loose<
  BaseModel & {
    logType?: Nullable<string>;
    userId?: Nullable<string>;
    title?: Nullable<string>;
    date?: Nullable<string>;
    createdAt: DateValue;
    updatedAt: DateValue;
    works: JsonArray;
  }
>;

export type DocMarkdown = Loose<
  BaseModel & {
    docId: string;
    logType: string;
    userId: string;
    date?: Nullable<string>;
    markdown: JsonValue;
  }
>;

export const workLogSchemas = createCrudSchemas<WorkLogs>();
export const docMarkdownSchemas = createCrudSchemas<DocMarkdown>();
