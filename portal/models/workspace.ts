import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * Multi-company workspace: Company → Projects → Tasks.
 *
 * References between these collections (companyId, userId, …) are stored as
 * plain strings, so none of them are registered as ObjectId fields.
 */

export enum COMPANY_STATUS {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum MEMBER_STATUS {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

export enum PROJECT_STATUS {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TASK_STATUS {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TASK_SIZE {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
}

export type Company = Loose<
  BaseModel & {
    name: string;
    slug: string;
    description?: Nullable<string>;
    logo?: Nullable<string>;
    color?: Nullable<string>;
    status: COMPANY_STATUS;
    createdById: string;
  }
>;

/** A named set of permissions inside one company (Owner, Manager, …). */
export type CompanyRole = Loose<
  BaseModel & {
    companyId: string;
    key: string;
    name: string;
    description?: Nullable<string>;
    permissions: string[];
    /** Seeded with the company; can be edited but not deleted. */
    isSystem?: boolean;
  }
>;

export type CompanyMember = Loose<
  BaseModel & {
    companyId: string;
    userId: string;
    roleKeys: string[];
    title?: Nullable<string>;
    status: MEMBER_STATUS;
    joinedAt?: DateValue;
  }
>;

export type Project = Loose<
  BaseModel & {
    companyId: string;
    name: string;
    slug: string;
    description?: Nullable<string>;
    status: PROJECT_STATUS;
    color?: Nullable<string>;
    icon?: Nullable<string>;
    leadIds: string[];
    memberIds: string[];
    startDate?: Nullable<string>;
    dueDate?: Nullable<string>;
    createdById: string;
  }
>;

export type Task = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    title: string;
    description?: Nullable<string>;
    size: TASK_SIZE;
    status: TASK_STATUS;
    assigneeIds: string[];
    dueDate?: Nullable<string>;
    completedAt?: Nullable<DateValue>;
    createdById: string;
  }
>;

export const companySchemas = createCrudSchemas<Company>();
export const companyRoleSchemas = createCrudSchemas<CompanyRole>();
export const companyMemberSchemas = createCrudSchemas<CompanyMember>();
export const projectSchemas = createCrudSchemas<Project>();
export const taskSchemas = createCrudSchemas<Task>();
