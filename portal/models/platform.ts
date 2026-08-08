import {
  createCrudSchemas,
  type BaseModel,
  type DateValue,
  type JsonObject,
  type Loose,
  type Nullable,
  type OptionalNullable,
} from './shared/base';

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

export type ShortLink = Loose<
  BaseModel & {
    slug: string;
    redirectTo: string;
    params?: OptionalNullable<JsonObject>;
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

export const eventSchemas = createCrudSchemas<Event>();
export const fileUploadSchemas = createCrudSchemas<FileUpload>();
export const shortLinkSchemas = createCrudSchemas<ShortLink>();
export const configDataSchemas = createCrudSchemas<ConfigData>();
