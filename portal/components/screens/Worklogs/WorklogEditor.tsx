'use client';

import type { Engagement, WorkLogs } from '@db/client';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { RefObject } from 'react';
import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import CustomDrawer from '@/components/elements/Drawer';
import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useDebouncedEffect } from '@/utils/hooks/useDebouncedHook';
import { useUser } from '@/utils/hooks/useUser';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setEdiotrSaving,
  setSelectedEngagement,
  updateLogs,
} from '@/utils/redux/worklogs/worklogs.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { DEFAULT_MARKDOWN_DATA } from './WorklogsHelper';
import EmojiLegend from './WorklogTabs/EmojiLegend';
import TodoTab from './WorklogTabs/TodoTab';

export const MARKDOWN_PLACHELODER = `* `;

export const getStatsOfContent = (content: string) => {
  //const _content = content.replaceAll(":check:", "✅");
  // how many times ✅ is there in content
  // console.log(content);
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  // console.log(content);
  return `${checks} / ${points}`;
};

const getPrivateLineCount = (content: string) => {
  return content
    .split('\n')
    .filter((line) => /^\s*(\*\s*)?p:/i.test(line))
    .length;
};

const CustomLoader = () => (
  <div className="mr-2 size-3 animate-spin rounded-full border-y-2 border-neutral-800"></div>
);

interface StatusDialogProps {
  open: boolean;
  status: boolean;
  loadingText: string;
  successText: string;
}

const StatusDialog = ({
  open,
  status,
  loadingText,
  successText,
}: StatusDialogProps) => (
  <Dialog
    className="!z-50"
    open={open}
    aria-labelledby="status-dialog-title"
    aria-describedby="status-dialog-description"
  >
    <DialogContent id="status-dialog-title" className="flex items-center gap-2">
      {status ? (
        <span className="material-symbols-outlined text-green-500">
          task_alt
        </span>
      ) : (
        <CustomLoader />
      )}

      <span className={status ? 'text-green-500' : ''}>
        {status ? successText : loadingText}
      </span>
    </DialogContent>
  </Dialog>
);

const SavingDialog = ({
  open,
  isSaved,
}: {
  open: boolean;
  isSaved?: boolean;
}) => (
  <StatusDialog
    open={open}
    status={isSaved ?? false}
    loadingText="Saving..."
    successText="Saved!"
  />
);

const ImportingDialog = ({
  open,
  imported,
}: {
  open: boolean;
  imported?: boolean;
}) => (
  <StatusDialog
    open={open}
    status={imported ?? false}
    loadingText="Importing..."
    successText="Done!"
  />
);

