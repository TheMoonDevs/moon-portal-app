import dayjs from "dayjs";
import { WorklogView } from "../Worklogs/WorklogView";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export const InPlanSection = ({ visible }: { visible?: boolean }) => {
  return (
    <>
      <section
        style={{ display: !visible ? "none" : "block" }}
        className="relative bg-white m-4 mt-6 py-2 px-0 border-neutral-400 rounded-xl shadow-md"
      >
        <WorklogView
          date={dayjs().add(1, "day").format("YYYY-MM-DD")}
          compactView={true}
        />
      </section>
    </>
  );
};
