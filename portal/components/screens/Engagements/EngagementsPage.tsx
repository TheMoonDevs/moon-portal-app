'use client';
import { Spinner } from '@/components/elements/Loaders';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Engagement, User, USERROLE, USERTYPE, WorkLogs } from '@prisma/client';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import EngagementWorklogs from './Worklogs';
import EngagementHeader from './EngagementHeader';
import { EngagementTeam } from './EngagementTeam';
import EngagementsList from './EngagementsList';

const EngagementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [activeEngagement, setActiveEngagement] = useState<Engagement | null>(
    null,
  );
  const [workLogs, setWorkLogs] = useState<WorkLogs[]>([]);
  const [workLogsLoading, setWorkLogsLoading] = useState(false);
  const pdfTargetRef = useRef(null);
  const [team, setTeam] = useState<User[]>([]);

  const fetchWorklogs = async () => {
    setWorkLogsLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/engagement/worklogs?engagementId=${activeEngagement?.id}&startDate=${activeEngagement?.startDate}&endDate=${activeEngagement?.endDate}`,
        null,
      );
      setWorkLogs(res.data.workLogs);
    } catch (error) {
      console.log(error);
    } finally {
      setWorkLogsLoading(false);
    }
  };

  const fetchEngagements = async () => {
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
    PortalSdk.getData(
      '/api/user?role=' +
        USERROLE.CORETEAM +
        '&userType=' +
        USERTYPE.MEMBER +
        '&status=ACTIVE&cache=true',
      null,
    )
      .then((data) => {
        setTeam(data?.data?.user);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    fetchEngagements();
  }, []);

  useEffect(() => {
    if (activeEngagement) {
      fetchWorklogs();
    }
  }, [activeEngagement?.id]);

  return (
    <div className="flex flex-col items-center gap-2 overflow-y-hidden">
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
      <div className="flex max-h-[90vh] w-full items-start gap-2 p-2">
        <div className="flex max-h-[90vh] w-1/4 flex-col gap-2 overflow-y-scroll">
          {/* box 1 */}
          {loading ? (
            <div className="flex h-screen w-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              <EngagementsList
                engagements={engagements}
                activeEngagement={activeEngagement}
                setActiveEngagement={setActiveEngagement}
                team={team}
              />
            </div>
          )}
        </div>
        {/* box 2 */}
        <div
          className={`${workLogs.length === 0 && 'h-[80vh]'} max-h-[90vh] w-1/2 rounded-lg border border-neutral-200`}
        >
          {!loading &&
            (workLogsLoading ? (
              <div className="flex h-screen w-full items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div
                className="custom-scrollbar max-h-[90vh] overflow-y-scroll"
                ref={pdfTargetRef}
              >
                {/* header */}
                <EngagementHeader
                  workLogs={workLogs}
                  activeEngagement={activeEngagement}
                  team={team}
                  pdfTargetRef={pdfTargetRef}
                />
                {/* worklogs */}
                <div className="py-6">
                  <EngagementWorklogs
                    workLogs={workLogs}
                    loading={loading}
                    workLogsLoading={workLogsLoading}
                    team={team}
                  />
                </div>
              </div>
            ))}
        </div>
        <div className="w-1/4">Box 3</div>
      </div>
    </div>
  );
};

export default EngagementsPage;
