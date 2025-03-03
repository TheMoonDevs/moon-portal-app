'use client';

import { BackgroundBeams } from '@/components/ui/background-beams';
import Image from 'next/image';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Code,
  List,
  Palette,
} from 'lucide-react';
import { useRef, useState } from 'react';

const items = [
  {
    text: 'Insights into Industry Markets & Trends',
    icon: <BarChart3 size={20} />,
  },
  { text: 'Case Studies of Top Ventures', icon: <Briefcase size={20} /> },
  { text: "Developer Insights into What's Next?", icon: <Code size={20} /> },
  { text: 'Design Fiction into AI Landscape', icon: <Palette size={20} /> },
  { text: '101 Guide for GPT Coding', icon: <BookOpen size={20} /> },
  { text: 'Most Useful Lists for Entrepreneurs', icon: <List size={20} /> },
];
const DevFolio = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const [email, setEmail] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 15;
    const y = (e.clientY - top - height / 2) / 15;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseEntered(true);
    if (!containerRef.current) return;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
  };

  const handleDownloadFolio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // 1. call a subscription api
      // 2. save the doc in db - source, email, context - dev folio
      // 3. send an email to the user
    } catch (e) {
    } finally {
    }
  };

  return (
    <main className="flex h-dvh items-center justify-center">
      <div className="mt-8 flex w-4/5 items-center justify-evenly gap-10">
        <div
          className="relative flex w-4/5 items-center justify-center"
          style={{ perspective: '1000px' }}
        >
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Image
              src="/images/folio-image.svg"
              alt="devfolio"
              className="z-50 mt-4"
              width={450}
              height={450}
            />
          </div>
        </div>
        <div className="w-full">
          <div className="relative mt-6 rounded-3xl border border-gray-600 bg-black p-6 pt-8">
            <div className="absolute inset-0 -z-10 h-full w-full scale-[0.80] transform rounded-full bg-red-500 bg-gradient-to-r from-blue-500 to-teal-500 blur-3xl" />
            <div className="flex w-fit flex-col gap-4">
              <h1 className="text-xl font-bold xl:text-3xl">MoonDev-Folio</h1>
              <p className="text-sm text-neutral-500">
                Our teams have helped more than 56 startups, 132 Feature
                requests for many innovations across the globe. Get an
                informative guide
              </p>
              <form
                onSubmit={handleDownloadFolio}
                className="mt-2 flex w-full flex-col items-center rounded-full border-transparent bg-black md:mt-4 xl:flex-row xl:gap-0 xl:border-[1px] xl:border-gray-500 xl:p-1.5"
              >
                <input
                  type="email"
                  required
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder="@ - Enter your Mail"
                  className="w-full flex-1 rounded-full border border-gray-500 bg-transparent px-3 py-1 text-sm text-white placeholder-gray-400 outline-none xl:w-auto xl:rounded-none xl:border-none"
                />
                <button
                  type="submit"
                  className="mt-4 w-full rounded-full border border-white bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 xl:mt-0 xl:w-auto"
                >
                  Download
                </button>
              </form>
            </div>
          </div>
          <ul className="ml-8 mt-10 grid w-full grid-cols-2 gap-x-12 gap-y-6 text-sm text-gray-300">
            {items.map((item, index) => (
              <li key={index} className="flex w-full items-start space-x-3">
                <span className="text-sky-400">{item.icon}</span>
                <span className="">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <BackgroundBeams className="-z-10" />
    </main>
  );
};

export default DevFolio;
