import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  Avatar,
  AvatarGroup,
  Button,
  Checkbox,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import { useCallback, useRef, useState } from "react";
import { initialTaskState } from "../../state";
import { User } from "@prisma/client";
import {
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { MARKDOWN_PLACEHOLDER } from "../../../Worklogs/WorklogTabs/TodoTab";
import { useUser } from "@/utils/hooks/useUser";
import { Spinner } from "@/components/elements/Loaders";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { toast } from "sonner";
import {
  clearEditorState,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import ToolTip from "@/components/elements/ToolTip";
import { PRIORITY, STATUSES } from "../mission.utils";
import dayjs from "dayjs";
import {
  deleteTask,
  setActiveTask,
  setAllTasks,
  updateTask,
} from "@/utils/redux/missions/missionsTasks.slice";

const TaskForm = ({ houseMembers }: { houseMembers: User[] }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const mdRef = useRef<MDXEditorMethods | null>(null);
  const { user } = useUser();
  const [assigneeDropdownRef, setAssigneeDropdownRef] = useState<any>(null);
  const isAssigneeDropdownOpen = Boolean(assigneeDropdownRef);
  const { allMissions, activeMission } = useAppSelector(
    (state: RootState) => state.mission
  );
  const { activeTask } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );

  const [taskState, setTaskState] = useState(
    activeTask || { ...initialTaskState, missionId: activeMission?.id }
  );
  const handleUserChange = useCallback(
    (selectedUserId: string) => {
      setTaskState((prevState) => ({
        ...prevState,
        assignees: prevState.assignees?.find((a) => a === selectedUserId)
          ? [...prevState.assignees?.filter((a) => a !== selectedUserId)]
          : [...prevState.assignees!, selectedUserId],
      }));
      // const selectedUser = houseMembers.find(
      //   (user) => user.id === selectedUserId
      // );

      // setTaskState((prevState) => ({
      //   ...prevState,
      //   userId: selectedUserId,
      //   avatar: selectedUser?.avatar || "",
      //   name: selectedUser?.name || "",
      //   email: selectedUser?.email || "",
      //   userInfoId: selectedUser?.id || "",
      // }));
    },
    [setTaskState, houseMembers]
  );

  const handleMarkdownChange = useCallback((content: string) => {
    const newContent = content.length === 0 ? MARKDOWN_PLACEHOLDER : content;
    mdRef?.current?.setMarkdown(newContent);
    setTaskState((prev: any) => ({ ...prev, description: content }));
  }, []);
  console.log(taskState);
  const onSubmit = async () => {
    const taskData = {
      ...taskState,
      indiePoints: Number(taskState.indiePoints) || 0,
      completedAt:
        taskState.completedAt !== activeTask?.completedAt
          ? taskState.completedAt
            ? taskState.completedAt.toISOString()
            : null
          : taskState.completedAt,
      expiresAt:
        taskState.expiresAt !== activeTask?.expiresAt
          ? taskState.expiresAt
            ? taskState.expiresAt.toISOString()
            : null
          : taskState.expiresAt,
    };
    console.log(taskData);
    setLoading(true);
    try {
      let res;
      if (taskState.id) {
        res = await PortalSdk.putData(`/api/mission-tasks`, taskData);
        toast.success("Task updated successfully!");
        dispatch(updateTask(res.data.task));
      } else {
        res = await PortalSdk.postData("/api/mission-tasks", taskState);
        toast.success("Task created successfully!");
        dispatch(setAllTasks([res.data.task]));
      }
      setLoading(false);
      dispatch(clearEditorState());
      dispatch(setEditModalOpen(false));
    } catch (error) {
      console.error("Error creating tasks:", error);
      setLoading(false);
      toast.error("Failed to create tasks");
      dispatch(setEditModalOpen(false));
      dispatch(clearEditorState());
    }
  };

  const handleDeleteTask = async () => {
    try {
      const res = await PortalSdk.deleteData(
        `/api/mission-tasks?id=${taskState.id}`,
        {}
      );
      toast.success("Task deleted successfully");
      dispatch(deleteTask(res.data.task));
      dispatch(setActiveTask(null));
      dispatch(setEditModalOpen(false));
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  console.log(taskState.priority?.value);
  return (
    <div>
      <div className="px-4 py-4 font-bold flex items-center justify-between">
        <span className="text-lg">Task</span>
        {taskState.id && (
          <Button
            startIcon={<span className="material-icons">delete</span>}
            className="!text-sm !text-red-500"
            onClick={handleDeleteTask}
          >
            Delete
          </Button>
        )}
      </div>
      <Divider />
      <div className="py-6 px-8 flex flex-col w-full">
        <input
          className="text-3xl outline-none"
          type="text"
          id="title"
          name="title"
          value={taskState.title ? taskState.title : ""}
          onChange={(e) =>
            setTaskState({ ...taskState, title: e.target.value })
          }
          placeholder="Add Task Name"
        />
        <div className="mt-8">
          <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  target
                </span>
                <span>Mission</span>
              </label>
              <select
                id="select-mission"
                value={activeMission?.title}
                onChange={(e) =>
                  setTaskState({
                    ...taskState,
                    missionId: e.target.value,
                  })
                }
                className="w-full rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              >
                <option value="" disabled>
                  Select Mission
                </option>
                {allMissions?.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.title}
                  </option>
                ))}
              </select>
              {/* </div> */}
            </div>
          </div>
          {/* <div className="flex items-center gap-4 w-full">
            <label
              className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
              htmlFor="select-mission"
            >
              <span className="material-symbols-outlined !text-base">
                target
              </span>
              <span>Indie Points</span>
            </label>
            <input
              type="number"
              id="indie-points"
              value={taskState.indiePoints}
              onChange={(e) =>
                setTaskState({
                  ...taskState,
                  indiePoints: Number(e.target.value),
                })
              }
              className="w-full rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              aria-label="Enter indie points"
            />
          </div> */}
          <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  person
                </span>
                <span>Assignees</span>
              </label>
              <div
                className="w-full cursor-pointer rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
                onClick={(e) => setAssigneeDropdownRef(e.currentTarget)}
              >
                {taskState.assignees!.length > 0 ? (
                  <div className="flex">
                    <AvatarGroup
                      sx={{
                        "& .MuiAvatar-root": {
                          width: 24,
                          height: 24,
                          fontSize: 15,
                        },
                      }}
                    >
                      {taskState.assignees?.map((assignee) => (
                        <ToolTip
                          title={
                            houseMembers.find((user) => user.id === assignee)
                              ?.name || ""
                          }
                          key={assignee}
                        >
                          <Avatar
                            src={
                              houseMembers.find((user) => user.id === assignee)
                                ?.avatar || ""
                            }
                          />
                        </ToolTip>
                      ))}
                    </AvatarGroup>
                  </div>
                ) : (
                  <div className="text-sm">Select Assignees</div>
                )}
              </div>
              <Menu
                anchorEl={assigneeDropdownRef}
                open={isAssigneeDropdownOpen}
                sx={{
                  zIndex: 10000,
                }}
                onClose={() => {
                  setAssigneeDropdownRef(null);
                }}
              >
                {houseMembers.map((member) => (
                  <MenuItem
                    className="gap-2 items-center"
                    key={member.id}
                    onClick={(e) => {
                      setAssigneeDropdownRef(null);
                      handleUserChange(member.id);
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                      }}
                      src={member.avatar || ""}
                    />
                    <span className="text-sm">{member.name}</span>
                  </MenuItem>
                ))}
              </Menu>
            </div>
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  calendar_clock
                </span>{" "}
                <span>Due Date</span>
              </label>
              <input
                type="date"
                id="due-date"
                value={dayjs(taskState.expiresAt).format("YYYY-MM-DD")}
                onChange={(e) =>
                  setTaskState((prevState) => ({
                    ...prevState,
                    expiresAt: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                className="w-full p-2 rounded-md appearance-none outline-none hover:bg-neutral-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="status"
              >
                <span className="material-symbols-outlined !text-base">
                  adjust
                </span>{" "}
                <span>Status</span>
              </label>

              <select
                id="status"
                defaultValue={taskState.status?.value}
                value={taskState.status?.value}
                onChange={(e) =>
                  setTaskState({
                    ...taskState,
                    status: {
                      value: e.target.value,
                      label:
                        STATUSES.find(
                          (status) => status.value === e.target.value
                        )?.label || "",
                      color:
                        STATUSES.find(
                          (status) => status.value === e.target.value
                        )?.color || "",
                    },
                  })
                }
                className="text-sm w-full rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              >
                {STATUSES.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      style={{ color: status.color }}
                      className="w-4 h-4 rounded-full"
                    ></span>
                    <span className="text-sm">{status.label}</span>
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 w-full">
              <label
                className="text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="status"
              >
                <span className="material-symbols-outlined !text-base">
                  flag
                </span>{" "}
                <span>Priority</span>
              </label>
              <select
                value={taskState.priority?.value}
                onChange={(e) =>
                  setTaskState({
                    ...taskState,
                    priority: {
                      value: e.target.value,
                      label:
                        PRIORITY.find(
                          (priority) => priority.value === e.target.value
                        )?.label || "",
                      color:
                        PRIORITY.find(
                          (priority) => priority.value === e.target.value
                        )?.color || "",
                    },
                  })
                }
                className="text-sm w-full rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              >
                <option value="" hidden>
                  Select Priority
                </option>
                {PRIORITY.map((priority) => (
                  <option
                    key={priority.value}
                    value={priority.value}
                    className="flex items-center gap-2"
                  >
                    <span
                      style={{ color: priority.color }}
                      className="w-4 h-4 rounded-full"
                    ></span>
                    <span>{priority.label}</span>
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  event_available
                </span>{" "}
                <span>Completed On</span>
              </label>

              <input
                type="date"
                id="completed-at"
                value={taskState.completedAt?.toISOString().split("T")[0]}
                placeholder="Empty"
                onChange={(e) =>
                  setTaskState((prevState) => ({
                    ...prevState,
                    completedAt: e.target.value
                      ? new Date(e.target.value)
                      : null,
                  }))
                }
                className="w-full p-2 rounded-md appearance-none outline-none hover:bg-neutral-100"
              />
            </div>
          </div> */}
          {/* <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div
              className="cursor-pointer flex items-center gap-4 w-full"
              onClick={(e) =>
                setTaskState({
                  ...taskState,
                  completed: !taskState.completed,
                })
              }
            >
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="completed"
              >
                <span className="material-symbols-outlined !text-base">
                  check_circle
                </span>{" "}
                <span>Is Completed?</span>
              </label>
              <div className="w-full">
                <Checkbox checked={Boolean(taskState.completed)} />
              </div>
            </div>
            <div
              className="cursor-pointer flex items-center gap-4 w-full"
              onClick={(e) =>
                setTaskState({
                  ...taskState,
                  expirable: !taskState.expirable,
                })
              }
            >
              <label
                htmlFor="completed"
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
              >
                <span className="material-symbols-outlined !text-base">
                  timer
                </span>{" "}
                <span>Expirable?</span>
              </label>
              <div className="w-full">
                <Checkbox checked={Boolean(taskState.expirable)} />
              </div>
            </div>
          </div> */}
          <div className="mt-6">
            <label
              className="w-full text-lg mb-4 font-bold text-neutral-400 flex items-center gap-2"
              htmlFor="Description"
            >
              {/* <span className="material-symbols-outlined !text-base">
                interests
              </span>{" "} */}
              <span>Description</span>
            </label>
            <div className="h-[180px] overflow-y-scroll border border-gray-300 rounded-md p-3 bg-white">
              <MdxAppEditor
                ref={mdRef}
                toMarkdownOptions={{
                  bullet: "*",
                }}
                plugins={[
                  headingsPlugin(),
                  listsPlugin(),
                  linkPlugin(),
                  quotePlugin(),
                  markdownShortcutPlugin(),
                  thematicBreakPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <>
                        {" "}
                        <BoldItalicUnderlineToggles />
                        <CreateLink />
                      </>
                    ),
                  }),
                ]}
                key={`${user?.id}`}
                editorKey={`${user?.id}`}
                markdown={
                  taskState.description?.trim().length === 0 ||
                  taskState.description === null ||
                  taskState.description === undefined
                    ? ""
                    : taskState.description
                }
                className="w-full h-full"
                contentEditableClassName={`mdx_ce ${
                  taskState.description?.trim() === MARKDOWN_PLACEHOLDER.trim()
                    ? "mdx_uninit"
                    : ""
                } `}
                onChange={handleMarkdownChange}
              />
            </div>
          </div>

          <div className="flex w-full ml-auto justify-self-end justify-end gap-4 mt-6 ">
            <Button
              onClick={() => {
                dispatch(clearEditorState());
                dispatch(setEditModalOpen(false));
              }}
              variant="outlined"
              className="!w-full  hover:!bg-neutral-100"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              className="!w-full !bg-neutral-900 hover:!bg-neutral-800 !text-white"
            >
              {loading ? <Spinner className="w-6 h-6 text-white" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
