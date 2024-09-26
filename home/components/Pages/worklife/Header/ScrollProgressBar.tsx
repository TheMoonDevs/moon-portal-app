import { useEffect, useState } from 'react';
import { LinearProgress } from '@mui/material';
import styled from '@emotion/styled';

const ProgressWrapper = styled.div<{ hide: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  z-index: 101;
  visibility: ${({ hide }) => (hide ? 'hidden' : 'visible')};
  transition: all 0.2s ease-in-out;
`;

export const ScrollProgressBar = ({ color }: { color: string }) => {
  const [scroll, setScroll] = useState(0);
  const [hideProgressBar, setHideProgressBar] = useState(true);

  const handleScroll = () => {
    const totalScroll = document.documentElement.scrollTop;
    const windowHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrollPercent = (totalScroll / windowHeight) * 100;
    setScroll(Number(scrollPercent));
    setHideProgressBar(window.scrollY === 0);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <ProgressWrapper hide={hideProgressBar}>
      <LinearProgress
        variant='determinate'
        value={scroll}
        sx={{
          backgroundColor: 'transparent',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color
          }
        }}
      />
    </ProgressWrapper>
  );
};
