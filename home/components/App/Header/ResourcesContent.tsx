import { cn } from '@/lib/utils';
import { ListItem } from './NavigationListItem';

const ResourcesMenuItems = [
  {
    title: 'Why TheMoonDevs?',
    description: 'Six reasons to choose TheMoonDevs',
    link: '/why-choose-us',
  },
  {
    title: 'Customers & Latest Innovations',
    description: 'Browse latest real-world case studies',
    link: '/case-studies',
  },
  {
    title: 'TheMoonDevs Cohort',
    description: 'Apply to join the elites of the startup builders',
    link: '/dev-cohort',
  },
  {
    title: 'Help Center',
    description: 'FAQs, Quick Consultation, Raise Issues',
    link: '/help-center',
  },
  {
    title: 'Builder Community',
    description: 'Find expert answers & inspiration for your projects',
    link: '/community',
  },
  {
    title: 'Partnerships & Proposals',
    description: 'Co-operate with us in achieving dreams together',
    link: '/partnership-proposals',
  },
];

const FeaturedMenuItems = [
  {
    image_url: '/images/abstract-red.png',
    title: 'DevFolio-2025',
    description: 'TheMoonDevs Cohort 2025',
    link: '/folios',
  },
  {
    image_url: '/images/abstract-purple.png',
    title: 'Complexity Calculator',
    description: ' Estimate the complexity of your project',
    link: '/complexity-calculator',
  },
];

export const ResourcesContent = ({
  className,
  orientation = 'desktop',
}: {
  className?: string;
  orientation?: 'desktop' | 'mobile' | 'tablet';
}) => {
  const midIndex = Math.ceil(ResourcesMenuItems.length / 2);
  const firstHalf = ResourcesMenuItems.slice(0, midIndex);
  const secondHalf = ResourcesMenuItems.slice(midIndex);
  return (
    <div
      className={cn(
        'grid w-[800px] grid-cols-[4fr_4fr]',
        orientation === 'mobile' && 'flex w-full flex-col-reverse',
      )}
    >
      <ul
        className={cn(
          'grid w-full grid-flow-row p-4',
          orientation === 'tablet' &&
            'grid grid-cols-2 space-y-0 divide-x divide-gray-200',
        )}
      >
        <div className="grid w-full grid-flow-row">
          {firstHalf.map((item, index) => {
            return (
              <ListItem
                className="w-full"
                key={index}
                title={item.title}
                link={item.link}
              >
                {item.description}
              </ListItem>
            );
          })}
        </div>
        <div className="grid w-full grid-flow-row">
          {secondHalf.map((item, index) => {
            return (
              <ListItem
                className="w-full"
                key={index}
                title={item.title}
                link={item.link}
              >
                {item.description}
              </ListItem>
            );
          })}
        </div>
      </ul>
      {/* </div> */}
      <div className="bg-black p-0 pb-4">
        <div className="p-5 pb-2 text-xl font-bold text-white">Featured</div>
        <ul
          className={cn(
            'flex flex-col items-center justify-between',
            orientation === 'tablet' && 'flex-row',
          )}
        >
          {FeaturedMenuItems.map((item, index) => (
            <ListItem
              imageStyle="h-36"
              link={item.link}
              imageUrl={item.image_url}
              type="card"
              className="w-full"
              key={index}
              title={item.title}
            >
              {item.description}
            </ListItem>
          ))}
        </ul>
      </div>
    </div>
  );
};
