import { ViewButtonGroup } from './ViewButtonGroup';

export const LinkFiltersHeader = ({ title }: { title?: string }) => {
  return (
    <div className="flex w-full flex-row items-center justify-between p-4">
      <h2 className="text-base text-lg font-normal uppercase tracking-[0.5rem] text-gray-500">
        {title || 'View All Links'}
      </h2>
      <ViewButtonGroup />
    </div>
  );
};
