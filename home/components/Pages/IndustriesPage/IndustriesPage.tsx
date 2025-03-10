'use client'

import { FilloutFormIds, useFilloutPopup } from '@/components/App/Global/FilloutPopup';
import IndustryHeroSection from './IndustryHeroSection';
import IndustryList from './IndustryList';
import Image from 'next/image';

const IndustriesPage = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-[#F5F2F0] text-black">
      <IndustryHeroSection />
      <IndustryList />
      <Footer />
    </main>
  );
};


const Footer = () => {
  const { openForm } = useFilloutPopup()
  return (
    <div className="relative w-full bg-black">
      <Image
        src="/images/whychooseus-footer.png"
        className="w-full h-screen object-cover"
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

export default IndustriesPage;
