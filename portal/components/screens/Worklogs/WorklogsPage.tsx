'use client';

import type { WorkLogs } from '@db/client';
import { useMediaQuery } from '@mui/material';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';

import SimpleTabs from '@/components/elements/Tabs';
import media from '@/styles/media';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setCompletedTodos,
  setIncompleteTodos,
  setTodoMarkdown,
} from '@/utils/redux/worklogs/laterTodos.slice';
import { setLogsList } from '@/utils/redux/worklogs/worklogs.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { carryOpenPoints, WorkLogsHelper } from './WorklogsHelper';
import TodoTab from './WorklogTabs/TodoTab';
import WorklogBuff from './WorklogTabs/WorklogBuff';
import WorklogTips from './WorklogTabs/WorklogTips';
import { WorklogView } from './WorklogView';

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
  onClick: () => void;
  selected: boolean;
  isTabletOrMore: boolean;
}) => {
  const isToday = dayjs(data.date).isSame(dayjs(), 'date');
  const isPast = dayjs(data.date).isBefore(dayjs(), 'date');
  const isFuture = dayjs(data.date).isAfter(dayjs(), 'date');
  const isEmpty = data.id === '';

  const borderClass = selected
    ? 'border-2 border-neutral-900 bg-white'
    : isToday
      ? 'border-2 border-blue-400'
      : isPast
        ? isEmpty
          ? 'border-2 border-red-400'
          : 'border-2 border-green-500'
        : 'border-neutral-200';

  const iconClass = isToday
    ? 'text-blue-500 animate-pulse'
    : isFuture
      ? isEmpty
        ? 'text-neutral-500'
        : 'text-green-500'
      : isEmpty
        ? 'text-red-500'
        : 'text-green-500';

  const iconType = isToday
    ? 'radio_button_checked'
    : isFuture
      ? isEmpty
        ? 'add_box'
        : 'checklist'
      : isEmpty
        ? 'pending'
        : 'checklist';

  const className = `flex min-h-[150px] flex-col gap-3 overflow-y-hidden rounded-lg border p-3 text-left ${borderClass}`;
  const body = (
    <>
      <div
        className={`flex justify-between ${selected ? 'font-bold text-black' : 'font-regular text-neutral-800'}`}
      >
        <h1 className="text-xs">{data.title}</h1>
        {data.logType === 'dayLog' && (
          <span className={`icon_size material-symbols-outlined ${iconClass}`}>
            {iconType}
          </span>
        )}
      </div>

      <div className="flex max-h-[100px] min-h-[100px] flex-col p-1">
        {!isEmpty ? (
          data.works.map((point: any, index: number) => {
            if (!point) return null;
            return (
              <div
                key={`${point.link_id}-${index}`}
                className="flex flex-row items-center"
              >
                <MdxAppEditor
                  key={point.id}
                  editorKey={point.id}
                  markdown={point.content}
                  readOnly
                  contentEditableClassName="mdx_ce_min leading-0 imp-p-0 grow w-full h-full line-clamp-4"
                />
              </div>
            );
          })
        ) : (
          <p className="text-sm text-neutral-300">
            Tap to jot down your logs...
          </p>
        )}
      </div>
    </>
  );

  // On wider screens the day opens beside the list; on phones it opens its
  // own page.
  return isTabletOrMore ? (
    <button
      type="button"
      data-date={data.date}
      className={className}
      onClick={onClick}
    >
      {body}
    </button>
  ) : (
    <Link href={linkForWorkLog(data)} className={className} onClick={onClick}>
      {body}
    </Link>
  );
};
export const WorklogsPage = () => {
  const { user } = useUser();

  const thisMonth = dayjs().month();
  const dispatch = useAppDispatch();
  const { todoMarkdown, incompleteTodos } = useAppSelector(
    (state) => state.laterTodos,
  );
  const [monthTab, setMonthTab] = useState<number>(thisMonth);
  const logsList = useAppSelector((state) => state.worklogs.logsList);
  const [yearLogData, setYearLogData] = useState<any>();
  const isTabletOrMore = useMediaQuery(media.moreTablet);

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
    if (!user?.id) return;
    carryOpenPoints()
      .then(() =>
        PortalSdk.getData(`/api/user/worklogs?userId=${user.id}`, null),
      )
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
  }, [user?.id]);

  useEffect(() => {
    if (!yearLogData || !user) return;
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
        return _worklog || WorkLogsHelper.defaultWorklogs(_date, user);
      })
      .reverse();
    dispatch(setLogsList(_logList));
  }, [monthTab, yearLogData, dispatch, user]);

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
    {
      label: (
        <div className="flex items-center gap-2 p-3">
          Todos
          {incompleteTodos > 0 && (
            <div className="size-2 animate-pulse rounded-full bg-blue-500"></div>
          )}
        </div>
      ),
      content: <TodoTab userId={user?.id as string} />,
    },
    { label: 'Tips', content: <WorklogTips /> },
  ];

  // Switching days is always allowed: the editor saves anything pending for
  // the day it leaves before the next day opens.
  const selectDate = (date: string) => {
    setSelectedID(undefined);
    setSelectedDate(date);
    setMonthTab(dayjs(date).month());
  };

  const handleWorkLogItemClick = (data: WorkLogs) => {
    if (data.date) selectDate(data.date);
  };

  const prevDay = centerdate.subtract(1, 'day');
  const nextDay = centerdate.add(1, 'day');
  // The month tabs only cover this year.
  const canGoPrev = prevDay.isSame(dayjs(), 'year');
  const canGoNext = nextDay.isSame(dayjs(), 'year');

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-date="${selectedDate}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedDate, logsList]);

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
      <div className="fixed inset-x-0 top-0 z-10 flex h-14 flex-row items-center justify-between gap-3 border-b border-neutral-400 bg-white px-3 py-2 md:left-4 md:pl-16">
        <div className="flex items-center">
          <Link href={APP_ROUTES.home}>
            <h1 className="mr-3 cursor-pointer whitespace-nowrap border-r-2 pr-3 text-sm font-extrabold md:text-lg">
              PORTAL
            </h1>
          </Link>
          <h1 className="font-regular hidden text-xs tracking-widest sm:block sm:text-sm">
            My Worklogs
          </h1>
        </div>
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <Link href={APP_ROUTES.user}>
            <div className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[0.7rem] text-neutral-100 hover:bg-neutral-700 sm:gap-2 sm:px-3 sm:py-1 sm:text-sm">
              <span className="icon_size material-symbols-outlined">
                insights
              </span>
              <span>My page</span>
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
              onClick={() => {
                setMonthTab(month_tab);
                setSelectedID(undefined);
                setSelectedDate(
                  dayjs()
                    .month(month_tab)
                    .startOf('month')
                    .format('YYYY-MM-DD'),
                );
              }}
              className={`shrink-0 cursor-pointer rounded-3xl p-1 md:p-0 ${
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
          <div className="invisible hidden max-h-[80vh] w-2/5 overflow-y-scroll p-3 max-lg:w-full md:visible md:block">
            <WorklogBuff month={dayjs().month(monthTab).format('YYYY-MM')} />
            <SimpleTabs tabs={tabs} />
          </div>
          <div className="invisible m-3 hidden max-h-[80vh] w-[50%] overflow-y-scroll rounded-lg border border-neutral-200 p-2 max-lg:w-full md:visible md:block">
            <WorklogView
              id={selectedID}
              date={centerdate.format('YYYY-MM-DD')}
              logType={'dayLog'}
              monthTab={monthTab}
              setMonthTab={setMonthTab}
              handleNextMonthClick={handleNextMonthClick}
              onPrevDay={
                canGoPrev
                  ? () => selectDate(prevDay.format('YYYY-MM-DD'))
                  : undefined
              }
              onNextDay={
                canGoNext
                  ? () => selectDate(nextDay.format('YYYY-MM-DD'))
                  : undefined
              }
            />
          </div>
          <div
            ref={listRef}
            className="m-3 grid max-h-[80vh] grid-cols-2 gap-3 overflow-y-scroll p-2 max-lg:grid-cols-4 max-md:grid-cols-2 lg:w-[30%]"
          >
            {filteredLogs.map(
              (data) => (
                <WorkLogItem
                  isTabletOrMore={isTabletOrMore}
                  key={data.id + '-' + data.date + '-' + data.userId}
                  data={data}
                  selected={selectedDate === data.date}
                  onClick={() => handleWorkLogItemClick(data)}
                />
              ),
              //)
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};
