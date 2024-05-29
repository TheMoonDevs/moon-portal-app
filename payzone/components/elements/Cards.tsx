export const MobileCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col items-center justify-start p-[20px] md:p-[40px] bg-black w-[95%] md:w-[350px] lg:w-1/4 h-[98%] md:h-4/5 shadow-md rounded-lg">
      {children}
    </div>
  );
};

export const LandscapeCard = ({
  dark = false,
  children,
  className,
}: {
  dark?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`flex flex-col  ${
        className || "items-start justify-start"
      } p-[20px] md:p-[40px] ${
        dark ? "bg-black text-white" : "bg-white text-black"
      } w-[95%] md:w-[500px] lg:w-3/4 h-[98vh] md:h-4/5 shadow-md rounded-lg`}
    >
      {children}
    </div>
  );
};
