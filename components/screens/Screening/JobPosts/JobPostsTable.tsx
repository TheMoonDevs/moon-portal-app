import { prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprint";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Skeleton, Tooltip } from "@mui/material";
import { JOBSTATUS, JobPost } from "@prisma/client";
import { Dispatch, SetStateAction, useState } from "react";
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
  const [jobStatus, setJobStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const handleDuplicatePost = async (jobPost: JobPost) => {
    try {
      setLoading(true);
      const response = await PortalSdk.postData("/api/jobPost", {
        data: jobPost,
      });
      console.log("response", response);
      if (response.status === "success") {
        setJobPosts((prevJobPosts) => [...prevJobPosts, response.data.jobPost]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error duplicating job post:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-row w-full gap-3 bg-neutral-100 rounded-lg">
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Title
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Dept.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Status
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Actions
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Default Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Dept. Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          Admin. Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800 p-2 border-r-2">
          HR. Updates
        </h4>
      </div>
      {jobPosts.map((job) => (
        <div
          key={job.id}
          className="flex flex-row border-b-2 border-neutral-200 w-full gap-3"
        >
          <div className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center">
            {job.title} | {prettyPrintDateInMMMDD(new Date(job.createdAt))}
          </div>
          <div className="flex-1 text-sm cursor-pointer p-2 border-r-2">
            {job.deptName}
          </div>
          <div className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center gap-2">
            <span className="material-symbols-outlined">
              {job.status === JOBSTATUS.ACTIVE ? "check_circle" : "block"}
            </span>{" "}
            {job.status}
          </div>
          <div className="flex-1 text-xs cursor-pointer p-2 border-r-2">
            <Tooltip title="Edit Job Details">
              <span
                className="material-symbols-outlined text-[10px]"
                onClick={() => openModal("basics", job)}
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
              title={`${jobStatus ? "Set Inactive" : "Set Active"}`}
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
          <div
            className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center gap-2"
            onClick={() => openModal("defaultReq", job)}
          >
            <span className="material-symbols-outlined text-[10px]">add</span>
            {job.defaultReq ? Object.keys(job.defaultReq).length : "0"} filled.
          </div>
          <div
            className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center gap-2"
            onClick={() => openModal("deptReq", job)}
          >
            <span className="material-symbols-outlined text-[10px]">add</span>
            {job.deptReq ? Object.keys(job.deptReq).length : "0"} filled.
          </div>
          <div
            className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center gap-2"
            onClick={() => openModal("adminReq", job)}
          >
            <span className="material-symbols-outlined text-[10px]">add</span>
            {job.adminReq ? Object.keys(job.adminReq).length : "0"} filled.
          </div>
          <div
            className="flex-1 text-sm cursor-pointer p-2 border-r-2 flex items-center gap-2"
            onClick={() => openModal("hrReq", job)}
          >
            <span className="material-symbols-outlined text-[10px]">add</span>
            {job.hrReq ? Object.keys(job.hrReq).length : "0"} filled.
          </div>
        </div>
      ))}
      {loading && <Skeleton variant="rectangular" className="w-full h-auto" />}
    </div>
  );
};
