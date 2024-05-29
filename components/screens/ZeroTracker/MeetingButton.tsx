interface IMeetingButtonProps {
  handleMeetingButtonClick: () => void;
}

export const MeetingButton = ({
  handleMeetingButtonClick,
}: IMeetingButtonProps) => {
  return (
    <div
      onClick={handleMeetingButtonClick}
      className="flex mx-3 px-3 flex-row items-center justify-center gap-1 p-4 rounded-[0.75em] overflow-hidden border border-blue-500 cursor-pointer text-neutral-900"
    >
      <p className="text-[0.7em] font-bold tracking-[0.2em] uppercase">
        Custom Meetings
      </p>
      <span className="icon_size material-icons">add_circle_outline</span>
    </div>
  );
};
