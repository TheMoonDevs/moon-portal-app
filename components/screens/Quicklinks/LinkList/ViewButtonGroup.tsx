import { VIEW } from "./LinkList";
import { useAppDispatch } from "@/utils/redux/store";
import { setCurrentView } from "@/utils/redux/quicklinks/quicklinks.slice";

export const ViewButtonGroup = () => {
  const dispatch = useAppDispatch();
  return (
    <>
      <div className="flex items-center justify-end divide-x-2 border-2 w-fit float-right cursor-pointer relative">
        {[
          {
            icon: "list",
            viewName: VIEW.list,
          },
          {
            icon: "group",
            viewName: VIEW.group,
          },
          {
            icon: "grid_view",
            viewName: VIEW.thumbnail,
          },
        ].map((item) => (
          <span
            className="material-symbols-outlined p-2 bg-white"
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
