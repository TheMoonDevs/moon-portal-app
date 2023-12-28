import mongoose from "mongoose";

export interface Candidate extends mongoose.Document {
  jobpost_id: number;
  name: string;
  email: string;
  mobile_number: number;
  education_qualification: string;
  skill_qualification: string;
  work_exp: string;
}

const CandidateSchema = new mongoose.Schema<Candidate>({
  jobpost_id: {
    type: Number,
    required: [true, "Please provide the job post ID for the candidate."],
    maxlength: [50, "Job post ID cannot be more than 50 characters"],
  },
  name: {
    type: String,
    required: [true, "Please provide a name for the candidate."],
    maxlength: [100, "Name cannot be more than 100 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email for the candidate."],
    maxlength: [100, "Email cannot be more than 100 characters"],
  },
  mobile_number: {
    type: Number,
    required: [true, "Please provide a mobile number for the candidate."],
    maxlength: [20, "Mobile number cannot be more than 20 characters"],
  },
  education_qualification: {
    type: String,
    maxlength: [
      100,
      "Education qualification cannot be more than 100 characters",
    ],
  },
  skill_qualification: {
    type: String,
    maxlength: [200, "Skill qualification cannot be more than 200 characters"],
  },
  work_exp: {
    type: String,
    maxlength: [100, "Work experience cannot be more than 100 characters"],
  },
});

export default mongoose.models.Candidate ||
  mongoose.model<Candidate>("Candidate", CandidateSchema);
