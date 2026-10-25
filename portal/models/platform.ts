import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type JsonObject,
  type Loose,
  type Nullable,
  type OptionalNullable,
} from './shared/base';

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

export const fileUploadSchemas = createCrudSchemas<FileUpload>();
export const configDataSchemas = createCrudSchemas<ConfigData>();
