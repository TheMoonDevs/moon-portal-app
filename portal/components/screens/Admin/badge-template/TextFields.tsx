import ToolTip from '@/components/elements/ToolTip';

interface BaseInputFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
  title?: string;
}

interface InputFieldProps extends BaseInputFieldProps {
  type: 'text' | 'number' | 'password' | 'email' | 'file';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface TextAreaFieldProps extends BaseInputFieldProps {
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

import React, { useRef, useEffect } from 'react';

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  placeholder,
  type,
  value,
  title,
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const inputElement = inputRef.current;

    if (inputElement && type === 'number') {
      const handleWheel = (event: WheelEvent) => {
        if (document.activeElement === inputElement) {
          event.preventDefault();
        }
      };

      inputElement.addEventListener('wheel', handleWheel);

      return () => {
        inputElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [type]);

  return (
    <div className='flex flex-col'>
      <label
        htmlFor={id}
        className='text-white font-semibold mb-2 flex items-center gap-2'
      >
        {label}
        {title && (
          <ToolTip title={title}>
            <span
              className='material-symbols-outlined'
              style={{ fontSize: '1rem' }}
            >
              info
            </span>
          </ToolTip>
        )}
      </label>
      <input
        type={type}
        id={id}
        ref={inputRef}
        className='p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-white transition'
        placeholder={placeholder}
        onChange={onChange}
        value={type !== 'file' ? value : undefined}
      />
    </div>
  );
};

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  title,
}) => (
  <div className='flex flex-col'>
    <label
      htmlFor={id}
      className='text-white font-semibold mb-2 flex items-center gap-2'
    >
      {label}
      {title && (
        <ToolTip title={title}>
          <span
            className='material-symbols-outlined'
            style={{ fontSize: '1rem' }}
          >
            info
          </span>
        </ToolTip>
      )}
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
