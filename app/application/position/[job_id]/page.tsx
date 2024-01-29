import { CandidateApplicationForm } from "@/components/screens/Public/CandidateApplicationForm";

export default function ApplicationPage({
  params,
}: {
  params: { jobID: string };
}) {
  /* TODO:
    1. Name
    2. Email
    3. Mobile Number
    5. Applicant Answers
  */

  return <CandidateApplicationForm />;
}

// export async function generateStaticParams() {
//   const posts = await fetch("https://.../posts").then((res) => res.json());

//   return posts.map((post) => ({
//     jobID: post.slug,
//   }));
// }
