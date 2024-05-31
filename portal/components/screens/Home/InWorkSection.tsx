import Link from "next/link";
import { WorklogView } from "../Worklogs/WorklogView";
import dayjs from "dayjs";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export const InWorkSection = ({ visible }: { visible?: boolean }) => {
  return (
    <div>
      <section
        style={{ display: !visible ? "none" : "block" }}
        className="relative bg-white m-4 mt-6 py-2 px-0 border-neutral-400 rounded-xl shadow-md"
      >
        <WorklogView date={dayjs().format("YYYY-MM-DD")} compactView={true} />
      </section>
    </div>
  );
};