export const WorklogEditor = ({
  loading,
  editWorkLogs,
  refreshWorklogs,
  compactView = false,
  monthTab = 0,
  setMonthTab,
  handleNextMonthClick,
  fetchXTasksForDay,
  fetchOptions,
  engagements,
}: {
  loading: boolean;
  editWorkLogs: WorkLogs | null;
  refreshWorklogs: () => void;
  compactView?: boolean;
  monthTab?: number;
  setMonthTab?: (month: number) => void;
  handleNextMonthClick?: () => void;
  fetchXTasksForDay: (date: string) => Promise<WorkLogs | null>;
  fetchOptions: { label: string; dateIdx: number }[];
  engagements: Engagement[];
}) => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const [openDrawer, setOpenDrawer] = useState<'emoji_legend' | 'todo'>();
  const [markdownDatas, setMarkdownDatas] = useState<WorkLogPoints[]>(
    DEFAULT_MARKDOWN_DATA,
  );
  const queryParams = useSearchParams();
  const [serverLog, setServerLog] = useState<WorkLogs | null>(null);
  const [workLog, setWorkLog] = useState<WorkLogs | null>(null);
  const _date = queryParams?.get('date');
  const [saving, setSaving] = useState<boolean>(false);
  const isAuotSaving = useRef(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [isSavingModalOpen, setIsSavingModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const [importing, setImporting] = useState<{
    importing: boolean;
    loader: boolean;
  }>({
    importing: false,
    loader: false,
  });
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const { selectedEngagement } = useAppSelector((state) => state.worklogs);

  const path = usePathname();
  useEffect(() => {
    if (!importing.importing)
      setTimeout(
        () => setImporting((prev) => ({ ...prev, loader: false })),
        1000,
      );
  }, [importing.importing]);
  const handleBackButtonClick = () => {
    if (saving || !isAutoSaved) setIsSavingModalOpen(true);
    if (!saving && isAutoSaved) router.replace(APP_ROUTES.userWorklogs);
  };

  const isAutoSaved = useMemo(() => {
    return (
      JSON.stringify(serverLog) === JSON.stringify(workLog) &&
      serverLog &&
      workLog
    );
  }, [serverLog, workLog]);

  useEffect(() => {
    if (!isAutoSaved && !loading) {
      dispatch(setEdiotrSaving(true));
    } else {
      dispatch(setEdiotrSaving(false));
    }
  }, [isAutoSaved, loading, dispatch]);

  useEffect(() => {
    const setSavedModalState = () => {
      setIsSavingModalOpen(false);
      router.replace(APP_ROUTES.userWorklogs);
    };
    if (!saving && isAutoSaved && isSavingModalOpen) {
      setTimeout(() => setSavedModalState(), 1000);
    }
  }, [saving, isAutoSaved, isSavingModalOpen]);

  useEffect(() => {
    if (!user) return;
    if (!editWorkLogs) {
      setWorkLog({
        id: '',
        userId: user?.id,
        logType: 'dayLog',
        title: `${dayjs().format('MMMM DD')}  - ${dayjs().format('dddd')}`,
        date: dayjs().format('YYYY-MM-DD'),
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
    isAuotSaving.current = true;
  }, [editWorkLogs]);

  const saveWorkLog = useCallback(
    (
      _workLog: { works: WorkLogPoints[] } | null,
      workData?: WorkLogPoints[],
    ) => {
      if (!user?.id) return;
      const worklogToSave = _workLog ?? workLog;
      if (!worklogToSave) return;
      //   console.log({
      //     ..._workLog,
      //     userId: _user?.id,
      //     works: _workLog.works || markdownDatas,
      //   });
      setSaving(true);
      //let _worklog: WorkLogs | null = workLog ? { ...workLog } : null;
      PortalSdk.putData(`/api/user/worklogs`, {
        ...worklogToSave,
        userId: user?.id,
        works: workData ? workData : worklogToSave.works || markdownDatas,
        updatedAt: new Date(),
      })
        .then((data) => {
          setSaving(false);
          if (!data?.data?.workLogs) return;
          setWorkLog(data?.data?.workLogs);
          setServerLog(data?.data?.workLogs);
          dispatch(updateLogs(data?.data?.workLogs));
          console.log('saved', data?.data?.workLogs);
        })
        .catch((err) => {
          setSaving(false);
          console.log(err);
        });
    },
    [workLog, markdownDatas, user?.id, dispatch],
  );

  const changeMarkData = (
    content: string,
    bd_index: number,
    _markdownDat: WorkLogPoints,
    _fullpoints: WorkLogPoints[],
  ) => {
    // console.log(content);
    const emojiMap: { [key: string]: string } = {
      ':check:': '✅',
      ':cross:': '❌',
      ':yellow:': '🟡',
      ':red:': '🔴',
      ':calendar:': '📅',
      ':pencil:': '✏️',
      ':bulb:': '💡',
      ':question:': '❓',
      ':star:': '⭐',
    };

    let new_content = content;

    for (const text in emojiMap) {
      new_content = new_content.replaceAll(text, emojiMap[text]);
    }
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
    // console.log(new_content);
    setMarkdownDatas(new_md);
    setWorkLog((wl: any) => ({
      ...wl,
      works: new_md as any[],
    }));
    isAuotSaving.current = true;
  };

  useDebouncedEffect(
    () => {
      if (saving) return;
      if (
        JSON.stringify(serverLog) === JSON.stringify(workLog) ||
        !workLog ||
        !isAuotSaving.current
      ) {
        return;
      }
      // console.log("saving... ", workLog);
      saveWorkLog(workLog as any);
    },
    [serverLog, workLog],
    3000,
  );

  const addNewProject = ({
    type,
    projectTitle,
    id,
  }: {
    type: LOGLINKTYPE;
    projectTitle: string;
    id: string;
  }) => {
    if (
      !projectTitle ||
      markdownDatas.find(
        (md) => md.title?.toLowerCase() === projectTitle?.toLowerCase(),
      ) ||
      projectTitle.trim().length <= 0
    )
      return;
    setMarkdownDatas((md) => {
      const new_md = [
        ...md,
        {
          link_id: id, //projectTitle.toLowerCase().replace(/\s/g, '-')
          link_type: type,
          icon: 'work',
          title: projectTitle,
          content: MARKDOWN_PLACHELODER,
        },
      ];
      setWorkLog((wl: any) => ({ ...wl, works: new_md }));
      return new_md;
    });
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
        'inserting ',
        text,
        index,
        markdownRefs.current[index]?.current,
      );
    markdownRefs.current[index || 0]?.current?.insertMarkdown(text);
  };

  const lastDateOfSelectedMonth = dayjs()
    .month(monthTab || 0)
    .endOf('month');

  const handleMonthChange = () => {
    if (handleNextMonthClick) {
      handleNextMonthClick();
    }
  };
  const handleClickTodo = () => {
    setOpenDrawer('todo');
  };
  const handleCloseDrawer = () => {
    setOpenDrawer(undefined);
  };

  const handleClickEmojiLegend = (event: any) => {
    setOpenDrawer('emoji_legend');
  };
  const togglePopup = () => {
    setShowPopup(!showPopup);
  };
  const popupRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
      setShowPopup(false);
    }
  };

  const handleClickOutsideSelect = (event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node)
    ) {
      setIsSelectOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutsideSelect);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSelect);
    };
  }, []);

  useEffect(() => {
    const handleSaveHotkeys = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        saveWorkLog(workLog as any);
      } else if (key === 'r') {
        event.preventDefault();
        refreshWorklogs();
      }
    };
    window.addEventListener('keydown', handleSaveHotkeys);
    return () => {
      window.removeEventListener('keydown', handleSaveHotkeys);
    };
  }, [saveWorkLog, refreshWorklogs, workLog]);

  const filteredEngagements = engagements.filter(
    (engagement) =>
      // engagement.title !== selectedEngagement?.title ||
      !markdownDatas.some((data) => data.title === engagement.title),
  );

  return (
    <div
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          console.log('Saving Worklogs');
          saveWorkLog(workLog as any);
        }
        if (e.ctrlKey && e.key === 'r') {
          e.preventDefault();
          console.log('Refreshing Worklogs');
          refreshWorklogs();
        }
      }}
      className="flex min-h-[50vh] flex-col md:max-w-[800px]"
    >
      {!compactView && (
        <div
          id="header"
          className="mt-2 flex flex-row items-center justify-between gap-4 md:mt-0 md:justify-end"
        >
          <div className="flex items-center gap-2">
            <div className="ml-2 flex items-center overflow-hidden rounded-full md:hidden">
              <IconButton>
                <div onClick={handleBackButtonClick} className="px-1">
                  <span className="material-icons !text-2xl text-neutral-900 hover:text-neutral-700">
                    arrow_back
                  </span>
                </div>
              </IconButton>
              {workLog?.date &&
                dayjs(workLog.date).isSame(lastDateOfSelectedMonth, 'day') && (
                  <IconButton
                    sx={{ fontSize: '16px' }}
                    onClick={handleMonthChange}
                  >
                    <span className="icon_size material-icons text-neutral-900 hover:text-neutral-700">
                      arrow_forward
                    </span>
                  </IconButton>
                )}
            </div>
            <button
              disabled={saving || (isAutoSaved as boolean)}
              onClick={() => saveWorkLog(workLog as any)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 p-2 px-3 text-sm text-neutral-400 md:ml-3 ${!saving && !isAutoSaved && '!bg-green-100 !text-green-500'}`}
            >
              {saving ? (
                <CustomLoader />
              ) : !isAutoSaved ? (
                <span className="icon_size material-icons">save</span>
              ) : (
                <span className="icon_size material-icons">done_all</span>
              )}

              <span>
                {saving ? 'Saving...' : isAutoSaved ? 'Saved' : 'Save'}
              </span>
            </button>
          </div>

          <div className="flex flex-row gap-1">
            {/* <div
              onClick={() => insertToContent("✅")}
              className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
            >
              <span className="icon_size material-icons">✅</span>
            </div> */}
            {loading ? (
              <div className="mr-2 mt-4 size-5 animate-spin rounded-full border-y-2 border-neutral-700 p-2"></div>
            ) : (
              <div
                onClick={refreshWorklogs}
                className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
              >
                <span className="material-icons !text-2xl !text-neutral-600">
                  refresh
                </span>
              </div>
            )}
            <div className="hidden cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700 max-sm:block">
              <span
                className="material-icons !text-2xl !text-neutral-600"
                onClick={handleClickEmojiLegend}
              >
                emoji_objects
              </span>
            </div>
            <div className="hidden cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700 max-sm:block">
              <span
                className="material-icons !text-2xl !text-neutral-600"
                onClick={handleClickTodo}
              >
                format_list_bulleted
              </span>
            </div>
            <CustomDrawer
              open={openDrawer === 'emoji_legend'}
              onClose={handleCloseDrawer}
            >
              <EmojiLegend />
            </CustomDrawer>
            <CustomDrawer
              open={openDrawer === 'todo'}
              onClose={handleCloseDrawer}
              height="50vh"
            >
              <TodoTab userId={user?.id as string} />
            </CustomDrawer>
            <div
              className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
              onClick={togglePopup}
            >
              <span className="material-icons !text-2xl !text-neutral-600">
                more_vert
              </span>
              {showPopup && (
                <div
                  ref={popupRef}
                  className="popup absolute z-10 mt-3 rounded-lg bg-white p-4 text-lg shadow-lg max-sm:right-0 max-sm:text-base"
                >
                  <ul>
                    {fetchOptions.map((option) => (
                      <li
                        key={option.dateIdx}
                        className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-neutral-100"
                        onClick={() => {
                          setImporting((prev) => ({
                            ...prev,
                            importing: true,
                            loader: true,
                          }));
                          if (saving) {
                            toast.warning('Saving... Please Wait!');
                            return;
                          }
                          fetchXTasksForDay(
                            dayjs(workLog?.date)
                              .subtract(option.dateIdx, 'day')
                              .format('YYYY-MM-DD'),
                          ).then((updatedWorkLog) => {
                            const newWorks = updatedWorkLog?.works as any;
                            saveWorkLog(updatedWorkLog as any, newWorks);
                            setShowPopup(false);
                            setImporting((prev) => ({
                              ...prev,
                              importing: false,
                            }));
                            refreshWorklogs();
                          });
                        }}
                      >
                        <span className="material-icons-outlined !text-neutral-600">
                          {' '}
                          download
                        </span>
                        <span>{option.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* {!isAutoSaved && !loading && (
                <button
                  onClick={() => saveWorkLog(workLog as any)}
                  className="cursor-pointer rounded-lg p-2 text-green-500"
                >
                  <span className="icon_size material-icons">done_all</span>
                </button>
              )} */}
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex w-full items-center justify-between">
          <input
            disabled
            type="text"
            className="bg-transparent text-2xl outline-none"
            placeholder="Jotdown a new project/task/goal..."
            value={workLog?.title || 'March 27 - Sunday'}
          />
        </div>
        <div className="relative flex items-start justify-between">
          <div className="item-center mt-3 flex gap-2 text-xs leading-3 text-neutral-500">
            {saving && <CustomLoader />}
            {workLog?.logType === 'dayLog'
              ? dayjs(workLog?.date).format('DD-MM-YYYY')
              : 'My logs'}{' '}
            {/* | {workLog?.logType}  */}|{' '}
            {saving
              ? 'saving...'
              : loading
                ? 'fetching..'
                : !isAutoSaved
                  ? 'In-Edit'
                  : 'Saved'}
            <span className="icon_size material-symbols-outlined text-neutral-500">
              {!isAutoSaved ? 'edit' : 'done'}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="material-symbols-outlined !text-sm">lock</span>
          <span>
            Prefix a line with <code>p:</code> to mark it private for other users.
          </span>
        </div>
        <div className={`h-[${compactView ? '1em' : '3em'}]`}></div>
      </div>
      {markdownDatas.map((_markdownDat, bd_index) => (
        <div
          key={_markdownDat.link_id}
          className="grow-1 flex flex-col items-stretch"
        >
          <p className="mb-2 px-4 text-[0.8em] uppercase tracking-widest text-neutral-500">
            {_markdownDat.title} - {getStatsOfContent(_markdownDat.content)}
            {getPrivateLineCount(_markdownDat.content) > 0 && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-amber-700">
                <span className="material-symbols-outlined mr-1 !text-[10px]">
                  lock
                </span>
                {getPrivateLineCount(_markdownDat.content)} private
              </span>
            )}
          </p>
          <div
            className="relative mb-3 flex flex-row items-stretch px-4"
            onKeyDown={(e) => {
              //console.log("keyup", e.key);
              // detect ctrl + space
              if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                // console.log("✅ pressed");
                insertToContent('✅', bd_index);
              }
              if (e.ctrlKey && e.key === 'q') {
                e.preventDefault();
                insertToContent('❌', bd_index);
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
                  loading
                    ? 'uninit'
                    : workLog?.id +
                      '-' +
                      _markdownDat.link_id +
                      '-' +
                      workLog?.title
                }
                editorKey={
                  loading
                    ? 'uninit'
                    : workLog?.id +
                      '-' +
                      _markdownDat.link_id +
                      '-' +
                      workLog?.title
                }
                markdown={
                  _markdownDat.content.trim().length != 0
                    ? _markdownDat.content
                    : MARKDOWN_PLACHELODER
                }
                className="h-full grow"
                contentEditableClassName={`mdx_ce ${
                  _markdownDat.content.trim() == MARKDOWN_PLACHELODER.trim()
                    ? ' mdx_uninit '
                    : ''
                } leading-1 imp-p-0 grow w-full h-full`}
                onChange={(content: any) => {
                  changeMarkData(
                    content,
                    bd_index,
                    _markdownDat,
                    markdownDatas,
                  );
                  //   debounceSaveWorkLogsMarkdownData(
                  //     content,
                  //     _markdownDat,s
                  //     markdownDatas
                  //   );
                }}
              />
            )}
            {(_markdownDat.content.trim().length <= 0 ||
              _markdownDat.content.trim() === MARKDOWN_PLACHELODER.trim()) &&
              !loading && (
                <span className="mdx_placeholder">Jotdown your thougts...</span>
              )}
            {/* <p>{_markdownDat.content}</p> */}
          </div>
        </div>
      ))}
      {!compactView && (
        <div
          id="bottom-bar"
          className="fixed inset-x-0 bottom-2 mx-3 my-1 flex flex-row gap-3 md:hidden"
        >
          {/* <div
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
          </div> */}
        </div>
      )}
      <div className="relative px-2 pb-1">
        {path?.includes('user/worklogs') && engagements.length > 0 && (
          <>
            <button
              className={`flex w-fit cursor-pointer items-start justify-start rounded-md bg-transparent px-3 py-1 text-[0.8em] uppercase tracking-widest text-neutral-300 transition-all duration-300 hover:border hover:border-neutral-400 hover:text-neutral-500 ${isSelectOpen && 'border border-neutral-400 text-neutral-500'}`}
              onClick={() => setIsSelectOpen(!isSelectOpen)}
            >
              <p className="flex items-center gap-2 font-medium">
                <span
                  className={`material-symbols-outlined transition-transform duration-300 ${
                    isSelectOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  {!isSelectOpen ? 'add' : 'remove'}
                </span>
                Engagement
              </p>
            </button>

            <div
              ref={selectRef}
              className={`absolute left-2 top-full z-20 mt-0 w-fit rounded-md border border-neutral-400 bg-white shadow-lg transition-all duration-300 ease-in-out ${
                isSelectOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
              } overflow-hidden`}
            >
              <div className="no-scrollbar max-h-60 overflow-y-auto">
                {filteredEngagements.length > 0 ? (
                  filteredEngagements.map((eng: Engagement) => (
                    <div
                      key={eng.id}
                      onClick={() => {
                        dispatch(setSelectedEngagement(eng));
                        if (selectedEngagement)
                          addNewProject({
                            type: LOGLINKTYPE.ENGAGEMENT,
                            projectTitle: eng.title,
                            id: selectedEngagement?.id,
                          });
                        setIsSelectOpen(false);
                      }}
                      className="block w-full cursor-pointer px-4 py-2 text-left text-xs transition-colors duration-300 hover:bg-neutral-100 focus:bg-neutral-100"
                    >
                      {eng.title}
                    </div>
                  ))
                ) : (
                  <div
                    className="block w-full cursor-pointer px-4 py-2 text-left text-xs transition-colors duration-300 hover:bg-neutral-100 focus:bg-neutral-100"
                    onClick={() => setIsSelectOpen(false)}
                  >
                    No Engagements
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <SavingDialog
        open={isSavingModalOpen}
        isSaved={!saving && (isAutoSaved as boolean)}
      />
      <ImportingDialog
        open={importing.loader}
        imported={!importing.importing}
      />
    </div>
  );
};
