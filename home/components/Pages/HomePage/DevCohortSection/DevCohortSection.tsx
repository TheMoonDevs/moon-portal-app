import { Mrs_Sheppards } from 'next/font/google';
import ProfileGrid from './ProfileGrid';
import Image from 'next/image';
import Link from 'next/link';

const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const DevCohortSection = () => {
  return (
    <section className="bg-black">
      <div className="flex flex-col pb-12 pt-12 text-white md:gap-28 md:pb-20 md:pt-32">
        <div className="mx-auto grid w-full gap-16 md:w-4/5 md:grid-cols-[1fr,2fr] md:gap-0">
          <CohortHeader />
          <ProfileGrid />
        </div>
        <CohortFooter />
      </div>
    </section>
  );
};

const CohortFooter = () => {
  return (
    <div className="my-[100px] flex flex-col items-center justify-center gap-2 md:mt-10 md:mb-0 md:flex-row md:items-start md:gap-2">
      <div className="flex items-end justify-center gap-1 text-xs font-bold md:items-start md:text-base">
        <div className="flex flex-col items-center gap-2 text-xs font-bold md:text-base">
          <Image
            alt="a selective"
            src="/icons/diamond-yellow.svg"
            width={20}
            height={20}
          />
          <span>a selective,</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-xs font-bold md:text-base">
          <Image
            alt="vetted"
            src="/icons/verified.svg"
            width={20}
            height={20}
          />
          <span>vetted,</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-xs font-bold md:text-base">
          <Image alt="growing" src="/icons/fire.svg" width={20} height={20} />
          <span>growing,</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-xs font-bold md:text-base">
          <Image alt="global" src="/icons/globe.svg" width={20} height={20} />
          <span>global</span>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start gap-2 md:mt-2 md:gap-4">
        <div className="text-xs font-bold md:text-base">
          <span>community </span>
          <span>of</span>
        </div>
        <Link
          href={'/dev-cohort'}
          className="group flex items-center gap-1 md:flex-col"
        >
          <span className={`${mrsSheppard.className} text-xl md:text-4xl`}>
            300 +
          </span>
          <span className="after:contents-[''] relative flex items-center gap-2 text-xs font-light text-neutral-400 transition-all duration-200 after:absolute after:bottom-0 after:left-0 after:mt-2 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:text-white group-hover:text-white group-hover:after:w-full">
            <span className="hidden md:block md:text-sm">
              apply to join cohort
            </span>
            <span className="material-symbols-outlined !text-xs">
              open_in_new
            </span>
          </span>
        </Link>
        <span className="text-xs font-bold md:text-base">devs</span>
      </div>
    </div>
  );
};

const CohortHeader = () => {
  return (
    <div className="flex items-center justify-center gap-5 my-[100px] md:gap-10 md:mt-0 md:mb-0 md:flex-col md:items-start md:justify-start">
      <div className="flex flex-col text-2xl md:text-5xl">
        <span>Work </span>
        <span>with </span>
        <span>devs </span>
        <span>that </span>
      </div>
      <div>
        <div className="flex items-center gap-6 text-5xl md:flex-col md:items-start md:gap-0">
          <span
            className={`${mrsSheppard.className} text-4xl md:mt-4 md:text-6xl`}
          >
            know{' '}
          </span>
          <span className="text-lg md:my-2">their way around</span>
        </div>
        <span
          className={`${mrsSheppard.className} my-2 text-5xl font-extrabold md:text-8xl`}
        >
          +
        </span>
        <div className="flex items-center gap-6 text-5xl md:flex-col md:items-start md:gap-0">
          <span className={`${mrsSheppard.className} text-4xl md:text-6xl`}>
            love{' '}
          </span>
          <span className="text-lg md:mt-2">what they do.</span>
        </div>
      </div>
    </div>
  );
};

export default DevCohortSection;
