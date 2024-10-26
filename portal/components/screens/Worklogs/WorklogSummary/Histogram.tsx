'use client';
import { WorkLogs } from '@prisma/client';
import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import dayjs from 'dayjs';

const Histogram = ({ worklogSummary, gridVisible }: { worklogSummary: WorkLogs[], gridVisible: boolean }) => {

  // Function to prepare the data for the histogram
  const prepareHistogramData = (worklogs: WorkLogs[]) => {
    const summaryMap: Record<
      string,
      { totalTasks: number; completedTasks: number }
    > = {};

    worklogs.forEach((worklog) => {
      const formattedDate = dayjs(worklog.date).format('MMM D');
      let totalTasks = 0;
      let completedTasks = 0;

      worklog.works.forEach((work: any) => {
        const points = (work.content?.match(/\n/g) || []).length + 1;
        const checks = (work.content?.match(/✅/g) || []).length;
        totalTasks += points;
        completedTasks += checks;
      });

      // Aggregate tasks by date
      if (!summaryMap[formattedDate]) {
        summaryMap[formattedDate] = { totalTasks: 0, completedTasks: 0 };
      }
      summaryMap[formattedDate].totalTasks += totalTasks;
      summaryMap[formattedDate].completedTasks += completedTasks;
    });

    // Convert the summaryMap to the format needed for Nivo
    return Object.entries(summaryMap).map(
      ([date, { totalTasks, completedTasks }]) => ({
        date,
        totalTasks,
        completedTasks,
      }),
    );
  };

  const histogramData = prepareHistogramData(worklogSummary);

  return (
    <div style={{ height: '400px' }}>
      <ResponsiveBar
        data={histogramData}
        keys={['completedTasks', 'totalTasks']}
        indexBy="date"
        margin={{ top: 20, right: 30, bottom: 100, left: 60 }}
        padding={0.3}
        colors={{ scheme: 'nivo' }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Date',
          legendPosition: 'middle',
          legendOffset: 32,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Number of Tasks',
          legendPosition: 'middle',
          legendOffset: -40,
        }}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        role="img"
        ariaLabel="Histogram chart"
        enableLabel={true}
        enableGridX={gridVisible}
        enableGridY={gridVisible}
      />
    </div>
  );
};

export default Histogram;
