import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type JsonArray,
  type JsonValue,
  type Loose,
  type Nullable,
} from './shared/base';

/**
 * Where one worklog line belongs. `source` is how it was decided: `auto` by
 * the linker, `user` by the person, `none` when the linker could not tell and
 * the person has not answered yet.
 */
export type WorklogLink = {
  key: string;
  text: string;
  /** A `p:` line: its link is only shown to the owner. */
  isPrivate?: boolean;
  companyId: string | null;
  projectId: string | null;
  taskId: string | null;
  confidence: number;
  source: 'auto' | 'user' | 'none';
};

export type WorkLogs = Loose<
  BaseModel & {
    logType?: Nullable<string>;
    userId?: Nullable<string>;
    title?: Nullable<string>;
    date?: Nullable<string>;
    createdAt: DateValue;
    updatedAt: DateValue;
    works: JsonArray;
    /** One entry per line, kept in step with `works` by the linker. */
    links?: WorklogLink[];
    /** Times the person answered their assistant when it was waiting on them. */
    guidance?: number;
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
