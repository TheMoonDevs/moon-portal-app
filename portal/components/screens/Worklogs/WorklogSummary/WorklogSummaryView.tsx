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
        alt="keep-going"
      />
    );
  }
  return null;
};

const FilterPill = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => {
  return (
    <button className="disabled:cursor-not-allowed flex gap-1 md:gap-2 items-center border bg-white text-sm text-black hover:bg-neutral-100 rounded-2xl px-2 py-1 mx-4 mt-5">
      <span className="material-symbols-outlined !text-sm" onClick={onClick}>
        cancel
      </span>
      <span>{label}</span>
    </button>
  );
};

export const WorklogSummaryView = ({
  worklogSummary,
  workLogUser,
}: WorklogSummaryViewProps) => {
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
            label={`Productive Streak (${formattedFirstDate} to ${formattedLastDate})`}
          />
        )}
        <div className="scrollable-container-summaryView p-8 h-[500px] overflow-y-auto ">
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
                {worklog.works.map((work: any, index: number) => {
                  return (
                    <div key={index}>
                      <MdxAppEditor
                        readOnly
                        key={`work-${uniqueId()}`}
                        markdown={work?.content}
                        contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
                        className="z-1"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </>
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

  const renderDates = (missedDates: string[], isUpdatedLogs: boolean) => {
    return (
      <div className="bg-white shadow-md rounded-lg  mb-4">
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
            <div key={date} className="border-b border-neutral-200 pb-2 mb-2">
              <p className="text-base text-gray-800 tracking-wide">
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
        <div className="pt-8 px-8">
          {tasksData.map((log, index) => {
            return (
              <div key={log.title}>
                <h1 className="text-sm uppercase tracking-[2px] font-bold text-neutral-500">
                  {log.title}
                </h1>
                <div key={index}>
                  <MdxAppEditor
                    readOnly
                    key={`work-${uniqueId()}`}
                    markdown={log?.content}
                    contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
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
        renderSummary(worklogSummary)}
    </>
  );
};
