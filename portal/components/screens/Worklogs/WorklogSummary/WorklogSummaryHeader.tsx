'use client';
import type { User } from '@db/client';
import { Fade } from '@mui/material';
import dayjs from 'dayjs';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import useOutsideClick from '@/utils/hooks/useOutsideClick';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { UserAvatar } from '../../Admin/shared/AdminUI';

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
  person,
}: {
  isSelectOpen: boolean;
  setIsSelectOpen: React.Dispatch<React.SetStateAction<boolean>>;
  coreTeam: User[];
  person?: User | null;
}) => {
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  useOutsideClick([ref], () => setIsSelectOpen(false));

  const matches = coreTeam.filter((u) =>
    `${u.name ?? ''} ${u.positionTitle ?? ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <div ref={ref} className="relative w-full sm:w-64">
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors duration-300 hover:bg-neutral-100"
        onClick={() => setIsSelectOpen(!isSelectOpen)}
      >
        <UserAvatar src={person?.avatar} name={person?.name} size={24} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">
          {person?.name ?? 'Select a teammate'}
        </span>
        <span className="text-xs text-neutral-400">Switch</span>
        <span
          className={`material-symbols-outlined !text-lg transition-transform duration-300 ${
            isSelectOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          expand_more
        </span>
      </button>
      {isSelectOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="w-full border-b border-neutral-200 px-3 py-2 text-sm outline-none"
          />
          <div className="no-scrollbar max-h-72 overflow-y-auto">
            {matches.map((user: User) => (
              <Link
                href={`${APP_ROUTES.userWorklogSummary}/${user.id}`}
                key={user.id}
                onClick={() => setIsSelectOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-300 hover:bg-neutral-100 ${
                  user.id === person?.id ? 'bg-neutral-100 font-semibold' : ''
                }`}
              >
                <UserAvatar src={user.avatar} name={user.name} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{user.name}</span>
                  {user.positionTitle && (
                    <span className="block truncate text-xs text-neutral-500">
                      {user.positionTitle}
                    </span>
                  )}
                </span>
              </Link>
            ))}
            {matches.length === 0 && (
              <p className="p-3 text-xs text-neutral-500">
                No one found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface WorklogSummaryHeaderProps {
  person?: User | null;
  joiningDate?: Date | string | null;
  setOnlyYearSummary: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number | null>>;
  onlyYearSummary: boolean;
  selectedMonth: number | null;
  selectedYear: number;
}
export const WorklogSummaryHeader = ({
  person,
  joiningDate,
  setOnlyYearSummary,
  setSelectedYear,
  setSelectedMonth,
  onlyYearSummary,
  selectedMonth,
  selectedYear,
}: WorklogSummaryHeaderProps) => {
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
  const [coreTeam, setCoreTeam] = useState<User[]>([]);
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
    PortalSdk.getData('/api/user?status=ACTIVE', null)
      .then((data) => setCoreTeam(data?.data?.user ?? []))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="flex flex-row items-center justify-between gap-3 border-neutral-400 bg-white px-3 py-4 max-sm:w-full max-sm:flex-col max-sm:items-start max-sm:gap-4">
      <div className="flex w-full items-center justify-between sm:w-[unset] sm:justify-start">
        <Link href={APP_ROUTES.home} className="flex items-center">
          <h1 className="mr-3 hidden cursor-pointer whitespace-nowrap border-r-2 pr-3 text-sm font-extrabold sm:block md:text-lg">
            PORTAL
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
          person={person}
        />
      )}
    </div>
  );
};
