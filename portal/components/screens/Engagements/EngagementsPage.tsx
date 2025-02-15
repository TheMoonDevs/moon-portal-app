'use client';
import { Spinner } from '@/components/elements/Loaders';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Engagement } from '@prisma/client';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

const EngagementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [activeEngagement, setActiveEngagement] = useState<Engagement | null>(
    null,
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData('/api/engagement', null);
      setEngagements(res.data);
      setActiveEngagement(res.data[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="fixed left-0 right-0 top-0 z-10 flex h-14 flex-row items-center justify-between gap-3 border-b border-neutral-400 bg-white px-3 py-2 md:left-4 md:pl-[6rem]">
        <div className="flex items-center">
          <Link href={APP_ROUTES.home}>
            <h1 className="mr-3 cursor-pointer whitespace-nowrap border-r-2 pr-3 text-sm font-extrabold md:text-lg">
              The Moon Devs
            </h1>
          </Link>
          <h1 className="font-regular hidden text-xs tracking-widest sm:block sm:text-sm">
            Engagements Logs
          </h1>
        </div>
      </div>
      <div className="h-14"></div>
      <div className="flex max-h-[80vh] w-full items-start gap-2 p-2">
        <div className="flex max-h-[80vh] w-1/4 flex-col gap-2 overflow-y-scroll">
          {/* box 1 */}
          {loading ? (
            <div className="flex h-screen w-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flwx flex flex-col gap-2 py-2">
              {engagements.map((engagement) => (
                <div
                  key={engagement.id}
                  className={`w-full cursor-pointer rounded-xl border border-neutral-300 bg-white p-4 shadow-sm transition hover:shadow-md ${
                    activeEngagement?.id === engagement.id
                      ? 'border-neutral-500 bg-neutral-100'
                      : ''
                  }`}
                  onClick={() => setActiveEngagement(engagement)}
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <h3 className="text-base font-medium text-neutral-800">
                      {engagement.title}
                    </h3>
                    <span className="material-symbols-outlined text-neutral-500">
                      chevron_right
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-1 pt-3 text-neutral-700">
                    <p className="text-md font-semibold">
                      {engagement.engagementType === 'FIXED'
                        ? `${engagement.progressPercentage}%`
                        : `${engagement.numberOfHours}Hrs`}
                    </p>
                    <p className="text-xs">
                      {dayjs(engagement.startDate).format('DD MMM YYYY')} to{' '}
                      {engagement.endDate
                        ? dayjs(engagement.endDate).format('DD MMM YYYY')
                        : '---'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-1/2">
          {' '}
          {activeEngagement ? (
            <div>
              <h2 className="text-lg font-semibold">Active Engagement</h2>
              <p className="mt-2 text-xl font-bold">{activeEngagement.title}</p>
              <p className="text-sm text-gray-600">
                {dayjs(activeEngagement.startDate).format('DD MMM YYYY')} to
                {activeEngagement.endDate
                  ? dayjs(activeEngagement.endDate).format('DD MMM YYYY')
                  : '---'}
              </p>
            </div>
          ) : (
            <p>No active engagement selected</p>
          )}
        </div>
        <div className="w-1/4">Box 3</div>
      </div>
    </div>
  );
};

export default EngagementsPage;
