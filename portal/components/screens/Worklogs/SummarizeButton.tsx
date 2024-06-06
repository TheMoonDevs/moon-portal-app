import { APP_ROUTES } from "@/utils/constants/appInfo";
import { Fade } from "@mui/material";
import dayjs from "dayjs";
import Link from "next/link";

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
  return (
    <div
      className="relative z-50"
      // href={`${APP_ROUTES.userWorklogSummary}/${
      //   user?.id
      // }?year=${dayjs().format("YYYY")}&month=${dayjs().format("MM")}`}
    >
      <button className="cursor-pointer text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg py-2 px-3 text-neutral-100 flex flex-row gap-2 items-center">
        <span className="icon_size material-symbols-outlined">summarize</span>
        <span>Summarize</span>
        <span className="icon_size material-symbols-outlined">expand_more</span>
      </button>
      <Fade in={true} mountOnEnter unmountOnExit>
        <div className="flex flex-col gap-2 shadow-lg absolute z-[9999] bg-white rounded-md w-full py-2">
          {summaryOptions.map(({ text, url }, index) => (
            <Link
              href={url}
              key={index}
              className="text-xs z-50 flex justify-between items-center hover:bg-neutral-200 p-2"
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
