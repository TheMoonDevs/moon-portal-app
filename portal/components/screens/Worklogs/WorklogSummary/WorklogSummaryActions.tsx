import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import useAsyncState from "@/utils/hooks/useAsyncState";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { GenAiSdk } from "@/utils/services/GenAiSdk";
import { Skeleton, Tooltip } from "@mui/material";
import { User, WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";
import { useRef, useState } from "react";
import generatePDF, { Margin } from "react-to-pdf";

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
  const handleAiSummaryBtnClick = async () => {
    setLoading(true);
    try {
      const response = await GenAiSdk.generateWorklogSummary(
        `${userData?.name}'s ${summaryTitle} Summary`,
        userData?.name,
        worklogSummary.map((wl) => wl.works)
      );
      setAiSummary(response);
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };
  const { copyToClipboard } = useCopyToClipboard();
  const aiSummaryPdfTargetRef = useRef(null);

  return (
    <div className="flex flex-col mt-10 justify-between items-center  w-full md:w-[50%]  relative">
      <div className="h-full">
        {!loading ? (
          aiSummary && (
            <>
              <div className="flex gap-4 items-center absolute top-2 md:top-10 right-2 md:right-10 !text-neutral-500 z-50">
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
              <div className="overflow-y-auto w-full h-full">
                <div
                  ref={aiSummaryPdfTargetRef}
                  className="p-4 md:p-10 pt-6 md:pt-14"
                >
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
          )
        ) : (
          <div className="pt-6 md:pt-14 pl-4 md:pl-14 w-full justify-self-start self-start">
            <LoadingSkeleton />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-2 md:gap-4 items-center justify-center sticky bottom-0 py-4 md:py-6 bg-white w-full justify-self-end">
        <Tooltip title="Download Worklog">
          <button
            className="flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2 text-sm md:text-base"
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
        <button className="flex gap-1 md:gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-2 md:px-4 py-1 md:py-2 text-sm md:text-base">
          <span className="material-symbols-outlined">analytics</span>
          <span>Breakdown</span>
        </button>
        <button
          onClick={handleAiSummaryBtnClick}
          className="flex gap-1 md:gap-2 items-center border bg-neutral-900 text-white hover:bg-neutral-700 rounded-md px-2 md:px-4 py-2 md:py-2 text-sm md:text-base"
        >
          <span>✨</span>
          <span>AI Summary</span>
        </button>
      </div>
    </div>
  );
};
