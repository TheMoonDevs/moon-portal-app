"use client";

import { LOGLINKTYPE, WorkLogPoints } from "@/utils/@types/interfaces";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WorkLogs } from "@prisma/client";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  createRef,
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
import { MDXEditorMethods } from "@mdxeditor/editor";

const MARKDOWN_PLACHELODER = `* `;

export const WorklogEditor = ({
  loading,
  editWorkLogs,
  refreshWorklogs,
  compactView = false,
}: {
  loading: boolean;
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
    const new_content = content.replaceAll(":check:", "✅");
    const new_md = _fullpoints.map((_md) => {
      if (_md.link_id === _markdownDat.link_id) {
        return {
          ..._md,
          content:
            new_content.trim().length <= 0 ? MARKDOWN_PLACHELODER : new_content,
        };
      }
      return _md;
    });
    console.log(new_content);
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
    if (
      !newProjectText ||
      markdownDatas.find(
        (md) => md.title?.toLowerCase() === newProjectText?.toLowerCase()
      ) ||
      newProjectText.trim().length <= 0
    )
      return;
    setMarkdownDatas((md) => {
      const new_md = [
        ...md,
        {
          link_id: newProjectText.toLowerCase().replace(/\s/g, "-"),
          link_type: LOGLINKTYPE.ABSTRACT,
          icon: "work",
          title: newProjectText,
          content: MARKDOWN_PLACHELODER,
        },
      ];
      setWorkLog((wl: any) => ({ ...wl, works: new_md }));
      return new_md;
    });
    setNewProjectText("");
  };

  const markdownRefs = useRef<RefObject<MDXEditorMethods>[]>([]);

  useEffect(() => {
    if (markdownDatas.length != markdownRefs.current.length) {
      markdownRefs.current = markdownDatas.map((_, i) => {
        return createRef<MDXEditorMethods>();
      });
    }
  }, [markdownRefs, markdownDatas]);

  const insertToContent = (text: string, index?: number) => {
    //console.log("inserting ", text, index);
    if (index != undefined)
      console.log(
        "inserting ",
        text,
        index,
        markdownRefs.current[index]?.current
      );
    markdownRefs.current[index || 0]?.current?.insertMarkdown(text);
  };

  const getStatsOfContent = (content: string) => {
    const _content = content.replaceAll(":check:", "✅");
    // how many times ✅ is there in content
    const checks = (_content.match(/✅/g) || []).length;
    const points = (_content.match(/\*/g) || []).length;
    return `${checks} / ${points}`;
  };

  return (
    <div className="flex flex-col md:max-w-[800px]">
      {!compactView && (
        <div id="header" className="flex flex-row justify-between">
          <Link
            href={APP_ROUTES.userWorklogs}
            className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
          >
            <span className="icon_size material-icons">arrow_back</span>
          </Link>
          <div className="flex flex-row gap-1">
            {/* <div
              onClick={() => insertToContent("✅")}
              className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
            >
              <span className="icon_size material-icons">✅</span>
            </div> */}
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 p-2 mt-2 border-t-2 border-b-2 border-neutral-700"></div>
            ) : (
              <div
                onClick={refreshWorklogs}
                className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
              >
                <span className="icon_size material-icons">refresh</span>
              </div>
            )}
            <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
              <span className="icon_size material-icons">more_vert</span>
            </div>
            {!isAutoSaved && !loading && (
              <button
                onClick={() => saveWorkLog(workLog as any)}
                className="cursor-pointer rounded-lg p-2 text-green-500"
              >
                <span className="icon_size material-icons">done_all</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-4  mb-4">
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
      {markdownDatas.map((_markdownDat, bd_index) => (
        <div key={_markdownDat.link_id} className="flex flex-col items-stretch">
          <p className="text-[0.8em] mb-2 tracking-widest uppercase text-neutral-500 px-4">
            {_markdownDat.title} - {getStatsOfContent(_markdownDat.content)}
          </p>
          <div
            className=" flex flex-row items-stretch px-4 mb-3"
            onKeyUp={(e) => {
              //console.log("keyup", e.key);
              // detect ctrl + space
              if (e.ctrlKey && e.key === " ") {
                console.log("✅ pressed");
                insertToContent("✅", bd_index);
              }
            }}
          >
            {_markdownDat.content && (
              <MdxAppEditor
                // autoFocus={bd_index === 0 ? true : false}
                ref={
                  bd_index < markdownRefs.current.length
                    ? markdownRefs.current[bd_index]
                    : null
                }
                key={
                  _markdownDat.content.trim().length <= 1 || loading
                    ? "uninit"
                    : _markdownDat.link_id + "-" + workLog?.title
                }
                markdown={
                  _markdownDat.content.length > 1
                    ? _markdownDat.content
                    : MARKDOWN_PLACHELODER
                }
                className="flex-grow h-full"
                contentEditableClassName="mdx_ce leading-1 imp-p-0 grow w-full h-full"
                onChange={(content: any) => {
                  changeMarkData(content, _markdownDat, markdownDatas);
                  //   debounceSaveWorkLogsMarkdownData(
                  //     content,
                  //     _markdownDat,s
                  //     markdownDatas
                  //   );
                }}
              />
            )}
            {/* <p>{_markdownDat.content}</p> */}
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
              <span className="icon_size material-icons">add</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
