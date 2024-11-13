import {
  clearEditorState,
  setActiveTab,
  setEditModalOpen,
} from "@/utils/redux/missions/mission.ui.slice";
import { RootState, useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import { getTimeValueOptions } from "./mission.utils";
import dayjs from "dayjs";
import { HOUSES_LIST } from "../HousesList";

const ActionBar = ({
  currentHouseIndex,
  activeTab,
  timeFrame,
  timeValue,
  setTimeFrame,
  setTimeValue,
}: {
  currentHouseIndex: number;
  activeTab: string;
  timeFrame: string;
  timeValue: string;
  setTimeFrame: React.Dispatch<React.SetStateAction<string>>;
  setTimeValue: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const dispatch = useAppDispatch();
  const { allMissions } = useAppSelector((state: RootState) => state.mission);

  const handleTimeFrameChange = (event: SelectChangeEvent<string>) => {
    const newTimeFrame = event.target.value as string;
    setTimeFrame(newTimeFrame);
    switch (newTimeFrame) {
      case "month":
        setTimeValue(dayjs().format("YYYY-MM"));
        break;
      case "quarter":
        setTimeValue("1");
        break;
      case "year":
        setTimeValue(dayjs().year().toString());
        break;
    }
  };

  const handleTimeValueChange = (event: SelectChangeEvent<string>) => {
    const newTimeValue = event.target.value as string;
    setTimeValue(newTimeValue);
  };

  return (
    <div
      id="mission-header"
      className=" w-full flex flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 rounded-t-xl"
    >
      <div className="w-full flex flex-row items-center gap-2">
        <h3
          className={`text-sm font-semibold text-neutral-600 tracking-widest uppercase cursor-pointer  w-fit transition-colors duration-300 ease-in-out
            `}
          // ${
          //   activeTab === "missions"
          //     ? "border-neutral-400 bg-gray-100"
          //     : "border-transparent bg-white"
          // }
          onClick={() => dispatch(setActiveTab("missions"))}
        >
          <span className="font-bold">
            {HOUSES_LIST[currentHouseIndex]?.name}
          </span>{" "}
          /<span className="text-xs"> Missions</span>
        </h3>

        <Tooltip
          title={
            activeTab === "tasks" && allMissions && allMissions.length === 0
              ? "No mission found. Add a new mission to create tasks."
              : activeTab === "tasks"
              ? "Add New Task"
              : "Add New Mission"
          }
        >
          <span
            className={`material-symbols-outlined cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110`}
            onClick={() => {
              dispatch(clearEditorState());
              dispatch(setActiveTab("missions"));
              dispatch(setEditModalOpen(true));
            }}
          >
            add_box
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-row items-center gap-2">
        <FormControl variant="standard" size="small" className="w-[100px]">
          <Select
            value={timeFrame}
            onChange={handleTimeFrameChange}
            label="Time Frame"
            disabled={activeTab === "tasks"}
          >
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="quarter">Quarter</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </FormControl>
        <FormControl variant="standard" size="small" className="w-[100px]">
          <Select
            value={timeValue}
            onChange={handleTimeValueChange}
            label="Value"
            disabled={activeTab === "tasks"}
          >
            {getTimeValueOptions(timeFrame).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* <span className="material-icons-outlined">search</span> */}
      </div>
    </div>
  );
};

export default ActionBar;
