import React from 'react';
import { Tooltip } from '@mui/material';

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
  logo: React.ReactNode;
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  content,
  logo,
  tooltip,
}) => (
  <Tooltip title={tooltip || ''} arrow>
    <div className='flex flex-col justify-between w-full p-5 rounded-lg shadow-md bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:border-l-4 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:scale-105'>
      <div className='flex justify-between items-start gap-2 mb-3'>
        <h1 className='font-semibold text-base text-gray-900 break-words'>
          <span className='block w-full'>
            {title.split(' ').slice(0, 2).join(' ')}
          </span>
          {title.split(' ').length > 2 && (
            <span className='block w-full'>
              {title.split(' ').slice(2).join(' ')}
            </span>
          )}
        </h1>
        <div className=''>{logo}</div>{' '}
      </div>
      <div className='text-2xl font-bold text-gray-700'>{content}</div>
    </div>
  </Tooltip>
);

export default MetricCard;
