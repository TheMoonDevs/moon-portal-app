'use client';

import type { JobPost } from '@db/client';
import { USERVERTICAL } from '@db/client';
import { useEffect, useState } from 'react';

import { Button } from '@/components/elements/Button';
import { NewJobPostModal } from '@/components/screens/Screening/JobPosts/_JobPostModal';
import { useUser } from '@/utils/hooks/useUser';
import { useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Dropdown } from './Dropdown';
import { JobAdminReqModal } from './JobPosts/JobAdminReqModal';
import { JobDefaultReqModal } from './JobPosts/JobDefaultReqModal';
import { JobDeptReqModal } from './JobPosts/JobDeptReqModal';
import { JobHRReqModal } from './JobPosts/JobHRReqModal';
import { JobPostsTable } from './JobPosts/JobPostsTable';

export const ScreeningPage = () => {
  const { user, status } = useUser();
  const isVisible =
    user?.vertical == USERVERTICAL.HR ||
    USERVERTICAL.OPERATIONS ||
    user?.isAdmin;
  const [isJobPostModalOpen, setIsJobPostModalOpen] = useState(false);
  const [isJobReqModalOpen, setIsJobReqModalOpen] = useState<string | null>(
    null,
  );
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [selectedJobPost, setSelectedJobPost] = useState<JobPost | null>(null);
  const jobPostsRefresh = useAppSelector((state) => state.ui.jobPostsRefresh);

  useEffect(() => {
    PortalSdk.getData('/api/jobPost', null)
      .then(({ data }) => {
        console.log('Fetched job posts:', data);
        setJobPosts(data.jobPost);
      })
      .catch((error) => {
        console.error('Error fetching job posts:', error);
      });
  }, [jobPostsRefresh]);

  if (!isVisible) return <></>;
  return (
    <div className="table_box">
      <div className="flex w-full flex-row items-center justify-between border-b px-4 py-2">
        <div className="flex flex-row items-center gap-4">
          <h1 className="mr-4 text-xl font-bold">Screening</h1>
          <p className="ml-[-20px] border-l-2 pl-2 text-sm font-bold">
            All Jobs
          </p>
          <button className="btn btn-primary flex items-center">
            Select Dept.
          </button>
          <Dropdown options={['all']} selected="" onSelected={() => {}} />
          <button className="btn btn-primary">Filter by</button>
          <Dropdown options={['all']} selected="" onSelected={() => {}} />
        </div>
        <div className="flex flex-row gap-4">
          <button className="btn btn-primary">Save to Excel</button>
          <Button
            onClick={() => {
              setIsJobPostModalOpen(true);
              setSelectedJobPost(null);
            }}
          >
            Add New Post
          </Button>
        </div>
      </div>
      <JobPostsTable
        jobPosts={jobPosts}
        setJobPosts={setJobPosts}
        openModal={(type: string, _jobpost: JobPost) => {
          setSelectedJobPost(_jobpost);
          if (type === 'basics') {
            setIsJobPostModalOpen(true);
          } else {
            setIsJobReqModalOpen(type);
          }
        }}
      />
      <NewJobPostModal
        isOpen={isJobPostModalOpen}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobPostModalOpen(false);
        }}
        jobPostData={selectedJobPost}
      />
      <JobDefaultReqModal
        isOpen={isJobReqModalOpen === 'defaultReq'}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobDeptReqModal
        isOpen={isJobReqModalOpen === 'deptReq'}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobAdminReqModal
        isOpen={isJobReqModalOpen === 'adminReq'}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobHRReqModal
        isOpen={isJobReqModalOpen === 'hrReq'}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
    </div>
  );
};
