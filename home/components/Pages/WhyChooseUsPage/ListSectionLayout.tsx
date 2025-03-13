import { cn } from '@/lib/utils';
import { IFeature } from './WhyChooseUsData';
import { ReactNode } from 'react';

const ListSectionLayout = ({
  children,
  index,
  feature,
}: {
  children: React.ReactNode;
  index: number;
  feature: IFeature;
}) => {
  const {
    id,
    sectionTitle,
    sectionHeading,
    sectionDescription,
    titleIconColor,
  } = feature;

  const Header = ({
    title,
    iconColor,
  }: {
    title: string | ReactNode;
    iconColor?: string;
  }) => {
    return (
      <div className="mb-3 flex items-center gap-2 border-b border-neutral-700 py-1 uppercase sm:mb-1 md:mb-6">
        <span
          className={cn(
            'block h-2 w-2 translate-y-[-1px]',
            iconColor ? iconColor : 'bg-orange-500',
          )}
        ></span>
        <div className="relative text-xs tracking-widest text-white">
          {title}
        </div>
      </div>
    );
  };

  return (
    <div className="py-8 md:p-6 md:py-10" id={id}>
      <Header title={sectionTitle} iconColor={titleIconColor} />
      <div
        className={cn(
          'grid grid-flow-row gap-6',
          feature.orientation === 'vertical'
            ? 'grid-cols-1'
            : 'grid-cols-1 lg:grid-cols-12',
        )}
      >
        <div
          className={cn(
            'mb-4 text-white',
            feature.orientation === 'horizontal' ? 'w-full md:col-span-6' : '',
          )}
        >
          <div className="flex gap-4 w-2/3">
            <span className="text-5xl font-extrabold">{index + 1} </span>
            <div>
              <h1 className={cn('flex gap-4 text-3xl lg:text-6xl font-bold text-white')}>
                <span>{sectionHeading}</span>
              </h1>

              <p className="mt-2 lg:mt-8 text-sm lg:text-3xl text-neutral-500">
                {sectionDescription}
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default ListSectionLayout;
