export const MobileCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-[98%] w-[95%] flex-col items-center justify-start rounded-lg bg-black p-[20px] shadow-md md:h-4/5 md:w-[350px] md:p-[40px] lg:w-1/4">
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
      className={`flex flex-col ${
        className || 'items-start justify-start'
      } p-[20px] md:p-[40px] ${
        dark ? 'bg-black text-white' : 'bg-white text-black'
      } h-[98vh] w-[95%] rounded-lg shadow-md md:h-4/5 md:w-[500px] lg:w-3/4`}
    >
      {children}
    </div>
  );
};
