interface IMeetingButtonProps {
  handleMeetingButtonClick: () => void;
}

export const MeetingButton = ({
  handleMeetingButtonClick,
}: IMeetingButtonProps) => {
  return (
    <div
      onClick={handleMeetingButtonClick}
      className="mx-3 flex cursor-pointer flex-row items-center justify-center gap-1 overflow-hidden rounded-[0.75em] border border-blue-500 p-4 px-3 text-neutral-900"
    >
      <p className="text-[0.7em] font-bold uppercase tracking-[0.2em]">
        Custom Meetings
      </p>
      <span className="icon_size material-icons">add_circle_outline</span>
    </div>
  );
};
