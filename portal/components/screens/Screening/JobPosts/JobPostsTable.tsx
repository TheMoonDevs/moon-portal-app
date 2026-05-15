import type { JobPost } from '@db/client';
import { JOBSTATUS } from '@db/client';
import { Skeleton, Tooltip } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import { prettyPrintDateInMMMDD } from '@/utils/helpers/prettyprint';
import { PortalSdk } from '@/utils/services/PortalSdk';
//const fields = Object.keys(JobPost);

export const JobPostsTable = ({
  jobPosts,
  setJobPosts,
  openModal,
}: {
  jobPosts: JobPost[];
  setJobPosts: Dispatch<SetStateAction<JobPost[]>>;
  openModal: (modalType: string, _jobpost: JobPost) => void;
}) => {
  const path = usePathname();
  const [jobStatus, setJobStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  const tableHeadings = [
    'Title',
    'Dept.',
    'Status',
    'Actions',
    'Default Reqs.',
    'Dept. Reqs.',
    'Admin. Reqs.',
    'HR Updates',
  ];
  const handleDuplicatePost = async (jobPost: JobPost) => {
    try {
      setLoading(true);
      const response = await PortalSdk.postData('/api/jobPost', {
        data: jobPost,
      });
      console.log('response', response);
      if (response.status === 'success') {
        setJobPosts((prevJobPosts) => [...prevJobPosts, response.data.jobPost]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error duplicating job post:', error);
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-scroll md:overflow-visible">
      <table id="jobpost-table" className="w-full">
        <thead>
          <tr className="w-full divide-x-2 rounded-lg bg-neutral-100">
            {tableHeadings.map((heading) => (
              <th
                key={heading}
                className="text-md p-2 pl-4 text-left font-semibold text-neutral-800"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobPosts.map((job) => (
            <tr
              key={job.id}
              className="w-full divide-x-2 border-b-2 border-neutral-200"
            >
              <Link
                className="block w-full"
                href={`${path}/position/${job.id}`}
              >
                <td className="p-2 pl-4 text-sm">
                  {job.title} |{' '}
                  {prettyPrintDateInMMMDD(new Date(job.createdAt))}
                </td>
              </Link>
              <td className="p-2 text-sm">{job.deptName}</td>
              <td className="p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined">
                    {job.status === JOBSTATUS.ACTIVE ? 'check_circle' : 'block'}
                  </span>{' '}
                  <span>{job.status}</span>
                </div>
              </td>
              <td className="p-2 text-sm">
                <div className="flex w-fit cursor-pointer items-center gap-2">
                  <Tooltip title="Edit Job Details">
                    <span
                      className="material-symbols-outlined text-[10px]"
                      onClick={() => openModal('basics', job)}
                    >
                      edit
                    </span>
                  </Tooltip>
                  <Tooltip
                    title="Duplicate Post"
                    className="ml-2"
                    onClick={() => handleDuplicatePost(job)}
                  >
                    <span className="material-symbols-outlined text-xs">
                      copy_all
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={`${jobStatus ? 'Set Inactive' : 'Set Active'}`}
                    className="ml-2"
                    onClick={() => setJobStatus(!jobStatus)}
                  >
                    {jobStatus ? (
                      <span className="material-symbols-outlined text-xs hover:text-red-500">
                        pause_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-xs hover:text-green-500">
                        play_circle
                      </span>
                    )}
                  </Tooltip>
                </div>
              </td>
              <td
                className="cursor-pointer p-2 text-sm"
                onClick={() => openModal('defaultReq', job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.defaultReq ? Object.keys(job.defaultReq).length : '0'}{' '}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="cursor-pointer p-2 text-sm"
                onClick={() => openModal('deptReq', job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.deptReq ? Object.keys(job.deptReq).length : '0'}{' '}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="cursor-pointer p-2 text-sm"
                onClick={() => openModal('adminReq', job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.adminReq ? Object.keys(job.adminReq).length : '0'}{' '}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="cursor-pointer p-2 text-sm"
                onClick={() => openModal('hrReq', job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.hrReq ? Object.keys(job.hrReq).length : '0'} filled.
                  </span>
                </div>
              </td>
            </tr>
          ))}
          {loading && (
            <tr className="relative w-full">
              <Skeleton
                variant="rectangular"
                className="!absolute left-0 top-0 !block !w-full"
                height={40}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
