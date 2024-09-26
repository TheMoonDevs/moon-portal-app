import { DirectoryList } from "@prisma/client";
import { ChangeEvent } from "react";
interface DropdownProps {
  options: DirectoryList[];
  placeholder: string;
  selectedDepartment: { title: string };
  handleOptionChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  placeholder,
  selectedDepartment,
  handleOptionChange,
}) => {
  const renderOptions = () => {
    return options.map((option) => (
      <option key={option.id} value={option.title}>
        {option.title}
      </option>
    ));
  };

  return (
    <>
      <label htmlFor="department" className="text-3xl py-4">
        Choose Department
      </label>
      <select
        className="outline outline-gray-100 p-2 cursor-pointer"
        value={selectedDepartment.title}
        onChange={handleOptionChange}
        required
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {renderOptions()}
      </select>
    </>
  );
};
