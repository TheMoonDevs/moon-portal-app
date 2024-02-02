import { CandidateListPage } from "@/components/screens/Screening/CandidateListPage";

const CandidateList = ({ params }: { params: { job_id: string } }) => {
  const { job_id } = params;
  return <CandidateListPage job_id={job_id} />;
};

export default CandidateList;
