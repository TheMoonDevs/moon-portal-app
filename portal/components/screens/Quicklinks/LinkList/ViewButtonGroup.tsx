"use client";
import { setCurrentView } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { VIEW } from "./LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";

export const ViewButtonGroup = () => {
  const dispatch = useAppDispatch();

  const { currentView } = useAppSelector((state) => state.quicklinksUi);

  return (
    <>
      <div className="flex items-center justify-end divide-x-2 border-2 w-fit float-right cursor-pointer relative">
        {[
          {
            icon: "fiber_smart_record",
            viewName: VIEW.thumbnail,
          },
          {
            icon: "grid_view",
            viewName: VIEW.group,
          },
          {
            icon: "list",
            viewName: VIEW.list,
          },
        ].map((item) => (
          <span
            className={`material-symbols-outlined p-2 ${
              item.viewName === currentView
                ? "text-neutral-200 bg-neutral-900"
                : "text-neutral-800 bg-white hover:bg-neutral-200"
            }`}
            key={item.icon}
            onClick={() => dispatch(setCurrentView(item.viewName))}
          >
            {item.icon}
          </span>
        ))}
      </div>
    </>
  );
};
