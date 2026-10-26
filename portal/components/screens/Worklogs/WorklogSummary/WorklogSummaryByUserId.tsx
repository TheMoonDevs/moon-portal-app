'use client';

import type { User } from '@db/client';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

import { WorklogSummaryContent } from './WorklogSummaryContent';
import { WorklogSummaryHeader } from './WorklogSummaryHeader';

interface WorklogSummaryByUserIdProps {
  userId?: string;
  userData?: User | null;
}

/** Loads a person in the browser, where the request carries the session. */
const usePerson = (userId?: string) => {
  const [person, setPerson] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    if (!userId) return;
    setPerson(undefined);
    PortalSdk.getData(`/api/user?id=${encodeURIComponent(userId)}`, null)
      .then((res) => setPerson(res?.data?.user?.[0] ?? null))
      .catch(() => setPerson(null));
  }, [userId]);
  return person;
};

export const WorklogSummaryByUserId: React.FC<WorklogSummaryByUserIdProps> = ({
  userId,
  userData: givenUser,
}) => {
  const fetched = usePerson(userId);
  const userData = userId ? fetched : givenUser;
  const searchParams = useSearchParams();
  const yearParam = searchParams?.get('year');
  const monthParam = searchParams?.get('month');

  const year = yearParam ? Number(yearParam) : dayjs().year();
  const month = monthParam ? Number(monthParam) - 1 : dayjs().month();

  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(month);

  const [onlyYearSummary, setOnlyYearSummary] = useState<boolean>(!month);
  const joiningDate = userData?.createdAt;

  const summaryTitle = `${
    !onlyYearSummary && selectedMonth !== null
      ? `${dayjs().month(selectedMonth).format('MMM')}, `
      : ''
  } ${selectedYear}`;

  return (
    <div className="w-full overflow-y-hidden">
      <WorklogSummaryHeader
        person={userData}
        joiningDate={joiningDate}
        setOnlyYearSummary={setOnlyYearSummary}
        setSelectedYear={setSelectedYear}
        setSelectedMonth={setSelectedMonth}
        onlyYearSummary={onlyYearSummary}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
      {userId && userData === null ? (
        <p className="p-10 text-center text-sm text-neutral-500">
          We couldn&apos;t find this person, or you don&apos;t have access to
          their worklogs.
        </p>
      ) : (
        <WorklogSummaryContent
          onlyYearSummary={onlyYearSummary}
          userData={userData}
          summaryTitle={summaryTitle}
        />
      )}
    </div>
  );
};
