import { cn } from '@/lib/utils';
import { ListItem } from './NavigationListItem';
import { useTallyPopup } from '../Global/TallyPopup';

const ResourcesMenuItems = [
  {
    id: 'why-themoondevs',
    title: 'Why TheMoonDevs?',
    description: 'Six reasons to choose TheMoonDevs',
    link: '/why-choose-us',
  },
  {
    id: 'customers-latest-innovations',
    title: 'Customers & Latest Innovations',
    description: 'Browse latest real-world case studies',
    link: '/industries',
  },
  {
    id: 'themoondevs-cohort',
    title: 'TheMoonDevs Cohort',
    description: 'Apply to join the elites of the startup builders',
    link: '/dev-cohort',
  },
  {
    id: 'help-center',
    title: 'Help Center',
    description: 'FAQs, Quick Consultation, Raise Issues',
    link: '/help-center',
  },
  {
    id: 'builder-community',
    title: 'Builder Community',
    description: 'Find expert answers & inspiration for your projects',
    link: '/community',
  },
  {
    id: 'partnerships-proposals',
    title: 'Partnerships & Proposals',
    description: 'Co-operate with us in achieving dreams together',
    link: '/partnership-proposals',
  },
];

const FeaturedMenuItems = [
  {
    image_url: '/images/folio-2025-article.png',
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
  const { openPopup } = useTallyPopup();
  return (
    <div
      className={cn(
        'grid w-[800px] grid-cols-[4fr_4fr]',
        orientation === 'mobile' && 'flex w-full flex-col-reverse',
      )}
    >
      <ul
        className={cn(
          'grid w-full grid-flow-row p-2 md:grid-cols-2 md:space-y-0 md:divide-x md:divide-gray-200 md:p-4 lg:grid-cols-1 lg:divide-none',
          orientation === 'tablet' && '',
        )}
      >
        {ResourcesMenuItems.map((item, index) => {
          return (
            <ListItem
              className="w-full"
              key={item.id}
              title={item.title}
              link={item.link}
              onClick={(e) => {
                if (item.id === 'themoondevs-cohort') {
                  e.preventDefault();
                  openPopup();
                }
              }}
            >
              {item.description}
            </ListItem>
          );
        })}
      </ul>
      {/* </div> */}
      <div className="bg-black p-0 md:pb-4">
        <div className="p-5 pb-2 text-xl font-bold text-white">Featured</div>
        <ul
          className={cn(
            'flex flex-col items-center justify-between md:flex-row lg:flex-col',
            // orientation === 'tablet' && 'flex-row',
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
