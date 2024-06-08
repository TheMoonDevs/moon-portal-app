import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import { WorklogSummaryView } from "./WorklogSummaryView";
import { WorklogSummaryActions } from "./WorklogSummaryActions";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User, WorkLogs } from "@prisma/client";
import { useSearchParams } from "next/navigation";

export const WorklogSummaryContent = ({
  userData,
  summaryTitle,
}: {
  userData: User | null | undefined;
  summaryTitle: string;
}) => {
  const searchParams = useSearchParams();
  const year = searchParams?.get("year");
  const month = searchParams?.get("month");

  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const { loading, setLoading } = useAsyncState();
  const pdfTargetRef = useRef(null);

  const fetchWorklogData = useCallback(
    async (query: {
      year: string | number | undefined | null;
      month?: string | number | undefined | null;
    }) => {
      setLoading(true);
      try {
        const response = await PortalSdk.getData(
          `/api/user/worklogs/summary?userId=${userData?.id}&year=${
            query.year
          }&month=${query.month || null}`,
          null
        );
        setWorklogSummary(response.data.workLogs);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    },
    [setLoading, userData?.id]
  );

  useEffect(() => {
    fetchWorklogData({ year, month });
    // console.log(worklogSummary.map((wl) => wl.works));
  }, [fetchWorklogData, month, year]);

  return (
    <div className="divide-x-2 flex overflow-hidden h-screen w-full">
      <div className="w-[50%]  h-screen overflow-y-scroll ">
        <div ref={pdfTargetRef} className="pt-28 p-10 ">
          <h1 className="text-2xl font-bold pb-8">
            {userData?.name?.split(" ")[0]}&apos;s Worklog Summary for{" "}
            {summaryTitle}
          </h1>
          {!loading ? (
            <WorklogSummaryView worklogSummary={worklogSummary} />
          ) : (
            <LoadingSkeleton />
          )}
        </div>
      </div>
      <WorklogSummaryActions
        userData={userData}
        worklogSummary={worklogSummary}
        summaryTitle={summaryTitle}
        pdfTargetRef={pdfTargetRef}
      />
    </div>
  );
};
