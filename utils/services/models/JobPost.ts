import mongoose from "mongoose";

export interface JobPost extends mongoose.Document {
  title: string;
  dept_name: string;
  description: string;
  skill_requirement: string;
  education_qualification: string;
  work_exp: string;
  work_hours_requirement: string;
  min_contract_period: string;
  expected_salary_range: string;
  location: string;
  status: string;
  jobpost: string;
  created_at: Date;
  deadline: Date;
}

export enum JOBPOST {
  FULLTIME = "fulltime",
  PARTTIME = "parttime",
  INTERN = "intern",
}

export enum JOBSTATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

const JobPostSchema = new mongoose.Schema<JobPost>({
  title: {
    type: String,
    required: [true, "Please provide a title for the job post."],
    maxlength: [100, "Title cannot be more than 100 characters"],
  },
  dept_name: {
    type: String,
    required: [true, "Please provide a department name for the job post."],
    maxlength: [60, "Department name cannot be more than 60 characters"],
  },
  description: {
    type: String,
    required: [true, "Please provide a description for the job post."],
    maxlength: [500, "Description cannot be more than 500 characters"],
  },
  skill_requirement: {
    type: String,
    maxlength: [200, "Skill requirement cannot be more than 200 characters"],
  },
  education_qualification: {
    type: String,
    maxlength: [
      100,
      "Education qualification cannot be more than 100 characters",
    ],
  },
  work_exp: {
    type: String,
    maxlength: [100, "Work experience cannot be more than 100 characters"],
  },
  work_hours_requirement: {
    type: String,
    maxlength: [50, "Work hours requirement cannot be more than 50 characters"],
  },
  min_contract_period: {
    type: String,
    maxlength: [
      50,
      "Minimum contract period cannot be more than 50 characters",
    ],
  },
  expected_salary_range: {
    type: String,
    maxlength: [50, "Expected salary range cannot be more than 50 characters"],
  },
  location: {
    type: String,
    maxlength: [50, "Location for the Job"],
  },
  status: {
    type: String,
    default: JOBSTATUS.ACTIVE,
  },
  jobpost: {
    type: String,
    default: JOBPOST.FULLTIME,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.JobPost ||
  mongoose.model<JobPost>("JobPost", JobPostSchema);
