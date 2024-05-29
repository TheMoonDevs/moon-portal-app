"use client";

import { WorkLogPoints } from "@/utils/@types/interfaces";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_MARKDOWN_DATA } from "./WorklogsHelper";
import { useDebouncedEffect } from "@/utils/hooks/useDebouncedHook";
import { debounce } from "lodash";
import store from "@/utils/redux/store";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";

const MARKDOWN_PLACHELODER = `* `;

export const WorklogEditor = ({
  editWorkLogs,
  refreshWorklogs,
  compactView = false,
}: {
  editWorkLogs: WorkLogs | null;
  refreshWorklogs: () => void;
  compactView?: boolean;
}) => {
  const { user } = useUser();
  const [markdownDatas, setMarkdownDatas] = useState<WorkLogPoints[]>(
    DEFAULT_MARKDOWN_DATA
  );
  const [newProjectText, setNewProjectText] = useState<string>("");
  const queryParams = useSearchParams();
  const [serverLog, setServerLog] = useState<WorkLogs | null>(null);
  const [workLog, setWorkLog] = useState<WorkLogs | null>(null);
  const _date = queryParams?.get("date");
  const [saving, setSaving] = useState<boolean>(false);
  const isAuotSaving = useRef(false);
  const isAutoSaved = useMemo(() => {
    return (
      JSON.stringify(serverLog) === JSON.stringify(workLog) &&
      serverLog &&
      workLog
    );
  }, [serverLog, workLog]);

  useEffect(() => {
    if (!user) return;
    if (!editWorkLogs) {
      setWorkLog({
        id: "",
        userId: user?.id,
        logType: "dayLog",
        title: `${dayjs().format("MMMM DD")}  - ${dayjs().format("dddd")}`,
        date: dayjs().format("YYYY-MM-DD"),
        createdAt: new Date(),
        updatedAt: new Date(),
        works: markdownDatas as any[],
      });
      return;
    }
    isAuotSaving.current = false;
    setWorkLog(editWorkLogs);
    setServerLog(editWorkLogs);
    setMarkdownDatas(editWorkLogs.works as any[]);
    console.log("placed ", editWorkLogs);
    isAuotSaving.current = true;
  }, [editWorkLogs]);

  // useEffect(() => {
  //   console.log("markdown datas changed", markdownDatas);
  // }, [markdownDatas]);

  const saveWorkLog = useCallback(
    (_workLog: { works: WorkLogPoints[] } | null) => {
      const _user = store.getState().auth.user;
      if (!_user || !_workLog || !_workLog) return;
      //   console.log({
      //     ..._workLog,
      //     userId: _user?.id,
      //     works: _workLog.works || markdownDatas,
      //   });
      setSaving(true);
      //let _worklog: WorkLogs | null = workLog ? { ...workLog } : null;
      PortalSdk.putData(`/api/user/worklogs`, {
        data: {
          ...workLog,
          userId: user?.id,
          works: markdownDatas,
          updatedAt: new Date(),
        },
      })
        .then((data) => {
          setSaving(false);
          if (!data?.data?.workLogs) return;
          setWorkLog(data?.data?.workLogs);
          setServerLog(data?.data?.workLogs);
          console.log("saved", data?.data?.workLogs);
        })
        .catch((err) => {
          setSaving(false);
          console.log(err);
        });
    },
    [workLog]
  );

  const changeMarkData = (
    content: string,
    _markdownDat: WorkLogPoints,
    _fullpoints: WorkLogPoints[]
  ) => {
    const new_content = content.split(/\n\n|\n/g);
    const new_md = _fullpoints.map((_md) => {
      if (_md.project === _markdownDat.project) {
        return {
          project: _md.project,
          project_icon: _md.project_icon,
          content: content.includes(MARKDOWN_PLACHELODER) ? content : content,
          pointInfos: new_content.map((text: string, index: number) => {
            return {
              text,
              status:
                _md.pointInfos.length > index
                  ? _md.pointInfos[index].status
                  : "none",
            };
          }),
        };
      }
      return _md;
    });
    console.log(content);
    setMarkdownDatas(new_md);
    setWorkLog((wl: any) => ({
      ...wl,
      works: new_md as any[],
    }));
  };
  useDebouncedEffect(
    () => {
      if (
        JSON.stringify(serverLog) === JSON.stringify(workLog) ||
        !editWorkLogs ||
        !workLog ||
        !isAuotSaving
      ) {
        return;
      }
      console.log("saving... ", workLog);
      saveWorkLog(workLog as any);
    },
    [serverLog, workLog],
    2000
  );

  const addNewProject = () => {
    setMarkdownDatas((md) => {
      const new_md = [
        ...md,
        {
          project: newProjectText,
          project_icon: "work",
          content: MARKDOWN_PLACHELODER,
          pointInfos: [
            {
              text: "",
              status: "none",
            },
          ],
        },
      ];
      setWorkLog((wl: any) => ({ ...wl, works: new_md }));
      return new_md;
    });
    setNewProjectText("");
  };

  return (
    <div className="flex flex-col max-w-[400px]">
      {!compactView && (
        <div id="header" className="flex flex-row justify-between">
          <Link
            href={APP_ROUTES.userWorklogs}
            className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
          >
            <span className="icon_size material-icons">arrow_back</span>
          </Link>
          <div className="flex flex-row gap-1">
            <div
              onClick={refreshWorklogs}
              className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
            >
              <span className="icon_size material-icons">refresh</span>
            </div>
            {!isAutoSaved && (
              <button
                onClick={() => saveWorkLog(workLog as any)}
                className="cursor-pointer rounded-lg p-2 text-red-500"
              >
                <span className="icon_size material-icons">done_all</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-4">
        <input
          disabled={compactView}
          type="text"
          className="text-2xl  outline-none bg-transparent"
          placeholder="Jotdown a new project/task/goal..."
          value={workLog?.title || "March 27 - Sunday"}
          onChange={(e) => {
            setWorkLog((wl) =>
              wl
                ? {
                    ...wl,
                    title: e.target.value,
                  }
                : null
            );
          }}
        />
        {saving ? (
          <p className="text-xs flex item-center gap-2 leading-3 mt-3 text-neutral-500">
            saving...
          </p>
        ) : (
          <p className="text-xs flex item-center gap-2 leading-3 mt-3 text-neutral-500">
            {workLog?.logType === "dayLog"
              ? dayjs(workLog?.date).format("DD-MM-YYYY")
              : "My logs"}{" "}
            | {workLog?.logType} | saved
            <span className="icon_size material-symbols-outlined text-neutral-500">
              {saving ? "" : "done"}
            </span>
          </p>
        )}
        <div className={`h-[${compactView ? "1em" : "3em"}]`}></div>
      </div>
      {markdownDatas.map((_markdownDat) => (
        <div key={_markdownDat.project} className="flex flex-col items-stretch">
          <p className="text-[0.5em] tracking-widest uppercase text-neutral-500 px-4">
            {_markdownDat.project} - {_markdownDat.pointInfos.length}
          </p>
          <div className=" flex flex-row items-stretch px-4 mb-3">
            {_markdownDat.content && (
              <MdxAppEditor
                key={
                  _markdownDat.pointInfos.length <= 1
                    ? "uninit"
                    : _markdownDat.project + "-" + workLog?.title
                }
                markdown={
                  _markdownDat.content
                    ? _markdownDat.content
                    : MARKDOWN_PLACHELODER
                }
                className="flex-grow h-full"
                contentEditableClassName="mdx_ce leading-1 imp-p-0 grow w-full h-full"
                onChange={(content: any) => {
                  changeMarkData(content, _markdownDat, markdownDatas);
                  //   debounceSaveWorkLogsMarkdownData(
                  //     content,
                  //     _markdownDat,
                  //     markdownDatas
                  //   );
                }}
              />
            )}
            {/* <p>{_markdownDat.content}</p> */}
            <div className="flex flex-col w-5 items-center mt-[0.35em] pr-[0.2em]">
              {_markdownDat.pointInfos.map((logPoint: any, _index: number) => (
                <div
                  key={`${logPoint?.text}${_index}`}
                  className=" h-[1.75em] flex items-center justify-center "
                >
                  <span
                    className={`icon_size material-symbols-outlined
              ${
                logPoint.status === "none"
                  ? "text-neutral-300"
                  : "text-green-500"
              }
              `}
                  >
                    {logPoint.status === "none"
                      ? "radio_button_unchecked"
                      : "task_alt"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      {!compactView && (
        <div
          id="bottom-bar"
          className="fixed bottom-[0.5rem] left-0 md:hidden right-0 mx-3 my-1 flex flex-row gap-3"
        >
          <div
            id="input-bar"
            className="flex flex-row items-center flex-grow justify-between bg-white p-2 rounded-lg shadow-md"
          >
            <span className="icon_size material-icons px-2 ">
              radio_button_unchecked
            </span>
            <input
              type="text"
              className="text-md flex-grow border-0 rounded-lg text-neutral-900 outline-none"
              placeholder="New breakdown..."
              value={newProjectText}
              onChange={(e) => {
                setNewProjectText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewProject();
              }}
            />
          </div>
          <div id="buttons" className="flex flex-row justify-between">
            <div
              onClick={() => addNewProject()}
              className="flex flex-row items-center cursor-pointer rounded-lg p-2 text-neutral-900  bg-white shadow-md"
            >
              <span className="icon_size material-icons">arrow_forward</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
