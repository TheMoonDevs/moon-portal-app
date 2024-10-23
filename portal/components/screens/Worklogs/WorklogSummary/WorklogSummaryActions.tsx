import { LoadingSkeleton } from "@/components/elements/LoadingSkeleton";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { User, WorkLogs } from "@prisma/client";
import { useState } from "react";
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
  const searchParams = useSearchParams();
  const month = searchParams?.get("month");
  const year = searchParams?.get("year");
  const [isContentVisible, setIsContentVisible] = useState(false);

  const isMonthly = !!month;
  const isYearly = !!year && !month;


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

    // Show Breakdown content if view is "Breakdown"
    if (view === "Breakdown") {
      return (
        <div className="overflow-y-scroll w-full max-h-screen  no-scrollbar ">
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
      <div className="overflow-x-hidden overflow-y-scroll w-full h-screen pb-32 md:pb-8 no-scrollbar">
        <WorklogBreakdown
          worklogSummary={worklogSummary}
          isMonthly={isMonthly}
          isYearly={isYearly}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-between items-center w-full md:w-[50%] relative">
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
      <div className="hidden md:flex w-full">{renderContent()}</div>
    </div>
  );
};
