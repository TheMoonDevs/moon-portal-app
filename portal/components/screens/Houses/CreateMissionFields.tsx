import { Grid } from "@mui/material";
import React, { useCallback, useRef } from "react";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { useUser } from "@/utils/hooks/useUser";
import { MARKDOWN_PLACEHOLDER } from "../Worklogs/WorklogTabs/TodoTab";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { PillSelector } from "./PillSelector";
import { HOUSEID, Mission, MissionTask } from "@prisma/client";
import { initialMissionState } from "./state";

export const pillOptions = [
  {
    label: "yes",
    value: true,
  },
  {
    label: "no",
    value: false,
  },
];

const housesList = [
  { label: "Management", value: "MANAGEMENT" },
  { label: "Growth", value: "GROWTH" },
  { label: "Product Tech", value: "PRODUCT_TECH" },
  { label: "Executive", value: "EXECUTIVE" },
];

type CreateMissionFieldsProps = {
  state: Partial<Mission>;
  setState: React.Dispatch<React.SetStateAction<Partial<Mission>>>;
};

const CreateMissionFields = ({
  state = initialMissionState,
  setState,
}: CreateMissionFieldsProps) => {
  const mdRef = useRef<MDXEditorMethods | null>(null);
  console.log(state);
  const { user } = useUser();
  const handleMarkdownChange = useCallback(
    (content: string) => {
      const newContent = content.length === 0 ? MARKDOWN_PLACEHOLDER : content;
      mdRef?.current?.setMarkdown(newContent);
      setState((prev: any) => ({ ...prev, description: content }));
    },
    [setState]
  );

  return (
    <Grid container spacing={4} className="py-4">
      <Grid item xs={12}>
        <label
          className="text-sm font-medium text-gray-700 mb-2 block"
          htmlFor="title"
        >
          Mission Title
        </label>
        <input
          type="text"
          id="title"
          value={state.title}
          onChange={(e) => setState({ ...state, title: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-md"
          placeholder="Enter the mission title"
        />
      </Grid>
      <Grid item xs={12}>
        <label
          htmlFor="description"
          className="text-sm font-medium text-gray-700 mb-2 block"
        >
          Mission Description
        </label>
        <div className="h-[180px] overflow-y-scroll border border-gray-300 rounded-md p-3 bg-white">
          <MdxAppEditor
            ref={mdRef}
            editorKey={`${user?.id}`}
            markdown={
              state.description?.trim().length === 0
                ? MARKDOWN_PLACEHOLDER
                : state.description || ""
            }
            className="w-full h-full"
            contentEditableClassName={`mdx_ce ${
              state.description?.trim() === MARKDOWN_PLACEHOLDER.trim()
                ? "mdx_uninit"
                : ""
            } leading-tight w-full h-full`}
            onChange={handleMarkdownChange}
          />
        </div>
      </Grid>
      <Grid item xs={12} sm={6}>
        <label
          className="text-sm font-medium text-gray-700 mb-2 block"
          htmlFor="select-house"
        >
          Select House
        </label>
        <select
          id="select-house"
          value={state.house}
          onChange={(e) =>
            setState({ ...state, house: e.target.value as HOUSEID })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-md"
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
      </Grid>
      <Grid item xs={12} sm={6}>
        <label
          className="text-sm font-medium text-gray-700 mb-2 block"
          htmlFor="house-points"
        >
          House Points
        </label>
        <input
          type="number"
          id="house-points"
          value={state.housePoints}
          onChange={(e) =>
            setState({
              ...state,
              housePoints: parseInt(e.target.value, 10),
              indiePoints: parseInt(e.target.value, 10) * 100,
            })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-md"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <label
          className="text-sm font-medium text-gray-700 mb-2 block"
          htmlFor="indie-points"
        >
          Indie Points
        </label>
        <input
          type="number"
          id="indie-points"
          value={state.indiePoints}
          onChange={(e) =>
            setState({
              ...state,
              indiePoints: parseInt(e.target.value, 10),
            })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-md"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <p className="text-sm font-medium text-gray-700">Indie Balance</p>
        <p className="text-lg font-semibold text-black mt-1">
          {(state.indiePoints || 0) -
            (
              (state as Mission & { tasks?: MissionTask[] })?.tasks || []
            ).reduce(
              (acc: number, task: MissionTask) => acc + task.indiePoints,
              0
            )}
        </p>
      </Grid>
      <Grid item xs={12} sm={6}>
        <DatePicker
          label="Completed At"
          value={state.completedAt ? dayjs(state.completedAt) : null}
          onChange={(newValue) =>
            setState((prevState) => ({
              ...prevState,
              completedAt: newValue ? newValue.toDate() : null,
            }))
          }
          className="w-full"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DatePicker
          label="Expires At"
          value={state.expiresAt ? dayjs(state.expiresAt) : null}
          onChange={(newValue) =>
            setState((prevState) => ({
              ...prevState,
              expiresAt: newValue ? newValue.toDate() : null,
            }))
          }
          className="w-full"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <PillSelector
          label="Is Completed"
          options={pillOptions}
          selectedValue={state.completed}
          onChange={(value) => setState({ ...state, completed: value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <PillSelector
          label="Is Expirable"
          options={pillOptions}
          selectedValue={state.expirable}
          onChange={(value) => setState({ ...state, expirable: value })}
        />
      </Grid>
    </Grid>
  );
};

export default CreateMissionFields;
