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
      <div className="flex w-full flex-row justify-between gap-2 px-3 py-2">
        <div className="relative flex flex-1 flex-col items-start justify-center gap-1 overflow-hidden rounded-[0.75em] bg-neutral-100 p-4 text-neutral-900">
          <span
            style={{ width: `${zeroUsage !== 'NaN' ? zeroUsage : 0}%` }}
            className="absolute inset-x-0 top-0 h-1 rounded-[1.15em] bg-blue-500"
          ></span>
          <p className="text-[0.7em] leading-none tracking-[0.2em] text-neutral-500">
            {' '}
            MY ZEROS
          </p>
          <p className="text-[1.3em] font-bold leading-none">
            {' '}
            {zeroRecord?.allZeros?.filter((_zero: any) => _zero.type === 'zero')
              .length || '0'}{' '}
            {/* / 30 */}
          </p>
        </div>
        <button
          onClick={handleZeroMarkerButtonClick}
          className="flex flex-row items-center justify-between gap-1 overflow-hidden rounded-[0.75em] bg-blue-500 p-4 text-neutral-100"
        >
          <p className="cursor-pointer text-[0.7em] font-bold tracking-[0.2em]">
            {' '}
            ZERO MARKER
          </p>
          <span className="icon_size material-icons">add_circle_outline</span>
        </button>
      </div>
    </>
  );
};
