import type { User } from '@db/client';
import dayjs from 'dayjs';

export const CurrentMonthList = ({
  item,
  itemMembers,
}: {
  item: any;
  itemMembers: User[];
}) => {
  return (
    <div className="flex w-full flex-row items-center justify-between gap-4 border-b border-neutral-300 p-2">
      <div className="flex flex-row items-center gap-2">
        {item.type === 'zero' && (
          <span className={`size-2 rounded-full bg-blue-500`}></span>
        )}
        {item.type === 'leave' && (
          <span className={`size-2 rounded-full bg-red-500`}></span>
        )}
        {item.type === 'meeting' && (
          <span className={`size-2 rounded-full bg-red-500`}></span>
        )}
        <div>
          {item.title && (
            <p className="text-[0.9em] font-bold text-neutral-500">
              {item.title}
            </p>
          )}
          <p className="text-[0.9em] font-bold text-neutral-500">
            {dayjs(item.date).format('DD MMM')}
          </p>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between">
        {itemMembers?.map((z_user: User, index: number) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${z_user?.id}-${index}`}
            src={z_user?.avatar || ''}
            className="size-6 rounded-full border border-neutral-200"
            alt={z_user?.name || ''}
          />
        ))}
      </div>
    </div>
  );
};
