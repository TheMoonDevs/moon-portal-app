import { Box, LinearProgress, styled, Typography } from '@mui/material';

interface MultiColorProgressBarProps {
  currentPoints: number;
  nextLevelPoints: number;
  colors: string[];
  height?: number;
}

interface CustomLinearProgressProps
  extends React.ComponentPropsWithoutRef<typeof LinearProgress> {
  colors: string[];
  height?: number;
}

const CustomLinearProgress = styled(LinearProgress)<CustomLinearProgressProps>(
  ({ colors, height }) => ({
    height: height || 20,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    '& .MuiLinearProgress-bar': {
      borderRadius: 10,
      backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    },
  })
);

const MultiColorProgressBar: React.FC<MultiColorProgressBarProps> = ({
  currentPoints,
  nextLevelPoints,
  colors,
  height = 20,
}) => {
  const progressPercentage = Math.min(
    (currentPoints / nextLevelPoints) * 100,
    100
  );
  const pointsRemaining = nextLevelPoints - currentPoints;

  return (
    <Box sx={{ width: '100%', marginTop: '20px' }}>
      <Typography
        sx={{
          textAlign: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {pointsRemaining > 0 ? (
          `${pointsRemaining} Points to Next Badge`
        ) : (
          <> 🌕 Max Level Unlocked! 🚀</>
        )}
      </Typography>
      <CustomLinearProgress
        variant='determinate'
        value={progressPercentage}
        colors={colors}
        height={height}
        sx={{ marginTop: '10px' }}
      />
    </Box>
  );
};

export default MultiColorProgressBar;
