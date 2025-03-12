/* eslint-disable @next/next/no-img-element */
'use client';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InstallButton, InstallState } from './Install';
import { LoginButtons, LoginState, MobileBox } from './Login';
import { LoginPassCode } from './LoginPassCode';
import { GreyButton } from '@/components/elements/Button';
import GoogleVerifyPage from './GoogleVerifyPage';
import { SparklesCore } from '@/components/ui/sparkles';

export const LoginScreen = () => {
  const [tab, setTab] = useState<InstallState | LoginState>(
    LoginState.SELECT_USER_TYPE,
  );
  const searchParams = useSearchParams();
  const uri = searchParams?.get('uri');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data, status, user, verifiedUserEmail, signOutUser } = useUser(false);
  const [enteredPasscode, setEnteredPasscode] = useState<string | null>('');

  useEffect(() => {
    if (status === 'authenticated') {
      setTab(InstallState.SPLASH);
      //router.push(APP_ROUTES.home);
    }
  }, [user, status, router]);

  useEffect(() => {
    const passkey = searchParams?.get('passkey');
    if (passkey) {
      setTab(LoginState.LOGIN_CODE);
      setEnteredPasscode(passkey);
      loginWithPassCode(passkey);
    }
  }, [searchParams]);

  const loginWithPassCode = (passCode: string) => {
    setLoading(true);
    setError(null);
    console.log('Logging in with passcode', passCode);
    signIn('credentials', {
      username: passCode.substring(0, 3).toUpperCase(),
      password: passCode.substring(3).toUpperCase(),
      redirect: false,
      callbackUrl: uri || APP_ROUTES.home,
      // callbackUrl: (redirectUri as string) || APP_ROUTES.home,
      // redirect: true,
    })
      .then((data) => {
        setLoading(false);
        console.log('signIn callback', data);
        if (data?.ok) {
          console.log('Logged in!', data);
          localStorage.setItem('passcode', passCode);
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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-neutral-900 py-2">
      <div className="absolute inset-0 h-screen w-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="h-full w-full"
          particleColor="#FFFFFF"
        />
      </div>
      <MobileBox customClass="group rounded-3xl border border-neutral-700 ">
        <div className="absolute left-0 top-0 h-full w-full rounded-3xl bg-gradient-to-r from-gray-600 to-gray-500 opacity-65 blur transition duration-1000 group-hover:opacity-100 group-hover:blur-lg"></div>
        <div className="z-50 flex w-full flex-col items-center justify-center gap-10 rounded-3xl bg-neutral-900 p-[20px] md:px-[12px] md:py-8">
          <div className="flex flex-col items-center justify-center gap-8">
            <div className="flex grow flex-col items-center justify-center gap-4">
              <div className="rounded-full p-4">
                <Image
                  src="/logo/logo_white.png"
                  alt="The Moon Devs"
                  width={80}
                  height={80}
                />
              </div>
              <p className="text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
                Welcome to
              </p>

              <div className="relative w-full">
                <h4 className="mb-4 text-center text-3xl font-bold text-neutral-100">
                  TheMoonDevs
                </h4>
                {/* Gradients */}
                <div className="absolute inset-x-20 -bottom-[2px] left-1/2 right-0 h-[5px] w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm" />
                <div className="absolute inset-x-20 bottom-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                <div className="absolute inset-x-60 bottom-0 left-1/2 right-0 h-[5px] w-1/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm" />
                <div className="absolute inset-x-60 bottom-0 left-1/2 h-px w-1/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
              </div>
            </div>

            {loading && (
              <div className="flex flex-row items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-100"></div>
                <p className="text-neutral-100">Logging in...</p>
              </div>
            )}
            {status === 'authenticated' &&
              (!user ? (
                <div className="flex flex-row items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-100"></div>
                  <p className="text-neutral-100">Verifying...</p>
                </div>
              ) : (
                verifiedUserEmail !== user?.email && (
                  <div>
                    <p className="text-center text-xs text-neutral-400">
                      Are you{' '}
                      <span className="font-medium text-neutral-100">
                        {user?.email}?
                      </span>{' '}
                      Please verify by signing in via google.
                    </p>{' '}
                  </div>
                )
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
                setEnteredPasscode(passCode);
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
          {status === 'authenticated' &&
            user &&
            verifiedUserEmail !== user?.email && (
              <GoogleVerifyPage
                signOutUser={signOutUser}
                setError={setError}
                passcode={enteredPasscode}
              />
            )}
          {status === 'authenticated' &&
            verifiedUserEmail === user?.email &&
            user && (
              <GreyButton
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (uri) router.replace(uri);
                  else router.push(APP_ROUTES.home);
                }}
              >
                Enter App
              </GreyButton>
            )}
          {/* {status === "authenticated" && <Logout user={user} signOut={signOut} />} */}
          {error && (
            <p className="mt-4 text-center text-xs text-red-500">{error}</p>
          )}
        </div>
      </MobileBox>
    </div>

    // </div>
  );
};
