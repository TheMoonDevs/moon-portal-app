'use client';
import { Spinner } from '@/components/elements/Loaders';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Engagement, User, USERROLE, USERTYPE, WorkLogs } from '@prisma/client';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import ToolTip from '@/components/elements/ToolTip';
import generatePDF, { Margin } from 'react-to-pdf';
import { Avatar, AvatarGroup } from '@mui/material';

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
        <div className="max-h-[90vh] w-1/2">
          {!loading &&
            (workLogsLoading ? (
              <div className="flex h-screen w-full items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="max-h-[90vh] overflow-y-scroll">
                <div className="sticky top-0 z-10 flex items-center justify-start gap-4 bg-white p-8 py-4 shadow-md max-sm:px-2 max-sm:py-4">
                  <div>
                    <p className="text-xl font-bold max-sm:text-lg">
                      {activeEngagement?.title}
                    </p>
                    <div className="flex items-center gap-2 max-sm:gap-1">
                      {/* <p className="text-sm font-regular">
                    Worklog Summary
                  </p> */}
                      <ToolTip title="Download Worklog">
                        <button
                          disabled={!workLogs.length}
                          className="flex items-center gap-1 border-b border-transparent text-sm hover:border-neutral-500 disabled:cursor-not-allowed"
                          onClick={() =>
                            generatePDF(pdfTargetRef, {
                              method: 'open',
                              filename: `worklog_summary_${activeEngagement?.title}.pdf`,
                              page: { margin: Margin.LARGE },
                            })
                          }
                        >
                          <span className="material-symbols-outlined !text-sm">
                            download
                          </span>
                          <span>Download Summary as PDF</span>
                        </button>
                      </ToolTip>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <AvatarGroup max={4}>
                      {team
                        .filter((user) =>
                          activeEngagement?.developer_ids?.includes(user.id),
                        )
                        .map((user) => (
                          <ToolTip key={user.id} title={user.name || ''}>
                            <Avatar
                              src={user.avatar || '/images/avatar.png'}
                              alt={user.name || ''}
                            />
                          </ToolTip>
                        ))}
                    </AvatarGroup>
                  </div>
                </div>
                <div className="py-6">
                  {workLogs.length > 0 ? (
                    workLogs.map((workLog) => {
                      return (
                        <div key={workLog.id}>
                          {workLog.works?.map((work) => {
                            return (
                              <div
                                key={workLog.id}
                                className="mx-4 my-2 rounded-lg bg-white px-4"
                              >
                                <h1 className="flex items-center gap-2 text-base font-semibold uppercase tracking-[1.5px] text-gray-800">
                                  {team
                                    .filter(
                                      (user) => user.id === workLog.userId,
                                    )
                                    .map((user) => (
                                      <ToolTip
                                        key={user.id}
                                        title={`${user.name} | ${user.vertical}`}
                                      >
                                        <img
                                          key={user.id}
                                          src={
                                            user.avatar || '/images/avatar.png'
                                          }
                                          alt={user.name || ''}
                                          className="h-8 w-8 cursor-pointer rounded-full object-cover"
                                        />
                                      </ToolTip>
                                    ))}
                                  {workLog.title}
                                </h1>

                                <MdxAppEditor
                                  readOnly
                                  markdown={
                                    typeof work === 'object' &&
                                    work !== null &&
                                    'content' in work
                                      ? ((work.content as string) ?? '')
                                      : ''
                                  }
                                  contentEditableClassName="summary_mdx flex flex-col gap-4 z-1"
                                  editorKey={'engagement-mdx'}
                                  className="z-1"
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center py-6">
                      <p className="text-neutral-500">
                        {workLogsLoading
                          ? 'Loading work logs...'
                          : loading
                            ? 'Loading engagements...'
                            : workLogs.length === 0 && 'No work logs found'}
                      </p>
                    </div>
                  )}
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
