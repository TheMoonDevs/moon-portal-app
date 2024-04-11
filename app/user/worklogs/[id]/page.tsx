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

  const queryParams = useSearchParams();
  const _date = queryParams?.get("date");
  const _logType = queryParams?.get("logType");

  return (
    <PageAccess isAuthRequired={true}>
      <WorklogView id={params.slug} date={_date} logType={_logType} />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
