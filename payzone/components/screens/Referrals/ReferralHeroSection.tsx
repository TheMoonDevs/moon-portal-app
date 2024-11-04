'use client';

import useAsyncState from '@/utils/hooks/useAsyncState';
import { CircularProgress } from '@mui/material';
import Image from 'next/image';
import { User } from '@prisma/client';
import { useAppDispatch } from '@/utils/redux/store';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/utils/hooks/useAuthSession';
import { MyServerApi } from '@/utils/service/MyServerApi';
import { setUser } from '@/utils/redux/auth/auth.slice';
import { APP_ROUTES } from '@/utils/constants/appInfo';

const ReferralHeroSection = () => {
  const { loading, signInReferralWithSocial, authStatus } = useAuthSession();

  return (
    <section className="mt-28 text-white">
      <div className="flex flex-col items-center justify-center">
        <HeroText />
        <button
          className="mb-4 mt-28 flex items-center justify-center gap-5 border-[1px] border-borderGrey px-14 py-3"
          onClick={signInReferralWithSocial}
          disabled={loading}
        >
          {authStatus === 'authenticating' ? (
            <CircularProgress size={30} color="inherit" />
          ) : (
            <Image src="/logo/google.png" alt="" width={30} height={30} />
          )}
          <span>Login with Google</span>
        </button>
      </div>
    </section>
  );
};

const HeroText = () => {
  return (
    <>
      <div className="mb-12 flex flex-col gap-3 text-center">
        <div className="relative">
          <p className="hero_text z-10 font-unica text-8xl first-letter:text-[#0AFF7C]">
            UPLIFT YOUR NETWORK
          </p>
          <Image
            src="/logo/ondemand.png"
            alt=""
            width={100}
            height={100}
            className="absolute right-[-4rem] top-[-3.4rem] z-0 self-end"
          />
        </div>
        <pre className="hero_text text-3xl font-light tracking-[0.2em] opacity-50">
          turn your connections into cash{' '}
        </pre>
      </div>
      <p className="hero_text text-md w-[55%] text-center">
        Refer TheMoonDevs to your friends who&apos;re building tech products.
        They need an excellent variable as much as we need a committed client.
        Tune up your connections and cash in your rewards.
      </p>
    </>
  );
};

export default ReferralHeroSection;
