import { ViewButtonGroup } from "./ViewButtonGroup";

export const LinkFiltersHeader = ({ title }: { title?: string }) => {
  return (
    <div className="flex flex-row w-full justify-between items-center py-4 px-4">
      <h2 className="uppercase tracking-[0.5rem] text-lg text-base font-normal text-gray-500">
        {title || "View All Links"}
      </h2>
      <ViewButtonGroup />
    </div>
  );
};
