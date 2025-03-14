import { ReactNode, useState } from 'react';
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
import { ProfileData } from '../HomePage/DevCohortSection/ProfileGrid';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { IPublication, PublicationDialog } from '@/components/App/PublicationDialog';

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
          <CarouselItem className="pl-1" key={slide.id}>
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
    company: 'Tech Lead for 7+ Startups',
    description: `The challenge of building an edge-tech project is what inspired me to initiate TheMoonDevs, we are a growing collective of similar builder-mindset developers across industries & countries.`,
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
      'I love the challenge of building User interfaces with complex interaction patterns & user flows. Making complex things simpler is the crux of better UX. and It’s a challenge I love to take on.',
    author: {
      name: 'Kshitij S.',
      role: 'TheMoonDevs Core-Team',
    },
  },
  {
    company: 'ML/AI Engineer',
    description: `When someone creates something they never thought possible because of my tool, that's worth more than any optimization metric. AI/ML research is a slow-burn science that amazes me!`,
    author: {
      name: 'Pramod G.',
      role: 'Ex-Sony AI Researcher',
    },
  },
  {
    company: 'DEVOPs Engineer',
    description:
      `The challenge of building automated systems that take away the burden of manual tasks is what drives me. with the advent of AI, & blockchain, DevOps became a lot more interesting!`,
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
          <Card className="rounded-sm  border-neutral-600 bg-black p-0 shadow-none">
            <CardContent className="flex  flex-col min-h-85 items-start justify-start p-0 px-4 py-2">
              <div className="w-full h-full flex flex-col justify-between items-stretch divide-y divide-neutral-600 text-white">
                <div className='mb-auto'>
                  <CompanyHeader company={company} />
                  {stat && (
                    <div className="my-2 text-5xl font-bold">{stat}</div>
                  )}
                  {description && (
                    <p className="text-lg text-gray-400">"{description}"</p>
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
      <div className="mt-4 self-end py-4 w-full">
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
      <CarouselContent className="-ml-1 items-stretch">
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


const HoveringCard = ({
  index,
  tag,
  setOpenDialog,
  setPublications,
}: {
  index: number;
  setOpenDialog: (value: boolean) => void;
  setPublications: (value: IPublication) => void;
  tag: {
    icon: string;
    title: string;
    publications: any[];
  };
}) => {
  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div
          className={`group w-full flex cursor-pointer items-center justify-center rounded-full p-2 text-sm ease-in-out`}
        >
          <div className="w-full flex justify-center itemss-center overflow-hidden rounded-full transition-all duration-500 bg-black group-hover:bg-neutral-100 p-1">
            <Image
              src={tag.icon}
              alt={'s'}
              width={48}
              height={48}
              className="scale-1 saturate-0 group-hover:scale-[0.95] transition-all duration-300 w-full object-cover rounded-full"
            />
          </div>
          {/* <span className="w-full text-xs text-white">{tag.title}</span> */}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 rounded-none border border-neutral-300 shadow-none">
        <div className="mb-2 flex items-center gap-2">
          {/* <div className="h-2 w-2 bg-orange-500"></div> */}
          <h4 className="text-xs font-semibold uppercase tracking-widest">
            {tag.title}
          </h4>
        </div>
        {tag.publications
          //.filter((publication) => publication?.link)
          .map((publication, index) => (
            <button
              key={index + publication.title}
              onClick={() => {
                setPublications({
                  ...publication,
                  name: tag.title,
                  avatar: tag.icon,
                });
                setOpenDialog(true);
              }}
              className="cusrsor-pointer hover:underline text-sm text-left font-light text-neutral-500 flex items-center group">
              <span>{publication?.title}</span>
              <span className="material-symbols-outlined !invisible !text-sm group-hover:!visible">
                open_in_new
              </span>
            </button>
          ))}
      </HoverCardContent>
    </HoverCard>
  );
};

export const IndustryExperts = () => {

  const [selectedPublication, setSelectedPublication] =
    useState<IPublication>();
  const [openDialog, setOpenDialog] = useState(false);


  return (
    <div className="py-10 grid grid-cols-10 gap-4">
      {ProfileData.map((profile, index) => (
        <HoveringCard
          key={index}
          index={index}
          tag={{
            icon: profile.avatar,
            title: profile.name,
            publications: profile.publications,
          }}
          setOpenDialog={setOpenDialog}
          setPublications={setSelectedPublication}
        />
      ))}
      <PublicationDialog
        setPublication={setSelectedPublication}
        setOpenDialog={setOpenDialog}
        open={openDialog && selectedPublication !== undefined}
        data={selectedPublication}
      />
    </div>
  );
}
