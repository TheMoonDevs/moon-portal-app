import ToolTip from '@/components/elements/ToolTip';
import { Engagement, User, WorkLogs } from '@prisma/client';
import React from 'react';
import generatePDF, { Margin } from 'react-to-pdf';
import { EngagementTeam } from './EngagementTeam';

const EngagementHeader = ({
  activeEngagement,
  workLogs,
  pdfTargetRef,
  team
}: {
  activeEngagement: Engagement | null;
  workLogs: WorkLogs[];
  pdfTargetRef: React.RefObject<HTMLDivElement>;
  team: User[]
}) => {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-start gap-4 bg-white p-8 py-4 shadow-md max-sm:px-2 max-sm:py-4">
      <div>
        <p className="text-xl font-bold max-sm:text-lg">
          {activeEngagement?.title}
        </p>
        <div className="flex items-center gap-2 max-sm:gap-1">
          {/* <p className="text-sm font-regular">
      Worklog Summary
    </p> */}
          <ToolTip title="Download Worklog">
            <button
              disabled={!workLogs.length}
              className="flex items-center gap-1 border-b border-transparent text-sm hover:border-neutral-500 disabled:cursor-not-allowed"
              onClick={() =>
                generatePDF(pdfTargetRef, {
                  method: 'open',
                  filename: `worklog_${activeEngagement?.title}.pdf`,
                  page: { margin: Margin.LARGE },
                })
              }
            >
              <span className="material-symbols-outlined !text-sm">
                download
              </span>
              <span>Download Worklog as PDF</span>
            </button>
          </ToolTip>
        </div>
      </div>
      <div className="ml-auto">
        <EngagementTeam activeEngagement={activeEngagement} team={team} />
      </div>
    </div>
  );
};

export default EngagementHeader;
