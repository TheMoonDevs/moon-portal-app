import { cn } from '@/lib/utils';
import { ListItem } from './NavigationListItem';
const ProductsData = [
  {
    category: 'For entrepreneurs',
    image_url: '/images/abstract-red.png',
    title: 'Instant service, exceptional experiences',
    items: [
      {
        name: 'Custom Bots',
        description: 'Ai first custom branded bots.',
      },
      {
        name: 'Quicklinks',
        description: 'Team sharing of links across platforms',
      },
      {
        name: 'Help Center',
        description: 'Help customers find accurate answers themselves.',
      },
    ],
  },
  {
    category: 'For support agents',
    image_url: '/images/abstract-purple.png',
    title: 'AI-first tools for more efficient agents',
    items: [
      {
        name: 'Inbox',
        description: 'Maximize productivity with an AI-enhanced inbox.',
      },
      {
        name: 'Copilot',
        description: 'Make every agent an instant AI-powered expert.',
      },
      {
        name: 'Tickets',
        description: 'Optimized to resolve complex issues efficiently.',
      },
    ],
  },
];
export const ProductsContent = ({
  className,
  orientation = 'desktop',
}: {
  className?: string;
  orientation?: 'mobile' | 'desktop';
}) => {
  return (
    <div
      className={cn(
        'grid w-[800px] grid-cols-[4fr_4fr] divide-x p-4 px-1',
        className,
      )}
    >
      {ProductsData.map((item, index) => (
        <div key={index}>
          <ul>
            <ListItem
              type="card"
              headerTitle={item.category}
              cardHeaderStyle={index === 0 ? `bg-orange-500` : `bg-green-500`}
              cardStyle={`w-full group-hover:bg-neutral-200  ${orientation === 'mobile' ? '!justify-[unset] h-fit' : 'h-52 justify-between'}`}
              contentStyle="text-black"
              imageUrl={item.image_url}
              className="w-full"
              key={index}
              title={item.title}
            />
          </ul>

          <div className="flex items-center justify-center">
            <ul className="grid w-full space-y-3 p-4">
              {item.items.map((item, index) => (
                <ListItem className="w-full" key={index} title={item.name}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};
