"use client";

import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Fade } from "@mui/material";
import { User, WorkLogs } from "@prisma/client";
import dayjs from "dayjs";
import Link from "next/link";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import generatePDF from "react-to-pdf";
import { usePathname, useSearchParams } from "next/navigation";
import useOutsideClick from "@/utils/hooks/useOutsideClick";

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
      className={`px-4 py-1 ${
        isActive ? "cursor-pointer hover:bg-neutral-100" : "text-neutral-400"
      }`}
      onClick={() => handleMonthSelect(monthIndex)}
    >
      <Link
        key={monthIndex}
        href={`${pathName}?year=${selectedYear}&month=${dayjs()
          .month(monthIndex)
          .format("MM")}`}
      >
        {dayjs().month(monthIndex).format("MMM")}
      </Link>
    </td>
  );

  return (
    <Fade in={isMonthDropdownOpen} mountOnEnter unmountOnExit>
      <table className="flex flex-col gap-1 absolute top-10 shadow-lg rounded-md bg-white">
        <tbody>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <tr key={rowIndex} className="items-center !text-sm py-1">
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
      <div className="absolute top-10 flex flex-col gap-1 shadow-lg rounded-md bg-white">
        {yearArray.map((year) => (
          <Link
            href={
              onlyYearSummary
                ? `${pathName}?year=${year}`
                : `${pathName}?year=${year}&month=${dayjs()
                    .month(selectedMonth as number)
                    .format("MM")}`
            }
            key={year}
            className="flex gap-2 items-center !text-sm cursor-pointer hover:bg-neutral-100 px-4 py-1"
            onClick={() => handleYearSelectFromDropdown(year)}
          >
            <span>{dayjs().year(year).format("YYYY")}</span>
          </Link>
        ))}
      </div>
    </Fade>
  );
};

interface WorklogSummaryByUserIdProps {
  userId?: string;
  userData: User | null | undefined;
}

