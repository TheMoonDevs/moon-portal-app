import { CandidateApplicationForm } from "@/components/screens/Public/CandidateApplicationForm";

export default function ApplicationPage({
  params,
}: {
  params: { job_id: string };
}) {
  return <CandidateApplicationForm jobID={params.job_id} />;
}
