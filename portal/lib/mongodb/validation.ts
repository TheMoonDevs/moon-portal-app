import {
  botProjectSchemas,
  certificateSchemas,
  clientBotSchemas,
  clientRequestSchemas,
  directoryListSchemas,
  fileUploadSchemas,
  missionTaskSchemas,
  notificationSchemas,
  requestMessageSchemas,
  requestUpdateSchemas,
  userSchemas,
} from '@/models';

const modelCrudSchemas = {
  user: userSchemas,
  directoryList: directoryListSchemas,
  missionTask: missionTaskSchemas,
  clientRequest: clientRequestSchemas,
  requestUpdate: requestUpdateSchemas,
  requestMessage: requestMessageSchemas,
  botProject: botProjectSchemas,
  clientBot: clientBotSchemas,
  notification: notificationSchemas,
  fileUpload: fileUploadSchemas,
  certificate: certificateSchemas,
} as const;

export type ValidatableModel = keyof typeof modelCrudSchemas;

export function parseCreateInput<T = unknown>(
  model: ValidatableModel,
  data: T,
): T {
  return modelCrudSchemas[model].create.parse(data) as T;
}

export function parseUpdateInput<T = unknown>(
  model: ValidatableModel,
  data: T,
): T {
  return modelCrudSchemas[model].update.parse(data) as T;
}

export function safeParseCreateInput<T = unknown>(
  model: ValidatableModel,
  data: T,
) {
  return modelCrudSchemas[model].create.safeParse(data) as {
    success: boolean;
    data?: T;
    error?: unknown;
  };
}
