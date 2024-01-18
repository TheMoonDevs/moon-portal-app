export enum OVERLAPTYPE {
  ALLDAYS = "alldays",
  WEEKDAYS = "weekdays",
  WEEKENDS = "weekends",
}

export interface ApplicantQuestion {
  question: string;
  description?: string;
  type: "text" | "dropdown" | "checkbox";
  options?: string[];
  required?: boolean;
}

export enum ApplicantTargetGroup {
  STUDENTS = "Students",
  FRESHERS = "Freshers",
  EXPERIENCED = "Experienced",
}

export enum JobPositionType {
  FULL_TIME = "Full Time",
  PART_TIME = "Part Time",
  INTERN = "Intern",
  CONTRACTUAL = "Contractual",
}

export interface JobPostDefaultReq {
  characterTags?: string[];
  attitudeTags?: string[];
  positionType?: JobPositionType;
  targetGroup?: ApplicantTargetGroup;
  applicantQuestions?: ApplicantQuestion[];
  isRemote?: boolean;
  jobLocation?: string; // global
}

export interface JobPostDeptReq {
  characterTags?: string[];
  attitudeTags?: string[];
  skills?: string[];
  workExpInYears?: string;
  applicantQuestions?: ApplicantQuestion[];
}

export interface JobPostAdminReq {
  stipendPerMonth?: string;
  stipendnegotiationRequirement?: string;
  stipendNegotiationRange?: string;
  perks?: string[];
  applicantQuestions?: ApplicantQuestion[];
}

export interface JobPostHRReq {
  publicPosting: {
    platform: string;
    url: string;
  }[];
  noOfPositions?: number;
  totalApplicants?: number;
  totalShortlisted?: number;
  totalScreened?: number;
  totalInterviewed?: number;
  totalHired?: number;
  targetTrialHireDate?: Date;
  targetCoreHireDate?: Date;
  applicantQuestions?: ApplicantQuestion[];
}