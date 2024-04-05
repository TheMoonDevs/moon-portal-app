'use client';
import Google from '../../../public/icons/google.svg';
import { useAuthSession } from '@/utils/hooks/useAuthSession';
import { useUser } from '@/utils/hooks/useUser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { setGoogleVerificationStatus } from '../../../utils/redux/auth/auth.slice';
import { useAppDispatch } from '../../../utils/redux/store';
import { APP_ROUTES } from '@/utils/constants/appInfo';

const GoogleVerifyPage = ({ signOutUser, setError }: any) => {
  const { user, isUserVerified } = useUser();
  const router = useRouter();
  const fetchedUserEmail = user?.email;
  const dispatch = useAppDispatch();
  const { signInWithSocial } = useAuthSession();

  const handleGoogleLogin = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const isVerifiedOnDevice = localStorage.getItem('isGoogleVerified');
    if (isVerifiedOnDevice === 'true') {
      router.push(APP_ROUTES.home);
      return;
    }

    try {
      const user = await signInWithSocial();
      if (!user || !user.email) throw new Error('User email is empty');
      const email = user.email;

      if (email === fetchedUserEmail) {
        dispatch(setGoogleVerificationStatus(true));
        localStorage.setItem('isGoogleVerified', 'true');
        router.push(APP_ROUTES.home);
      } else {
        dispatch(setGoogleVerificationStatus(false));
        console.log(isUserVerified);
        setError('Email not verified!, Signing out!');
        setTimeout(signOutUser(), 5000);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <button
        className='w-full flex flex-row justify-center items gap-[0.5rem] px-[1rem] py-[0.5rem] border-[#959595] rounded-[0.5rem] bg-[#fff] color-[#000] capitalize'
        onClick={handleGoogleLogin}
      >
        <Image src={Google} alt='icon' />
        Verify with Google
      </button>
    </div>
  );
};

export default GoogleVerifyPage;
