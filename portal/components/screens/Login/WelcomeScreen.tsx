import { AuroraBackground } from '@/components/ui/aurora-background';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Marcellus } from 'next/font/google';
import { useEffect } from 'react';

const marcellus = Marcellus({ weight: '400', subsets: ['latin'] });
const WelcomeScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AuroraBackground className={cn('bg-black', marcellus.className)}>
      <div className="animate-fadeInTopDown text-base font-light text-white opacity-0 md:text-2xl">
        Welcome to
      </div>

      <div className="animate-fadeIn mt-5 text-center text-3xl font-extrabold text-white opacity-0 delay-300 md:text-6xl">
        The Moon Devs Portal
      </div>

      <div className="mt-3 animate-fadeInTopUp text-sm font-light italic text-gray-200 opacity-0 md:text-xl">
        Connect. Innovate. Elevate.
      </div>

      <div className="animate-fadeInTopUp opacity-0 delay-300">
        <Loader2
          className="mt-8 animate-spin font-light"
          size={40}
          color="white"
        />
      </div>
    </AuroraBackground>
  );
};

export default WelcomeScreen;