export const WorklogSummaryByUserId: React.FC<WorklogSummaryByUserIdProps> = ({
  userId,
  userData,
}) => {
  const searchParams = useSearchParams();
  const year = searchParams?.get("year");
  const month = searchParams?.get("month");

  const [selectedYear, setSelectedYear] = useState<number>(Number(year));
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    month ? Number(month) - 1 : null
  );
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] =
    useState<boolean>(false);
  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const [onlyYearSummary, setOnlyYearSummary] = useState<boolean>(!month);
  const pdfTargetRef = useRef(null);
  const pathName = usePathname();

  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  useOutsideClick([monthDropdownRef, yearDropdownRef], () => {
    setIsMonthDropdownOpen(false);
    setIsYearDropdownOpen(false);
  });

  const joiningDate = (userData?.workData as any)?.joining;
  const joiningYear = Number(dayjs(joiningDate).format("YYYY"));
  const joiningMonth = Number(dayjs(joiningDate).format("M")) - 1;
  const currentYear = Number(dayjs().format("YYYY"));
  const currentMonth = Number(dayjs().format("M"));

  const yearArray = useMemo(
    () =>
      Array.from(
        { length: currentYear - joiningYear + 1 },
        (_, i) => joiningYear + i
      ),
    [currentYear, joiningYear]
  );

  const fetchWorklogData = useCallback(
    async (query: {
      year: string | number | undefined | null;
      month?: string | number | undefined | null;
    }) => {
      try {
        const response = await PortalSdk.getData(
          `/api/user/worklogs/summary?userId=${userId}&year=${
            query.year
          }&month=${query.month || null}`,
          null
        );
        setWorklogSummary(response.data.workLogs);
      } catch (error) {
        console.error(error);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchWorklogData({ year, month });
  }, [fetchWorklogData, month, year]);

  const handleYearSelect = () => {
    setOnlyYearSummary(true);
    // fetchWorklogData({ year: selectedYear });
  };

  const handleYearSelectFromDropdown = (year: number) => {
    setSelectedYear(year);
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

  return (
    <div>
      <div className="fixed left-0 right-0 top-0 z-10 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-400 md:pl-[6rem]">
        <div className="flex items-center">
          <Link href={APP_ROUTES.home}>
            <h1 className="text-lg cursor-pointer font-bold border-r-2 pr-3 mr-3">
              The Moon Devs
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="tracking-widest text-sm font-regular">
              Worklog Summary
            </h1>
            <span className="material-symbols-outlined !text-neutral-400">
              chevron_right
            </span>
            <div className="flex gap-2 items-center !text-sm relative">
              <Link
                href={`${pathName}?year=${selectedYear}`}
                className={`${
                  onlyYearSummary ? "font-bold" : ""
                } cursor-pointer`}
                onClick={handleYearSelect}
              >
                {selectedYear || dayjs().format("YYYY")}
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
                className="material-symbols-outlined !text-base rounded-full border border-neutral-400 px-1 cursor-pointer hover:bg-neutral-100 scale-75"
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              >
                {isYearDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </div>
            <span className="material-symbols-outlined !text-neutral-400">
              chevron_right
            </span>
            <div className="flex gap-2 items-center !text-sm relative z-50">
              <Link
                href={
                  onlyYearSummary && selectedMonth !== null
                    ? `${pathName}?year=${selectedYear}&month=${dayjs()
                        .month(selectedMonth)
                        .format("MM")}`
                    : ""
                }
                className={`cursor-pointer ${
                  !onlyYearSummary ? "font-bold" : ""
                }`}
                onClick={() =>
                  onlyYearSummary &&
                  selectedMonth !== null &&
                  handleMonthSelect(selectedMonth)
                }
              >
                {selectedMonth !== null
                  ? dayjs().month(selectedMonth).format("MMM")
                  : dayjs().format("MMM")}
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
                className="material-symbols-outlined !text-base rounded-full border border-neutral-400 px-1 cursor-pointer hover:bg-neutral-100 scale-75"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              >
                {isMonthDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* LEFT SECTION */}
      <div className="h-screen divide-x-2 flex">
        <div
          className="w-[60%] p-10 pt-28 h-screen overflow-y-scroll"
          ref={pdfTargetRef}
        >
          <h1 className="text-2xl font-bold pb-8">
            {userData?.name?.split(" ")[0]}&apos;s Worklog Summary for{" "}
            {!onlyYearSummary && selectedMonth !== null
              ? `${dayjs().month(selectedMonth).format("MMM")}, `
              : ""}
            {selectedYear}
          </h1>
          {worklogSummary.length > 0 ? (
            <>
              {worklogSummary.map((worklog) => (
                <div key={worklog.title}>
                  <h1 className="text-xl font-bold">{worklog.title}</h1>
                  {worklog.works.map((work: any, index: number) => (
                    <div key={index}>
                      <MdxAppEditor
                        readOnly
                        key={work.id}
                        markdown={work?.content}
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
          )}
        </div>
        {/* LEFT SECTION ENDS */}
        {/* RIGHT SECTION */}
        <div className="flex flex-col mt-10 justify-between p-10">
          <div></div>
          <div className="flex flex-row gap-4">
            <button
              className="flex gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-4 py-2"
              onClick={() =>
                generatePDF(pdfTargetRef, {
                  filename: `worklog_summary_${userData?.name}.pdf`,
                })
              }
            >
              <span className="material-symbols-outlined">download</span>
              <span className="text-sm">Download as PDF</span>
            </button>
            <button className="flex gap-2 items-center border border-neutral-800 hover:bg-neutral-100 rounded-md px-4 py-2">
              <span className="material-symbols-outlined">analytics</span>
              <span className="text-sm">Breakdown</span>
            </button>
            <button className="flex gap-2 items-center border bg-neutral-900 text-white hover:bg-neutral-700 rounded-md px-4 py-2 ">
              <span className="">✨</span>
              <span className="text-sm">AI Summary</span>
            </button>
          </div>
        </div>
        {/* RIGHT SECTION ENDS */}
      </div>
    </div>
  );
};
