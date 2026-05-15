import { Raleway } from 'next/font/google';
import { useEffect } from 'react';

import { AuroraBackground } from '@/components/ui/aurora-background';
import { cn } from '@/lib/utils';

const marcellus = Raleway({ weight: '400', subsets: ['latin'] });
const WelcomeScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AuroraBackground className={cn('bg-black', marcellus.className)}>
      <div className="animate-fadeIn text-base font-light text-white opacity-0 md:text-2xl">
        Hello,
      </div>

      <div className="mt-8 animate-fadeIn text-center text-3xl font-extrabold text-white opacity-0 delay-500 md:text-[5rem]">
        Welcome
      </div>

      <div className="mt-8 animate-fadeInTopUp text-sm font-light italic tracking-widest text-gray-200 opacity-0 delay-1000 md:text-xl">
        to The Moon Devs Portal
      </div>

      {/* <div className="animate-fadeInTopUp opacity-0 delay-1000">
        <Loader2
          className="mt-10 animate-spin font-light"
          size={40}
          color="white"
        />
      </div> */}
    </AuroraBackground>
  );
};

export default WelcomeScreen;
