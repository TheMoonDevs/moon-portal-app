'use client';
import ComplexityFunnel from './ComplexityFunnel';
import Link from 'next/link';
import {
  FilloutFormIds,
  useFilloutPopup,
} from '@/components/App/Global/FilloutPopup';
import { Risque } from 'next/font/google';

const risque = Risque({ weight: ['400'], subsets: ['latin'] });
const ComplexityPage = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-white text-black">
      <div className="mt-20 flex w-full items-center justify-start">
        <div className="mx-auto mt-20 w-responsive max-w-responsive md:mx-32 lg:mx-56">
          <h1 className="mb-6 flex flex-col gap-2 text-4xl font-bold md:text-6xl lg:text-7xl">
            A tech project's worth is measured by it's complexity.
          </h1>
          <p className="mb-6 flex flex-col text-lg text-neutral-600 w-1/2">
            TheMoonDevs is a digital startup studio specialising in pioneering
            edge tech solutions & integrating difficult-to-execute trending technologies into your projects.
          </p>
        </div>
      </div>
      <ComplexityFunnel />
      <div className="mx-auto h-[2px] w-[90%] bg-neutral-700"></div>
      <PlanListing />
      <SimplePriceSection />

    </main>
  );
};

// That which no one can do, is what we're most interested in doing.

const PLAN_DATA = [
  {
    id: 1,
    title: 'Simpleton MVP',
    description:
      'The perfect starting place for your idea. Turn around in 3-4 weeks. No lags, jump right into development',
  },
  {
    id: 2,
    title: 'Premium MVP',
    description:
      'Everything you need to scale your project. Pay per week, Pause/cancel anytime. Scale with 2x speed.',
  },
  {
    id: 3,
    title: 'Complex MVP',
    description:
      'Our cohort of devs will make your impossible project pssible. On-site team support.',
  },
];

const PlanListing = () => {
  const { openForm } = useFilloutPopup();
  return (
    <div className="mx-10 w-responsive max-w-responsive py-10 pb-32 md:mx-56 md:py-20">
      <h1 className="my-10 mb-20 text-center text-3xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
        Our Services are purpose-built around the complexity{' '}
        <span className="font-normal italic">funnel</span>, to help you start
        simple &<span className="font-normal italic"> scale</span> in a
        sustainable, predictable pattern.
      </h1>
      <div className="z-30 grid gap-4 md:grid-cols-3">
        {PLAN_DATA.map((plan) => (
          <div className="group relative z-50 after:absolute after:bottom-0 after:left-0 after:-z-[1] after:h-full after:w-full after:bg-orange-300 after:from-pink-500 after:via-orange-400 after:to-green-500 after:bg-clip-border">
            <Link
              href={`/pricing`}
              key={plan.id}
              className="flex flex-col gap-2 border border-neutral-200 bg-white p-4 transition-all duration-300 group-hover:-translate-y-2 group-hover:translate-x-2"
            >
              <div className="font-bold text-neutral-500">0{plan.id}</div>
              <h2 className="text-lg font-bold">{plan.title}</h2>
              <p className="text-sm text-neutral-600">{plan.description}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimplePriceSection = () => {
  const { openForm } = useFilloutPopup();

  return (
    <div className="z-20 flex w-full items-center justify-center bg-black p-6 lg:p-20">
      <div className="relative after:absolute after:bottom-0 after:left-0 after:-z-[1] after:h-full after:w-full after:-translate-x-2 after:translate-y-2 after:bg-gradient-to-r after:from-pink-500 after:via-orange-400 after:to-green-500 after:bg-clip-border">
        <div className="relative z-30 flex flex-col overflow-hidden border bg-white p-6 shadow-lg md:flex-row lg:p-10">
          <div className="flex w-full flex-col justify-stretch lg:pr-6">
            <div className="flex h-full w-full flex-col justify-between lg:w-[90%]">
              <h2 className="mb-5 text-center text-4xl font-semibold text-black md:text-left xl:text-6xl">
                Simple, transparent pricing to get you started
              </h2>
              <p className="mt-2 text-center text-gray-600 md:text-left">
                Start with a simpler version of your complex idea. <br /> No Hidden fees, No extra costs. Any project under 2x complexity.
              </p>
            </div>
          </div>

          <div className="mt-10 flex w-full flex-col justify-center border-gray-300 pl-6 text-center md:w-3/4 md:border-l lg:mt-0 lg:w-1/2">
            <div className="-ml-14 mb-6 flex justify-center md:-ml-0 md:justify-end lg:my-0">
              <span className="self-start text-sm text-gray-500 lg:justify-self-end">
                From
              </span>
              <div className="flex flex-col">
                <p
                  className={`${risque.className} text-6xl font-extralight text-black md:self-end md:text-7xl lg:text-8xl`}
                >
                  $3,999
                </p>
                <span className="self-end text-sm text-gray-500">
                  per project
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-2 md:justify-end">
              <Link
                href={'/pricing'}
                className="mt-4 rounded-md border border-gray-500 px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
              >
                View our pricing
              </Link>
              {/* Get Started Button */}
              <button
                onClick={() => openForm(FilloutFormIds.BookCall)}
                className="mt-4 rounded-md border border-gray-500 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Get Started &nbsp; &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplexityPage;
