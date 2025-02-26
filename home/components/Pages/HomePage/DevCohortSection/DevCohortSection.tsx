import { Mrs_Sheppards } from 'next/font/google';
import ProfileGrid from './ProfileGrid';

const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const DevCohortSection = () => {
  return (
    <section className="bg-black">
      <div className="mx-auto grid w-4/5 grid-cols-[1fr,2fr] py-32 text-white">
        <div className="flex flex-col">
          <div className="flex flex-col text-5xl">
            <span>Work </span>
            <span>with </span>
            <span>devs </span>
            <span>that </span>
            <span className={`${mrsSheppard.className} mt-4 text-6xl`}>
              know{' '}
            </span>
            <span className="my-2 text-lg">their way around</span>
          </div>
          <span
            className={`${mrsSheppard.className} my-2 text-8xl font-extrabold`}
          >
            +
          </span>
          <div className="flex flex-col text-5xl">
            <span className={`${mrsSheppard.className} text-6xl`}>love </span>
            <span className="mt-2 text-lg">what they do.</span>
          </div>
        </div>
        <ProfileGrid />
      </div>
    </section>
  );
};

export default DevCohortSection;
