import dayjs from 'dayjs';

import type { Badge } from '@/models/progress';
import { METRIC_LABELS } from '@/models/progress';

export interface BadgeProgress {
  badge: Badge;
  value: number;
  earnedAt: string | null;
}

export const DEFAULT_BADGE_IMAGE = '/images/badge-default.svg';

/** One badge with the person's progress towards it. */
const BadgeCard = ({ badge, value, earnedAt }: BadgeProgress) => {
  const isAwarded = !!earnedAt;
  const percent = Math.min((value / Math.max(badge.threshold, 1)) * 100, 100);
  const left = Math.max(badge.threshold - value, 0);

  return (
    <div
      className={`relative flex items-center rounded-lg px-4 py-6 shadow-md transition-transform duration-300 hover:scale-105 ${
        isAwarded ? 'bg-[#E0E4F4]' : 'bg-[#F7F8FD]'
      }`}
    >
      <div
        className={`relative size-14 shrink-0 overflow-hidden border-2 ${
          isAwarded ? 'border-gray-200' : 'border-gray-300 grayscale'
        }`}
        style={{
          clipPath:
            'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badge.imageUrl || DEFAULT_BADGE_IMAGE}
          alt={badge.name}
          className="size-full object-cover"
        />
      </div>

      <div className="ml-4 flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="w-full min-w-0">
          <h3
            className={`truncate text-lg font-semibold ${
              isAwarded ? 'text-gray-800' : 'text-gray-700'
            }`}
          >
            {badge.name}
          </h3>
          {badge.description && (
            <p className="truncate text-xs text-gray-500">
              {badge.description}
            </p>
          )}
          {isAwarded ? (
            <p className="mt-1 text-xs text-gray-600">
              Earned on {dayjs(earnedAt).format('DD MMM YYYY')}
            </p>
          ) : (
            <>
              <div className="mt-2 w-full rounded-full bg-gray-300">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-[width] duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {value} / {badge.threshold} {METRIC_LABELS[badge.metric]} ·{' '}
                {left} to go
              </p>
            </>
          )}
        </div>
        {isAwarded && (
          <div className="flex shrink-0 items-center gap-1 rounded-md bg-neutral-300 p-1 text-xs font-semibold text-gray-600">
            <div className="size-3 rounded-full bg-[#18A77C]" />
            Earned
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
