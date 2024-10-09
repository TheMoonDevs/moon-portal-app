'use client';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { setIsPageLoading } from '@/redux/ui/ui.slice';
import { useMounted } from '@/utils/hooks/useMounted';
import styled from '@emotion/styled';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PageProgress = styled.div<{ active?: boolean; color?: string }>`
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  z-index: 100;

  span {
    border-top: 4px solid
      ${(props) => (props.color ? props.color : props.theme.colors.primary)};
    display: ${(props) => (props.active ? 'block' : 'none')};
    animation: ${(props) =>
      props.active ? 'progress_loading 2s ease-in infinite' : 'unset'};
  }

  @keyframes progress_loading {
    0% {
      width: 0;
    }
    100% {
      width: 100%;
    }
  }
`;

export function PageLoader({ color }: { color?: string }) {
  const isPageLoading = useAppSelector((state) => state.ui.isPageLoading);
  return (
    <PageProgress active={isPageLoading} color={color}>
      <span />
    </PageProgress>
  );
}

export function AppPageLoader({ color }: { color?: string }) {
  usePageLoader();
  return <PageLoader color='black' />;
}

export const usePageLoader = () => {
  const dispatch = useAppDispatch();
  const path = usePathname();
  const router = useRouter();
  const isMounted = useMounted();

  useEffect(() => {
    const handleRouteChange = (
      url: string,
      { shallow }: { shallow: boolean }
    ) => {
      if (shallow) {
        return;
      }
      if (path === url) {
        return;
      }
      dispatch(setIsPageLoading(true));
    };
    const handleRouteFinish = () => {
      dispatch(setIsPageLoading(false));
    };
    if (isMounted) {
      dispatch(setIsPageLoading(false));
    }
    return () => {
      dispatch(setIsPageLoading(true));
    };
  }, [isMounted, path, dispatch]);
};
