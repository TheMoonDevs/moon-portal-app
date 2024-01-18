import { JobPost } from "@prisma/client";
import { useState } from "react";
//const fields = Object.keys(JobPost);

export const JobPostsTable = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row w-full gap-3 bg-neutral-100 rounded-lg p-3">
        <h4 className="text-md flex-1 font-semibold text-neutral-800">Title</h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">Dept.</h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          Status
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          Priorities
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          Default Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          Dept. Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          Admin. Reqs.
        </h4>
        <h4 className="text-md flex-1 font-semibold text-neutral-800">
          HR. Updates
        </h4>
      </div>
      <div className="flex flex-row border-b-2 border-neutral-200 w-full gap-3"></div>
    </div>
  );
};
