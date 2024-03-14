"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import Link from "next/link";

const tempData = [
  {
    id: "idsdjneslnfrnleskdnelrnv",
    title: "March 24 - Sunday",
    date: "2021-03-24",
    works: [
      {
        id: "sdjnvkrbd-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon PWA",
        status: "none", // none, done, inProgress
      },
      {
        id: "djncsjnk-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon Homepage",
        status: "done", // none, done, inProgress
      },
      {
        id: "sdvnsjknc-2021-03-24", // should be random id - `random_uid+date`
        text: "Worked on the Moon PWA",
        status: "none", // none, done, inProgress
      },
    ],
  },
];
export const WorklogsPage = () => {
  const { user } = useUser(false);

  if (!user?.workData) return null;

  return (
    <div className="flex flex-col">
      <div className="fixed left-0 right-0 top-0 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-400">
        <h1 className="tracking-widest text-sm">My Worklogs</h1>
        <div className="flex flex-row gap-1">
          <Link href={APP_ROUTES.home}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">arrow_back</span>
            </div>
          </Link>
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">refresh</span>
            </div>
          </Link>
          <Link href={APP_ROUTES.userWorklogs}>
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div>
          </Link>
        </div>
      </div>
      <div className="scrollable_list">
        <div className="h-[4em]"></div>
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 m-2">
          <h4 className="text-xs font-bold">My Private Board</h4>
          <div className="flex flex-col">
            {tempData[0].works.map((work) => (
              <div key={work.id} className="flex flex-row items-center">
                <p className="text-sm font-light line-clamp-1">{work.text}</p>
                {work.status == "done" && (
                  <span className="icon_size material-icons text-green-500">
                    task_alt
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-row justify-between">
          <h4 className="text-xs font-bold p-2 px-4">March</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 p-2">
          {tempData.map((data) => (
            <Link
              href={APP_ROUTES.userWorklogs + "/" + data.id}
              key={data.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3"
            >
              <h1 className="text-xs font-bold">{data.title}</h1>
              <div className="flex flex-col">
                {data.works.map((work) => (
                  <div key={work.id} className="flex flex-row items-center">
                    <p className="text-sm font-light line-clamp-1">
                      {work.text}
                    </p>
                    {work.status == "done" && (
                      <span className="icon_size material-icons text-green-500">
                        task_alt
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3"></div>
        <div className="h-[50em]"></div>
      </div>
    </div>
  );
};
