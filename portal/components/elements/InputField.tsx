import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  textarea?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  textarea = false,
}) => {
  return (
    <div className="mb-6">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          className="mt-1 w-full resize-none rounded-md border border-gray-300 p-3 shadow-sm transition duration-200 focus:border-gray-400 focus:outline-none focus:ring focus:ring-gray-200"
          rows={3}
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          className={`mt-1 w-full rounded-md border border-gray-300 p-3 shadow-sm transition duration-200 focus:border-gray-400 focus:outline-none focus:ring focus:ring-gray-200 ${
            label === 'City' ? 'h-[56px]' : ''
          }`}
        />
      )}
    </div>
  );
};

export default InputField;
