import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogView } from "@/components/screens/Worklogs/WorklogView";
import { useParams, useSearchParams } from "next/navigation";

export default function WorklogViewPage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogView id={params.slug} />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
