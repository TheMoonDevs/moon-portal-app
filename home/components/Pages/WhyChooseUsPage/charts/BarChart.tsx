'use client';

import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';

const data = [
  { name: 'CRYPTO', value: 32 },
  { name: 'AI', value: 28 },
  { name: 'FINTECH', value: 19 },
  { name: 'GAMING', value: 15 },
  { name: 'AR/VR', value: 7 },
];

const BarChart = () => {
  const mobile = useMediaQuery(media.largeMobile);
  return (
    <ResponsiveBar
      data={data}
      keys={['value']}
      indexBy="name"
      margin={{ top: 40, right: 20, bottom: 60, left: 40 }}
      padding={0}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={({ index, data }) => (index === 0 ? '#FF6200' : '#1A1A1A')}
      borderColor={'#FF5600'}
      borderWidth={2}
      tooltip={(props) => (
        <div className="bg-black p-2 text-white text-xs">
          {props.data.name}: {props.data.value} projects
        </div>
      )}
      enableLabel={false}
      defs={[
        {
          id: 'highlightGradient',
          type: 'linearGradient',
          colors: [
            { offset: 0, color: '#FF4F00' },
            { offset: 100, color: '#1A1A1A' },
          ],
        },
        {
          id: 'dotPattern',
          type: 'patternDots',
          background: 'transparent',
          color: 'rgba(255,83,0,0.4)',
          size: 3,
          padding: 8,
          // stagger: true,
        },
      ]}
      fill={[
        {
          match: (d) => d.data.data.name === 'CRYPTO',
          id: 'highlightGradient',
        },
        {
          match: '*',
          id: 'dotPattern',
        },
      ]}
      axisLeft={{
        renderTick: () => <g></g>,
      }}
      axisBottom={{
        tickSize: 0, // No tick lines
        tickPadding: mobile ? 6 : 12, // Adjust space below bars
        tickRotation: 0,
      }}
      layers={[
        'grid',
        'axes',
        'bars',
        'markers',
        'legends',
        (props) => (
          <>
            {props.bars.map((bar) => (
              <g key={bar.key}>
                {/* Label Box */}
                <rect
                  x={bar.x + 1}
                  y={bar.y + 1}
                  width="40"
                  height="30"
                  fill="black"
                />
                {/* Label Text */}
                <text
                  x={bar.x + 12}
                  y={bar.y + 20}
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {bar.data.value}
                </text>
              </g>
            ))}
          </>
        ),
      ]}
      theme={{
        axis: {
          domain: { line: { stroke: 'transparent' } },
          ticks: {
            line: { stroke: '#666' },
            text: { fill: '#aaa', fontSize: mobile ? '8px' : '12px' },
          },
          legend: { text: { fill: '#aaa' } },
        },
        grid: {
          line: { stroke: '#333', strokeWidth: 0.5, strokeDasharray: '2 2' },
        },
        background: '#1A1A1A',
        //labels: { text: { fill: '#aaa' } },
      }}
      enableGridX={false}
      enableGridY={false}
      role="application"
    />
  );
};

export default BarChart;
