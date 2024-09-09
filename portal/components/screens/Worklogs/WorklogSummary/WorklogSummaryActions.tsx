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
import Image from "next/image";
import { CircleX } from "lucide-react";

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
  const [view, setView] = useState<"AI Summary" | "Breakdown" | null>(null);
  const { copyToClipboard } = useCopyToClipboard();
  const aiSummaryPdfTargetRef = useRef(null);
  const searchParams = useSearchParams();
  const month = searchParams?.get("month");
  const year = searchParams?.get("year");
  const [isContentVisible, setIsContentVisible] = useState(false);

  const isMonthly = !!month;
  const isYearly = !!year && !month;

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
      setIsContentVisible(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdownBtnClick = () => {
    if (worklogSummary.length === 0) return;
    setView("Breakdown");
    setIsContentVisible(true); // Show content on button click
  };

  const toggleContentVisibility = () => {
    setIsContentVisible(!isContentVisible);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="pt-6 px-14 md:px-0 md:pt-14 w-full md:min-w-[300px] lg:min-w-[400px]">
          <LoadingSkeleton />
        </div>
      );
    }

    if (worklogSummary.length === 0) {
      return (
        <div className="flex w-full flex-col items-center justify-center h-screen md:h-[70vh]">
          <Image
            src="/images/empty_item.svg"
            alt="not-found"
            width={200}
            height={200}
          />
          <p className="text-2xl">No Record Found!</p>
        </div>
      );
    }

    if (view === "AI Summary" && aiSummary) {
      return (
        <>
          <div className="flex gap-4 items-center absolute top-9 left-10 md:left-auto md:right-10 !text-neutral-500 z-50">
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
                onClick={() => copyToClipboard(aiSummary)}>
                stack
              </span>
            </Tooltip>
          </div>
          <div
            className={`overflow-y-auto h-[80vh] w-full ${
              isContentVisible ? "block" : "hidden"
            }`}>
            <div ref={aiSummaryPdfTargetRef} className="p-10 pt-16">
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
      );
    }

    // Show Breakdown content if view is "Breakdown"
    if (view === "Breakdown") {
      return (
        <div className="overflow-y-scroll w-full max-h-screen  ">
          <WorklogBreakdown
            worklogSummary={worklogSummary}
            isMonthly={isMonthly}
            isYearly={isYearly}
          />
        </div>
      );
    }

    // Default case when neither "AI Summary" nor "Breakdown" view is active
    return (
      <div className="overflow-y-scroll w-full h-screen pb-32 md:pb-8">
        <WorklogBreakdown
          worklogSummary={worklogSummary}
          isMonthly={isMonthly}
          isYearly={isYearly}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col mt-10 justify-between items-center w-full md:w-[50%] md:border-t-2 relative">
      {isContentVisible && (
        <>
          <button
            className="absolute top-6 z-20 right-5 md:hidden"
            onClick={toggleContentVisibility}>
            <CircleX color="black" />
          </button>

          <div className="h-screen w-full md:hidden">{renderContent()}</div>
        </>
      )}

      {/* Render content conditionally */}
      <div className="hidden md:flex">{renderContent()}</div>

      {/* Bottom buttons */}
      <div className="text-[0.7rem] sm:text-[0.9rem] md:text-[0.7rem] lg:text-base flex flex-row gap-2 md:gap-4 items-center justify-center fixed md:sticky bottom-0 py-4 md:py-6 bg-white w-full justify-self-end">
        <Tooltip title="Download Worklog">
          <button
            disabled={!worklogSummary.length}
            className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2"
            onClick={() =>
              generatePDF(pdfTargetRef, {
                method: "open",
                filename: `worklog_summary_${userData?.name}.pdf`,
                page: { margin: Margin.LARGE },
              })
            }>
            <span className="material-symbols-outlined">download</span>
            <span>Download as PDF</span>
          </button>
        </Tooltip>
        <button
          disabled={!worklogSummary.length}
          className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2"
          onClick={handleBreakdownBtnClick}>
          <span className="material-symbols-outlined">analytics</span>
          <span>Breakdown</span>
        </button>
        <button
          disabled={!worklogSummary.length}
          onClick={handleAiSummaryBtnClick}
          className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border bg-neutral-900 text-white hover:bg-neutral-700 rounded-md px-2 md:px-4 py-2 md:py-2">
          <span className="text-[0.8rem] md:text-[1rem]">✨</span>
          <span>AI Summary</span>
        </button>
      </div>
    </div>
  );
};
