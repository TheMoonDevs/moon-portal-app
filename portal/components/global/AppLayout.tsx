'use client';

import { usePathname, useRouter } from 'next/navigation';

import { useUser } from '@/utils/hooks/useUser';

export interface PageReactFC extends React.FC {
  isAuthRequired: boolean;
}

export const AppLayout = (props: { children: any }) => {
  const { user, status } = useUser(true);
  const path = usePathname();
  const router = useRouter();

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {props.children}
    </div>
  );
};
