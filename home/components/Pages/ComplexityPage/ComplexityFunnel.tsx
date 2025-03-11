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
        description:
          `ProductHunt is a 1x complexity factor, as all it's capabilities are traditional web app features. Most of its complexity is in complex search, leaderboard sorting & email notifications to users.`,
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
    ],
  },
  {
    id: '2x',
    tags: [
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Turnaround in 3-4 weeks',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Upto 10x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
    ],
  },
  {
    id: '3x',
    tags: [
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Turnaround in 3-4 weeks',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Upto 10x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
    ],
  },
  {
    id: '4x',
    tags: [
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Turnaround in 3-4 weeks',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Upto 10x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
    ],
  },
  {
    id: '5x+',
    tags: [
      {
        icon: '/images/complexity/complexity.png',
        title: 'End-to-End solution',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: '2x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Turnaround in 3-4 weeks',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      },
      {
        icon: '/images/complexity/complexity.png',
        title: 'Upto 10x Complexity Scale',
        description:
          'lorem ipsum dolor sit amet consectetur  adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
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
