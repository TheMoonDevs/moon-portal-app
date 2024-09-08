import { Button } from '@mui/material';

export const PillSelector = ({
  label,
  options,
  selectedValue,
  onChange,
}: {
  label: string;
  options: { label: string; value: any }[];
  selectedValue: any;
  onChange: (value: any) => void;
}) => {
  return (
    <div>
      <label className='text-sm font-medium text-black'>{label}</label>
      <div className='flex gap-2 mt-2'>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={selectedValue === option.value ? 'contained' : 'outlined'}
            onClick={() => onChange(option.value)}
            className={`pill-btn px-4 py-1 rounded-full ${
              selectedValue === option.value ? 'selected' : ''
            }`}
            aria-label={`Select ${option.label}`}
            sx={{
              transition: 'background-color 0.3s ease, border-color 0.3s ease',
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
