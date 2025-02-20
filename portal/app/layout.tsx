/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/google-font-display */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@mantine/core/styles.css';
import './globals.css';
import '@mdxeditor/editor/style.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { MUIThemeRegistry } from '@/styles/provider';
import { ReduxProvider } from '@/utils/redux/provider';
import { ToastsContainer } from '@/components/elements/Toast';
import { SessionProvider, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import NextAuthProvider from '@/utils/services/NextAuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { AppLayout } from '@/components/global/AppLayout';
import { MantineProvider } from '@mantine/core';
import { UpdatePWA } from '@/components/global/UpdatePWA';
import PushServiceRegistration from '@/components/global/PushServiceRegistration';
import RedirectWrapperProvider from '@/components/global/RedirectWrapperProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json', // we are accessing our manifest file here
  title: 'The Moon Devs',
  description:
    'A community of developers and designers building the future of the web',
};

export default function RootLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block"
          rel="stylesheet"
        ></link>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined&display=block"
          rel="stylesheet"
        ></link>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0,0&display=block"
        ></link>
      </head>
      <body className={inter.className}>
        <NextAuthProvider session={session}>
          <MUIThemeRegistry options={{ key: 'mui' }}>
            <MantineProvider>
              <RedirectWrapperProvider>
                <ReduxProvider>
                  <PushServiceRegistration>
                    <UpdatePWA>
                      <AppLayout>{children}</AppLayout>
                    </UpdatePWA>
                  </PushServiceRegistration>
                  <ToastsContainer />
                </ReduxProvider>
              </RedirectWrapperProvider>
            </MantineProvider>
          </MUIThemeRegistry>
        </NextAuthProvider>
      </body>
    </html>
  );
}
