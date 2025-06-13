import { Raleway } from 'next/font/google';
import Image from 'next/image';
import { FileText } from 'lucide-react';
import { IIndustryAndProjects } from '../HomePage/IndustrySection/IndustryData';
import IndustryCarousel from '../IndustriesPage/IndustryCarousel';
import { projectsData } from '../HomePage/IndustrySection/IndustryData';
import { ExperienceSection } from './ExperienceSection';
import { WorkExperienceAccordion } from './WorkExperienceAccordion';
import { founderProjects } from './FounderProjects';
import { FounderActivity } from './FounderActivity';
import FounderThoughts from './FounderThoughts';

const raleway = Raleway({ weight: '700', subsets: ['latin'] });

const SOCIAL_LINKS = [
    {
        href: 'https://www.linkedin.com/in/s-t-r/',
        icon: '/icons/linkedin.svg',
        label: 'LinkedIn',
    },
    {
        href: 'https://twitter.com/subhakartikkireddy',
        icon: '/icons/twitter.svg',
        label: 'Twitter',
    },
    {
        href: 'https://medium.com/@subhakartikkireddy_10915',
        icon: 'https://cdn.svgporn.com/logos/medium-icon.svg',
        label: 'Medium',
    },
    {
        href: 'https://github.com/karcreativeworks',
        icon: 'https://cdn.svgporn.com/logos/github-icon.svg',
        label: 'GitHub',
    },
    {
        href: 'https://www.toptal.com/resume/subhakar-tikkireddy',
        icon: <FileText className="w-[18px] h-[18px] text-white" />,
        label: 'Toptal',
    },
];

export const FounderPage = () => {
    return (
        <>
            <section className="w-full bg-black text-white flex flex-col md:flex-row items-stretch justify-start gap-0 md:gap-20">
                <div className="flex-1 flex-grow-1 max-w-4xl pt-16 px-6 md:p-16 flex flex-col items-start justify-center md:min-h-screen order-2 md:order-2">
                    <h1 className={`text-4xl md:text-8xl font-thin mb-6 leading-tight ${raleway.className}`}>Building the Next Level</h1>
                    <p className="text-ms md:text-lg text-gray-300 font-light tracking-wide leading-relaxed mb-8">
                        <span className="font-bold text-xl">Subhakar Tikkireddy</span> is a visionary serial entrepreneur, renowned for leading multiple pre-seed startups to success as a fractional CTO. His expertise bridges technology and business, empowering digital startup founders to scale and innovate in competitive markets.
                    </p>
                    <div className="flex gap-5">
                        {SOCIAL_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={link.label}
                                className="hover:scale-110 transition-transform duration-200"
                            >
                                {typeof link.icon === 'string' ? (
                                    <Image src={link.icon} alt={link.label} width={18} height={18} className="drop-shadow-lg invert" />
                                ) : (
                                    link.icon
                                )}
                            </a>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-8">
                        <a
                            href="https://themoondevs.com/l/meet-str"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center gap-2"
                        >
                            Book a Discovery Call
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>
                        <a
                            href="https://www.linkedin.com/in/s-t-r/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-200 inline-flex items-center gap-2"
                        >
                            Send Me an InMail
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
                <div className="flex items-end justify-start relative min-h-screen order-1 md:order-1 -mt-[250px] md:mt-0">
                    <Image
                        src="/images/subhakar/header-snapshot-2.png"
                        alt="Subhakar Tikkireddy"
                        width={450}
                        height={600}
                        className="rounded-xl shadow-2xl object-cover filter grayscale"
                        priority
                    />
                    <div className="absolute inset-0 rounded-xl pointer-events-none bg-black/30 mix-blend-overlay" />
                </div>
            </section>
            <FounderThoughts />
            <section className="w-full bg-black text-white flex flex-col md:flex-row items-stretch justify-start gap-0 md:gap-20">
                <IndustryCarousel
                    theme={'dark'}
                    industryArticles={founderProjects}
                    industryName={"Case Studies & Articles"}
                />
            </section>
            <section className="min-h-screen w-full bg-black text-white flex flex-col md:flex-row items-stretch justify-start gap-0">
                <FounderActivity />
                <WorkExperienceAccordion />
            </section>
            <section className="w-full bg-black text-white py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className={`text-3xl md:text-5xl font-thin mb-6 ${raleway.className}`}>Let's Build Something Amazing Together</h2>
                    <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                        Whether you're looking to scale your startup, need technical leadership, or want to explore innovative solutions, I'm here to help turn your vision into reality.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-4">
                            <a
                                href="https://themoondevs.com/l/meet-str"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center gap-2"
                            >
                                Book a Discovery Call
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/s-t-r/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-2 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-200 inline-flex items-center gap-2"
                            >
                                Send Me an InMail
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                        <p className="text-sm text-gray-400">30-minute free consultation to discuss your project</p>
                    </div>
                </div>
            </section>
        </>
    );
}