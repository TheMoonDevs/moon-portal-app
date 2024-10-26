'use client';
import { WorkLogs } from '@prisma/client';
import React from 'react';
import {
  calculatePercentageChange,
  getWeekData,
  groupByWeek,
} from './Breakdown';

const StatiStics = ({ worklogSummary }: { worklogSummary: WorkLogs[] }) => {
  const groupedByWeek = groupByWeek(worklogSummary);
  const weekData = getWeekData(groupedByWeek);

  return (
    <div className='pt-5 w-full flex justify-center'>
      <div className='overflow-x-auto'>
        <table className='w-full table-auto rounded-lg border border-gray-200'>
          <thead className='bg-gray-200'>
            <tr className='text-left'>
              <th className='p-4 text-sm font-semibold text-gray-600'></th>
              {weekData.map((week, idx) => {
                const [weekNumber, weekDates] = week.weekLabel.split(' (');
                return (
                  <th
                    key={idx}
                    className='p-4 text-sm font-semibold text-gray-700'
                  >
                    <div className='flex flex-col items-center'>
                      <span>{weekNumber}</span>
                      <span className='text-xs text-gray-500'>
                        ({weekDates}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className='bg-white'>
              <td className='p-4 text-sm font-semibold text-gray-600'>
                Task Completion
              </td>
              {weekData.map((week, idx) => {
                const prevTotalTasks =
                  idx > 0 ? weekData[idx - 1].totalTasks : 0;
                const percentageChange = calculatePercentageChange(
                  week.totalTasks,
                  prevTotalTasks
                );
                const trendColor =
                  percentageChange > 0
                    ? 'text-green-500'
                    : percentageChange < 0
                    ? 'text-red-500'
                    : 'text-gray-500';

                return (
                  <td
                    key={idx}
                    className='p-4 text-sm font-medium text-gray-600 text-center'
                  >
                    <div className='flex flex-col items-center'>
                      <div>
                        {week.completedTasks} / {week.totalTasks}
                      </div>
                      {idx > 0 && (
                        <div
                          className={`text-xs mt-1 ${trendColor} flex flex-col items-center justify-center`}
                        >
                          <span className='material-symbols-outlined'>
                            {percentageChange > 0
                              ? 'arrow_drop_up'
                              : percentageChange < 0
                              ? 'arrow_drop_down'
                              : 'horizontal_rule'}
                          </span>
                          {percentageChange.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr className='bg-gray-50'>
              <td className='p-4 text-sm font-semibold text-gray-600'>
                Missed Logs
              </td>
              {weekData.map((week, idx) => (
                <td
                  key={idx}
                  className='p-4 text-sm font-medium text-gray-600 text-center'
                >
                  {week.missedLogs}
                </td>
              ))}
            </tr>
            <tr className='bg-white'>
              <td className='p-4 text-sm font-semibold text-gray-600'>
                Most Productive <br /> Day
              </td>
              {weekData.map((week, idx) => (
                <td
                  key={idx}
                  className='p-4 text-sm font-medium text-gray-600 text-center'
                >
                  {week.mostProductiveDay}
                </td>
              ))}
            </tr>
            <tr className='bg-gray-50'>
              <td className='p-4 text-sm font-semibold text-gray-600'>
                Least Productive <br /> Day
              </td>
              {weekData.map((week, idx) => (
                <td
                  key={idx}
                  className='p-4 text-sm font-medium text-gray-600 text-center'
                >
                  {week.leastProductiveDay}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatiStics;
