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
import generatePDF, { Margin } from "react-to-pdf";
import { Tooltip } from "@mui/material";
import { GenAiSdk } from "@/utils/services/GenAiSdk";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { uniqueId } from "lodash";

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


  const { copyToClipboard } = useCopyToClipboard();
  const aiSummaryPdfTargetRef = useRef(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [view, setView] = useState<"AI Summary" | "Worklogs">("Worklogs");

  const handleAiSummaryBtnClick = async () => {
    if (worklogSummary.length === 0) return;
    setLoading(true);
    try {
      const response = await GenAiSdk.generateWorklogSummary(
        `${userData?.name}'s ${summaryTitle} Summary`,
        userData?.name,
        worklogSummary.map((wl) => wl.works)
      );
      setAiSummary(response);
      setView("AI Summary");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-neutral-100">
      <div className="w-[100%] md:w-[50%] overflow-y-scroll h-screen m-4 mt-4 bg-white rounded-2xl shadow-xl">
        <div className="">
          {userData &&
            <div className="flex items-center justify-start p-8 py-4 shadow-md gap-4 bg-white sticky top-0 z-10">
              <img
                src={userData?.avatar ?? "/images/avatar.png"}
                alt="avatar"
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="text-xl font-bold">{userData?.name}</p>
                <div className="flex items-center gap-2">
                  {/* <p className="text-sm font-regular">
                    Worklog Summary
                  </p> */}
                  <Tooltip title="Download Worklog">
                    <button
                      disabled={!worklogSummary.length}
                      className="disabled:cursor-not-allowed flex gap-1 items-center text-sm border-b border-transparent hover:border-neutral-500"
                      onClick={() =>
                        generatePDF(pdfTargetRef, {
                          method: "open",
                          filename: `worklog_summary_${userData?.name}.pdf`,
                          page: { margin: Margin.LARGE },
                        })
                      }>
                      <span className="material-symbols-outlined !text-sm">download</span>
                      <span>Download Summary as PDF</span>
                    </button>
                  </Tooltip>
                </div>
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
          <div className="flex items-center justify-between bg-blue-50">
            <h1 className="text-xs text-neutral-700 p-3 px-4">Generate an AI summary to use in Meeting Notes, Resume etc.. </h1>
            {view === "AI Summary" ? (
              <div className="flex gap-4 items-center px-4 !text-neutral-500">
                <Tooltip title="Download AI Summary">
                  <span
                    className="material-symbols-outlined hover:cursor-pointer hover:!text-neutral-600"
                    onClick={() =>
                      generatePDF(aiSummaryPdfTargetRef, {
                        method: "open",
                        filename: `ai_worklog_summary_${userData?.name}.pdf`,
                        page: { margin: Margin.LARGE },
                      })
                    }>
                    download
                  </span>
                </Tooltip>
                <Tooltip title="Copy AI Summary">
                  <span
                    className="material-symbols-outlined hover:cursor-pointer hover:!text-neutral-600"
                    onClick={() => aiSummary ? copyToClipboard(aiSummary) : {}}>
                    stack
                  </span>
                </Tooltip>
              </div>
            ) : (
              <button
                disabled={!worklogSummary.length}
                onClick={handleAiSummaryBtnClick}
                className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border bg-white text-xs text-black hover:bg-neutral-100 rounded-2xl px-2 py-1 mx-4">
                <span className="text-[0.8rem] md:text-[1rem]">✨</span>
                <span>AI Summary</span>
              </button>
            )}
          </div>
          {view === "Worklogs" ?
            <div className="" ref={pdfTargetRef} >
              {!loading ? (
                <WorklogSummaryView worklogSummary={worklogSummary} workLogUser={userData} />
              ) : (
                <LoadingSkeleton />
              )}
            </div>
            : (
              <div className="p-4">
                {aiSummary && (
                  <div ref={aiSummaryPdfTargetRef} className="">
                    <div className="w-full">
                      <MdxAppEditor
                        className=""
                        key={`ai_summary-${uniqueId()}`}
                        readOnly
                        contentEditableClassName="summary_mdx flex flex-col gap-4"
                        markdown={aiSummary}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setView("Worklogs");
                  }}
                  className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border bg-white text-sm text-black hover:bg-neutral-100 rounded-2xl px-2 py-1 mx-4">
                  <span className="material-symbols-outlined !text-sm">arrow_back</span>
                  <span>Back to Worklogs</span>
                </button>
              </div>
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
