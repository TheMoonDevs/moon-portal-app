import { MoonIcon } from "@/components/elements/Icon";
import { prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprint";
import { Tooltip } from "@mui/material";
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
          <div className="flex-1 text-xs cursor-pointer p-2 border-r-2 gap-3">
            <Tooltip title="Edit Job Details">
              <span
                className="material-symbols-outlined text-[10px]"
                onClick={() => openModal("basics", job)}
              >
                edit
              </span>
            </Tooltip>
            <Tooltip title="Duplicate Post">
              <span className="material-symbols-outlined text-xs">
                copy_all
              </span>
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
    </div>
  );
};
