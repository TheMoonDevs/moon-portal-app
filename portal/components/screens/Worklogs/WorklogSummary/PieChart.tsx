import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import dayjs from 'dayjs';
import { WorkLogs } from '@prisma/client';
import { groupByWeek } from './Breakdown';

const Pie = ({ worklogSummary }: { worklogSummary: WorkLogs[] }) => {
  const groupedByWeek = groupByWeek(worklogSummary);

  const data = Object.keys(groupedByWeek).map((weekLabel) => {
    const weekData = groupedByWeek[weekLabel];
    return {
      id: weekLabel,
      label: weekLabel,
      value: weekData.totalTasks,
    };
  });

  return (
    <div style={{ height: '400px' }}>
      <ResponsivePie
        data={data}
        margin={{ top: 40, right: 20, bottom: 20, left: 80 }}
        valueFormat={(value) => `${value}`}
        sortByValue={true}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={{ scheme: 'nivo' }}
        borderWidth={1}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]],
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor='#333333'
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabel={({ value }) => `${value}`}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: 'color',
          modifiers: [['darker', 2]],
        }}
        legends={[]}
      />
    </div>
  );
};

export default Pie;
