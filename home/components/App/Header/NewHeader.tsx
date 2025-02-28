'use client';
import { APP_ROUTES } from '@/utils/constants/AppInfo';
import { useAuthSession } from '@/utils/hooks/useAuthSession';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Link } from '../Global/react-transition-progress/CustomLink';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ResourcesContent } from './ResourcesContent';
import { ProductsContent } from './ProductsContent';
import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';

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

  const isMobile = useMediaQuery(media.largeMobile);
  useEffect(() => {
    if (!isMobile && open) {
      setOpen(false);
    }
  }, [isMobile]);
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
    <div className="fixed top-0 z-[100] w-full backdrop-blur-sm">
      <div
        className={`relative mx-6 my-6 flex items-center justify-between bg-transparent ${open && 'mb-0 rounded-t-lg rounded-tr-lg !bg-black'} max-lg:mx-2 max-lg:my-2`}
      >
        <div className="flex h-12 max-w-fit items-center justify-between rounded-lg bg-black px-2 text-white">
          <Link
            className="flex items-center gap-3 max-lg:gap-0"
            href={APP_ROUTES.index}
          >
            <Image
              src="/logo/logo_white.png"
              alt="logo"
              height={36}
              width={32}
            />
            <p className="px-2 py-2 text-sm font-semibold max-lg:hidden">
              TheMoonDevs
            </p>
          </Link>
          <NavigationMenu delayDuration={0} className="max-lg:hidden">
            <NavigationMenuList className="">
              {path !== '/products/custom-bots' && (
                <>
                  <NavigationMenuItem className="">
                    <NavigationMenuTrigger className="bg-black hover:!bg-[#414a4c] hover:text-white">
                      <div className="text-sm">Resources</div>
                      <NavigationMenuContent className="m-0 w-full border-none p-0">
                        <ResourcesContent />
                      </NavigationMenuContent>
                    </NavigationMenuTrigger>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-black hover:!bg-[#414a4c] hover:text-white">
                      <div className="text-sm">Products</div>
                      <NavigationMenuContent className="m-0 w-full border-none p-0">
                        <ProductsContent />
                      </NavigationMenuContent>
                    </NavigationMenuTrigger>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {path === '/products/custom-bots' && (
            <>
              <MenuItem
                label="Public Bots"
                onMouseEnter={() =>
                  setShowDropdown({ pricing: false, publicBots: true })
                }
                onMouseLeave={closeDropdowns}
              />
              <MenuItem
                label="Pricing"
                onMouseEnter={() =>
                  setShowDropdown({ publicBots: false, pricing: true })
                }
                onMouseLeave={closeDropdowns}
              />
            </>
          )}
        </div>
        {showDropdown.publicBots && (
          <div className="absolute left-0 top-12 mt-2 h-40 w-80 rounded-md border border-gray-300 bg-white p-2 text-black shadow-lg">
            Box 1
          </div>
        )}
        {showDropdown.pricing && (
          <div className="absolute left-0 top-12 mt-2 h-40 w-96 rounded-md border border-gray-300 bg-white p-2 text-black shadow-lg">
            Box 2
          </div>
        )}

        <div className="flex h-12 max-w-fit items-center justify-between gap-3 rounded-lg bg-black px-2 text-white max-lg:gap-0">
          {path === '/products/custom-bots' && (
            <>
              <div className="flex items-center">
                <MenuItem label="Resources" />
                <MenuItem label="View Demo" />
                <Link
                  href={'https://portal.themoondevs.com'}
                  className="cursor-pointer rounded-md border-2 border-transparent px-2 py-2 text-sm font-semibold transition-colors duration-300 ease-in-out hover:bg-[#414a4c] max-lg:hidden"
                  // onClick={() => handleGoogleSignIn('/products/custom-bots')}
                >
                  Sign In
                </Link>
              </div>
              <CustomButton label="Start Trial" />
            </>
          )}

          {path !== '/products/custom-bots' && (
            <>
              <div className="flex items-center">
                <MenuItem label="Pricing" to="/pricing" />
                <MenuItem label="Roast" to="/roast" />
                <Link
                  href={'https://portal.themoondevs.com'}
                  className="cursor-pointer rounded-md border-2 border-transparent px-2 py-2 text-sm font-semibold transition-colors duration-300 ease-in-out hover:bg-[#414a4c] max-lg:hidden"
                  // onClick={() => handleGoogleSignIn('/')}
                >
                  Sign In
                </Link>
              </div>
              <CustomButton label="Book a Call" />
            </>
          )}

          {/* Hamburger */}
          <button
            className="hidden px-1 py-2 max-lg:block"
            onClick={() => setOpen(!open)}
          >
            <span className="material-symbols-outlined !text-2xl">
              {!open ? 'menu' : 'close'}
            </span>
          </button>
        </div>
      </div>
      {open && isMobile && (
        <HamBurger handleGoogleSignIn={handleGoogleSignIn} />
      )}
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
    <div className="mx-6 rounded-bl-lg rounded-br-lg bg-black px-5 py-4 text-white max-lg:mx-2 max-lg:my-[-10px]">
      {path === '/' && (
        <>
          <Accordion className="w-full" defaultValue={'resources'}>
            <AccordionItem value="resources" className="w-full border-none">
              <AccordionTrigger
                className="text-left text-2xl font-bold"
                arrowStyle="text-white h-6 w-6"
              >
                Resources
              </AccordionTrigger>
              <AccordionContent className="w-full bg-white text-base text-neutral-600">
                <ResourcesContent orientation="mobile" className="bg-white" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="products" className="w-full border-none">
              <AccordionTrigger
                className="text-left text-2xl font-bold"
                arrowStyle="text-white h-6 w-6"
              >
                Products
              </AccordionTrigger>
              <AccordionContent className="w-full bg-white text-base text-neutral-600">
                <ProductsContent className="w-full p-2" orientation="mobile" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Link
            href={'https://portal.themoondevs.com'}
            className="py-2 text-2xl font-bold max-sm:text-lg"
            onClick={() => handleGoogleSignIn && handleGoogleSignIn('/')}
          >
            Sign In
          </Link>
          <div className="mt-6 flex items-center gap-4 border-t-[1px] border-gray-300 py-4 max-sm:flex-col max-sm:gap-2 max-sm:py-2">
            <button
              className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white max-sm:w-full"
              style={{ border: '2px solid white' }}
            >
              Book a Call
            </button>
          </div>
        </>
      )}
      {path === '/products/custom-bots' && (
        <>
          <p className="flex items-center justify-between py-2 text-2xl font-bold max-sm:text-lg">
            Public Bots{' '}
            <span className="material-symbols-outlined">
              keyboard_arrow_down
            </span>
          </p>
          <p className="flex items-center justify-between py-2 text-2xl font-bold max-sm:text-lg">
            Resources
            <span className="material-symbols-outlined">
              keyboard_arrow_down
            </span>
          </p>
          <p className="py-2 text-2xl font-bold max-sm:text-lg">Pricing</p>
          <div className="mt-6 flex items-center gap-4 border-t-[1px] border-gray-300 py-4 max-sm:flex-col max-sm:gap-2 max-sm:py-2">
            <button
              className="w-1/2 rounded-md bg-white py-2 text-sm font-semibold text-black max-sm:w-full"
              style={{ border: '2px solid white' }}
            >
              View Demo
            </button>
            <Link
              href={'https://portal.themoondevs.com'}
              className="w-1/2 rounded-md bg-black py-2 text-sm font-semibold text-white max-sm:w-full"
              style={{ border: '2px solid white' }}
              // onClick={() =>
              //   handleGoogleSignIn &&
              //   handleGoogleSignIn('/products/custom-bots')
              // }
            >
              Sign In
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

const CustomButton = ({ label }: { label: string }) => {
  return (
    <button className="hover:shadow-hover:shadow-gray-400 flex transform items-center justify-center rounded-lg !bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:translate-x-0.5 max-lg:hidden">
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
      className="cursor-pointer rounded-md border-2 border-transparent px-2 py-2 text-sm font-semibold transition-colors duration-300 ease-in-out hover:bg-[#414a4c] max-lg:hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </Link>
  );
};
