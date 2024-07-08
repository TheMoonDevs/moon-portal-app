"use client";
import { Mission } from "@prisma/client"
import { HousesList } from "./HousesList"
import { useEffect, useState } from "react"
import { PortalSdk } from "@/utils/services/PortalSdk";
import dayjs from "dayjs";
import { MissionsList } from "./MissionsList";


export const HousesPage = () => {

    const [missions, setMissions] = useState<Mission[]>([]);

    useEffect(() => {
        PortalSdk.getData("/api/missions?month="+dayjs().format("YYYY-MM"), null)
        .then((data) => {
            setMissions(data?.data?.missions || []);
        })
        .catch((err) => {
            console.log(err);
        });
    },[])


    return (
        <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
                <HousesList missions={missions} />
            </div>
            <div className="col-span-2">
                <MissionsList missions={missions} />
            </div>
            <div className="col-span-1">

            </div>
        </div>
    )
}