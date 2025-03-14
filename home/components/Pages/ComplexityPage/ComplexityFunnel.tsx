import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export const COMPLEXITY_DATA = [
  {
    id: '1x',
    tags: [
      {
        icon: '/images/complexity/producthunt.png',
        title: 'Product Hunt',
        description: 'ProductHunt is a 1x complexity factor, as all its capabilities are traditional web app features. Most of its complexity is in search functionality, leaderboard sorting & email notifications to users.',
      },
      {
        icon: '/images/complexity/Pinterest-Logo-2011-2016.png',
        title: 'Pinterest',
        description: 'A visual discovery platform like Pinterest focuses on image collection, categorization, and sharing. The core pinboard functionality uses standard database relationships and content delivery patterns that are well-established in modern web development.',
      },
      {
        icon: '/images/complexity/Fitbit-Logo.png',
        title: 'Fitbit',
        description: 'A fitness tracking MVP focuses on basic activity logging, goal setting, and progress visualization. The app side of tracking platforms can be built with standard mobile development frameworks and simple data visualization tools.',
      },
      {
        icon: '/images/complexity/tinder.png',
        title: 'Tinder',
        description: 'Building a dating app MVP is surprisingly straightforward. The core swipe mechanics, basic matching algorithms, and messaging functionality use well-established patterns that can be implemented with modern frameworks in weeks, not months.',
      },
      {
        icon: '/images/complexity/reddit.png',
        title: 'Reddit',
        description: 'Social platforms like Reddit have become significantly easier to build with AI-powered development tools. Core features like content feeds, voting systems, and basic comment threads are standard implementations that follow established patterns.',
      },
      {
        icon: '/images/complexity/groupon.png',
        title: 'Groupon',
        description: 'A deals platform MVP focuses on limited but essential features: merchant listings, payment processing, and email distribution. The streamlined version can be built rapidly while maintaining scalability for future feature expansion.',
      },
      {
        icon: '/images/complexity/trello.png',
        title: 'Trello',
        description: 'Task management platforms like Trello use straightforward card-based systems with drag-and-drop functionality. The core features rely on proven UI patterns and simple data synchronization that can be implemented with modern frontend frameworks.',
      },
      {
        icon: '/images/complexity/medium.png',
        title: 'Medium',
        description: 'Content publishing platforms like Medium focus on clean article creation, basic engagement metrics, and user profiles. The foundational features use established content management patterns that are quick to implement with web technologies.',
      },
    ],
  },
  {
    id: '2x',
    tags: [
      {
        icon: '/images/complexity/airbnb.png',
        title: 'Airbnb',
        description: 'An MVP version of a booking platform focuses on core listing, search, and payment functionality. Our expertise in booking systems means we can set up your platform with the right architecture for future scale without overbuilding initially.',
      },
      {
        icon: '/images/complexity/opensea.svg',
        title: 'OpenSea',
        description: 'An NFT marketplace MVP requires blockchain integration, wallet connections, and transaction handling, but remains achievable with our Web3 expertise. The initial version can support basic minting and trading while setting the foundation for expanded features.',
      },
      {
        icon: '/images/complexity/zoom.png',
        title: 'Zoom',
        description: 'With WebRTC technology now mature, building a video conferencing MVP has become significantly more accessible. The core real-time communication features can be implemented quickly, while still allowing for future enhancements like breakout rooms or recording.',
      },
      {
        icon: '/images/complexity/notion.png',
        title: 'Notion',
        description: 'While Notion appears simple, it combines document editing, project management, and team collaboration. The 2x complexity comes from building flexible content blocks and sharing permissions that maintain performance as user content grows.',
      },
      {
        icon: '/images/complexity/uber.png',
        title: 'Uber',
        description: 'A ride-sharing MVP at 2x complexity focuses on location tracking, driver-rider matching, and basic payment processing. The foundation can be built efficiently while establishing the architecture needed for future features like surge pricing or multiple service tiers.',
      },
      {
        icon: '/images/complexity/spotify.png',
        title: 'Spotify',
        description: 'A music streaming MVP requires audio content delivery, playlist management, and basic recommendation features. At 2x complexity, the core streaming functionality and user library can be established while setting the stage for more advanced discovery features.',
      },
      {
        icon: '/images/complexity/discord.png',
        title: 'Discord',
        description: 'A community platform like Discord combines real-time messaging with voice channels and role-based permissions. At 2x complexity, the core communication features can be established while maintaining the flexibility needed for future feature expansion.',
      },
    ],
  },
  {
    id: '3x',
    tags: [
      {
        icon: '/images/complexity/udemy.png',
        title: 'Udemy',
        description: 'An e-learning platform requires video content delivery, course management, progress tracking, and payment processing. The 3x complexity stems from building systems that handle different content types while maintaining a seamless user experience.',
      },
      {
        icon: '/images/complexity/netflix.png',
        title: 'Netflix',
        description: 'Building an MVP version of a streaming platform is achievable at 3x complexity. The fundamental content delivery, user accounts, and recommendation engine can be implemented efficiently, with architecture that supports future scaling and content expansion.',
      },
      {
        icon: '/images/complexity/pokemon.jpg',
        title: 'Pokémon Go',
        description: 'AR gaming applications like Pokémon Go combine geolocation, augmented reality, and user progression systems. The 3x complexity comes from integrating these technologies while maintaining performance across different mobile devices and environments.',
      },
      {
        icon: '/images/complexity/zapier.png',
        title: 'Zapier',
        description: 'Automation platforms like Zapier require flexible integration frameworks, workflow builders, and task scheduling systems. The 3x complexity lies in creating reliable connections across hundreds of third-party services while maintaining intuitive user interfaces.',
      },
      {
        icon: '/images/complexity/dappradar.png',
        title: 'DappRadar',
        description: 'DappRadar complexity comes from integrating multiple blockchain networks, real-time data analytics, and market tracking. The platform requires sophisticated indexing systems and API integrations across various decentralized protocols.',
      },
      {
        icon: '/images/complexity/slack.webp',
        title: 'Slack',
        description: 'The complexity in messaging platforms like Slack lies in real-time sync across devices, message threading, and integrations. We can build a solid foundation with the right architecture to handle millions of messages while remaining responsive.',
      },
      {
        icon: '/images/complexity/asana.png',
        title: 'Asana',
        description: 'Project management platforms like Asana combine task dependencies, timeline visualizations, and team collaboration features. The 3x complexity comes from building systems that maintain data consistency across different project views and user permissions.',
      },
      {
        icon: '/images/complexity/tableau.png',
        title: 'Tableau',
        description: 'Data visualization platforms require sophisticated data processing, interactive charting, and customizable dashboards. The 3x complexity stems from creating systems that can handle large datasets while providing responsive user interfaces for analysis.',
      },
    ],
  },
  {
    id: '4x',
    tags: [
      {
        icon: '/images/complexity/youtube.png',
        title: 'YouTube',
        description: 'YouTubes complexity exceeds Netflix with its combination of content delivery, live streaming, creator tools, and community features. The platform requires sophisticated video processing pipelines and recommendation systems that operate at massive scale.',
      },
      {
        icon: '/images/complexity/uniswap.png',
        title: 'Uniswap',
        description: 'Uniswaps complexity stems from its automated market maker algorithms, liquidity pools, and cross-chain interactions. Building a decentralized exchange requires deep blockchain expertise and rigorous security practices to safeguard user funds.',
      },
      {
        icon: '/images/complexity/stripe.png',
        title: 'Stripe',
        description: 'Payment platforms like Stripe require extensive financial integrations, fraud detection systems, and compliance with various regulatory frameworks. The complexity lies in building secure systems that handle financial transactions with near-perfect reliability.',
      },
      {
        icon: '/images/complexity/gpay.png',
        title: 'GPay',
        description: 'Digital wallets like GPay combine secure payment processing with NFC technology for contactless transactions. The 4x complexity comes from implementing bank integrations, security protocols, and seamless device communication across platforms.',
      },
    ],
  },{
    id: '5x+',
    tags: [
      {
        icon: '/images/complexity/figma.png',
        title: 'Figma (6x)',
        description: 'Design platforms like Figma reach 6x complexity due to their real-time collaboration features, vector rendering engines, and plugin ecosystems. Building high-performance creative tools demands specialized expertise in graphics processing and data synchronization.',
      },
      {
        icon: '/images/complexity/chainlink.png',
        title: 'Chainlink (8x)',
        description: 'Chainlink represents 8x complexity as its not just a product but a critical Web3 infrastructure with decentralized oracles, verifiable random functions, and proof-of-reserve systems. These frameworks require mathematical precision and bulletproof security.',
      },
      {
        icon: '/images/complexity/googlemaps.png',
        title: 'Google Maps (10x)',
        description: 'Google Maps represents the pinnacle of complexity with its combination of satellite imagery, street-level photography, real-time traffic data, and global routing algorithms. The system processes petabytes of geospatial data while maintaining millisecond response times.',
      },
      {
        icon: '/images/complexity/claude.png',
        title: 'Claude (10x)',
        description: 'Large language models like Claude represent 10x complexity, requiring massive neural networks, training on billions of parameters, and sophisticated safety systems. These AI systems demand specialized expertise in machine learning and distributed computing infrastructure.',
      },
    ],
  },
];
const ComplexityFunnel = () => {
  return (
    <div className="mx-auto flex w-[91%] flex-col items-center justify-center pb-32 pt-10">
      {COMPLEXITY_DATA.map((item, complexityIndex) => (
        <div
          style={{ zIndex: COMPLEXITY_DATA.length - complexityIndex }}
          className={cn(
            'group relative',
            complexityIndex === 0 ? '' : 'lg:-mt-16',
          )}
        >
          <div
            className={cn(
              '',
              complexityIndex === 0
                ? ''
                : 'funnel-container group relative mx-auto transform duration-300 ease-in-out group-hover:translate-y-4 group-hover:lg:translate-y-10',
            )}
            style={{
              width: `calc(100% - ${complexityIndex} * 10%)`,
            }}
          >
            <FunnelSvg />
            <div
              className={cn(
                'absolute left-[5%] top-1/2 -translate-y-1/2 transform text-xs font-bold text-neutral-400 transition-all duration-300 ease-in-out group-hover:text-lg group-hover:text-[#6100FF] group-hover:md:text-xl lg:text-2xl group-hover:lg:text-5xl',
                complexityIndex !== 0 &&
                '-left-[5%] group-hover:-left-[8%] group-hover:top-1/2',
                complexityIndex === COMPLEXITY_DATA.length - 1 &&
                'top-6 group-hover:-left-[20%] group-hover:top-1/2 lg:top-24',
              )}
            >
              {item.id}
            </div>
            <div
              className={cn(
                'group-hover:lg:scale-80 absolute left-1/2 top-1/2 grid w-full -translate-x-1/2 -translate-y-1/2 scale-0 transform place-items-center justify-center gap-0 text-2xl font-bold transition-all duration-300 ease-in-out group-hover:scale-75 group-hover:md:scale-[0.8] lg:w-fit lg:gap-2 group-hover:xl:scale-100',
                complexityIndex === 0
                  ? `grid-cols-4`
                  : complexityIndex === 1
                    ? `grid-cols-3`
                    : complexityIndex === 2
                      ? `grid-cols-3`
                      : `grid-cols-2`,
              )}
            >
              {item.tags.map((tag, index) => (
                <HoveringCard index={complexityIndex} key={index} tag={tag} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComplexityFunnel;

const HoveringCard = ({
  index,
  tag,
}: {
  index: number;
  tag: {
    icon: string;
    title: string;
    description: string;
  };
}) => {
  return (
    <HoverCard openDelay={300} closeDelay={0}>
      <HoverCardTrigger asChild>
        <div
          className={`group-hover:lg:scale-80 flex w-full scale-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#6100FF] py-1 pr-2 text-sm transition-all duration-300 ease-in-out group-hover:scale-75 group-hover:md:scale-[0.8] ${index === COMPLEXITY_DATA.length - 1 ? 'group-hover:xl:scale-75' : 'group-hover:xl:scale-90'}`}
        >
          <div className="ml-1 w-16 overflow-hidden rounded-full border-2 border-[#6100FF] bg-white px-1 py-1">
            <Image
              src={tag.icon}
              alt={'s'}
              width={24}
              height={24}
              className="w-full object-contain"
            />
          </div>
          <span className="w-full text-xs text-white">{tag.title}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 rounded-none border border-neutral-300 shadow-none">
        <div className="mb-2 flex items-center gap-2">
          {/* <div className="h-2 w-2 bg-orange-500"></div> */}
          <h4 className="text-xs font-semibold uppercase tracking-widest">
            {tag.title}
          </h4>
        </div>
        <p className="text-sm font-light text-neutral-500">{tag.description}</p>
      </HoverCardContent>
    </HoverCard>
  );
};

const FunnelSvg = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 1240 272"
      width="1240"
      height="272"
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        transform: 'translate3d(0px, 0px, 0px)',
        contentVisibility: 'visible',
      }}
    >
      <defs>
        <clipPath id="__lottie_element_147">
          <rect width="1240" height="272" x="0" y="0"></rect>
        </clipPath>
        <linearGradient
          id="__lottie_element_151"
          spreadMethod="pad"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-135"
          x2="0"
          y2="135"
        >
          <stop offset="0%" stop-color="rgb(25,24,58)" stop-opacity="1"></stop>
          <stop
            offset="50%"
            stop-color="rgb(25,24,58)"
            stop-opacity="0.5"
          ></stop>
          <stop
            offset="100%"
            stop-color="rgb(25,24,58)"
            stop-opacity="0"
          ></stop>
        </linearGradient>
        <clipPath id="__lottie_element_156">
          <path d="M0,0 L114,0 L114,48 L0,48z"></path>
        </clipPath>
        <clipPath id="__lottie_element_167">
          <path d="M0,0 L20,0 L20,20 L0,20z"></path>
        </clipPath>
        <clipPath id="__lottie_element_589">
          <path d="M0,0 L152,0 L152,48 L0,48z"></path>
        </clipPath>
        <clipPath id="__lottie_element_600">
          <path d="M0,0 L24,0 L24,24 L0,24z"></path>
        </clipPath>
        <clipPath id="__lottie_element_645">
          <path d="M0,0 L147,0 L147,48 L0,48z"></path>
        </clipPath>
        <clipPath id="__lottie_element_656">
          <path d="M0,0 L20,0 L20,20 L0,20z"></path>
        </clipPath>
        <clipPath id="__lottie_element_710">
          <path d="M0,0 L227,0 L227,48 L0,48z"></path>
        </clipPath>
        <clipPath id="__lottie_element_721">
          <path d="M0,0 L24,0 L24,24 L0,24z"></path>
        </clipPath>
        <clipPath id="__lottie_element_805">
          <path d="M0,0 L166,0 L166,48 L0,48z"></path>
        </clipPath>
        <clipPath id="__lottie_element_816">
          <path d="M0,0 L20,0 L20,20 L0,20z"></path>
        </clipPath>
      </defs>
      <g clip-path="url(#__lottie_element_147)">
        <g
          transform="matrix(1,0,0,-1,620,136)"
          opacity="1"
          style={{ display: 'block' }}
        >
          <g opacity="1" transform="matrix(1,0,0,1,0,0)">
            <path
              fill="rgb(241,241,241)"
              fill-opacity="0"
              d=" M0,-135 C342.1780090332031,-135 620,-74.50650024414062 620,0 C620,74.50650024414062 342.1780090332031,135 0,135 C-342.1780090332031,135 -620,74.50650024414062 -620,0 C-620,-74.50650024414062 -342.1780090332031,-135 0,-135z"
            ></path>
            <path
              stroke="url(#__lottie_element_151)"
              stroke-linecap="butt"
              stroke-linejoin="miter"
              fill-opacity="0"
              stroke-miterlimit="4"
              stroke-opacity="1"
              stroke-width="1"
              d=" M0,-135 C342.1780090332031,-135 620,-74.50650024414062 620,0 C620,74.50650024414062 342.1780090332031,135 0,135 C-342.1780090332031,135 -620,74.50650024414062 -620,0 C-620,-74.50650024414062 -342.1780090332031,-135 0,-135z"
            ></path>
          </g>
        </g>
      </g>
    </svg>
  );
};
