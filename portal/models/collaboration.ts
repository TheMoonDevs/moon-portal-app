import { createCrudSchemas, type BaseModel, type DateValue, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import { type BUFF_LEVEL } from './shared/enums';

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

export type Task = Loose<{
  taskId: string;
  name: string;
  status: string;
  priority?: Nullable<string>;
  assignees: string[];
  url: string;
  startDate?: OptionalNullable<DateValue>;
  dueDate?: OptionalNullable<DateValue>;
}>;

export type BuffBadge = Loose<
  BaseModel & {
    userId: string;
    title: string;
    points: number;
    buffLevel: BUFF_LEVEL;
    month: string;
    user?: Record<string, unknown>;
  }
>;

export const pointerSchemas = createCrudSchemas<Pointer>();
export const replySchemas = createCrudSchemas<Reply>();
export const taskSchemas = createCrudSchemas<Task>();
export const buffBadgeSchemas = createCrudSchemas<BuffBadge>();
