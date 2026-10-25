/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { GreyButton } from '@/components/elements/Button';
import { SparklesCore } from '@/components/ui/sparkles';
import { LOGIN_ERROR_MESSAGES } from '@/lib/auth/loginErrors';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useAuthSession } from '@/utils/hooks/useAuthSession';
import { useUser } from '@/utils/hooks/useUser';

import { InstallButton, InstallState } from './Install';
import { LoginButtons, LoginState, MobileBox } from './Login';
import { LoginPassCode } from './LoginPassCode';

const Spinner = ({ label }: { label: string }) => (
  <div className="flex flex-row items-center justify-center gap-2">
    <div className="size-5 animate-spin rounded-full border-y-2 border-neutral-100"></div>
    <p className="text-neutral-100">{label}</p>
  </div>
);

/**
 * Sign-in is two short steps: type your portal code, then pick any Google
 * account linked to you. Both are checked together on the server.
 */
export const LoginScreen = () => {
  const [tab, setTab] = useState<InstallState | LoginState>(
    LoginState.SELECT_USER_TYPE,
  );
  const searchParams = useSearchParams();
  const uri = searchParams?.get('uri');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passCode, setPassCode] = useState<string | null>(null);
  const router = useRouter();
  const { status, user, googleEmail } = useUser();
  const { getGoogleIdToken } = useAuthSession();

  const isSignedIn = status === 'authenticated' && !!googleEmail;

  // A session from before Google became part of sign-in is not enough any
  // more: end it quietly so the person can sign in the new way.
  useEffect(() => {
    if (status === 'authenticated' && !googleEmail) {
      signOut({ redirect: false });
    }
  }, [status, googleEmail]);

  useEffect(() => {
    if (isSignedIn) setTab(InstallState.SPLASH);
  }, [isSignedIn]);

  useEffect(() => {
    const passkey = searchParams?.get('passkey');
    if (passkey && passkey.length === 6) {
      setPassCode(passkey.toUpperCase());
      setTab(LoginState.GOOGLE);
    }
  }, [searchParams]);

  const resetToCode = (message: string | null) => {
    setError(message);
    setPassCode(null);
    setTab(LoginState.LOGIN_CODE);
  };

  const continueWithGoogle = async () => {
    if (!passCode) return;
    setError(null);

    let idToken: string;
    try {
      idToken = await getGoogleIdToken();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(LOGIN_ERROR_MESSAGES.GOOGLE_FAILED);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username: passCode.substring(0, 3).toUpperCase(),
        password: passCode.substring(3).toUpperCase(),
        idToken,
        redirect: false,
        callbackUrl: uri || APP_ROUTES.home,
      });
      if (result?.ok) {
        router.replace(uri || APP_ROUTES.home);
        return;
      }
      const code = result?.error ?? '';
      if (code === 'INVALID_CODE') resetToCode(LOGIN_ERROR_MESSAGES[code]);
      else
        setError(
          LOGIN_ERROR_MESSAGES[code] ?? 'Sign-in failed. Please try again.',
        );
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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
          className="size-full"
          particleColor="#FFFFFF"
        />
      </div>
      <MobileBox customClass="group rounded-3xl border border-neutral-700 ">
        <div className="absolute left-0 top-0 size-full rounded-3xl bg-gradient-to-r from-gray-600 to-gray-500 opacity-65 blur transition duration-1000 group-hover:opacity-100 group-hover:blur-lg"></div>
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
                  The Moon Devs
                </h4>
                {/* Gradients */}
                <div className="absolute inset-x-20 -bottom-[2px] left-1/2 right-0 h-[5px] w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm" />
                <div className="absolute inset-x-20 bottom-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                <div className="absolute inset-x-60 bottom-0 left-1/2 right-0 h-[5px] w-1/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm" />
                <div className="absolute inset-x-60 bottom-0 left-1/2 h-px w-1/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
              </div>
            </div>

            {loading && <Spinner label="Signing in..." />}
          </div>
          <InstallButton
            onInstallUpdate={(inst) => {
              if (inst) setTab(InstallState.INSTALL_CHECK);
            }}
          />
          {tab === LoginState.SELECT_USER_TYPE && (
            <LoginButtons onContinue={() => setTab(LoginState.LOGIN_CODE)} />
          )}
          {tab === LoginState.LOGIN_CODE && (
            <LoginPassCode
              onPassCodeFilled={(code) => {
                setError(null);
                setPassCode(code.toUpperCase());
                setTab(LoginState.GOOGLE);
              }}
            />
          )}
          {tab === LoginState.GOOGLE && passCode && !loading && (
            <div className="flex w-3/4 flex-col items-center gap-3">
              <p className="text-center text-xs text-neutral-400">
                Code{' '}
                <span className="font-mono tracking-[0.3em] text-neutral-100">
                  {passCode.slice(0, 3)}•••
                </span>
                . Now sign in with any Google account linked to you.
              </p>
              <button
                onClick={continueWithGoogle}
                className="flex w-full flex-row items-center justify-center gap-2 rounded-[0.5rem] bg-white px-4 py-2 font-medium text-black hover:bg-neutral-200"
              >
                <Image src="/icons/google.svg" alt="" width={20} height={20} />
                <span>Continue with Google</span>
              </button>
              <button
                onClick={() => resetToCode(null)}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Use a different code
              </button>
            </div>
          )}
          {isSignedIn && user && (
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
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
        </div>
      </MobileBox>
    </div>
  );
};
