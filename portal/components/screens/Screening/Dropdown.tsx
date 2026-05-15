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
      className="form-select focus:ring-primary-500 focus:border-primary-500 block cursor-pointer rounded-md border border-gray-300 bg-white py-2 shadow-sm focus:outline-none sm:text-sm"
      value={selected}
      onChange={(e) => onSelected(e.target.value)}
    >
      {options.map((option) => (
        <option
          className="flex flex-row items-center justify-between"
          key={option}
          value={option}
        >
          {option}
          <span className="material-icons text-neutral-500 group-hover:text-white">
            {option === selected ? 'done_all' : ''}
          </span>
        </option>
      ))}
    </select>
  );
};
