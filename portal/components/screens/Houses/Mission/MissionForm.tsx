import { HOUSEID, Mission } from "@prisma/client";
import { initialMissionState } from "../state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/utils/hooks/useUser";
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
import { MARKDOWN_PLACEHOLDER } from "../../Worklogs/WorklogTabs/TodoTab";
import { Button, Divider } from "@mui/material";
import dayjs from "dayjs";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { Spinner } from "@/components/elements/Loaders";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { toast } from "sonner";
import {
  clearEditorState,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import { PRIORITY, STATUSES } from "./mission.utils";
import { HOUSES_LIST } from "../HousesList";
import {
  setAddMission,
  setDeleteMission,
  setUpdateMission,
} from "@/utils/redux/missions/mission.slice";

const housesList = [
  { label: "Management", value: "MANAGEMENT" },
  { label: "Growth", value: "GROWTH" },
  { label: "Product Tech", value: "PRODUCT_TECH" },
  { label: "Executive", value: "EXECUTIVE" },
];

const MissionForm = ({ currentHouseIndex }: { currentHouseIndex: number }) => {
  console.log("currentHouseIndex", currentHouseIndex);
  const mdRef = useRef<MDXEditorMethods | null>(null);
  const { user } = useUser();
  const { isEditModalOpen } = useAppSelector(
    (state: RootState) => state.missionUi
  );
  const { editingMission } = useAppSelector(
    (state: RootState) => state.missionUi
  );
  const { activeTask } = useAppSelector(
    (state: RootState) => state.missionsTasks
  );
  const [missionState, setMissionState] = useState<Partial<Mission>>(
    editingMission || initialMissionState
  );

  useEffect(() => {
    setMissionState(editingMission || initialMissionState);
  }, [editingMission, activeTask]);

  const handleMarkdownChange = useCallback((content: string) => {
    const newContent = content.length === 0 ? MARKDOWN_PLACEHOLDER : content;
    mdRef?.current?.setMarkdown(newContent);
    setMissionState((prev: any) => ({ ...prev, description: content }));
  }, []);

  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    const missionData = {
      ...missionState,
      vertical: user?.vertical || null,
      month: dayjs().format("YYYY-MM"),
      completedAt:
        missionState.completedAt !== editingMission?.completedAt
          ? missionState.completedAt
            ? missionState.completedAt.toISOString()
            : null
          : missionState.completedAt,
      expiresAt:
        missionState.expiresAt !== editingMission?.expiresAt
          ? missionState.expiresAt
            ? missionState.expiresAt.toISOString()
            : null
          : missionState.expiresAt,
    };
    setLoading(true);
    try {
      let res;
      if (missionState.id) {
        res = await PortalSdk.putData(`/api/missions`, missionData);
        toast.success("Mission updated successfully!");
        dispatch(setUpdateMission(res.data.mission));
      } else {
        res = await PortalSdk.postData("/api/missions", missionData);
        toast.success("Mission created successfully!");
        dispatch(setAddMission(res.data.mission));
      }
      setLoading(false);

      dispatch(clearEditorState());
      dispatch(setEditModalOpen(false));
    } catch (error) {
      console.error("Error creating mission:", error);
      setLoading(false);
      toast.error("Failed to create mission");
      dispatch(setEditModalOpen(false));
      dispatch(clearEditorState());
    }
  };

  const handleDeleteMission = async () => {
    try {
      const res = await PortalSdk.deleteData(
        `/api/missions?id=${missionState.id}`,
        {}
      );
      dispatch(setDeleteMission(res.data.mission));
      toast.success("Mission deleted successfully");
      dispatch(clearEditorState());
      dispatch(setEditModalOpen(false));
    } catch (error) {
      toast.error("Failed to delete mission");
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="px-4 py-4 font-bold flex items-center justify-between">
        <span className="text-sm">Missions</span>
        {missionState.id && (
          <Button
            startIcon={<span className="material-icons">delete</span>}
            className="!text-sm !text-red-500"
            onClick={handleDeleteMission}
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
          value={missionState.title}
          onChange={(e) =>
            setMissionState({ ...missionState, title: e.target.value })
          }
          placeholder="Add Mission Name"
        />
        <div className="mt-8">
          <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className=" text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  interests
                </span>{" "}
                <span>House</span>
              </label>
              <select
                id="select-house"
                defaultValue={HOUSES_LIST[currentHouseIndex]?.name}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
                    house: e.target.value as HOUSEID,
                  })
                }
                className="w-full text-sm rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              >
                <option value="" disabled>
                  Select House
                </option>
                {housesList.map((house) => (
                  <option key={house.value} value={house.value}>
                    {house.label}
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
                  adjust
                </span>{" "}
                <span>Status</span>
              </label>

              <select
                id="status"
                value={missionState.status?.value}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
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
          </div>
          <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="priority"
              >
                <span className="material-symbols-outlined !text-base">
                  flag
                </span>{" "}
                <span>Priority</span>
              </label>
              <select
                value={missionState.priority?.value}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
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
                value={dayjs(missionState.expiresAt).format("YYYY-MM-DD")}
                onChange={(e) =>
                  setMissionState((prevState) => ({
                    ...prevState,
                    expiresAt: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                className="w-full p-2 rounded-md appearance-none outline-none hover:bg-neutral-100 text-sm"
              />
            </div>
          </div>
          {/* <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  interests
                </span>{" "}
                <span>House</span>
              </label>
              <select
                id="select-house"
                value={missionState.house}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
                    house: e.target.value as HOUSEID,
                  })
                }
                className="w-full rounded-md appearance-none outline-none hover:bg-neutral-100 p-2"
              >
                <option value="" disabled>
                  Select House
                </option>
                {housesList.map((house) => (
                  <option key={house.value} value={house.value}>
                    {house.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  interests
                </span>{" "}
                <span>House Points</span>
              </label>
              <input
                type="number"
                id="house-points"
                value={missionState.housePoints}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
                    housePoints: parseInt(e.target.value, 10),
                    indiePoints: parseInt(e.target.value, 10) * 100,
                  })
                }
                className="w-full p-2  rounded-md appearance-none outline-none hover:bg-neutral-100"
              />
            </div>
          </div> */}
          {/* <div className="grid grid-cols-2 items-center gap-4 w-full">
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  interests
                </span>{" "}
                <span>Indie Points</span>
              </label>
              <input
                type="number"
                id="indie-points"
                value={missionState.indiePoints}
                onChange={(e) =>
                  setMissionState({
                    ...missionState,
                    indiePoints: parseInt(e.target.value, 10),
                  })
                }
                className="w-full p-2  rounded-md appearance-none outline-none hover:bg-neutral-100"
              />
            </div>
            <div className="flex items-center gap-4 w-full">
              <label
                className="w-full text-base font-medium text-neutral-400 flex items-center gap-2"
                htmlFor="select-mission"
              >
                <span className="material-symbols-outlined !text-base">
                  interests
                </span>{" "}
                <span>Indie Balance</span>
              </label>
              <p className="w-full pl-1 text-lg font-semibold text-black mt-1">
                {(missionState.indiePoints || 0) -
                  (
                    (missionState as Mission & { tasks?: MissionTask[] })
                      ?.tasks || []
                  ).reduce(
                    (acc: number, task: MissionTask) => acc + task.indiePoints,
                    0
                  )}
              </p>
            </div>
          </div> */}
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
                value={dayjs(missionState.completedAt).format("YYYY-MM-DD")}
                placeholder="Empty"
                onChange={(e) =>
                  setMissionState((prevState) => ({
                    ...prevState,
                    completedAt: e.target.value
                      ? new Date(e.target.value)
                      : null,
                  }))
                }
                className="w-full p-2 rounded-md appearance-none outline-none hover:bg-neutral-100"
              />
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
                value={dayjs(missionState.expiresAt).format("YYYY-MM-DD")}
                onChange={(e) =>
                  setMissionState((prevState) => ({
                    ...prevState,
                    expiresAt: e.target.value ? new Date(e.target.value) : null,
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
                setMissionState({
                  ...missionState,
                  completed: !missionState.completed,
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
                <Checkbox checked={Boolean(missionState.completed)} />
              </div>
            </div>
            <div
              className="cursor-pointer flex items-center gap-4 w-full"
              onClick={(e) =>
                setMissionState({
                  ...missionState,
                  expirable: !missionState.expirable,
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
                <Checkbox checked={Boolean(missionState.expirable)} />
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
                markdown={
                  missionState.description?.trim().length === 0 ||
                  missionState.description === null ||
                  missionState.description === undefined
                    ? ""
                    : missionState.description
                }
                className="w-full h-full"
                contentEditableClassName={`mdx_ce ${
                  missionState.description?.trim() ===
                  MARKDOWN_PLACEHOLDER.trim()
                    ? "mdx_uninit"
                    : ""
                } `}
                onChange={handleMarkdownChange}
              />
            </div>
          </div>

          <div className="flex w-full ml-auto justify-self-end justify-end gap-4 mt-6">
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

export default MissionForm;
