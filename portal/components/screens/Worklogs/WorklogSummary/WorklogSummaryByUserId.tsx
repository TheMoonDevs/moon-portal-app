"use client";

import { User } from "@prisma/client";
import dayjs from "dayjs";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { WorklogSummaryHeader } from "./WorklogSummaryHeader";
import { WorklogSummaryContent } from "./WorklogSummaryContent";

interface WorklogSummaryByUserIdProps {
  userId?: string;
  userData: User | null | undefined;
}

export const WorklogSummaryByUserId: React.FC<WorklogSummaryByUserIdProps> = ({
  userData,
}) => {
  const searchParams = useSearchParams();
  const year = searchParams?.get("year");
  const month = searchParams?.get("month");

  const [selectedYear, setSelectedYear] = useState<number>(Number(year));
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    month ? Number(month) - 1 : dayjs().month()
  );
  const [onlyYearSummary, setOnlyYearSummary] = useState<boolean>(!month);
  const joiningDate = (userData?.workData as any)?.joining;

  const summaryTitle = `${
    !onlyYearSummary && selectedMonth !== null
      ? `${dayjs().month(selectedMonth).format("MMM")}, `
      : ""
  } ${selectedYear}`;

  return (
    <div className="w-full">
      <WorklogSummaryHeader
        joiningDate={joiningDate}
        setOnlyYearSummary={setOnlyYearSummary}
        setSelectedYear={setSelectedYear}
        setSelectedMonth={setSelectedMonth}
        onlyYearSummary={onlyYearSummary}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
      <WorklogSummaryContent userData={userData} summaryTitle={summaryTitle} />
    </div>
  );
};
