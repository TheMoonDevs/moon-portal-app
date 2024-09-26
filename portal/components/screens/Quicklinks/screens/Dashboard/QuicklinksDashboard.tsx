import FolderSection from "./FolderSection";
import LinksSection from "./LinksSection";

export const QuicklinksDashboard = () => {
  return (
    <>
      <div className=" w-full flex gap-10">
        <div className="w-[70%]">
          <LinksSection />
        </div>
        <div className="w-[30%] mt-[10px]">
          <FolderSection />
        </div>
      </div>
    </>
  );
};
