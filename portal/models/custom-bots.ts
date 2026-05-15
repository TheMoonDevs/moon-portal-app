import { createCrudSchemas, type BaseModel, type DateValue, type JsonArray, type JsonObject, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import { type BOTMODE, type FUNCTIONTYPE, type REQUESTSTATUS, type UPDATEFROM, type UPDATETYPE } from './shared/enums';

export type BotProject = Loose<
  BaseModel & {
    clientId: string;
    name: string;
    githubRepoName: string;
    githubRepoUrl: string;
    githubRepoBranch?: OptionalNullable<string>;
    prUrl?: OptionalNullable<string>;
    prNumber?: OptionalNullable<number>;
    description?: OptionalNullable<string>;
    projectDir: string;
    clientBots?: ClientBot[];
    clientRequests?: ClientRequest[];
    previewConfigs?: OptionalNullable<JsonObject>;
    prodConfigs?: OptionalNullable<JsonObject>;
    stagingConfigs?: OptionalNullable<JsonObject>;
    metadata?: OptionalNullable<JsonObject>;
  }
>;

export type ClientBotTemplate = Loose<
  BaseModel & {
    clientId?: Nullable<string>;
    name: string;
    type: string;
    requiredKeys: JsonArray;
  }
>;

export type ClientBot = Loose<
  BaseModel & {
    botProjectId: string;
    clientRequestIds: string[];
    clientId: string;
    name: string;
    type: string;
    variables: JsonArray;
    botProject?: BotProject;
  }
>;

export type ClientRequestFunction = Loose<
  BaseModel & {
    clientId: string;
    botProjectId: string;
    originClientRequestId: string;
    name: string;
    baseUrl: string;
    mode: BOTMODE;
    type: FUNCTIONTYPE;
    endpoints: JsonArray;
    schedules: JsonArray;
    metadata?: OptionalNullable<JsonObject>;
    originClientRequest?: ClientRequest;
  }
>;

export type ClientRequest = Loose<
  BaseModel & {
    createdAt: DateValue;
    updatedAt: DateValue;
    botProjectId: string;
    clientId: string;
    mentionedClientBotIds: string[];
    title: string;
    description: string;
    prUrl: string;
    prNumber: number;
    prBranch: string;
    prTargetBranch: string;
    requestDir: string;
    requestStatus: REQUESTSTATUS;
    requestUpdates?: RequestUpdate[];
    requestMessages?: RequestMessage[];
    deployedFunctions?: ClientRequestFunction[];
    metadata?: OptionalNullable<JsonObject>;
    lastUpdatedAt?: OptionalNullable<DateValue>;
    botProject?: BotProject;
  }
>;

export type RequestUpdate = Loose<
  BaseModel & {
    originClientRequestId: string;
    botProjectId: string;
    clientId: string;
    prUrl: string;
    prNumber: number;
    prBranch: string;
    prTargetBranch: string;
    metadata?: OptionalNullable<JsonObject>;
    originClientRequest?: ClientRequest;
  }
>;

export type RequestMessage = Loose<
  BaseModel & {
    originClientRequestId: string;
    clientId: string;
    message: string;
    media: JsonArray;
    githubUrl?: OptionalNullable<string>;
    updateType: UPDATETYPE;
    updateFrom: UPDATEFROM;
    metadata?: OptionalNullable<JsonObject>;
    originClientRequest?: ClientRequest;
  }
>;

export const botProjectSchemas = createCrudSchemas<BotProject>();
export const clientBotTemplateSchemas = createCrudSchemas<ClientBotTemplate>();
export const clientBotSchemas = createCrudSchemas<ClientBot>();
export const clientRequestFunctionSchemas = createCrudSchemas<ClientRequestFunction>();
export const clientRequestSchemas = createCrudSchemas<ClientRequest>();
export const requestUpdateSchemas = createCrudSchemas<RequestUpdate>();
export const requestMessageSchemas = createCrudSchemas<RequestMessage>();
