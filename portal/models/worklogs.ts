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

export type Pointer = Loose<
  BaseModel & {
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    targetUserId: string;
    content: string;
    replies?: Reply[];
  }
>;

export type Reply = Loose<
  BaseModel & {
    createdAt: Date;
    updatedAt: Date;
    pointerId: string;
    pointer?: Pointer;
    userId: string;
    content: string;
  }
>;

export const workLogSchemas = createCrudSchemas<WorkLogs>();
export const docMarkdownSchemas = createCrudSchemas<DocMarkdown>();
export const pointerSchemas = createCrudSchemas<Pointer>();
export const replySchemas = createCrudSchemas<Reply>();
