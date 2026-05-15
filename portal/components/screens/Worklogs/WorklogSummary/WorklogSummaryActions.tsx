import type { User, WorkLogs } from '@db/client';
import { CircleX } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { LoadingSkeleton } from '@/components/elements/LoadingSkeleton';
import useAsyncState from '@/utils/hooks/useAsyncState';

import WorklogBreakdown from './WorklogBreakdown';

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
  const [view, setView] = useState<'AI Summary' | 'Breakdown' | null>(null);
  const searchParams = useSearchParams();
  const month = searchParams?.get('month');
  const year = searchParams?.get('year');
  const [isContentVisible, setIsContentVisible] = useState(false);

  const isMonthly = !!month;
  const isYearly = !!year && !month;

  const handleBreakdownBtnClick = () => {
    if (worklogSummary.length === 0) return;
    setView('Breakdown');
    setIsContentVisible(true); // Show content on button click
  };

  const toggleContentVisibility = () => {
    setIsContentVisible(!isContentVisible);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full px-14 pt-6 md:min-w-[300px] md:px-0 md:pt-14 lg:min-w-[400px]">
          <LoadingSkeleton />
        </div>
      );
    }

    if (worklogSummary.length === 0) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center md:h-[70vh]">
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
    if (view === 'Breakdown') {
      return (
        <div className="no-scrollbar max-h-screen w-full">
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
      <div className="no-scrollbar w-full overflow-hidden">
        <WorklogBreakdown
          worklogSummary={worklogSummary}
          isMonthly={isMonthly}
          isYearly={isYearly}
        />
      </div>
    );
  };

  return (
    <div className="relative flex w-full flex-col items-center justify-between md:w-[50%]">
      {isContentVisible && (
        <>
          <button
            className="absolute right-5 top-6 z-20 md:hidden"
            onClick={toggleContentVisibility}
          >
            <CircleX color="black" />
          </button>

          <div className="h-screen w-full md:hidden">{renderContent()}</div>
        </>
      )}

      {/* Render content conditionally */}
      <div className="hidden w-full md:flex">{renderContent()}</div>
    </div>
  );
};
