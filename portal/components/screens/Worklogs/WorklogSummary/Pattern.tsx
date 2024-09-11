'use client';
import { ResponsiveLine } from '@nivo/line';
import dayjs from 'dayjs';
import { WorkLogs } from '@prisma/client';

export const getStatsOfContent = (content: string) => {
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  return { checks, points };
};

const Pattern = ({
  gridVisible,
  worklogSummary,
}: {
  gridVisible: boolean;
  worklogSummary: WorkLogs[];
}) => {
  const formattedWorklogData = worklogSummary.map((log) => {
    const formattedDate = dayjs(log.date).format('MMM D');
    let totalTasks = 0;
    let completedTasks = 0;

    log.works.forEach((work: any) => {
      const { checks, points } = getStatsOfContent(
        (typeof work === 'object' && work !== null && 'content' in work
          ? work.content
          : '') as string
      );
      totalTasks += points;
      completedTasks += checks;
    });

    return {
      x: formattedDate,
      y: totalTasks,
      completed: completedTasks,
    };
  });

  const data = [
    {
      id: 'Completed Tasks',
      color: 'hsl(260, 70%, 50%)',
      data: formattedWorklogData.map((item) => ({
        x: item.x,
        y: item.completed.toFixed(1),
      })),
    },
    {
      id: 'Total Tasks',
      color: 'hsl(90, 70%, 50%)',
      data: formattedWorklogData.map((item) => ({ x: item.x, y: item.y })),
    },
  ];

  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 10, right: 20, bottom: 80, left: 50 }}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: 'auto',
        max: 'auto',
        stacked: true,
        reverse: false,
      }}
      yFormat=' >-.2f'
      curve='natural'
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Date',
        legendOffset: 36,
        legendPosition: 'start',
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Number Of Tasks',
        legendOffset: -40,
        legendPosition: 'start',
      }}
      enableGridX={gridVisible}
      enableGridY={gridVisible}
      enablePoints={true}
      colors={{ scheme: 'accent' }}
      pointSize={10}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabel='data.yFormatted'
      pointLabelYOffset={-12}
      enableTouchCrosshair={true}
      useMesh={true}
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'row',
          translateX: 0,
          translateY: 50,
          itemsSpacing: 0,
          itemWidth: 120,
          itemHeight: 20,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
        },
      ]}
    />
  );
};

export default Pattern;
