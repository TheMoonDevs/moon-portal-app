import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { ArrayHelper } from "@/utils/helpers/array";
import { User, WorkLogs } from "@prisma/client";
import { uniqueId } from "lodash";
import { getStatsOfContent } from "../WorklogEditor";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  MissedTask,
  setIsShowProductiveStreak,
  setProductiveStreakData,
  setShowCompletedTasks,
  setShowMissedLogs,
  setShowMissedTasks,
  setShowUpdatedLogs,
} from "@/utils/redux/worklogsSummary/statsAction.slice";
import dayjs from "dayjs";

interface WorklogSummaryViewProps {
  worklogSummary: WorkLogs[];
  workLogUser: User | null | undefined;
  isDrawer?: boolean;
}

const getCompletionEmoji = (completed: number, total: number) => {
  if (completed === total && total > 0) {
    return (
      <Image
        src="/emojis-animated/star.webp"
        width={24}
        height={24}
        alt="star"
      />
    );
  } else if (completed === 0) {
    return (
      <Image src="/emojis-animated/sad.webp" width={24} height={24} alt="sad" />
    );
  } else if (completed < total) {
    return (
      <Image
        src="/emojis-animated/keep-going.webp"
        width={24}
        height={24}
        alt="keep-going"
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

const FilterPill = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="group mx-2 mt-5 flex transform items-center gap-2 rounded-full border border-neutral-400 bg-neutral-100 px-4 py-1 text-sm text-neutral-700 transition duration-300 ease-in-out hover:border-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className="material-symbols-outlined text-base text-neutral-500 transition duration-300 ease-in-out group-hover:text-neutral-700"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        cancel
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
};

export const WorklogSummaryView = ({
  worklogSummary,
  workLogUser,
  isDrawer,
}: WorklogSummaryViewProps) => {
  const uniqueWorklogs = getLatestWorklogPerDate(worklogSummary); //removes duplicate data from worklogs and we will get the latest updated worklogs
  const dispatch = useAppDispatch();
  const {
    isShowProductiveStreak,
    productiveStreakData,
    missedDates,
    showMissedLogs,
    showUpdatedLogs,
    updatedLogsDates,
    showMissedTasks,
    missedTasksData,
    showCompletedTasks,
    completedTasksData,
  } = useAppSelector((state: RootState) => state.statsAction);

  const firstStreakDate =
    productiveStreakData?.[productiveStreakData.length - 1]?.date || "";
  const lastStreakDate = productiveStreakData?.[0]?.date || "";

  const formattedFirstDate = dayjs(firstStreakDate).format("MMMM D");
  const formattedLastDate = dayjs(lastStreakDate).format("MMMM D");

  const missedLogMonth =
    missedDates.length > 0 ? dayjs(missedDates[0]).format("MMMM YYYY") : "";

  const renderSummary = (summaryData: WorkLogs[]) =>
    summaryData.length > 0 ? (
      <>
        {isShowProductiveStreak && productiveStreakData.length > 0 && (
          <FilterPill
            onClick={() => dispatch(setIsShowProductiveStreak(false))}
            label={`Productive Streak (${formattedLastDate} to ${formattedFirstDate})`}
          />
        )}
        <div
          className={`scrollable-container-summaryView ${isShowProductiveStreak ? "h-screen-minus-310" : "h-screen-minus-250"} overflow-y-auto ${!isDrawer ? "p-8" : "p-2"} max-sm:h-[70vh]`}
        >
          {(!isShowProductiveStreak
            ? ArrayHelper.reverseSortByDate(summaryData, "date")
            : summaryData
          ).map((worklog) => {
            const markdownData = worklog?.works[0];
            const stats = markdownData
              ? getStatsOfContent(markdownData.content as string)
                  .split(" / ")
                  .map(Number)
              : [0, 0];
            const [completed, total] = stats;

            return (
              <div
                key={worklog.date}
                data-date={format(parseISO(worklog.date || ""), "yyyy-MM-dd")}
                className="py-4"
              >
                <div className="flex items-start gap-3 rounded-lg bg-white">
                  {markdownData && (
                    <p className="text-2xl">
                      {getCompletionEmoji(completed, total)}
                    </p>
                  )}
                  <div className="flex flex-col">
                    <h1 className="text-base font-semibold uppercase tracking-[1.5px] text-gray-800">
                      {worklog.title}
                    </h1>
                    {markdownData && (
                      <p className="flex items-center gap-1 text-xs font-medium capitalize tracking-[1px] text-gray-600">
                        <span className="font-bold text-gray-900">
                          {completed}
                        </span>{" "}
                        out of{" "}
                        <span className="font-bold text-gray-900">{total}</span>{" "}
                        tasks have been completed
                      </p>
                    )}
                  </div>
                </div>
                <div className="pl-2">
                  {worklog.works.map((work: any, index: number) => {
                    return (
                      <div key={index}>
                        <MdxAppEditor
                          readOnly
                          key={`work-${uniqueId()}`}
                          markdown={work?.content}
                          contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
                          editorKey={`work-${uniqueId()}`}
                          className="z-1"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    ) : (
      <div className="flex max-h-[400px] w-full flex-col items-center justify-center p-8">
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

  const renderDates = (missedDates: string[], isUpdatedLogs: boolean) => {
    return (
      <div className="mb-4 rounded-lg bg-white shadow-md">
        <div className="mb-4">
          <FilterPill
            onClick={() =>
              isUpdatedLogs
                ? dispatch(setShowUpdatedLogs(false))
                : dispatch(setShowMissedLogs(false))
            }
            label={
              isUpdatedLogs
                ? `Updated Logs (${missedLogMonth})`
                : `Missed Logs (${missedLogMonth})`
            }
          />
        </div>
        <div className="flex flex-col gap-3 px-6">
          {missedDates.map((date: string) => (
            <div key={date} className="mb-2 border-b border-neutral-200 pb-2">
              <p className="text-base tracking-wide text-gray-800">
                {dayjs(date).format("D MMMM")}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTasks = (tasksData: MissedTask[], isCompletedTasks: boolean) => {
    return (
      <div className="">
        <FilterPill
          onClick={() =>
            !isCompletedTasks
              ? dispatch(setShowMissedTasks(false))
              : dispatch(setShowCompletedTasks(false))
          }
          label={
            !isCompletedTasks
              ? "You missed marking tasks as complete. Below are the tasks you missed."
              : "Completed Tasks"
          }
        />
        <div className="px-8 pt-8">
          {tasksData.map((log, index) => {
            return (
              <div key={log.title}>
                <h1 className="text-sm font-bold uppercase tracking-[2px] text-neutral-500">
                  {log.title}
                </h1>
                <div key={index}>
                  <MdxAppEditor
                    readOnly
                    key={`work-${uniqueId()}`}
                    markdown={log?.content}
                    contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
                    editorKey={`work-${uniqueId()}`}
                    className="z-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {showMissedLogs && renderDates(missedDates, false)}
      {showUpdatedLogs && renderDates(updatedLogsDates, true)}
      {showMissedTasks && renderTasks(missedTasksData, false)}
      {showCompletedTasks && renderTasks(completedTasksData, true)}
      {!showMissedLogs &&
        !showUpdatedLogs &&
        !showMissedTasks &&
        isShowProductiveStreak &&
        !showCompletedTasks &&
        renderSummary(productiveStreakData)}
      {!showUpdatedLogs &&
        !showMissedLogs &&
        !isShowProductiveStreak &&
        !showMissedTasks &&
        !showCompletedTasks &&
        renderSummary(uniqueWorklogs)}
    </>
  );
};
