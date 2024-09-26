import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    <div className='mb-6'>
      <label
        htmlFor={id}
        className='block text-sm font-medium mb-2 text-gray-700'
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          className='border border-gray-300 rounded-md w-full p-3 mt-1 shadow-sm focus:outline-none focus:border-gray-400 focus:ring focus:ring-gray-200 transition duration-200 resize-none'
          rows={3}
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          className={`border border-gray-300 rounded-md w-full p-3 mt-1 shadow-sm focus:outline-none focus:border-gray-400 focus:ring focus:ring-gray-200  transition duration-200 ${
            label === 'City' ? 'h-[56px]' : ''
          }`}
        />
      )}
    </div>
  );
};

export default InputField;
