"use client";

import { Button, GreyButton } from "@/components/elements/Button";
import { useUser } from "@/utils/hooks/useUser";
import { USERVERTICAL } from "@/utils/services/models/User";

const Dropdown = ({
  options,
  selected,
  onSelected,
}: {
  options: string[];
  selected: string;
  onSelected: (value: string) => void;
}) => {
  return (
    <select
      className="form-select py-2 block cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
      value={selected}
      onChange={(e) => onSelected(e.target.value)}
    >
      {options.map((option) => (
        <option
          className="flex flex-row justify-between items-center"
          key={option}
          value={option}
        >
          {option}
          <span className="material-icons text-neutral-500 group-hover:text-white">
            {option === selected ? "done_all" : ""}
          </span>
        </option>
      ))}
    </select>
  );
};

export const ScreeningPage = () => {
  const { user, status } = useUser();
  const isVisible = user?.vertical == USERVERTICAL.HR || user?.isAdmin;
  if (!isVisible) return <></>;
  return (
    <div className="table_box">
      <div className="w-full fixed flex flex-row justify-between items-center border-b py-2 px-4">
        <div className="flex flex-row gap-4">
          <h1 className="text-xl font-bold mr-4">Screening</h1>
          <button className="btn btn-primary flex items-center">
            Select Post
          </button>
          <Dropdown options={["all"]} selected="" onSelected={() => {}} />
          <button className="btn btn-primary">Filter by</button>
          <Dropdown options={["all"]} selected="" onSelected={() => {}} />
        </div>
        <div className="flex flex-row gap-4">
          <button className="btn btn-primary">Save to Excel</button>
          <Button>Add New Post</Button>
        </div>
      </div>
    </div>
  );
};
