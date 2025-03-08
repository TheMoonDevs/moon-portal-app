import { ReactNode } from 'react';
import LineChart from './charts/LineChart';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import BarChart from './charts/BarChart';
const AIEmpoweredDevelopmentData = [
  {
    id: 'progress',
    color: 'orange',
    data: [
      { x: '2018', y: 1 },
      { x: '2019', y: 5.5 },
      { x: '2020', y: 4 },
      { x: '2021', y: 4.3 },
      { x: '2022', y: 5 },
      { x: '2023', y: 4 },
      { x: '2024', y: 5.5 },
      { x: '2025', y: 4 },
    ],
  },
];
const AIEmpoweredDevelopment = () => {
  return (
    <div>
      <div className="afte:content-[''] relative mx-6 mb-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-400 after:absolute after:bottom-0 after:left-0 after:h-[0.5px] after:w-full after:bg-neutral-700">
        AI-Driven Performance Over Time
      </div>
      <div className="h-[400px] w-full">
        <LineChart
          data={[AIEmpoweredDevelopmentData[0]]}
          gridValues={[0, 1, 2, 3, 4, 5, 6]}
          tickValuesLeft={[0, 1, 2, 3, 4, 5, 6]}
          tickValuesBottom={['2018', '2025']}
        />
      </div>
    </div>
  );
};

const RealtimeProgressTrackingData = [
  {
    id: 'slide1',
    items: [
      {
        title: 'abc',
        image_url: '/images/abstract-red.png',
      },
      { title: 'bac', image_url: '/images/abstract-red.png' },
    ],
  },
  {
    id: 'slide2',
    items: [
      { title: '', image_url: '/images/abstract-red.png' },
      { title: '', image_url: '/images/abstract-red.png' },
    ],
  },
  {
    id: 'slide3',
    items: [
      { title: '', image_url: '/images/abstract-red.png' },
      { title: '', image_url: '/images/abstract-red.png' },
    ],
  },
];

const RealtimeProgressTracking = () => {
  function CarouselControls() {
    return (
      <div className="mt-8 flex gap-3 bg-black">
        <CarouselPrevious />
        <CarouselNext />
      </div>
    );
  }
  return (
    <Carousel>
      <CarouselContent className="-ml-1">
        {RealtimeProgressTrackingData.map((slide) => (
          <CarouselItem className="pl-1">
            <div key={slide.id} className="flex">
              {slide.items.map((item) => (
                <div key={item.title} className="relative w-full">
                  <Image
                    src={item.image_url}
                    className="aspect-square w-full object-cover"
                    alt={item.title}
                    width={500}
                    height={500}
                  />
                  <span className="absolute left-3 top-3 block rounded-full bg-black px-2 py-2 text-white">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>{' '}
      <CarouselControls />
    </Carousel>
  );
};

const BuildersNetwork = () => {
  return (
    <div className="col-span-full h-[400px] w-full border border-neutral-700 md:col-span-6">
      <BarChart />
    </div>
  );
};

const DevsPassionData = [
  {
    id: 'slide1',
    title: 'abc',
    image_url: '/images/abstract-red.png',
  },
  {
    id: 'slide2',
    title: '',
    image_url: '/images/abstract-red.png',
  },
];
const DevsPassion = () => {
  function CarouselControls() {
    return (
      <div className="mt-8 bg-black">
        <div className="flex justify-end gap-3">
          <CarouselPrevious className="static" />
          <CarouselNext className="static" />
        </div>
      </div>
    );
  }
  return (
    <Carousel>
      <CarouselControls />
      <CarouselContent className="-ml-1">
        {DevsPassionData.map((slide) => (
          <CarouselItem className="pl-1">
            <div key={slide.id} className="flex">
              <div className="relative w-full">
                <Image
                  src={slide.image_url}
                  className="aspect-video w-full object-cover"
                  alt={slide.title}
                  width={500}
                  height={500}
                />
                <span className="absolute left-3 top-3 block rounded-full bg-black px-2 py-2 text-white">
                  {slide.title}
                </span>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>{' '}
    </Carousel>
  );
};

export interface IFeature {
  id: string;
  title: string;
  traits: string;
  sectionTitle: string;
  sectionHeading: string;
  sectionDescription: string;
  content: ReactNode;
  titleIconColor: string;
  orientation: 'vertical' | 'horizontal';
}

export const features: IFeature[] = [
  {
    id: 'ai-empowered-development',
    title: 'Ai Empowered Development',
    traits: 'speed',
    sectionTitle: 'Ai Empowered Development',
    sectionHeading: "Speed & Performance beyond what's humanly possible.",
    sectionDescription:
      'Work with teams & devs who know how to take advantage of AI',
    content: <AIEmpoweredDevelopment />,
    titleIconColor: 'bg-orange-500',
    orientation: 'vertical',
  },
  {
    id: 'progress-tracking',
    title: 'Realtime progress tracking tools',
    traits: 'efficiency',
    sectionTitle: 'Transparent Progress Tracking',
    sectionHeading: 'Top-Notch tools to keep you updated at every step',
    sectionDescription:
      'Our portal gives you complete realtime progress updates on team & devs - Quality that can be measured',
    content: <RealtimeProgressTracking />,
    titleIconColor: 'bg-blue-400',
    orientation: 'vertical',
  },
  {
    id: 'industry-experts',
    title: 'Industry experts at demand',
    traits: 'technique',
    sectionTitle: 'elite developers who work with edge-tech',
    sectionHeading: 'Industry experts that you can consult/work with',
    sectionDescription:
      'fractional cto’s & cmo’s available at demand to lead / advice your project',
    content: <></>,
    titleIconColor: 'bg-yellow-500',
    orientation: 'vertical',
  },
  {
    id: 'long-term-project-support',
    title: 'Long term project support',
    traits: 'help',
    sectionTitle: 'Long term & RESPONSIVE support',
    sectionHeading: 'Teams that care to solve you out of your fix',
    sectionDescription:
      'bug fixes or feature requests - we will never say no when you need us.',
    content: <></>,
    titleIconColor: 'bg-green-500',
    orientation: 'vertical',
  },
  {
    id: 'devs-with-the-same-passion',
    title: 'Devs with the same passion',
    traits: 'passion',
    sectionTitle: 'problem solvers that love challenges',
    sectionHeading: 'Innovators Who Build & Scale',
    sectionDescription:
      'From Idea to Launch: We help startups validate, iterate, and grow with powerful MVPs.',
    content: <DevsPassion />,
    titleIconColor: 'bg-orange-500',
    orientation: 'vertical',
  },
  {
    id: 'builders-network',
    title: 'Builders Network',
    traits: 'scale',
    sectionTitle: 'ascess to builder network',
    sectionHeading: 'Reach out/network with next tech product leaders',
    sectionDescription:
      'product leaders who can accelerate your success with insights, collaboration, and hands-on support',
    content: <BuildersNetwork />,
    titleIconColor: 'bg-purple-500',
    orientation: 'horizontal',
  },
];
