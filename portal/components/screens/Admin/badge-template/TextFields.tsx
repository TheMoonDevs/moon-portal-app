import react from 'react';

interface BaseInputFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
}

interface InputFieldProps extends BaseInputFieldProps {
  type: 'text' | 'number' | 'password' | 'email' | 'file';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface TextAreaFieldProps extends BaseInputFieldProps {
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  placeholder,
  type,
  value,
  onChange,
}) => (
  <div className='flex flex-col'>
    <label htmlFor={id} className='text-white font-semibold mb-2'>
      {label}
    </label>
    <input
      type={type}
      id={id}
      className='p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-white transition'
      placeholder={placeholder}
      onChange={onChange}
      value={type !== 'file' ? value : undefined}
    />
  </div>
);

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
}) => (
  <div className='flex flex-col'>
    <label htmlFor={id} className='text-white font-semibold mb-2'>
      {label}
    </label>
    <textarea
      id={id}
      className='p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-white transition'
      placeholder={placeholder}
      rows={4}
      onChange={onChange}
      value={value}
    ></textarea>
  </div>
);
