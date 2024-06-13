import { APP_ROUTES } from "@/utils/constants/appInfo";
import useOutsideClick from "@/utils/hooks/useOutsideClick";
import { Fade } from "@mui/material";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";

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
        isActive ? "cursor-pointer hover:bg-neutral-100" : "text-neutral-400"
      }`}
    >
      {isActive ? (
        <div onClick={() => handleMonthSelect(monthIndex)}>
          <Link
            key={monthIndex}
            className="px-4 py-4"
            href={`${pathName}?year=${selectedYear}&month=${dayjs()
              .month(monthIndex)
              .format("MM")}`}
          >
            {dayjs().month(monthIndex).format("MMM")}
          </Link>
        </div>
      ) : (
        <div className="px-4">{dayjs().month(monthIndex).format("MMM")}</div>
      )}
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
  const pathName = usePathname();
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] =
    useState<boolean>(false);
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  const joiningYear = Number(dayjs(joiningDate).format("YYYY"));
  const joiningMonth = Number(dayjs(joiningDate).format("M")) - 1;
  const currentYear = Number(dayjs().format("YYYY"));
  const currentMonth = Number(dayjs().format("M"));

  useOutsideClick([monthDropdownRef, yearDropdownRef], () => {
    setIsMonthDropdownOpen(false);
    setIsYearDropdownOpen(false);
  });

  const yearArray = useMemo(
    () =>
      Array.from(
        { length: currentYear - joiningYear + 1 },
        (_, i) => joiningYear + i
      ),
    [currentYear, joiningYear]
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
  return (
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
              className={`${onlyYearSummary ? "font-bold" : ""} cursor-pointer`}
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
  );
};
