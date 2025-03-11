'use client';

import { features, IFeature } from './WhyChooseUsData';
import ListSectionLayout from './ListSectionLayout';
import FeatureListItems from './FeatureListItems';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { FilloutFormIds, useFilloutPopup } from '@/components/App/Global/FilloutPopup';

const WhyChooseUs = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-white text-black">
      <div className="mt-20 w-full">
        <Header />
        <div className="mx-auto w-[calc((100%/12)*10)] max-w-[calc(1492px+(1.5rem*2))]">
          <Hero />
          <FeatureListItems />
        </div>
        <div className="w-full bg-black">
          <div className="mx-auto w-[calc((100%/12)*10)] max-w-[calc(1492px+(1.5rem*2))]">
            <div className="py-20">
              {features.map((feature, index) => (
                <ListSectionLayout
                  index={index}
                  key={feature.id}
                  feature={feature}
                >
                  {feature.content}
                </ListSectionLayout>
              ))}
            </div>
          </div>
          <Footer />
        </div>
        {/* <BarChart /> */}
      </div>
    </main>
  );
};

const Footer = () => {
  const { openForm } = useFilloutPopup()
  return (
    <div className="relative">
      <Image
        src="/images/whychooseus-footer.png"
        className="w-full"
        width={1920}
        height={1080}
        alt="footer"
      />
      <div className="absolute top-0 my-auto grid h-[calc(100%)] w-full grid-cols-1 lg:grid-cols-2">
        <div className="flex h-full w-full flex-col justify-center gap-20 py-4 text-white lg:col-start-2 lg:-mt-20 lg:w-4/5">
          <h1 className="flex flex-col gap-2 text-center text-4xl font-extrabold md:text-6xl lg:text-right lg:text-7xl">
            <span className="w-full">A true miracle</span>{' '}
            <span className="w-full">requires people</span>
            <span className="w-full">who truly care</span>
            <span className="w-full">for your idea</span>
          </h1>
          <button
            onClick={() => openForm(FilloutFormIds.BookCall)}
            className="mx-auto w-fit rounded-lg bg-white px-5 py-2 text-lg font-bold text-black md:text-xl lg:ml-auto lg:mr-0 lg:self-end lg:text-2xl">
            Start your journey with us &nbsp; &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      <span className="relative z-10 mb-4 px-4 text-xl font-normal uppercase tracking-wide">
        Why TheMoonDevs?
      </span>
      <div className="flex w-full flex-col gap-1 px-8">
        <div className="h-[1px] bg-black"></div>
        <div className="h-[1px] bg-black"></div>
      </div>
    </div>
  );
};

const Hero = () => {
  return (
    <div className="relative flex flex-col items-center justify-center py-6 md:py-12">
      <h1 className="mx-auto py-2 text-center text-4xl font-extrabold sm:block sm:w-10/12 md:w-full md:py-3 md:text-6xl lg:text-7xl">
        6 reasons why TheMoonDevs is the best choice for your project
      </h1>
    </div>
  );
};

export default WhyChooseUs;
