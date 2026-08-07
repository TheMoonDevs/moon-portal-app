import { z } from 'zod';

export type DateValue = Date | string;
export type Nullable<T> = T | null;
export type OptionalNullable<T> = T | null | undefined;

export type JsonValue = unknown;
export type JsonObject = Record<string, unknown>;
export type JsonArray = unknown[];

export type Loose<T extends object> = T;

export interface BaseModel {
  id: string;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

// Generic schema helper for schemaless collections.
export const objectSchema = <T>() => z.object({}).passthrough() as z.ZodType<T>;

export const createCrudSchemas = <
  TEntity,
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
>() => ({
  entity: objectSchema<TEntity>(),
  create: objectSchema<TCreate>(),
  update: objectSchema<TUpdate>(),
});
