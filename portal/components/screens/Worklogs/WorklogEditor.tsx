'use client';

import { LOGLINKTYPE, WorkLogPoints } from '@/utils/@types/interfaces';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { WorkLogs } from '@prisma/client';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createRef,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_MARKDOWN_DATA } from './WorklogsHelper';
import { useDebouncedEffect } from '@/utils/hooks/useDebouncedHook';
import store, { useAppDispatch } from '@/utils/redux/store';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import {
  setEdiotrSaving,
  updateLogs,
} from '@/utils/redux/worklogs/worklogs.slice';
import {
  Popover,
  IconButton,
  Drawer,
  Dialog,
  DialogContent,
} from '@mui/material';
import EmojiLegend from './WorklogTabs/EmojiLegend';
import TodoTab from './WorklogTabs/TodoTab';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { toast } from 'sonner';

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

const CustomLoader = () => (
  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-t-2 border-neutral-800"></div>
);

const SavingDialog = ({
  open,
  isSaved,
}: {
  open: boolean;
  isSaved?: boolean;
}) => (
  <Dialog
    className={`!z-50`}
    open={open}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
  >
    <DialogContent id="alert-dialog-title" className="flex items-center gap-2">
      {isSaved ? (
        <span
          className={`${isSaved ? 'text-green-500' : ''} material-symbols-outlined`}
        >
          {' '}
          task_alt{' '}
        </span>
      ) : (
        <CustomLoader />
      )}

      <span className={isSaved ? 'text-green-500' : ''}>
        {isSaved ? 'Saved!' : 'Saving...'}
      </span>
    </DialogContent>
  </Dialog>
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
}: {
  loading: boolean;
  editWorkLogs: WorkLogs | null;
  refreshWorklogs: () => void;
  compactView?: boolean;
  monthTab?: number;
  setMonthTab?: (month: number) => void;
  handleNextMonthClick?: () => void;
  fetchXTasksForDay: (date: string) => Promise<WorkLogs | null>;
  fetchOptions: { label: string; date: string }[];
}) => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const [openTodo, setOpenTodo] = useState<boolean>(false);
  const [markdownDatas, setMarkdownDatas] = useState<WorkLogPoints[]>(
    DEFAULT_MARKDOWN_DATA,
  );
  const [newProjectText, setNewProjectText] = useState<string>('');
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
  const handleBackButtonClick = () => {
    if (saving || !isAutoSaved) setIsSavingModalOpen(true);
    if (!saving && isAutoSaved) router.replace(APP_ROUTES.userWorklogs);
  };

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

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
        ...workLog,
        userId: user?.id,
        works: markdownDatas,
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
    [workLog],
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
    markdownRefs.current[bd_index]?.current?.setMarkdown(new_content);
  };
  useDebouncedEffect(
    () => {
      if (saving) return;
      if (
        JSON.stringify(serverLog) === JSON.stringify(workLog) ||
        !editWorkLogs ||
        !workLog ||
        !isAuotSaving
      ) {
        return;
      }
      // console.log("saving... ", workLog);
      saveWorkLog(workLog as any);
    },
    [serverLog, workLog],
    3000,
  );

  const addNewProject = () => {
    if (
      !newProjectText ||
      markdownDatas.find(
        (md) => md.title?.toLowerCase() === newProjectText?.toLowerCase(),
      ) ||
      newProjectText.trim().length <= 0
    )
      return;
    setMarkdownDatas((md) => {
      const new_md = [
        ...md,
        {
          link_id: newProjectText.toLowerCase().replace(/\s/g, '-'),
          link_type: LOGLINKTYPE.ABSTRACT,
          icon: 'work',
          title: newProjectText,
          content: MARKDOWN_PLACHELODER,
        },
      ];
      setWorkLog((wl: any) => ({ ...wl, works: new_md }));
      return new_md;
    });
    setNewProjectText('');
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
    setOpenTodo(true);
  };
  const handleCloseTodo = () => {
    setOpenTodo(false);
  };
  const togglePopup = () => {
    setShowPopup(!showPopup);
  };
  const popupRef = useRef<HTMLDivElement | null>(null);
  const handleClickOutside = (event: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
      setShowPopup(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      className="flex min-h-screen flex-col md:max-w-[800px]"
    >
      {!compactView && (
        <div
          id="header"
          className="mt-4 flex flex-row items-center justify-between gap-4 md:mt-0 md:justify-end"
        >
          <div className="flex items-center gap-2">
            <div className="ml-2 flex items-center overflow-hidden rounded-full md:hidden">
              <IconButton>
                <div onClick={handleBackButtonClick} className="px-1">
                  <span className="material-icons !text-3xl text-neutral-900 hover:text-neutral-700 md:!text-2xl">
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
              <div className="mr-2 mt-4 h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-700 p-2"></div>
            ) : (
              <div
                onClick={refreshWorklogs}
                className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
              >
                <span className="material-icons !text-3xl md:!text-2xl">
                  refresh
                </span>
              </div>
            )}
            <div className="hidden cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700 max-sm:block">
              <span
                className="material-icons !text-3xl md:!text-2xl"
                onClick={handleClick}
                aria-describedby={id}
              >
                emoji_objects
              </span>
            </div>
            <div className="hidden cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700 max-sm:block">
              <span
                className="material-icons !text-3xl md:!text-2xl"
                onClick={handleClickTodo}
                aria-describedby={id}
              >
                format_list_bulleted
              </span>
            </div>
            <Popover
              id={id}
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              sx={{
                '.MuiPopover-paper': {
                  backgroundColor: '#fff',
                  color: '#333',
                  borderRadius: '12px',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
                  padding: '0px 16px',
                  maxWidth: '90%',
                },
                my: '8px',
              }}
            >
              <div className="px-2 pb-4 pt-0">
                <EmojiLegend />
              </div>
            </Popover>
            <Drawer
              anchor="bottom"
              open={openTodo}
              onClose={handleCloseTodo}
              sx={{
                '.MuiDrawer-paper': {
                  backgroundColor: '#fff',
                  padding: '24px',
                  borderRadius: '16px 16px 0 0',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
                  height: '90vh',
                },
              }}
            >
              <div className="absolute right-0 top-4 hidden w-10 cursor-pointer text-neutral-900 hover:text-neutral-700 max-sm:block">
                <span
                  className="material-icons !text-3xl md:!text-2xl"
                  onClick={handleCloseTodo}
                >
                  close_icon
                </span>
              </div>
              <TodoTab userId={user?.id as string} />
            </Drawer>
            <div
              className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
              onClick={togglePopup}
            >
              <span className="material-icons !text-3xl md:!text-2xl">
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
                        key={option.date}
                        className="cursor-pointer p-2 hover:bg-neutral-100"
                        onClick={() => {
                          fetchXTasksForDay(option.date).then(
                            (updatedWorkLog) => {
                              setWorkLog(updatedWorkLog);
                              setShowPopup(false);
                            },
                          );
                        }}
                      >
                        {option.label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 hidden flex-col max-sm:flex">
                    <div
                      className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
                      onClick={handleClick}
                    >
                      <span className="material-icons text-4xl">
                        emoji_objects
                      </span>
                    </div>
                    <div
                      className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700"
                      onClick={handleClickTodo}
                    >
                      <span className="material-icons text-4xl">
                        format_list_bulleted
                      </span>
                    </div>
                  </div>
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
      <div className="mb-4 p-4">
        <div className="flex w-full items-center justify-between">
          <input
            disabled
            type="text"
            className="bg-transparent text-2xl outline-none"
            placeholder="Jotdown a new project/task/goal..."
            value={workLog?.title || 'March 27 - Sunday'}
          />
        </div>
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
        <div className={`h-[${compactView ? '1em' : '3em'}]`}></div>
      </div>
      {markdownDatas.map((_markdownDat, bd_index) => (
        <div
          key={_markdownDat.link_id}
          className="flex-grow-1 flex flex-col items-stretch"
        >
          <p className="mb-2 px-4 text-[0.8em] uppercase tracking-widest text-neutral-500">
            {_markdownDat.title} - {getStatsOfContent(_markdownDat.content)}
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
                className="h-full flex-grow"
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
          className="fixed bottom-[0.5rem] left-0 right-0 mx-3 my-1 flex flex-row gap-3 md:hidden"
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
      <SavingDialog
        open={isSavingModalOpen}
        isSaved={!saving && (isAutoSaved as boolean)}
      />
    </div>
  );
};
