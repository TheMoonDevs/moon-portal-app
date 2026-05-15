'use client';
import type { User } from '@db/client';
import { USERROLE, USERTYPE } from '@db/client';
import { Fade } from '@mui/material';
import dayjs from 'dayjs';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import useOutsideClick from '@/utils/hooks/useOutsideClick';
import { setMembers } from '@/utils/redux/coreTeam/coreTeam.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

interface MonthTableProps {
  selectedYear: number;
  joiningYear: number;
  joiningMonth: number;
  currentMonth: number;
  handleMonthSelect: (month: number) => void;
  isMonthDropdownOpen: boolean;
}

const MonthTable: React.FC<MonthTableProps> = ({
  selectedYear,
  joiningYear,
  joiningMonth,
  currentMonth,
  handleMonthSelect,
  isMonthDropdownOpen,
}) => {
  const pathName = usePathname();
  const renderCell = (monthIndex: number, isActive: boolean) => (
    <td
      key={monthIndex}
      className={`h-8 ${
        isActive ? 'cursor-pointer hover:bg-neutral-100' : 'text-neutral-400'
      }`}
    >
      {isActive ? (
        <div onClick={() => handleMonthSelect(monthIndex)}>
          <Link
            key={monthIndex}
            className="p-4"
            href={`${pathName}?year=${selectedYear}&month=${dayjs()
              .month(monthIndex)
              .format('MM')}`}
          >
            {dayjs().month(monthIndex).format('MMM')}
          </Link>
        </div>
      ) : (
        <div className="px-4">{dayjs().month(monthIndex).format('MMM')}</div>
      )}
    </td>
  );

  return (
    <Fade in={isMonthDropdownOpen} mountOnEnter unmountOnExit>
      <table className="absolute right-0 top-10 z-20 flex flex-col gap-1 rounded-md bg-white shadow-lg sm:right-[unset]">
        <tbody>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <tr key={rowIndex} className="items-center py-1 !text-sm">
              {Array.from({ length: 3 }, (_, colIndex) => {
                const monthIndex = rowIndex * 3 + colIndex;
                const isCurrentYear = selectedYear === joiningYear;
                const isActive = isCurrentYear
                  ? monthIndex >= joiningMonth && monthIndex <= currentMonth - 1
                  : monthIndex <= currentMonth - 1;

                return renderCell(monthIndex, isActive);
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Fade>
  );
};

interface YearDropdownProps {
  yearArray: number[];
  handleYearSelectFromDropdown: (year: number) => void;
  isYearDropdownOpen: boolean;
  onlyYearSummary: boolean;
  selectedMonth: number | null;
}

const YearDropdown: React.FC<YearDropdownProps> = ({
  yearArray,
  handleYearSelectFromDropdown,
  isYearDropdownOpen,
  onlyYearSummary,
  selectedMonth,
}) => {
  const pathName = usePathname();
  return (
    <Fade in={isYearDropdownOpen} mountOnEnter unmountOnExit>
      <div className="absolute top-10 z-20 flex flex-col gap-1 rounded-md bg-white shadow-lg">
        {yearArray.map((year) => (
          <Link
            href={
              onlyYearSummary
                ? `${pathName}?year=${year}`
                : `${pathName}?year=${year}&month=${dayjs()
                    .month(selectedMonth as number)
                    .format('MM')}`
            }
            key={year}
            className="flex cursor-pointer items-center gap-2 px-4 py-1 !text-sm hover:bg-neutral-100"
            onClick={() => handleYearSelectFromDropdown(year)}
          >
            <span>{dayjs().year(year).format('YYYY')}</span>
          </Link>
        ))}
      </div>
    </Fade>
  );
};

const SelectUser = ({
  isSelectOpen,
  setIsSelectOpen,
  coreTeam,
}: {
  isSelectOpen: boolean;
  setIsSelectOpen: React.Dispatch<React.SetStateAction<boolean>>;
  coreTeam: User[];
}) => {
  return (
    <div className="relative">
      <button
        className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-400 bg-white px-4 py-2 text-sm shadow-lg transition-colors duration-300 hover:bg-neutral-100"
        onClick={() => setIsSelectOpen(!isSelectOpen)}
      >
        <span className="font-medium">Select Team Member</span>
        <span
          className={`material-symbols-outlined transition-transform duration-300 ${
            isSelectOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          {isSelectOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      <div
        className={`absolute left-0 top-full z-20 w-full rounded-md border border-neutral-400 bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isSelectOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="no-scrollbar max-h-60 overflow-y-auto">
          {coreTeam.map((user: User) => (
            <Link
              href={`${APP_ROUTES.userWorklogSummary}/${user.id}`}
              key={user.id}
              onClick={() => setIsSelectOpen(false)}
              className="block w-full px-4 py-2 text-left text-xs transition-colors duration-300 hover:bg-neutral-100 focus:bg-neutral-100"
            >
              {user.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

interface WorklogSummaryHeaderProps {
  joiningDate: Date;
  setOnlyYearSummary: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number | null>>;
  onlyYearSummary: boolean;
  selectedMonth: number | null;
  selectedYear: number;
}
export const WorklogSummaryHeader = ({
  joiningDate,
  setOnlyYearSummary,
  setSelectedYear,
  setSelectedMonth,
  onlyYearSummary,
  selectedMonth,
  selectedYear,
}: WorklogSummaryHeaderProps) => {
  const dispatch = useAppDispatch();
  const pathName = usePathname();
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] =
    useState<boolean>(false);
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  const joiningYear = Number(dayjs(joiningDate).format('YYYY'));
  const joiningMonth = Number(dayjs(joiningDate).format('M')) - 1;
  const currentYear = Number(dayjs().format('YYYY'));
  const currentMonth = Number(dayjs().format('M'));
  const coreTeam = useAppSelector((state: RootState) => state.coreTeam.members);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  useOutsideClick([monthDropdownRef, yearDropdownRef], () => {
    setIsMonthDropdownOpen(false);
    setIsYearDropdownOpen(false);
  });

  const yearArray = useMemo(
    () =>
      Array.from(
        { length: currentYear - joiningYear + 1 },
        (_, i) => joiningYear + i,
      ),
    [currentYear, joiningYear],
  );
  const handleYearSelect = () => {
    setOnlyYearSummary(true);
    // fetchWorklogData({ year: selectedYear });
  };

  const handleYearSelectFromDropdown = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth((prev) => prev);
    // fetchWorklogData({
    //   year: year,
    //   month:
    //     !onlyYearSummary && selectedMonth !== null
    //       ? dayjs().month(selectedMonth).format("MM")
    //       : null,
    // });
  };

  const handleMonthSelect = (month: number) => {
    setOnlyYearSummary(false);
    setSelectedMonth(month);
    // fetchWorklogData({
    //   year: selectedYear,
    //   month: dayjs().month(month).format("MM"),
    // });
  };

  useEffect(() => {
    if (coreTeam.length === 0) {
      PortalSdk.getData(
        '/api/user?role=' +
          USERROLE.CORETEAM +
          '&userType=' +
          USERTYPE.MEMBER +
          '&status=ACTIVE',
        null,
      )
        .then((data) => {
          dispatch(setMembers(data?.data?.user));
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [dispatch, coreTeam.length]);

  return (
    <div className="flex flex-row items-center justify-between gap-3 border-neutral-400 bg-white px-3 py-4 max-sm:w-full max-sm:flex-col max-sm:items-start max-sm:gap-4">
      <div className="flex w-full items-center justify-between sm:w-[unset] sm:justify-start">
        <Link href={APP_ROUTES.home} className="flex items-center">
          <h1 className="mr-3 hidden cursor-pointer whitespace-nowrap border-r-2 pr-3 text-sm font-extrabold sm:block md:text-lg">
            The Moon Devs
          </h1>
          <Image
            src="/logo/logo.png"
            width={30}
            height={30}
            alt="logo"
            className="mr-3 aspect-square w-6"
          />
        </Link>
        <div className="flex items-center pr-10 sm:gap-4">
          <h1 className="font-regular ml-1 whitespace-nowrap text-sm md:text-base md:tracking-widest">
            Worklog Summary
          </h1>
          <span className="material-symbols-outlined !text-neutral-400">
            chevron_right
          </span>
          <div className="!text-md relative flex items-center gap-1 sm:gap-2">
            <Link
              href={`${pathName}?year=${selectedYear}`}
              className={`${onlyYearSummary ? 'font-bold' : ''} cursor-pointer`}
              onClick={handleYearSelect}
            >
              {selectedYear || dayjs().format('YYYY')}
            </Link>
            <div ref={yearDropdownRef}>
              <YearDropdown
                yearArray={yearArray}
                handleYearSelectFromDropdown={handleYearSelectFromDropdown}
                isYearDropdownOpen={isYearDropdownOpen}
                onlyYearSummary={onlyYearSummary}
                selectedMonth={selectedMonth}
              />
            </div>
            <span
              className="material-symbols-outlined scale-75 cursor-pointer rounded-full border border-neutral-400 px-1 !text-base hover:bg-neutral-100"
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            >
              {isYearDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </div>
          <span className="material-symbols-outlined !text-neutral-400">
            chevron_right
          </span>
          <div className="!text-md z-50 flex items-center gap-1 sm:relative sm:gap-2">
            <Link
              href={
                onlyYearSummary && selectedMonth !== null
                  ? `${pathName}?year=${selectedYear}&month=${dayjs()
                      .month(selectedMonth)
                      .format('MM')}`
                  : ''
              }
              className={`cursor-pointer ${
                !onlyYearSummary ? 'font-bold' : ''
              }`}
              onClick={() =>
                onlyYearSummary &&
                selectedMonth !== null &&
                handleMonthSelect(selectedMonth)
              }
            >
              {selectedMonth !== null
                ? dayjs().month(selectedMonth).format('MMM')
                : dayjs().format('MMM')}
            </Link>
            <div ref={monthDropdownRef}>
              <MonthTable
                selectedYear={selectedYear}
                joiningYear={joiningYear}
                joiningMonth={joiningMonth}
                currentMonth={currentMonth}
                handleMonthSelect={handleMonthSelect}
                isMonthDropdownOpen={isMonthDropdownOpen}
              />
            </div>
            <span
              className="material-symbols-outlined scale-75 cursor-pointer rounded-full border border-neutral-400 px-1 !text-base hover:bg-neutral-100"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            >
              {isMonthDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>
      </div>
      {coreTeam.length > 0 && (
        <SelectUser
          isSelectOpen={isSelectOpen}
          setIsSelectOpen={setIsSelectOpen}
          coreTeam={coreTeam}
        />
      )}
    </div>
  );
};
