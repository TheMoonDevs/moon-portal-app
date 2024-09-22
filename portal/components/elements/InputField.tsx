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
    <div className='mb-4'>
      <label htmlFor={id} className='block text-sm font-medium mb-1'>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          className='border rounded w-full p-2 mt-1 shadow-sm focus:ring focus:ring-blue-300 transition duration-150'
          rows={3}
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          className={`border rounded w-full p-2 mt-1 shadow-sm focus:ring focus:ring-blue-300 transition duration-150 ${
            label === 'City' && 'h-[56px]'
          }`}
        />
      )}
    </div>
  );
};

export default InputField;
