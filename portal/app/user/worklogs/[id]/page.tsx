import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogView } from "@/components/screens/Worklogs/WorklogView";
import { WorklogViewPageWrapper } from "@/components/screens/Worklogs/WorklogViewPageWrapper";
import media from "@/styles/media";
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
      <WorklogViewPageWrapper id={params.slug} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
