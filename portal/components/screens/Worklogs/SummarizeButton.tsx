import { APP_ROUTES } from "@/utils/constants/appInfo";
import useOutsideClick from "@/utils/hooks/useOutsideClick";
import { Fade } from "@mui/material";
import dayjs from "dayjs";
import Link from "next/link";
import { useRef, useState } from "react";

const thisYear = dayjs().year();
const thisMonth = dayjs().format("MM"); //June = "06"
const previousYear = thisYear - 1;
const previousMonth =
  Number(thisMonth) === 1
    ? "12"
    : dayjs()
        .month(Number(thisMonth) - 2)
        .format("MM");

const calculateYearForPreviousMonth =
  Number(thisMonth) === 1 ? thisYear - 1 : thisYear;

const options = (userId: string | null | undefined) => [
  {
    text: "This Year",
    url: `${APP_ROUTES.userWorklogSummary}/${userId}?year=${thisYear}`,
  },
  {
    text: "This Month",
    url: `${APP_ROUTES.userWorklogSummary}/${userId}?year=${thisYear}&month=${thisMonth}`,
  },
  {
    text: "Previous Year",
    url: `${APP_ROUTES.userWorklogSummary}/${userId}?year=${previousYear}`,
  },
  {
    text: "Previous Month",
    url: `${APP_ROUTES.userWorklogSummary}/${userId}?year=${calculateYearForPreviousMonth}&month=${previousMonth}`,
  },
];

export const SummarizeButton = ({
  userId,
}: {
  userId: string | null | undefined;
}) => {
  const summaryOptions = options(userId);
  const [isBtnDropdownOpen, setIsBtnDropdownOpen] = useState(false);
  const summaryBtnRef = useRef(null);
  useOutsideClick([summaryBtnRef], () => setIsBtnDropdownOpen(false));
  return (
    <div
      ref={summaryBtnRef}
      className="relative z-50"
      onClick={() => setIsBtnDropdownOpen(!isBtnDropdownOpen)}
      // href={`${APP_ROUTES.userWorklogSummary}/${
      //   user?.id
      // }?year=${dayjs().format("YYYY")}&month=${dayjs().format("MM")}`}
    >
      <button className="cursor-pointer text-sm border border-neutral-800 rounded-md py-1 px-3 text-neutral-900 flex flex-row gap-2 items-center">
        <span className="icon_size material-symbols-outlined">timeline</span>
        <span>Archive</span>
        <span className="icon_size material-symbols-outlined">expand_more</span>
      </button>
      <Fade in={isBtnDropdownOpen} mountOnEnter unmountOnExit>
        <div className="flex flex-col shadow-3xl border border-1 absolute z-[9999] bg-white rounded-md w-full mt-2">
          {summaryOptions.map(({ text, url }, index) => (
            <Link
              href={url}
              key={index}
              className="text-xs z-50 flex justify-between items-center hover:bg-neutral-200 p-2"
              onClick={() => setIsBtnDropdownOpen(false)}
            >
              <span>{text}</span>
              <span className="icon_size material-symbols-outlined !font-bold">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </Fade>
    </div>
  );
};
