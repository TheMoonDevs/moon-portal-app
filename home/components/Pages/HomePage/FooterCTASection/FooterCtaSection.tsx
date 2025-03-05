import { FilloutFormIds, useFilloutPopup } from '@/components/App/Global/FilloutPopup';
import Image from 'next/image';
import React from 'react';

const FooterCtaSection: React.FC = () => {
    const { openForm } = useFilloutPopup();
    return (
        <section className="relative w-full min-h-[80vh] md:min-h-[600px] lg:min-h-[1000px] flex items-start justify-center overflow-hidden">
            {/* Background Image Container */}
            <div className="absolute inset-0 w-full h-full">
                {/* Image will be added by you */}
                <Image
                    src="/images/home-footer-cta.png"
                    alt="hero"
                    className="h-full w-full object-cover"
                    fill
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 flex flex-col md:justify-center mt-[20%] md:mt-[20%]">
                <h2 className="text-white text-2xl text-left md:text-center md:text-4xl lg:text-5xl font-bold max-w-5xl mx-auto mb-10">
                    "Work with a cohort of devs who are most passionate about building new ideas in new spaces solving challenging problems."
                </h2>

                <div className='mx-auto flex flex-col items-center'>
                    <button
                        onClick={() => openForm(FilloutFormIds.BookCall)}
                        className="bg-white mx-auto flex items-center gap-2 hover:bg-gray-300 text-black text-sm md:text-md lg:text-lg font-bold py-3 px-8 rounded-lg transition-colors duration-200">
                        Get Started Today
                        <span className="material-symbols-outlined inherit">arrow_right_alt</span>
                    </button>
                    <p className='text-white text-xs mt-2'>Free trails for seed-funded startups.</p>
                </div>
            </div>
        </section>
    );
};

export default FooterCtaSection;
