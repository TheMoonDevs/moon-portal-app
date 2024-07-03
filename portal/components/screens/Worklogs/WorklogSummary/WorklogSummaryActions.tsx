import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import useAsyncState from "@/utils/hooks/useAsyncState";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { GenAiSdk } from "@/utils/services/GenAiSdk";
import { Tooltip } from "@mui/material";
import { User, WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";
import { useRef, useState } from "react";
import generatePDF, { Margin } from "react-to-pdf";
import WorklogBreakdown from "./WorklogBreakdown";
import { useSearchParams } from "next/navigation";

interface WorklogSummaryActionsProps {
  userData: User | null | undefined;
  worklogSummary: WorkLogs[];
  pdfTargetRef: any;
  summaryTitle: string;
}

export const WorklogSummaryActions = ({
  userData,
  worklogSummary,
  summaryTitle,
  pdfTargetRef,
}: WorklogSummaryActionsProps) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const { loading, setLoading } = useAsyncState();
  const [view, setView] = useState<string | null>(null);
  const { copyToClipboard } = useCopyToClipboard();
  const aiSummaryPdfTargetRef = useRef(null);
  const searchParams = useSearchParams();
  const month = searchParams?.get("month");
  const year = searchParams?.get("year");

  const isMonthly = !!month;
  const isYearly = !!year && !month;
  const handleAiSummaryBtnClick = async () => {
    setLoading(true);
    try {
      const response = await GenAiSdk.generateWorklogSummary(
        `${userData?.name}'s ${summaryTitle} Summary`,
        userData?.name,
        worklogSummary.map((wl) => wl.works)
      );
      setAiSummary(response);
      setView("AI Summary");
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const handleBreakdownBtnClick = async () => {
    setLoading(true);
    try {
      setView("Breakdown");
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col mt-10 justify-between items-center  w-full md:w-[50%] border-t-2 relative">
      <div></div>
      {view === "Breakdown" && !loading && (
        <div className="overflow-y-scroll w-full h-screen pb-32 md:pb-8">
          <WorklogBreakdown
            worklogSummary={worklogSummary}
            isMonthly={isMonthly}
            isYearly={isYearly}
          />
        </div>
      )}
      {view === "AI Summary" && !loading && aiSummary && (
        <>
          <div className="flex gap-4 items-center absolute top-10 right-10 !text-neutral-500 z-50">
            <Tooltip title="Download AI Summary">
              <span
                className="material-symbols-outlined hover:cursor-pointer hover:!text-neutral-600"
                onClick={() =>
                  generatePDF(aiSummaryPdfTargetRef, {
                    method: "open",
                    filename: `ai_worklog_summary_${userData?.name}.pdf`,
                    page: { margin: Margin.LARGE },
                  })
                }
              >
                download
              </span>
            </Tooltip>
            <Tooltip title="Copy AI Summary">
              <span
                className="material-symbols-outlined hover:cursor-pointer hover:!text-neutral-600"
                onClick={() => copyToClipboard(aiSummary)}
              >
                stack
              </span>
            </Tooltip>
          </div>
          <div className=" overflow-y-auto w-full">
            <div ref={aiSummaryPdfTargetRef} className="p-10 pt-14">
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
          </div>
        </>
      )}{" "}
      {loading && (
        <div className="pt-6 md:pt-14 min-w-[300px] md:min-w-[400px]">
          <LoadingSkeleton />
        </div>
      )}
      <div className=" text-[0.7rem] sm:text-[0.9rem] md:text-[0.7rem] lg:text-base flex flex-row gap-2 md:gap-4 items-center justify-center sticky bottom-0 py-4 md:py-6 bg-white w-full justify-self-end">
        <Tooltip title="Download Worklog">
          <button
            className="flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2"
            onClick={() =>
              generatePDF(pdfTargetRef, {
                method: "open",
                filename: `worklog_summary_${userData?.name}.pdf`,
                page: { margin: Margin.LARGE },
              })
            }
          >
            <span className="material-symbols-outlined">download</span>
            <span>Download as PDF</span>
          </button>
        </Tooltip>
        <button
          className="flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2"
          onClick={handleBreakdownBtnClick}
        >
          <span className="material-symbols-outlined">analytics</span>
          <span>Breakdown</span>
        </button>
        <button
          onClick={handleAiSummaryBtnClick}
          className="flex gap-1 md:gap-2 items-center border bg-neutral-900 text-white hover:bg-neutral-700 rounded-md px-2 md:px-4 py-2 md:py-2"
        >
          <span className="text-[0.8rem] md:text-[1rem]">✨</span>
          <span>AI Summary</span>
        </button>
      </div>
    </div>
  );
};
