"use client";
import { HOUSEID, Mission } from "@prisma/client"
import { useEffect, useState } from "react";

const HOUSES_LIST = [
    {
        id: HOUSEID.MANGEMENT,
        name: "Management",
        description: "Management House",
        image: `images/houses/${HOUSEID.MANGEMENT}.png`,
        background: `linear-gradient(180deg, #D40000, #000000)`
    },
    {
        id: HOUSEID.GROWTH,
        name: "Growth",
        description: "Growth House",
        image: `images/houses/${HOUSEID.GROWTH}.png`,
        background: `linear-gradient(180deg, #540907, #060405)`,
    },
    {
        id: HOUSEID.EXECUTIVE,
        name: "Executive",
        description: "Executive House",
        image: `images/houses/${HOUSEID.EXECUTIVE}.png`,
        background: `linear-gradient(180deg, #0A95A8, #10303C)`,
    },
    {
        id: HOUSEID.PRODUCT_TECH,
        name: "Product",
        description: "Product House",
        image: `images/houses/${HOUSEID.PRODUCT_TECH}.png`,
        background: `linear-gradient(180deg, #62368D, #291643)`,
    }
]

export const HousesList = ({missions}:{
    missions: Mission[]
}) => {

    const [houses, setHouses] = useState(HOUSES_LIST);

    useEffect(() => {
        // mutate houses and ass points and sort on basis of total missions completed.
    },[missions])

    return (
        <div className="flex flex-col gap-4 p-4">
            {HOUSES_LIST.map((house) => (
                <div
                    key={house.id}
                    style={{
                        background: house.background
                    }}
                    className="flex flex-col gap-2  border border-neutral-200 text-white rounded-xl">
                    <div className="flex flex-row items-center gap-2 p-4 px-8 border-b border-white/20">
                        <img src={house.image}
                            alt={house.name}
                            className="w-full h-48 w-48 object-cover object-center circular " />
                        <div className="p-4">
                            <h3 className="text-xl font-regular tracking-widest uppercase">{house.name}</h3>
                            <h1 className="text-[3em] font-bold">12</h1>
                            <p className="text-sm">House Members</p>

                        </div>
                    </div>
                    <div className="p-4">
                    <p className="text-sm">{house.description}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}