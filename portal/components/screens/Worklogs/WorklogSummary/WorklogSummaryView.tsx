import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { ArrayHelper } from "@/utils/helpers/array";
import { User, WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";

interface WorklogSummaryViewProps {
  worklogSummary: WorkLogs[];
  workLogUser: User | null | undefined;
}

export const WorklogSummaryView = ({
  worklogSummary,
  workLogUser,
}: WorklogSummaryViewProps) => {

  return worklogSummary.length > 0 ? (
    <div className="p-8">
      {ArrayHelper.reverseSortByDate(worklogSummary, "date").map((worklog) => (
        <div key={worklog.title}>
          <div className="flex items-center justify-between">
            <h1 className="text-sm uppercase tracking-[2px] font-bold text-neutral-500">{worklog.title}</h1>
          </div>
          {worklog.works.map((work: any, index: number) => (
            <div key={index}>
              <MdxAppEditor
                readOnly
                key={`work-${uniqueId()}`}
                markdown={work?.content}
                contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
                className="z-1"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  ) : (
    <div className="flex w-full flex-col items-center justify-center max-h-[400px] p-8">
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
