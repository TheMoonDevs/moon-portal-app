'use client';

import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { WorkLogs } from '@prisma/client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import store, { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import dayjs from 'dayjs';
import { WorkLogsHelper } from './WorklogsHelper';
import { Fade, useMediaQuery } from '@mui/material';
import media from '@/styles/media';
import { WorklogView } from './WorklogView';
import { SummarizeButton } from './SummarizeButton';
import { Toaster, toast } from 'sonner';
import { setLogsList } from '@/utils/redux/worklogs/worklogs.slice';
import SimpleTabs from '@/components/elements/Tabs';
import WorklogTips from './WorklogTabs/WorklogTips';
import TodoTab from './WorklogTabs/TodoTab';
import {
  setCompletedTodos,
  setIncompleteTodos,
  setTodoMarkdown,
} from '@/utils/redux/worklogs/laterTodos.slice';
import WorklogBuff from './WorklogTabs/WorklogBuff';
import ClickupTasks from './WorklogTabs/ClickupTasks';
import { PrivateWorklogView } from './PrivateWorklogView';
import { usePassphrase } from '@/utils/hooks/usePassphrase';
const tempData = [
  {
    id: 'idsdjneslnfrnleskdnelrnv',
    title: 'March 24 - Sunday',
    date: '2021-03-24',
    works: [
      {
        id: 'sdjnvkrbd-2021-03-24', // should be random id - `random_uid+date`
        text: 'Worked on the Moon PWA',
        status: 'none', // none, done, inProgress
      },
      {
        id: 'djncsjnk-2021-03-24', // should be random id - `random_uid+date`
        text: 'Worked on the Moon Homepage',
        status: 'done', // none, done, inProgress
      },
      {
        id: 'sdvnsjknc-2021-03-24', // should be random id - `random_uid+date`
        text: 'Worked on the Moon PWA',
        status: 'none', // none, done, inProgress
      },
    ],
  },
];

const linkForWorkLog = (data: WorkLogs) => {
  return (
    APP_ROUTES.userWorklogs +
    '/' +
    (data.id || 'new') +
    '?logType=' +
    data.logType +
    (data.logType === 'dayLog' ? '&date=' + data.date : '')
  );
};

export const WorkLogItem = ({
  data,
  onClick,
  selected,
  isTabletOrMore,
}: {
  data: WorkLogs;
  onClick: any;
  selected?: boolean;
  isTabletOrMore: boolean;
}) => {
  return (
    <Link
      href={isTabletOrMore ? '' : linkForWorkLog(data)}
      className={`flex min-h-[150px] flex-col gap-3 overflow-y-hidden rounded-lg border border-neutral-200 p-3 ${
        data.logType === 'privateLog' ? 'h-full' : ''
      } ${selected ? 'border-2 border-neutral-900 bg-white' : ''}`}
      key={JSON.stringify(data.works)}
      onClick={onClick}
    >
      <div
        className={`flex flex-row justify-between ${
          selected ? 'font-bold text-black' : 'font-regular text-neutral-800'
        }`}
      >
        <h1 className={`text-xs`}>{data.title}</h1>
        {data.logType === 'dayLog' && (
          <span
            className={`icon_size material-symbols-outlined ${
              dayjs(data.date).isBefore(dayjs(), 'date') && data.id === ''
                ? 'text-red-500'
                : !selected
                  ? 'text-neutral-500'
                  : dayjs(data.date).isSame(dayjs(), 'date')
                    ? 'text-green-500'
                    : data.id === '' ||
                        dayjs(data.date).isAfter(dayjs(), 'date')
                      ? 'text-neutral-500'
                      : 'text-blue-500'
            } `}
          >
            {dayjs(data.date).isSame(dayjs(), 'date')
              ? 'radio_button_checked'
              : dayjs(data.date).isAfter(dayjs(), 'date')
                ? data.id === ''
                  ? 'add_box'
                  : 'checklist'
                : data.id === ''
                  ? 'pending'
                  : 'checklist'}
          </span>
        )}
      </div>
      <div className="flex max-h-[100px] min-h-[100px] flex-col p-1">
        {data.id != '' &&
          data.works //.flatMap((wk) => (wk as any)?.pointInfos)
            //.slice(0, 3)
            .map((point: any, index: number) => (
              <div
                key={`${point.link_id}-${index}`}
                className="flex flex-row items-center"
              >
                <div className="text-sm font-light">
                  <MdxAppEditor
                    key={point?.id}
                    editorKey={point?.id}
                    markdown={point?.content}
                    readOnly={true}
                    contentEditableClassName="mdx_ce_min leading-0 imp-p-0 grow w-full h-full line-clamp-4"
                    // plugins={[
                    //   diffSourcePlugin({
                    //     diffMarkdown: "An older version",
                    //     viewMode: "diff",
                    //   }),
                    // ]}
                  />
                </div>
              </div>
            ))}
        {data.id === '' && (
          <div className="">
            <p className="text-sm text-neutral-300">
              Tap to jot down your logs...
            </p>
          </div>
        )}
      </div>
    </Link>
  );
};

