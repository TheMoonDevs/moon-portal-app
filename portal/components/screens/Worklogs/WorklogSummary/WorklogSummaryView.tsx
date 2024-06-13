import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";

interface WorklogSummaryViewProps {
  worklogSummary: WorkLogs[];
}

export const WorklogSummaryView = ({
  worklogSummary,
}: WorklogSummaryViewProps) => {
  return worklogSummary.length > 0 ? (
    <>
      {worklogSummary.map((worklog) => (
        <div key={worklog.title}>
          <h1 className="text-xl font-bold">{worklog.title}</h1>
          {worklog.works.map((work: any, index: number) => (
            <div key={index}>
              <MdxAppEditor
                readOnly
                key={`work-${uniqueId()}`}
                markdown={work?.content}
                contentEditableClassName="summary_mdx flex flex-col gap-4"
              />
            </div>
          ))}
        </div>
      ))}
    </>
  ) : (
    <div className="flex w-full flex-col items-center justify-center h-[400px]">
      {/* eslint-disable-next-line @next/next/no-img-element  */}
      <img
        src="/images/empty_item.svg"
        alt="not-found"
        width={200}
        height={200}
      />
      <p className="text-2xl">No Record Found!</p>
    </div>
  );
};
