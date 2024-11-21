import React from 'react';
import { UseFormRegister, FieldValues } from 'react-hook-form';
import Label from './Label';

interface TextareaProps {
  id: string;
  label: string;
  register?: UseFormRegister<FieldValues>;
  requiredMessage?: string;
  errors?: any;
  customClass?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const Textarea: React.FC<TextareaProps> = ({
  id,
  label,
  register,
  requiredMessage,
  errors,
  customClass,
  value,
  onChange,
}) => {
  return (
    <div className="mb-4 flex flex-col">
      <Label htmlFor={id} label={label} />
      <textarea
        id={id}
        {...(register && register(id, { required: requiredMessage }))}
        className={`mt-1 h-48 resize-none rounded-lg border border-gray-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-500 ${customClass}`}
        value={value}
        onChange={onChange}
      />
      {errors && errors[id] && (
        <p className="mt-1 text-xs text-red-500">{errors[id].message}</p>
      )}
    </div>
  );
};
export default Textarea;
