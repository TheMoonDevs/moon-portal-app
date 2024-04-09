import dayjs from "dayjs";
import { WorklogView } from "../Worklogs/WorklogView";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export const InPlanSection = ({ visible }: { visible?: boolean }) => {
  return (
    <>
      <section
        style={{ display: !visible ? "none" : "block" }}
        className="relative m-4 mt-8 py-2 px-0 border border-2 border-neutral-800 rounded-xl shadow-md"
      >
        <WorklogView
          date={dayjs().add(1, "day").format("YYYY-MM-DD")}
          compactView={true}
          visible={visible}
        />
        <Link
          href={`${APP_ROUTES.userWorklogs}?date=${dayjs().format(
            "YYYY-MM-DD"
          )}`}
          className="absolute flex justify-center bottom-0 right-0 left-0 p-3 bg-black rounded-b-lg "
        >
          <p className="text-white text-xs text-center">
            Click here to open editor
          </p>
          <span className="icon_size text-white material-icons-outlined">
            chevron_right
          </span>
        </Link>
      </section>
    </>
  );
};
