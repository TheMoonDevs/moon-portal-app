import React from "react";
import { RootState, useAppSelector } from "@/utils/redux/store";
import { calculateMissionStat } from "./MissionsList";
import { Mission } from "@prisma/client";

export const MissionDetails = ({ missions }: { missions: Mission[] }) => {
  const { mission, isOpen } = useAppSelector(
    (state: RootState) => state.selectedMission
  );

  if (!mission) {
    return <MissionDetailsSkeleton />;
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 h-[96vh] overflow-y-scroll my-4 border-b border-neutral-200 
       `}
    >
      {!isOpen ? (
        <div className="flex flex-col gap-6">
          {missions?.map((mission: Mission) => MissionComponent(mission))}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">{mission.title}</h2>
          <div className="flex items-center mb-4">
            <img
              src={`/images/houses/${mission.house}.png`}
              alt={mission.house}
              className="w-10 h-10 object-cover rounded-full mr-3"
            />
            <span className="text-lg font-semibold">{mission.house}</span>
          </div>
          <div className="mb-4">
            <p>House Points: {mission.housePoints}</p>
            <p>Total Indie Points: {mission.indiePoints}</p>
            <p>
              Status:{" "}
              {calculateMissionStat(mission, "status") == 0
                ? "Not Started yet"
                : calculateMissionStat(mission, "status")}
            </p>
          </div>
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: `${calculateMissionStat(mission, "percentage")}%`,
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {calculateMissionStat(mission, "balance")} / {mission.indiePoints}{" "}
              Indie Points remaining
            </p>
          </div>
          <h3 className="text-xl font-semibold mb-4">Tasks</h3>
          <ul className="space-y-4">
            {/* @ts-expect-error Server Component */}{" "}
            {mission.tasks?.map((task: any) => (
              <li key={task.id} className="rounded-lg p-4 shadow ">
                <div className="flex items-center mb-2">
                  <img
                    src={
                      task.userInfo?.avatar || "/icons/placeholderAvatar.svg"
                    }
                    alt={task.userInfo?.name}
                    className="w-10 h-10 object-cover rounded-full mr-3"
                  />
                  <span className="font-semibold">
                    {task.userInfo?.name || "Unknown"}
                  </span>
                </div>
                <p className="text-gray-700 mb-2 font-bold">{task.title}</p>
                <p className="text-gray-700 mb-2 text-sm">{task.description}</p>
                <p className="text-right font-medium text-blue-600 text-sm">
                  {task.indiePoints} Indie Points
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const MissionComponent = (mission: Mission) => {
  return (
    <div className="">
      <h2 className="text-2xl font-bold mb-4">{mission.title}</h2>
      <div className="flex items-center mb-4">
        <img
          src={`/images/houses/${mission.house}.png`}
          alt={mission.house}
          className="w-10 h-10 object-cover rounded-full mr-3"
        />
        <span className="text-lg font-semibold">{mission.house}</span>
      </div>
      <div className="mb-4">
        <p>House Points: {mission.housePoints}</p>
        <p>Total Indie Points: {mission.indiePoints}</p>
        <p>
          Status:{" "}
          {calculateMissionStat(mission, "status") == 0
            ? "Not Started yet"
            : calculateMissionStat(mission, "status")}
        </p>
      </div>
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${calculateMissionStat(mission, "percentage")}%`,
            }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {calculateMissionStat(mission, "balance")} / {mission.indiePoints}{" "}
          Indie Points remaining
        </p>
      </div>
      <h3 className="text-xl font-semibold mb-4">Tasks</h3>
      <ul className="space-y-4">
        {/* @ts-expect-error Server Component */}{" "}
        {mission.tasks?.map((task: any) => (
          <li key={task.id} className="rounded-lg p-4 shadow ">
            <div className="flex items-center mb-2">
              <img
                src={task.userInfo?.avatar || "/icons/placeholderAvatar.svg"}
                alt={task.userInfo?.name}
                className="w-10 h-10 object-cover rounded-full mr-3"
              />
              <span className="font-semibold">
                {task.userInfo?.name || "Unknown"}
              </span>
            </div>

            <p className="text-gray-700 mb-2 font-bold">{task.title}</p>
            <p className="text-gray-700 mb-2 text-sm">{task.description}</p>
            <p className="text-right font-medium text-blue-600 text-sm">
              {task.indiePoints} Indie Points
            </p>
          </li>
        ))}
      </ul>
      <hr className="my-5 bg-black " />
    </div>
  );
};

export const MissionDetailsSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto my-4 border-b border-neutral-200">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-gray-400 h-2.5 rounded-full w-1/2"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-1"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <ul className="space-y-4">
        {[1, 2, 3].map((index) => (
          <li key={index} className="rounded-lg p-4 shadow">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 ml-auto"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};
