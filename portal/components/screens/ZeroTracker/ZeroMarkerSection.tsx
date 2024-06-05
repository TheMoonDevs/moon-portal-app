interface ZeroMarkerSectionProps {
  zeroRecord: any;
  handleZeroMarkerButtonClick: React.Dispatch<React.SetStateAction<any>>;
  zeroUsage: string | 0 | undefined;
}

export const ZeroMarkerSection = ({
  zeroRecord,
  handleZeroMarkerButtonClick,
  zeroUsage,
}: ZeroMarkerSectionProps) => {
  return (
    <>
      <div className="flex flex-row justify-between w-full py-2 px-3 gap-2">
        <div className="relative flex-1 flex flex-col items-start justify-center gap-1 p-4 rounded-[0.75em] overflow-hidden bg-neutral-100 text-neutral-900">
          <span
            style={{ width: `${zeroUsage !== "NaN" ? zeroUsage : 0}%` }}
            className=" bg-blue-500 h-1 rounded-[1.15em] absolute top-0 left-0 right-0"
          ></span>
          <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] ">
            {" "}
            MY ZEROS
          </p>
          <p className="text-[1.3em] font-bold leading-none ">
            {" "}
            {zeroRecord?.allZeros?.filter((_zero: any) => _zero.type === "zero")
              .length || "0"}{" "}
            {/* / 30 */}
          </p>
        </div>
        <button
          onClick={handleZeroMarkerButtonClick}
          className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-blue-500 text-neutral-100"
        >
          <p className="text-[0.7em] font-bold tracking-[0.2em] cursor-pointer">
            {" "}
            ZERO MARKER
          </p>
          <span className="icon_size material-icons">add_circle_outline</span>
        </button>
      </div>
    </>
  );
};
