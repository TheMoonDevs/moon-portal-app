import { LOGLINKTYPE, WorkLogPoints } from "@/utils/@types/interfaces";
import dayjs from "dayjs";

const MARKDOWN_PLACHELODER = `* `;
export const DEFAULT_MARKDOWN_DATA: WorkLogPoints[] = [
  {
    link_type: LOGLINKTYPE.GENERAL,
    link_id: "general",
    title: "General",
    icon: "work",
    content: MARKDOWN_PLACHELODER,
  },
];
export const WorkLogsHelper = {
  defaultWorklogs: (date?: string | null, user?: any) => {
    const this_date = date || dayjs().format("YYYY-MM-DD");
    return {
      id: "",
      userId: user?.id,
      logType: "dayLog",
      title: `${dayjs(this_date).format("MMMM DD")}  - ${dayjs(
        this_date
      ).format("dddd")}`,
      date: dayjs(this_date).format("YYYY-MM-DD"),
      createdAt: new Date(),
      updatedAt: new Date(),
      works: DEFAULT_MARKDOWN_DATA as any[],
    };
  },
  defaultPrivateBoard: (month: string | null, user?: any) => {
    //const this_date = date || dayjs().format("YYYY-MM-DD");
    return {
      id: "",
      userId: user?.id,
      logType: "privateLog",
      title: `My Private Board`,
      date: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      works: DEFAULT_MARKDOWN_DATA as any[],
    };
  },
};
