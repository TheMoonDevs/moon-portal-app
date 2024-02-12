"use client";

import { Button, GreyButton } from "@/components/elements/Button";
import { NewJobPostModal } from "@/components/screens/Screening/JobPosts/_JobPostModal";
import { useUser } from "@/utils/hooks/useUser";
import ScreeningTable from "./ScreeningTable";
import { useEffect, useState } from "react";
import { JobPost, USERVERTICAL } from "@prisma/client";
import { JobPostsTable } from "./JobPosts/JobPostsTable";
import { useAppSelector } from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { JobDefaultReqModal } from "./JobPosts/JobDefaultReqModal";
import { JobDeptReqModal } from "./JobPosts/JobDeptReqModal";
import { JobAdminReqModal } from "./JobPosts/JobAdminReqModal";
import { JobHRReqModal } from "./JobPosts/JobHRReqModal";

const Dropdown = ({
  options,
  selected,
  onSelected,
}: {
  options: string[];
  selected: string;
  onSelected: (value: string) => void;
}) => {
  return (
    <select
      className="form-select py-2 block cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
      value={selected}
      onChange={(e) => onSelected(e.target.value)}
    >
      {options.map((option) => (
        <option
          className="flex flex-row justify-between items-center"
          key={option}
          value={option}
        >
          {option}
          <span className="material-icons text-neutral-500 group-hover:text-white">
            {option === selected ? "done_all" : ""}
          </span>
        </option>
      ))}
    </select>
  );
};

export const ScreeningPage = () => {
  const { user, status } = useUser();
  const isVisible =
    user?.vertical == USERVERTICAL.HR ||
    USERVERTICAL.OPERATIONS ||
    user?.isAdmin;
  const [isJobPostModalOpen, setIsJobPostModalOpen] = useState(false);
  const [isJobReqModalOpen, setIsJobReqModalOpen] = useState<string | null>(
    null
  );
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [selectedJobPost, setSelectedJobPost] = useState<JobPost | null>(null);
  const jobPostsRefresh = useAppSelector((state) => state.ui.jobPostsRefresh);

  useEffect(() => {
    PortalSdk.getData("/api/jobPost", null)
      .then(({ data }) => {
        console.log("Fetched job posts:", data);
        setJobPosts(data.jobPost);
      })
      .catch((error) => {
        console.error("Error fetching job posts:", error);
      });
  }, [jobPostsRefresh]);

  if (!isVisible) return <></>;
  return (
    <div className="table_box">
      <div className="w-full  flex flex-row justify-between items-center border-b py-2 px-4">
        <div className="flex flex-row gap-4 items-center">
          <h1 className="text-xl font-bold mr-4">Screening</h1>
          <p className="text-sm font-bold border-l-2 ml-[-20px] pl-2">
            All Jobs
          </p>
          <button className="btn btn-primary flex items-center">
            Select Dept.
          </button>
          <Dropdown options={["all"]} selected="" onSelected={() => {}} />
          <button className="btn btn-primary">Filter by</button>
          <Dropdown options={["all"]} selected="" onSelected={() => {}} />
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
      <div className="">
        <JobPostsTable
          jobPosts={jobPosts}
          setJobPosts={setJobPosts}
          openModal={(type: string, _jobpost: JobPost) => {
            setSelectedJobPost(_jobpost);
            if (type === "basics") {
              setIsJobPostModalOpen(true);
            } else {
              setIsJobReqModalOpen(type);
            }
          }}
        />
      </div>
      <NewJobPostModal
        isOpen={isJobPostModalOpen}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobPostModalOpen(false);
        }}
        jobPostData={selectedJobPost}
      />
      <JobDefaultReqModal
        isOpen={isJobReqModalOpen === "defaultReq"}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobDeptReqModal
        isOpen={isJobReqModalOpen === "deptReq"}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobAdminReqModal
        isOpen={isJobReqModalOpen === "adminReq"}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
      <JobHRReqModal
        isOpen={isJobReqModalOpen === "hrReq"}
        handleClose={() => {
          setSelectedJobPost(null);
          setIsJobReqModalOpen(null);
        }}
        jobPostData={selectedJobPost}
      />
    </div>
  );
};
