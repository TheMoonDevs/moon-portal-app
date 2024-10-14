'use client';
import { APP_ROUTES } from '@/utils/constants/AppInfo';
import { useAuthSession } from '@/utils/hooks/useAuthSession';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';

const NewHeader = () => {
  const [showDropdown, setShowDropdown] = useState({
    publicBots: false,
    pricing: false,
  });
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();

  const { signInWithSocial } = useAuthSession();

  const closeDropdowns = () => {
    setShowDropdown({ publicBots: false, pricing: false });
  };

  const handleGoogleSignIn = async (redirectUrl?: string) => {
    try {
      const user = await signInWithSocial();
      console.log('Google sign-in successful: ', user);
      router.push(redirectUrl || '/');
      open && setOpen(false);
    } catch (error) {
      console.error('Google sign-in error: ', error);
    }
  };

  return (
    <div className='fixed w-full top-0 z-[100] bg-transparent'>
      {' '}
      <div
        className={` relative bg-transparent my-6 mx-6 flex items-center justify-between ${open && '!bg-black mb-0 rounded-t-lg rounded-tr-lg'} max-lg:mx-2 max-lg:my-2`}
      >
        <div className='h-12 max-w-fit rounded-lg bg-black text-white flex items-center px-2 justify-between'>
          <Link
            className='flex items-center gap-3 max-lg:gap-0'
            href={APP_ROUTES.index}
          >
            <Image
              src='/logo/logo_white.png'
              alt='logo'
              height={36}
              width={32}
            />
            <p className='text-sm py-2 px-2 font-semibold max-lg:hidden'>
              TheMoonDevs
            </p>
          </Link>
          {path === '/' && (
            <>
              <MenuItem label='Dev Folio' />
              <MenuItem label='Unit Rates' />
            </>
          )}
          {path === '/products/custom-bots' && (
            <>
              <MenuItem
                label='Public Bots'
                onMouseEnter={() =>
                  setShowDropdown({ pricing: false, publicBots: true })
                }
                onMouseLeave={closeDropdowns}
              />
              <MenuItem
                label='Pricing'
                onMouseEnter={() =>
                  setShowDropdown({ publicBots: false, pricing: true })
                }
                onMouseLeave={closeDropdowns}
              />
            </>
          )}
        </div>
        {showDropdown.publicBots && (
          <div className='absolute bg-white h-40 w-80 left-0 text-black border border-gray-300 mt-2 rounded-md p-2 top-12 shadow-lg'>
            Box 1
          </div>
        )}
        {showDropdown.pricing && (
          <div className='absolute bg-white h-40 w-96 left-0 text-black border border-gray-300 mt-2 rounded-md p-2 top-12 shadow-lg'>
            Box 2
          </div>
        )}

        <div className='h-12 max-w-fit rounded-lg bg-black text-white flex items-center px-2 gap-3 justify-between max-lg:gap-0'>
          {path === '/products/custom-bots' && (
            <>
              <div className='flex items-center '>
                <MenuItem label='Resources' />
                <MenuItem label='View Demo' />
                <button
                  className='text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden'
                  onClick={() => handleGoogleSignIn('/products/custom-bots')}
                >
                  Sign In
                </button>
              </div>
              <Button label='Start Trial' />
            </>
          )}

          {path === '/' && (
            <>
              <div className='flex items-center '>
                <MenuItem label='Products' to='/products/custom-bots' />
                <MenuItem label='Services' />
                <button
                  className='text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden'
                  onClick={() => handleGoogleSignIn('/')}
                >
                  Sign In
                </button>
              </div>
              <Button label='Book a Call' />
            </>
          )}

          {/* Hamburger */}
          <button
            className='hidden max-lg:block py-2 px-1'
            onClick={() => setOpen(!open)}
          >
            <span className='material-symbols-outlined !text-2xl'>
              {!open ? 'menu' : 'close'}
            </span>
          </button>
        </div>
      </div>
      {open && <HamBurger handleGoogleSignIn={handleGoogleSignIn} />}
    </div>
  );
};

export default NewHeader;

const HamBurger = ({
  handleGoogleSignIn,
}: {
  handleGoogleSignIn?: (path: string) => void;
}) => {
  const path = usePathname();

  return (
    <div className='text-white bg-black mx-6 rounded-bl-lg rounded-br-lg py-4 px-5 max-lg:mx-2 max-lg:my-[-10px]'>
      {path === '/' && (
        <>
          <p className='text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between'>
            Products
            <span className='material-symbols-outlined'>
              keyboard_arrow_down
            </span>
          </p>
          <p className='text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between'>
            Services
            <span className='material-symbols-outlined'>
              keyboard_arrow_down
            </span>
          </p>
          <p className='text-2xl max-sm:text-lg font-bold py-2'>Dev Folio</p>
          <p className='text-2xl max-sm:text-lg font-bold py-2'>Unit Rates</p>

          <p
            className='text-2xl max-sm:text-lg font-bold py-2'
            onClick={() => handleGoogleSignIn && handleGoogleSignIn('/')}
          >
            Sign In
          </p>
          <div className='flex items-center gap-4 max-sm:gap-2 max-sm:flex-col border-t-[1px] border-gray-300 mt-6 py-4 max-sm:py-2'>
            <button
              className='w-full max-sm:w-full rounded-md text-sm py-2 bg-white text-black font-semibold'
              style={{ border: '2px solid white' }}
            >
              Book a Call
            </button>
          </div>
        </>
      )}
      {path === '/products/custom-bots' && (
        <>
          <p className='text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between'>
            Public Bots{' '}
            <span className='material-symbols-outlined'>
              keyboard_arrow_down
            </span>
          </p>
          <p className='text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between'>
            Resources
            <span className='material-symbols-outlined'>
              keyboard_arrow_down
            </span>
          </p>
          <p className='text-2xl max-sm:text-lg font-bold py-2'>Pricing</p>
          <div className='flex items-center gap-4 max-sm:gap-2 max-sm:flex-col border-t-[1px] border-gray-300 mt-6 py-4 max-sm:py-2'>
            <button
              className='w-1/2 max-sm:w-full rounded-md text-sm py-2 bg-white text-black font-semibold'
              style={{ border: '2px solid white' }}
            >
              View Demo
            </button>
            <button
              className='w-1/2 max-sm:w-full rounded-md text-sm py-2 bg-black text-white font-semibold'
              style={{ border: '2px solid white' }}
              onClick={() =>
                handleGoogleSignIn &&
                handleGoogleSignIn('/products/custom-bots')
              }
            >
              Sign In
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Button = ({ label }: { label: string }) => {
  return (
    <button
      className='rounded-full !bg-white text-black text-sm py-2 px-4 font-medium flex items-center justify-center transition-all duration-300 ease-in-out
transform hover:translate-x-1 hover:-translate-y-1 hover:shadow-hover:shadow-gray-400 max-lg:hidden'
    >
      {label}
    </button>
  );
};

interface MenuItemProps {
  label: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  to?: string;
}

const MenuItem = ({ label, onMouseEnter, onMouseLeave, to }: MenuItemProps) => {
  return (
    <Link
      href={to || '#'}
      className='text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </Link>
  );
};
