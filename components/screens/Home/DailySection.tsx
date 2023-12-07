import { useUser } from "@/utils/hooks/useUser";

export const DailySection = () => {
  const { user } = useUser();
  const getTime = () => {
    const date = new Date();
    // get time in a timezone
    const time = date.toLocaleTimeString();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${hours}:${minutes} ${date.getHours() >= 12 ? "PM" : "AM"}`;
  };
  const getDate = (pattern: string) => {
    const date = new Date();
    const day = date.getDay();
    const month = date.getMonth();
    const year = date.getFullYear();
    const dayName = date.toLocaleString("default", { weekday: "long" });
    const monthName = date.toLocaleString("default", { month: "long" });
    const monthShortName = date.toLocaleString("default", { month: "short" });
    if (pattern === "full") return `${dayName}, ${day} ${monthName} ${year}`;
    if (pattern === "dayname") return `${dayName}`;
    if (pattern === "mmm") return `${monthShortName} ${day}`;
    return `${monthName} ${day}`;
  };
  return (
    <div className=" flex flex-col py-1 px-1 mx-2 my-1 gap-6 bg-white rounded-[1.15em]">
      <div className="flex flex-row justify-between border-neutral-400 border-b text-sm px-2 py-3 w-full">
        <h4>
          It&apos;s &nbsp;
          <strong>{getTime()}</strong> &nbsp; now.
        </h4>
        <p className="flex items-center gap-2 pl-2 text-xs border-neutral-400 border-l">
          <span className="icon_size text-neutral-800  material-icons">
            schedule
          </span>
          40Hrs per week
        </p>
      </div>
      <div className="flex flex-row justify-between text-sm p-2 w-full">
        <div>
          <h1 className="font-black text-3xl">{getDate("mmm")}</h1>
          <p className="text-xs">
            {getDate("dayname")} | {user?.timezone}
          </p>
        </div>
        <div className="flex flex-row gap-2"></div>
      </div>
      <div className="flex flex-row justify-between text-sm p-2 w-full">
        <p>Overlaps</p>
      </div>
    </div>
  );
};
