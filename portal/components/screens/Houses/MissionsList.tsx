"use client";
import { prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprint";
import { Mission } from "@prisma/client";
import dayjs from "dayjs";


export const MissionsList = ({ missions }: { missions: Mission[] }) => {

    return (
        <div className="h-full flex flex-col gap-4 my-4 shadow-xl rounded-lg border">
            <div id="mission-header"
                className="flex flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-neutral-400 tracking-widest uppercase">Missions</h3>
                <div className="flex flex-row items-center gap-2">
                    <span className="material-icons-outlined">filter_alt</span>
                    <span className="material-icons-outlined">search</span>
                </div>
            </div>
            {missions.map((mission,i) => (
                <div
                    key={mission.id}
                    className="flex flex-col gap-2 border-b border-neutral-200">
                    <div className="flex flex-row items-center gap-2 w-full px-4"
                    >
                        <img
                        src={`images/houses/${mission.house}.png`}
                        alt={mission.house}
                        className="w-8 h-8 object-cover object-center rounded-full" />
                        <h4 className="text-md font-semibold">{mission.title}</h4>
                        <p className="text-sm font-regular ml-auto">{mission.housePoints} HP</p>
                        <p className="text-sm font-regular">{mission.indiePoints} / {mission.indiePoints}</p>
                        <p className="text-sm font-regular">{mission.completed ? "✅" : "🟡"}</p>
                        {/* <p className="text-sm font-regular">{mission.createdAt ? prettyPrintDateInMMMDD(new Date(mission.createdAt)) : "uknown"}</p> */}
                    </div>
                    <div className="h-[2px] bg-green-500"
                    style={{width: `${10+i*20}%`}}
                    ></div>
                </div>
            ))}
        </div>
    )
}