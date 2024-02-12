import { prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprint";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Skeleton, Tooltip } from "@mui/material";
import { JOBSTATUS, JobPost } from "@prisma/client";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { usePathname } from "next/navigation";
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
    "Title",
    "Dept.",
    "Status",
    "Actions",
    "Default Reqs.",
    "Dept. Reqs.",
    "Admin. Reqs.",
    "HR Updates",
  ];
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
    <div className="overflow-x-scroll md:overflow-visible">
      <table id="jobpost-table" className="w-full">
        <thead>
          <tr className=" w-full bg-neutral-100 rounded-lg divide-x-2">
            {tableHeadings.map((heading) => (
              <th
                key={heading}
                className="text-md font-semibold text-neutral-800 text-left p-2 pl-4"
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
              className="border-b-2 border-neutral-200 w-full divide-x-2"
            >
              <Link
                className="block w-full"
                href={`${path}/position/${job.id}`}
              >
                <td className="text-sm p-2 pl-4">
                  {job.title} |{" "}
                  {prettyPrintDateInMMMDD(new Date(job.createdAt))}
                </td>
              </Link>
              <td className="text-sm p-2">{job.deptName}</td>
              <td className="text-sm p-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined">
                    {job.status === JOBSTATUS.ACTIVE ? "check_circle" : "block"}
                  </span>{" "}
                  <span>{job.status}</span>
                </div>
              </td>
              <td className="text-sm p-2">
                <div className="cursor-pointer w-fit flex gap-2 items-center">
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
              </td>
              <td
                className="text-sm p-2 cursor-pointer"
                onClick={() => openModal("defaultReq", job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.defaultReq ? Object.keys(job.defaultReq).length : "0"}{" "}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="text-sm p-2 cursor-pointer"
                onClick={() => openModal("deptReq", job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.deptReq ? Object.keys(job.deptReq).length : "0"}{" "}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="text-sm p-2 cursor-pointer"
                onClick={() => openModal("adminReq", job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.adminReq ? Object.keys(job.adminReq).length : "0"}{" "}
                    filled.
                  </span>
                </div>
              </td>
              <td
                className="text-sm p-2 cursor-pointer"
                onClick={() => openModal("hrReq", job)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">
                    add
                  </span>
                  <span>
                    {job.hrReq ? Object.keys(job.hrReq).length : "0"} filled.
                  </span>
                </div>
              </td>
            </tr>
          ))}
          {loading && (
            <Skeleton variant="rectangular" className="w-full h-auto" />
          )}
        </tbody>
      </table>
    </div>
  );
};
