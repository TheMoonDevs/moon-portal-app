import {
  type BaseModel,
  createCrudSchemas,
  type JsonValue,
  type Loose,
  type Nullable,
} from './shared/base';

export type DocMarkdown = Loose<
  BaseModel & {
    docId: string;
    logType: string;
    userId: string;
    date?: Nullable<string>;
    markdown: JsonValue;
  }
>;

export const docMarkdownSchemas = createCrudSchemas<DocMarkdown>();
