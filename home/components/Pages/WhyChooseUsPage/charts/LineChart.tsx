'use client';

import { linearGradientDef, patternDotsDef } from '@nivo/core';
import { ResponsiveLine } from '@nivo/line';

const LineChart = ({
  data,
  gridValues,
  tickValuesLeft,
  tickValuesBottom,
}: {
  data: [{ id: string; color: string; data: { x: string; y: number }[] }];
  gridValues: number[];
  tickValuesLeft: number[];
  tickValuesBottom: number[] | string[];
}) => {
  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 40, right: 30, bottom: 40, left: 40 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 6 }}
      curve="linear"
      axisBottom={{
        tickValues: tickValuesBottom,
        tickPadding: 3,
        tickSize: 1,
      }}
      axisLeft={{
        format: (value) => `${value}x`,
        tickValues: tickValuesLeft,
        tickPadding: 3,
        tickSize: 1,
      }}
      key={'progress'}
      enableArea={true}
      colors={['#FF5600']}
      crosshairType="x"
      lineWidth={2}
      enablePoints={false}
      enableGridX={false}
      enableGridY={true}
      gridYValues={gridValues}
      useMesh={true}
      tooltip={({ point }) => (
        <div
          style={{
            background: '#222',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px',
          }}
        >
          {`${point.data.x}: ${point.data.y}x`}
        </div>
      )}
      fill={[
        { match: { id: 'progress' }, id: 'gradientA' }, // Background gradient
        { match: { id: 'progress' }, id: 'dots-pattern' }, // Overlay dots
      ]}
      defs={[
        patternDotsDef('dots-pattern', {
          background: 'transparent',
          color: 'rgba(255, 140, 0, 0.8)',
          size: 4,
          padding: 10,
          // stagger: true,
        }),
        linearGradientDef('gradientA', [
          { offset: 0, color: 'inherit' },
          { offset: 100, color: 'inherit', opacity: 0 },
        ]),
      ]}
      theme={{
        background: 'transparent',

        crosshair: {
          line: {
            strokeDasharray: '0 0',
            stroke: '#f3f4f6',
          },
        },
        axis: {
          domain: {
            line: {
              stroke: '#f3f4f6',
            },
          },
          ticks: {
            text: {
              fontSize: 12,
              fill: '#888',
            },
          },
        },

        grid: {
          line: {
            stroke: '#262626',
          },
        },
      }}
    />
  );
};

export default LineChart;
