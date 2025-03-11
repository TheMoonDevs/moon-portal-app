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
import { Card, CardContent } from '@/components/ui/card';

const AIEmpoweredDevelopmentData = [
  {
    id: 'progress',
    color: 'orange',
    data: [
      { x: '2018', y: 0.12 },
      { x: '2019', y: 0.23 },
      { x: '2020', y: 0.56 },
      { x: '2021', y: 0.89 },
      { x: '2022', y: 0.95 },
      { x: '2023', y: 2.35 },
      { x: '2024', y: 4.5 },
      { x: '2025', y: 5.9 },
    ],
  },
];

export const AIEmpoweredDevelopment = () => {
  return (
    <div>
      <div className="afte:content-[''] relative mx-6 mb-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-400 after:absolute after:bottom-0 after:left-0 after:h-[0.5px] after:w-full after:bg-neutral-700">
        AI-Driven Developer Performance Over Time
      </div>
      <div className="h-[400px] w-full">
        <LineChart
          data={[AIEmpoweredDevelopmentData[0]]}
          gridValues={[0, 1, 2, 3, 4, 5, 6]}
          tickValuesLeft={[0, 1, 2, 3, 4, 5, 6]}
          tickValuesBottom={['2018', '2023', '2024', '2025']}
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
        title: 'Client Cockpit: Everything you need at a glance',
        image_url: '/images/portal-image/portal-worksync.png',
      },
      {
        title: 'Analyze sprints in real-time',
        image_url: '/images/portal-image/portal-livetrack.png'
      },
    ],
  },
  {
    id: 'slide2',
    items: [
      { title: 'timezone-free scheduler', image_url: '/images/portal-image/schedule-meets.png' },
      { title: 'get-work-done on the go.', image_url: '/images/portal-image/mobile-app.png' },
    ],
  },
  // {
  //   id: 'slide3',
  //   items: [
  //     { title: '', image_url: '/images/abstract-red.png' },
  //     { title: '', image_url: '/images/abstract-red.png' },
  //   ],
  // },
];