export const WorklogsPage = () => {
  const { localPassphrase } = usePassphrase();
  const { user } = useUser();

  const thisYear = dayjs().year();
  const thisMonth = dayjs().month();
  const thisDate = dayjs().date();
  const dispatch = useAppDispatch();
  const { todoMarkdown, incompleteTodos } = useAppSelector(
    (state) => state.laterTodos,
  );
  const [monthTab, setMonthTab] = useState<number>(thisMonth);
  const logsList = useAppSelector((state) => state.worklogs.logsList);
  const [yearLogData, setYearLogData] = useState<any>();
  const [privateBoard, setPrivateBoard] = useState<WorkLogs | null>(null);
  const isTabletOrMore = useMediaQuery(media.moreTablet);
  const isEditorSaving = useAppSelector(
    (state) => state.worklogs.isEditorSaving,
  );

  const fetchLaterToDo = (userId: string) => {
    PortalSdk.getData(`/api/user/todolater?userId=${userId}`, null)
      .then((data) => {
        const content = data?.data?.markdown?.content || '';
        dispatch(setTodoMarkdown(content));
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    if (todoMarkdown) {
      if (todoMarkdown.trim() === '*' || todoMarkdown.trim() === '') {
        dispatch(setIncompleteTodos(0));
      } else {
        const total = (todoMarkdown.match(/\n/g) || []).length + 1;
        const completed = (todoMarkdown.match(/✅/g) || []).length;
        dispatch(setIncompleteTodos(total - completed));
        dispatch(setCompletedTodos(completed));
      }
    }
  }, [todoMarkdown]);

  useEffect(() => {
    if (user?.id) {
      fetchLaterToDo(user?.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const _user = store.getState().auth.user;

    if (!_user) return;
    PortalSdk.getData(`/api/user/worklogs?userId=${_user.id}`, null)
      .then((data) => {
        // console.log(data);
        setYearLogData(data);

        // const _privateboard = data?.data?.workLogs.find(
        //   (wl: WorkLogs) => wl.logType === "privateLog"
        // );
        // setPrivateBoard(
        //   _privateboard ||
        //     WorkLogsHelper.defaultPrivateBoard(
        //       dayjs().month(monthTab).format("MM-YYYY"),
        //       _user
        //     )
        // );
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (!yearLogData) return;
    const _user = store.getState().auth.user;
    const _total_days_in_month = dayjs().month(monthTab).daysInMonth();
    const _logList = Array.from({
      length:
        monthTab != dayjs().month()
          ? _total_days_in_month
          : _total_days_in_month <= dayjs().date() + 2
            ? _total_days_in_month
            : dayjs().date() + 2,
    })
      .map((_, i) => {
        const _date = dayjs()
          .month(monthTab)
          .date(i + 1)
          .format('YYYY-MM-DD');
        const _worklog = yearLogData?.data?.workLogs.find(
          (wl: WorkLogs) => wl.date === _date,
        );
        return _worklog || WorkLogsHelper.defaultWorklogs(_date, _user);
      })
      .reverse();
    dispatch(setLogsList(_logList));
  }, [monthTab, yearLogData, dispatch]);

  const [selectedID, setSelectedID] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    dayjs().format('YYYY-MM-DD'),
  );
  const centerdate = useMemo(() => dayjs(selectedDate), [selectedDate]);

  // load default date id
  useEffect(() => {
    if (
      logsList.length > 0 &&
      !selectedID &&
      centerdate.isSame(dayjs(), 'date')
    ) {
      const _worklog = logsList.find(
        (wl) => wl.date === centerdate.format('YYYY-MM-DD'),
      );
      if (_worklog) {
        setSelectedID(_worklog.id);
      }
    }
  }, [logsList, centerdate, selectedID]);

  //if (!user?.workData) return null;
  const tabs = [
    { label: 'Tasks', content: <ClickupTasks email={user?.email as string} /> },
    { label: 'Tips', content: <WorklogTips /> },
    {
      label: (
        <div className="flex items-center gap-2 p-3">
          Todos for later
          {incompleteTodos > 0 && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
          )}
        </div>
      ),
      content: <TodoTab userId={user?.id as string} />,
    },
  ];

  const handleWorkLogItemClick = (data: WorkLogs, isEditorSaving: boolean) => {
    if (isEditorSaving) {
      toast.error('Save your Logs! (Ctrl+S)');
      return;
    }
    if (data.id?.trim().length > 0) {
      setSelectedID(data.id);
      if (data.date) setSelectedDate(data.date);
    } else if (data.date) {
      // console.log(data);
      setSelectedID(undefined);
      if (data.date) setSelectedDate(data.date);
    }
  };

  const isFutureMonth =
    monthTab > thisMonth || (monthTab === 0 && thisMonth === 11);

  const filteredLogs = isFutureMonth
    ? logsList.filter((data) => dayjs(data.date).month() === monthTab).slice(-4)
    : logsList.filter((data) => dayjs(data.date).month() === monthTab);

  const handleNextMonthClick = () => {
    setMonthTab((prevMonth) => {
      const nextMonth = (prevMonth + 1) % 12;
      const newDate = dayjs()
        .month(nextMonth)
        .startOf('month')
        .format('YYYY-MM-DD');
      setSelectedDate(newDate);
      return nextMonth;
    });
  };

  return (
    <div className="flex flex-col">
      <div className="fixed left-0 right-0 top-0 z-10 flex h-14 flex-row items-center justify-between gap-3 border-b border-neutral-400 bg-white px-3 py-2 md:left-4 md:pl-[6rem]">
        <div className="flex items-center">
          <Link href={APP_ROUTES.home}>
            <h1 className="mr-3 cursor-pointer whitespace-nowrap border-r-2 pr-3 text-sm font-extrabold md:text-lg">
              The Moon Devs
            </h1>
          </Link>
          <h1 className="font-regular hidden text-xs tracking-widest sm:block sm:text-sm">
            My Worklogs
          </h1>
        </div>
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <SummarizeButton userId={user?.id} />
          <Link
            className="hidden sm:block"
            href={`${APP_ROUTES.userWorklogSummary}/${
              user?.id
            }?year=${thisYear}&month=${dayjs().month(thisMonth).format('MM')}`}
          >
            <div className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[0.7rem] text-neutral-100 hover:bg-neutral-700 sm:gap-2 sm:px-3 sm:py-1 sm:text-sm">
              <span className="icon_size material-symbols-outlined">
                description
              </span>
              <span>{dayjs().format('MMMM')} Summary</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="scrollable_list">
        <div className="h-14"></div>
        <div className="custom-scrollbar z-[5] flex flex-row justify-between space-x-2 overflow-x-auto bg-neutral-100 px-2 py-3 md:p-2">
          {Array.from({ length: 12 }).map((_, month_tab: number) => (
            <div
              key={month_tab}
              onClick={() => setMonthTab(month_tab)}
              className={`flex-shrink-0 cursor-pointer rounded-3xl px-1 py-1 md:p-0 ${
                monthTab === month_tab ? 'border border-neutral-600' : ''
              }`}
            >
              <h4
                className={`text-xs md:text-sm lg:text-base ${
                  monthTab === month_tab
                    ? 'font-bold text-neutral-800'
                    : 'text-neutral-400'
                } p-1 md:p-2 lg:px-4`}
              >
                {dayjs().month(month_tab).format('MMMM')}
              </h4>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-row-reverse max-lg:flex-col">
          <div className="invisible hidden max-h-[80vh] w-[40%] overflow-y-scroll p-3 max-lg:w-full md:visible md:block">
            <WorklogBuff filteredLogs={filteredLogs} monthTab={monthTab} />
            <SimpleTabs tabs={tabs} />
          </div>
          <div className="invisible m-3 hidden max-h-[80vh] w-[50%] overflow-y-scroll rounded-lg border border-neutral-200 p-2 max-lg:w-full md:visible md:block">
            {/* {privateBoard && (
              <WorkLogItem
                key={
                  privateBoard.id +
                  "-" +
                  privateBoard.date +
                  "-" +
                  privateBoard.userId
                }
                data={privateBoard}
              />
            )} */}
            <WorklogView
              id={selectedID}
              date={centerdate.format('YYYY-MM-DD')}
              logType={'dayLog'}
              monthTab={monthTab}
              setMonthTab={setMonthTab}
              handleNextMonthClick={handleNextMonthClick}
            />
            <PrivateWorklogView
              date={centerdate.format('YYYY-MM-DD')}
              logType={'privateWorklogs'}
            />
          </div>
          <div className="m-3 grid max-h-[80vh] grid-cols-2 gap-3 overflow-y-scroll p-2 max-lg:grid-cols-4 max-md:grid-cols-2 lg:w-[30%]">
            {filteredLogs.map(
              (data) => (
                <WorkLogItem
                  isTabletOrMore={isTabletOrMore}
                  key={data.id + '-' + data.date + '-' + data.userId}
                  data={data}
                  selected={selectedDate === data.date}
                  onClick={() => handleWorkLogItemClick(data, isEditorSaving)}
                />
              ),
              //)
            )}
          </div>
        </div>
        {/* <div className="flex flex-col gap-3 h-[5rem]"></div> */}
      </div>
      <Toaster />
    </div>
  );
};
