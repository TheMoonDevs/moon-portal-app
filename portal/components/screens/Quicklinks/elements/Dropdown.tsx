import type { DirectoryList } from '@db/client';
import type { ChangeEvent } from 'react';
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
      <label htmlFor="department" className="py-4 text-3xl">
        Choose Department
      </label>
      <select
        className="cursor-pointer p-2 outline outline-gray-100"
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
