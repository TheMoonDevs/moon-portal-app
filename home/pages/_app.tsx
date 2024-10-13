import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Provider as ReduxProvider } from "react-redux";
import type { AppType } from "next/app";
import { AppProps } from "next/app";

import { CacheProvider, EmotionCache, Global } from "@emotion/react";

import { Header } from "@/components/App/Header/Header";
import MetaInfo, { MetaInfoProps } from "@/components/App/MetaInfo";
import { AppPageLoader } from "@/components/App/PageLoader";

import { MUIThemeProvider } from "@/styles/provider";
import createEmotionCache from "@/styles/emotion";
import globalStyles from "@/styles/global";
import "../styles/globals.css";

import store from "@/redux/store";
import { FirebaseSDK } from "@/utils/service/firebase";
import { APP_ROUTES } from "@/utils/constants/AppInfo";
import { useRouter } from "next/router";
import NewHeader from "@/components/App/Header/NewHeader";

const clientSideEmotionCache = createEmotionCache();

// FirebaseSDK.initializeAnalaytics();

const MyLayout: React.FC<{ show: boolean; children?: React.ReactNode }> = ({
  children,
  show,
}) => {
  const path = usePathname();
  const router = useRouter();
  const isDefinedRoute = Object.values(APP_ROUTES).includes(router.pathname);

  //if (!show) return null;

  useEffect(() => {
    FirebaseSDK.initializeAnalaytics();
  }, []);

  return (
    <MUIThemeProvider>
      {/* <Header /> */}
      <NewHeader/>
      <main>{children}</main>
      <AppPageLoader />
      {/* <Footer /> */}
      {/* <LoginModal /> */}
    </MUIThemeProvider>
  );
};

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

const MyApp: AppType<{
  //session: Session | null;
  emotionCache: EmotionCache;
  meta: MetaInfoProps;
}> = (props: MyAppProps) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const {} = pageProps;
  return (
    <CacheProvider value={emotionCache}>
      <ReduxProvider store={store}>
        <MetaInfo meta={pageProps.meta} />
        <Global styles={globalStyles} />
        {/* <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-${GTAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-${GTAG_ID}');
        `}
        </Script> */}
        <MyLayout show={true}>
          <Component {...pageProps} />
        </MyLayout>
        {/* <Analytics /> */}
        {/* </PersistGate> */}
        {/* </SessionProvider> */}
      </ReduxProvider>
    </CacheProvider>
  );
};

export default MyApp;
