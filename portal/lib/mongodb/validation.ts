import { fileUploadSchemas, notificationSchemas, userSchemas } from '@/models';

const modelCrudSchemas = {
  user: userSchemas,
  notification: notificationSchemas,
  fileUpload: fileUploadSchemas,
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