export const RealtimeProgressTracking = () => {
  function CarouselControls() {
    return (
      <div className="mt-8 flex gap-3 bg-black">
        <CarouselPrevious className="static bg-transparent text-white md:absolute" />
        <CarouselNext className="static bg-transparent text-white md:absolute" />
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

const INDUSTRY_EXPERTS_DATA = [
  {
    company: 'SHARESIES',
    stat: '70%',
    description: 'Resolution rate with Fin',
    author: {
      name: 'RUBY PICTON',
      role: 'Investor Care Lead',
    },
  },
  {
    company: 'ROBIN',
    description:
      "The numbers speak for themselves. We're seeing a 50% resolution rate with Fin, which is pretty amazing!",
    author: {
      name: 'BEN PEAK',
      role: 'Director, Technical Support',
    },
  },
  {
    company: 'DENTAL INTELLIGENCE',
    stat: '97%',
    description: 'Fin CSAT Score',
    author: {
      name: 'SAM MILLER',
      role: 'Customer Support Operations Manager',
    },
  },
  {
    company: 'LINKTREE',
    description:
      'Within six days, Fin started resolving 42% of conversations and surpassed my expectations.',
    author: {
      name: 'DANE BURGESS',
      role: 'Customer Support Director',
    },
  },
];

export const INNOVATORS_DATA = [
  {
    company: 'CTO of 28+ Startups',
    description: `The challenge of building an edge-tech project is what drove me to initiate TheMoonDevs, we are a growing collective of similar builder-mindset developers across industries & countries. We build new stuff from scratch, and we love it.`,
    author: {
      name: 'Subhakar T.',
      role: 'Founder of TheMoonDevs',
    },
  },
  {
    company: 'Data Engineer',
    description: `Data tells stories if you build the right systems to listen. When building from zero, I can ask 'what patterns exist that no one has looked for?' That question leads to insight, not just efficiency.`,
    author: {
      name: 'Ibrahim A.',
      role: 'Sr. from TheMoonDev Cohort',
      profile: `/images/profiles/ibrahim-n.png`,
    },
  },
  {
    company: 'UX/UI Engineer',
    description:
      'I love the challenge of building User interfaces from scratch with complex interaction patterns & user flows. Making complex things seem simple is the crux of my role. and It’s a great feeling to see a messed-up interface slowly healing.',
    author: {
      name: 'Kshitij S.',
      role: 'TheMoonDevs Core-Team',
    },
  },
  {
    company: 'ML/AI Engineer',
    description: `When someone creates something they never thought possible because of my tool, that's worth more than any optimization metric. AI/ML research is slow-burn science that unravels into cascaading innovation results.`,
    author: {
      name: 'Pramod G.',
      role: 'Ex-Sony AI Researcher',
    },
  },
  {
    company: 'DEVOPs Engineer',
    description:
      `The challenge of building automated systems that take away the burden of manual developer or client tasks is what drives me. with the advent of AI, & blockchain, the future of DevOps is more exciting & secure than ever.`,
    author: {
      name: 'Vishwajeet Y.',
      role: 'TheMoonDevs Core-Team',
    },
  },
];

interface Testimonial {
  company: string;
  stat?: string;
  description: string;
  author: {
    name: string;
    role: string;
  };
}
export const Testimonial = ({
  data = INDUSTRY_EXPERTS_DATA,
}: {
  data?: Testimonial[];
}) => {
  function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    const { company, stat, description, author } = testimonial;

    return (
      <CarouselItem className="pl-1 md:basis-1/2 lg:basis-1/3">
        <div className="p-1">
          <Card className="rounded-sm border-neutral-600 bg-black p-0 shadow-none">
            <CardContent className="flex h-60 items-start justify-start p-0 px-4 py-2">
              <div className="grid w-full grid-cols-1 grid-rows-[1.8fr_1fr] justify-between divide-y divide-neutral-600 text-white">
                <div>
                  <CompanyHeader company={company} />
                  {stat && (
                    <div className="my-2 text-5xl font-bold">{stat}</div>
                  )}
                  {description && (
                    <p className="text-sm text-gray-400">{description}</p>
                  )}
                </div>
                <AuthorDetails author={author} />
              </div>
            </CardContent>
          </Card>
        </div>
      </CarouselItem>
    );
  }

  function CompanyHeader({ company }: { company: string }) {
    return (
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 bg-orange-500"></span>
        <div className="text-sm font-semibold uppercase tracking-widest">
          {company}
        </div>
      </div>
    );
  }

  function AuthorDetails({
    author,
  }: {
    author: {
      name: string;
      role: string;
    };
  }) {
    return (
      <div className="mt-4 self-end py-4">
        <p className="text-sm font-semibold">{author.name}</p>
        <p className="text-xs text-gray-500">{author.role}</p>
      </div>
    );
  }

  function CarouselControls() {
    return (
      <div className="mt-8 flex gap-3 bg-black">
        <CarouselPrevious className="static bg-transparent text-white" />
        <CarouselNext className="static bg-transparent text-white" />
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent className="-ml-1">
        {data.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} />
        ))}
      </CarouselContent>
      <CarouselControls />
    </Carousel>
  );
};

const ProjectSupportData = [
  {
    id: 'slide1',
    title: '28+ Months',
    image_url: '/images/assets/timeline-minimatch.png',
  },
  {
    id: 'slide2',
    title: '16+ Months',
    image_url: '/images/assets/timeline-betswapgg.png',
  },
];
export const ProjectSupport = () => {
  function CarouselControls() {
    return (
      <div className="mt-8 bg-black">
        <div className="flex justify-end gap-3">
          <CarouselPrevious className="static bg-transparent text-white" />
          <CarouselNext className="static bg-transparent text-white" />
        </div>
      </div>
    );
  }
  return (
    <Carousel>
      <CarouselControls />
      <CarouselContent className="-ml-1">
        {ProjectSupportData.map((slide) => (
          <CarouselItem className="pl-1">
            <div key={slide.id} className="flex">
              <div className="relative w-full">
                <Image
                  src={slide.image_url}
                  className="aspect-video w-full h-[300px] object-contain"
                  alt={slide.title}
                  width={1500}
                  height={400}
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

export const BuildersNetwork = () => {
  return (
    <div className="col-span-full border border-neutral-700 bg-[#1A1A1A] md:col-span-6">
      <div className="afte:content-[''] relative mx-6 mb-2 py-4 text-xs font-bold uppercase tracking-widest text-neutral-400 after:absolute after:bottom-0 after:left-0 after:h-[0.5px] after:w-full after:bg-neutral-700">
        Our Clients & Partners across Industries
      </div>
      <div className="h-[350px] w-full">
        <BarChart />
      </div>
    </div>
  );
};
