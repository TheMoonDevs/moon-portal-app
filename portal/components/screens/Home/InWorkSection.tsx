import Link from "next/link";
import { WorklogView } from "../Worklogs/WorklogView";
import dayjs from "dayjs";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export const InWorkSection = ({ visible }: { visible?: boolean }) => {
  return (
    <div>
      <section
        style={{ display: !visible ? "none" : "block" }}
        className="relative bg-white m-4 mt-6 py-2 px-0 border-neutral-400 rounded-xl shadow-md max-h-[50vh] overflow-hidden"
      >
        <WorklogView date={dayjs().format("YYYY-MM-DD")} compactView={true} />
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-transparent to-white flex flex-col justify-end">
          <p className="font-semibold text-xs text-neutral-500 text-center p-2"></p>
        </div>
      </section>
    </div>
  );
};
