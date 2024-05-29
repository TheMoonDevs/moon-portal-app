import { User } from "@prisma/client";
import dayjs from "dayjs";

export const CurrentMonthList = ({
  item,
  itemMembers,
}: {
  item: any;
  itemMembers: User[];
}) => {
  return (
    <div className="p-2 flex flex-row justify-between items-center gap-4 w-full border-b border-neutral-300">
      <div className="flex flex-row items-center gap-2">
        {item.type === "zero" && (
          <span className={`bg-blue-500 w-2 h-2 rounded-full`}></span>
        )}
        {item.type === "leave" && (
          <span className={`bg-red-500 w-2 h-2 rounded-full`}></span>
        )}
        {item.type === "meeting" && (
          <span className={`bg-red-500 w-2 h-2 rounded-full`}></span>
        )}
        <div>
          {item.title && (
            <p className="text-[0.9em] text-neutral-500  font-bold">
              {item.title}
            </p>
          )}
          <p className="text-[0.9em] text-neutral-500  font-bold">
            {dayjs(item.date).format("DD MMM")}
          </p>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between">
        {itemMembers?.map((z_user: User) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={z_user.id}
            src={z_user.avatar || ""}
            className="w-6 h-6 rounded-full border border-neutral-200"
            alt={z_user.name || ""}
          />
        ))}
      </div>
    </div>
  );
};
