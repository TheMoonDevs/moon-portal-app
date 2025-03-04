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
import DevFolioCard from '@/components/App/Global/FolioCard';
import { CardContainer } from '@/components/ui/3d-card';

const items = [
  {
    text: 'Insights into Industry Markets',
    icon: <BarChart3 size={20} />,
  },
  { text: 'Case Studies of Top Ventures', icon: <Briefcase size={20} /> },
  { text: "Developer Insights - What's Next?", icon: <Code size={20} /> },
  { text: 'AI Landscape', icon: <Palette size={20} /> },
  { text: '101 Guide for GPT Coding', icon: <BookOpen size={20} /> },
  { text: 'Useful Lists for Entrepreneurs', icon: <List size={20} /> },
];
const DevFolio = () => {
  return (
    <main className="flex items-center justify-center my-20 xl:my-0 xl:h-screen">
      <div className="mt-8 flex w-4/5 flex-col items-center justify-evenly gap-10 lg:flex-row">
        <div className="relative flex flex-1 items-center justify-center">
          <CardContainer>
            <Image
              src="/images/folio-image.svg"
              alt="devfolio"
              className="z-50 mt-4"
              width={450}
              height={450}
            />
          </CardContainer>
        </div>
        <div className="flex-1 flex flex-col-reverse gap-8 md:gap-10 lg:gap-0 lg:flex-col">
          <div className="relative mx-auto mt-6 max-w-sm rounded-3xl border border-gray-600 bg-black p-6 pt-8 sm:mx-[unset] sm:w-full sm:max-w-full">
            <div className="absolute inset-0 -z-10 h-full scale-[0.80] transform rounded-full bg-red-500 bg-gradient-to-r from-blue-500 to-teal-500 blur-3xl" />
            <DevFolioCard />
          </div>
          <ul className="ml-0 mt-10 flex flex-col items-center justify-center text-sm sm:ml-0 xl:items-start xl:justify-start">
            <div className="grid grid-cols-1 gap-x-12 md:gap-x-4 gap-y-6 text-sm text-gray-300 sm:grid-cols-2">
              {items.map((item, index) => (
                <li key={index} className="flex w-full items-start space-x-3">
                  <span className="text-white">{item.icon}</span>
                  <span className="text-neutral-400">{item.text}</span>
                </li>
              ))}
            </div>
          </ul>
        </div>
      </div>
      <BackgroundBeams className="-z-10" />
    </main>
  );
};

export default DevFolio;
