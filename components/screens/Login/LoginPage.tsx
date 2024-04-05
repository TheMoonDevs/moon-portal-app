/* eslint-disable @next/next/no-img-element */
'use client';

import { APP_ROUTES, LOCAL_STORAGE } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InstallButton, InstallState } from './Install';
import { LoginButtons, LoginState, MobileBox } from './Login';
import { LoginPassCode } from './LoginPassCode';
import { GreyButton } from '@/components/elements/Button';
import GoogleVerifyPage from './GoogleVerifyPage';

export const LoginPage = () => {
  const [tab, setTab] = useState<InstallState | LoginState>(
    LoginState.SELECT_USER_TYPE
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data, status, user, isUserVerified, signOutUser } = useUser(false);

  useEffect(() => {
    if (status === 'authenticated') {
      setTab(InstallState.SPLASH);
      //router.push(APP_ROUTES.home);
    }
  }, [user, status, router]);

  const loginWithPassCode = (passCode: string) => {
    setLoading(true);
    setError(null);
    console.log('Logging in with passcode', passCode);
    signIn('credentials', {
      username: passCode.substring(0, 3).toUpperCase(),
      password: passCode.substring(3).toUpperCase(),
      redirect: false,
    })
      .then((data) => {
        setLoading(false);
        console.log('signIn callback', data);
        if (data?.ok) {
          console.log('Logged in!', data);
          // router.push(APP_ROUTES.home);
        } else {
          console.log('Failed to login!', data);
          setError('Invalid passcode!');
          setTab(LoginState.SELECT_USER_TYPE);
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
        console.log('Failed to login!');
        setError('Network Error!');
        setTab(LoginState.SELECT_USER_TYPE);
      });
  };

  return (
    <div className='flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen'>
      <MobileBox>
        <div className='flex flex-col grow gap-4 items-center justify-center'>
          <div className='  p-4 rounded-full'>
            <Image
              src='/logo/logo_white.png'
              alt='The Moon Devs'
              width={80}
              height={80}
            />
          </div>
          <p className='text-neutral-400 tracking-[0.5em] uppercase text-xs text-center'>
            Welcome to
          </p>
          <h4 className='text-3xl font-bold text-neutral-100'>TheMoonDevs</h4>
          {loading && (
            <div className='flex flex-row items-center justify-center gap-2'>
              <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-100'></div>
              <p className='text-neutral-100'>Logging in...</p>
            </div>
          )}
          {status === 'authenticated' &&
            (!user ? (
              <div className='flex flex-row items-center justify-center gap-2'>
                <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-100'></div>
                <p className='text-neutral-100'>Verifying...</p>
              </div>
            ) : (
              <div>
                <p className='text-neutral-400   text-xs text-center'>
                  Are you {user?.email}? Please verify by signing in via google.
                </p>{' '}
              </div>
            ))}
        </div>
        <InstallButton
          onInstallUpdate={(inst) => {
            if (inst) setTab(InstallState.INSTALL_CHECK);
          }}
        />
        {tab === LoginState.LOGIN_CODE && (
          <LoginPassCode
            onPassCodeFilled={(passCode) => {
              loginWithPassCode(passCode);
              setTab(InstallState.SPLASH);
            }}
          />
        )}
        {tab === LoginState.SELECT_USER_TYPE && (
          <LoginButtons
            onSelectUserType={(_type) => {
              setTab(LoginState.LOGIN_CODE);
            }}
          />
        )}
        {status === 'authenticated' && user && !isUserVerified && (
          <GoogleVerifyPage signOutUser={signOutUser} setError={setError} />
        )}
        {isUserVerified && (
          <GreyButton
            onClick={() => {
              router.push(APP_ROUTES.dashboard);
            }}
          >
            Enter App
          </GreyButton>
        )}
        {/* {status === "authenticated" && <Logout user={user} signOut={signOut} />} */}
        {error && (
          <p className='text-red-500 text-xs text-center mt-4'>{error}</p>
        )}
      </MobileBox>
    </div>
  );
};
