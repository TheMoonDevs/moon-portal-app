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
  return (
    <main className="my-20 flex items-center justify-center">
      <div className="mt-8 flex w-4/5 flex-col items-center justify-evenly gap-10 lg:flex-row">
        <div className="relative flex w-4/5 items-center justify-center">
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
        <div className="w-full">
          <div className="relative mx-auto mt-6 max-w-sm rounded-3xl border border-gray-600 bg-black p-6 pt-8 sm:mx-[unset] sm:w-full sm:max-w-full">
            <div className="absolute inset-0 -z-10 h-full w-full scale-[0.80] transform rounded-full bg-red-500 bg-gradient-to-r from-blue-500 to-teal-500 blur-3xl" />
            <DevFolioCard />
          </div>
          <ul className="ml-0 mt-10 flex w-full flex-col items-center justify-center text-sm sm:ml-0 sm:items-start sm:justify-start lg:ml-8">
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 text-sm text-gray-300 sm:grid-cols-2">
              {items.map((item, index) => (
                <li key={index} className="flex w-full items-start space-x-3">
                  <span className="text-sky-400">{item.icon}</span>
                  <span className="">{item.text}</span>
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
