import { Tooltip } from '@mui/material';
import React from 'react';

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
  logo: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  isClickAble?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  content,
  logo,
  tooltip,
  onClick,
  isClickAble = true,
}) => (
  <Tooltip title={tooltip || ''} arrow>
    <div
      className={`flex w-full flex-col justify-between rounded-lg bg-gradient-to-br from-white to-gray-50 p-5 shadow-md ${isClickAble && 'cursor-pointer transition-all duration-300 hover:scale-105 hover:border-l-4 hover:border-blue-500 hover:from-blue-50'}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h1 className="break-words text-base font-semibold text-gray-900">
          <span className="block w-full">
            {title.split(' ').slice(0, 2).join(' ')}
          </span>
          {title.split(' ').length > 2 && (
            <span className="block w-full">
              {title.split(' ').slice(2).join(' ')}
            </span>
          )}
        </h1>
        <div className="">{logo}</div>{' '}
      </div>
      <div className="text-2xl font-bold text-gray-700">{content}</div>
    </div>
  </Tooltip>
);

export default MetricCard;

export const SquareCard = ({
  icon,
  content,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  content: React.ReactNode;
  title: string;
  onClick?: () => void;
}) => (
  <div
    className="flex cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-2 shadow-md transition-all duration-300 hover:scale-105 hover:border-l-4 hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50"
    onClick={onClick}
  >
    <div className="self-end">{icon}</div>
    <div className="mt-2 text-2xl font-bold">{content}</div>
    <div className="mt-1 max-w-[80%] text-xs text-gray-600">{title}</div>
  </div>
);
