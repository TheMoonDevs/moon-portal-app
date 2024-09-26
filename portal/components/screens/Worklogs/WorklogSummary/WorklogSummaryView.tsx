import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { ArrayHelper } from "@/utils/helpers/array";
import { User, WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";
import { getStatsOfContent } from "../WorklogEditor";
import Image from "next/image";

interface WorklogSummaryViewProps {
  worklogSummary: WorkLogs[];
  workLogUser: User | null | undefined;
}

const getCompletionEmoji = (completed: number, total: number) => {
  if (completed === total && total > 0) {
    return (
      <Image
        src="/emojis-animated/star.webp"
        width={28}
        height={28}
        alt="star"
      />
    );
  } else if (completed === 0) {
    return (
      <Image src="/emojis-animated/sad.webp" width={28} height={28} alt="sad" />
    );
  } else if (completed < total) {
    return (
      <Image
        src="/emojis-animated/keep-going.webp"
        width={28}
        height={28}
        alt="star"
      />
    );
  }
  return null;
};

export const getLatestWorklogPerDate = (worklogs: WorkLogs[]): WorkLogs[] => {
  const latestWorklogMap: Record<string, WorkLogs> = {};

  worklogs.forEach((worklog) => {
    if (worklog?.date) {
      if (
        !latestWorklogMap[worklog.date] ||
        new Date(worklog.updatedAt) >
          new Date(latestWorklogMap[worklog.date].updatedAt)
      ) {
        latestWorklogMap[worklog.date] = worklog;
      }
    }
  });

  return Object.values(latestWorklogMap);
};

export const WorklogSummaryView = ({
  worklogSummary,
  workLogUser,
}: WorklogSummaryViewProps) => {
  const uniqueWorklogs = getLatestWorklogPerDate(worklogSummary); //removes duplicate data from worklogs and we will get the latest updated worklogs

  return uniqueWorklogs.length > 0 ? (
    <div className="p-8">
      {ArrayHelper.reverseSortByDate(uniqueWorklogs, "date").map((worklog) => {
        const markdownData = worklog?.works[0];
        const stats = markdownData
          ? getStatsOfContent(markdownData.content as string)
              .split(" / ")
              .map(Number)
          : [0, 0];
        const [completed, total] = stats;

        return (
          <div key={worklog.title}>
            <div className="flex items-center justify-between">
              <h1 className="text-sm uppercase tracking-[2px] font-bold text-neutral-500">
                {worklog.title}
              </h1>
              {markdownData && (
                <p className="text-sm uppercase tracking-[2px] font-bold text-neutral-500 flex items-center gap-1">
                  <span>
                    {getStatsOfContent(markdownData.content as string)}
                  </span>
                  <span className="ml-2 text-lg">
                    {getCompletionEmoji(completed, total)}
                  </span>
                </p>
              )}
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
        );
      })}
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
