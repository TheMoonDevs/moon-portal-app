import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import { WorklogSummaryView } from "./WorklogSummaryView";
import { WorklogSummaryActions } from "./WorklogSummaryActions";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User, WorkLogs } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { calculateMetrics } from "../WorklogBreakdown/BreakdownMetrics";

export const WorklogSummaryContent = ({
  userData,
  summaryTitle,
  onlyYearSummary,
}: {
  userData: User | null | undefined;
  summaryTitle: string;
  onlyYearSummary: boolean;
}) => {
  const searchParams = useSearchParams();
  const year = searchParams?.get("year") || dayjs().year();
  let month = !onlyYearSummary
    ? searchParams?.get("month") || dayjs().month(dayjs().month()).format("MM")
    : null;

  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const [userInfo, setUserInfo] = useState<User | null | undefined>(undefined);
  const { loading, setLoading } = useAsyncState();
  const pdfTargetRef = useRef(null);
  // console.log(userData?.id);
  const fetchWorklogData = useCallback(
    async (query: {
      year: string | number | undefined | null;
      month?: string | number | undefined | null;
    }) => {
      console.log(userData?.id);
      setLoading(true);
      try {
        const response = await PortalSdk.getData(
          `/api/user/worklogs/summary?userId=${userData?.id}&year=${query.year}&month=${query.month}`,
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

  const isMonthly = !!month;
  const isYearly = !!year && !month;
  const metrics = calculateMetrics(worklogSummary, isMonthly, isYearly);

  return (
    <div className="divide-x-2 flex flex-col md:flex-row overflow-hiddenh-screen w-full h-screen bg-neutral-100">
      <div className="w-[100%] md:w-[50%] overflow-y-scroll m-4 mt-4 bg-white rounded-2xl shadow-xl">
        <div ref={pdfTargetRef} className="">
          {userData &&
            <div className="flex items-center justify-start p-8 py-4 shadow-md gap-4 bg-white sticky top-0 z-10">
              <img
                src={userData?.avatar ?? "/images/avatar.png"}
                alt="avatar"
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="text-xl font-bold">{userData?.name}</p>
                <p className="text-sm font-regular">
                  Worklog Summary for{" "}
                  {summaryTitle}
                </p>
              </div>
              <div className="ml-auto">
                <h3 className="text-2xl font-bold">
                  {summaryTitle}
                </h3>
                <p className="text-xs font-regular">
                  {worklogSummary.length} Logs | {metrics.totalTasks} tasks
                </p>
              </div>
            </div>
          }
          {!loading ? (
            <div className="">
              <WorklogSummaryView worklogSummary={worklogSummary} workLogUser={userData} />
            </div>
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
