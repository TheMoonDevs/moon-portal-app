import type {
  JobPostAdminReq,
  JobPostDefaultReq,
  JobPostDeptReq,
  JobPostHRReq,
} from '@/models/domains/job-post';

import { createCrudSchemas, type BaseModel, type DateValue, type JsonArray, type JsonObject, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import { type JOBPOST, type JOBSTATUS } from './shared/enums';

export type Candidate = Loose<
  BaseModel & {
    name: string;
    email: string;
    mobileNumber: number;
    portfolio?: Nullable<string>;
    resume?: Nullable<string>;
    applicantAnswers: JsonArray;
    educationQualification?: Nullable<string>;
    skillQualification?: Nullable<string>;
    workExp?: Nullable<string>;
    jobPostId: string;
    screeningRound1?: OptionalNullable<JsonObject>;
    screeningRound2?: OptionalNullable<JsonObject>;
  }
>;

export type JobPost = Loose<
  BaseModel & {
    title: string;
    deptName: string;
    description: string;
    defaultReq?: OptionalNullable<JobPostDefaultReq>;
    deptReq?: OptionalNullable<JobPostDeptReq>;
    adminReq?: OptionalNullable<JobPostAdminReq>;
    hrReq?: OptionalNullable<JobPostHRReq>;
    status: JOBSTATUS;
    jobpost: JOBPOST;
    createdAt: DateValue;
    Candidate?: Candidate[];
  }
>;

export const candidateSchemas = createCrudSchemas<Candidate>();
export const jobPostSchemas = createCrudSchemas<JobPost>();
