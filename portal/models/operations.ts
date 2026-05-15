import { createCrudSchemas, type BaseModel, type DateValue, type JsonArray, type JsonObject, type JsonValue, type Loose, type Nullable, type OptionalNullable } from './shared/base';

export type ClientLeadForm = Loose<
  BaseModel & {
    teamSize?: Nullable<string>;
    industry?: Nullable<string>;
    requirementType?: Nullable<string>;
    budget?: Nullable<number>;
    time?: Nullable<string>;
    stage?: Nullable<string>;
    contact: JsonObject;
  }
>;

export type ZeroRecords = Loose<
  BaseModel & {
    userId?: Nullable<string>;
    config?: Nullable<string>;
    year?: Nullable<string>;
    allZeros: JsonArray;
    allMeetings: JsonArray;
  }
>;

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

export type Certificate = Loose<
  BaseModel & {
    title?: Nullable<string>;
    userId?: Nullable<string>;
    fileId?: Nullable<string>;
    file?: OptionalNullable<JsonObject>;
    files: JsonArray;
    userInfo?: OptionalNullable<JsonObject>;
  }
>;

export type FileUpload = Loose<
  BaseModel & {
    userId?: Nullable<string>;
    uploadedByUserId?: Nullable<string>;
    fileName?: Nullable<string>;
    mimeType?: Nullable<string>;
    fileUrl?: Nullable<string>;
    folderName?: Nullable<string>;
    fileSize?: Nullable<number>;
    userInfo?: OptionalNullable<JsonObject>;
  }
>;

export type ConfigData = Loose<
  BaseModel & {
    configId: string;
    configType: string;
    configApp?: Nullable<string>;
    configData?: OptionalNullable<JsonObject>;
    timestamp?: DateValue;
  }
>;

export type Article = Loose<
  BaseModel & {
    title: string;
    image?: Nullable<string>;
    content: string;
    articleUrl: string;
    articleType: string;
    author: string;
    publishDate: DateValue;
    categories: string[];
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

export type Event = Loose<
  BaseModel & {
    name: string;
    subTitle: string;
    link: string;
    date: string;
    month: number;
    year: number;
    time: string;
  }
>;

export const clientLeadFormSchemas = createCrudSchemas<ClientLeadForm>();
export const zeroRecordsSchemas = createCrudSchemas<ZeroRecords>();
export const workLogSchemas = createCrudSchemas<WorkLogs>();
export const certificateSchemas = createCrudSchemas<Certificate>();
export const fileUploadSchemas = createCrudSchemas<FileUpload>();
export const configDataSchemas = createCrudSchemas<ConfigData>();
export const articleSchemas = createCrudSchemas<Article>();
export const docMarkdownSchemas = createCrudSchemas<DocMarkdown>();
export const eventSchemas = createCrudSchemas<Event>();
