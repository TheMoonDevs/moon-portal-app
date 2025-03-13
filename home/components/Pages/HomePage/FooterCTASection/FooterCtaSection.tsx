import {
  FilloutFormIds,
  useFilloutPopup,
} from '@/components/App/Global/FilloutPopup';
import Image from 'next/image';
import React from 'react';

const FooterCtaSection: React.FC = () => {
  const { openForm } = useFilloutPopup();
  return (
    <section className="relative flex w-full items-start justify-center overflow-hidden md:min-h-[600px] lg:min-h-[1000px]">
      {/* Background Image Container */}
      <div className="absolute inset-0 h-full w-full">
        {/* Image will be added by you */}
        <Image
          src="/images/home-footer-cta.png"
          alt="hero"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto my-[20%] flex max-w-7xl flex-col px-6 sm:px-6 md:mt-[20%] md:justify-center lg:px-8">
        <h2 className="mx-auto mb-10 max-w-5xl text-center text-2xl font-bold text-white md:text-4xl lg:text-5xl">
          "Work with a cohort of devs who are most passionate about building new
          ideas in new spaces solving challenging problems."
        </h2>

        <div className="mx-auto flex flex-col items-center">
          <button
            onClick={() => openForm(FilloutFormIds.BookCall)}
            className="md:text-md mx-auto flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-bold text-black transition-colors duration-200 hover:bg-gray-300 lg:text-lg"
          >
            Get Started Today
            <span className="material-symbols-outlined inherit">
              arrow_right_alt
            </span>
          </button>
          <p className="mt-2 text-xs text-white">
            Free trails for seed-funded startups.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FooterCtaSection;
