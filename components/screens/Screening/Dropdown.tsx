export const Dropdown = ({
  options,
  selected,
  onSelected,
}: {
  options: string[];
  selected: string;
  onSelected: (value: string) => void;
}) => {
  return (
    <select
      className="form-select py-2 block cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
      value={selected}
      onChange={(e) => onSelected(e.target.value)}
    >
      {options.map((option) => (
        <option
          className="flex flex-row justify-between items-center"
          key={option}
          value={option}
        >
          {option}
          <span className="material-icons text-neutral-500 group-hover:text-white">
            {option === selected ? "done_all" : ""}
          </span>
        </option>
      ))}
    </select>
  );
};
