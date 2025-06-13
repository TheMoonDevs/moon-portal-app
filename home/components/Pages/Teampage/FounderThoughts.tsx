import React from 'react';

const FounderThoughts: React.FC = () => {
    return (
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12 sm:space-y-16 lg:space-y-24">
                {/* First Section */}
                <section className="space-y-4 sm:space-y-6 flex justify-center relative">
                    <div className="absolute inset-0 bg-[url('/images/worklife-footer-bg4.jpg')] bg-cover bg-center grayscale mix-blend-overlay"></div>
                    <div className='max-w-4xl py-8 sm:py-12 lg:py-16 relative z-10 px-4 sm:px-6 lg:px-8'>
                        <h6 className='text-gray-400 text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-4'>Why i do what I do ?</h6>
                        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-100 leading-tight">
                            "I like to code the Next Idea, not the existing one."
                        </h2>
                        <p className="text-base sm:text-lg mt-3 sm:mt-4 text-gray-400 leading-relaxed">
                            My passion for coding stems from its ability to transform ideas into reality. Over the past decade,
                            I've found my true calling in building startups and tackling edge tech challenges and complex projects (as that's what usually a good startup idea is centered around).
                            <br /><br />
                            What fascinates me
                            is the unique intersection of design and code - two seemingly opposite skill sets that I've mastered through
                            years of experience. I believe in innovations and the building spirit, most useful products today are built by innovators and not the exisitng enterprises.
                            <br /><br />
                            That's where the real fun is - building what's next rather than fixing what's already there.
                        </p>
                    </div>
                </section>

                {/* Second Section */}
                {/* <section className="space-y-6">

                </section> */}
            </div>
        </div>
    );
};

export default FounderThoughts;
