import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { GreyButton } from '@/components/elements/Button';
import { Spinner } from '@/components/elements/Loaders';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { MobileBox } from '../../Login/Login';

interface Criteria {
  criteriaLogic?: string;
  streakType?: string;
  streakTitle?: string;
  streakCount?: number;
  customTitle?: string;
  customDescription?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageurl: string;
  criteria: Criteria;
  createdAt: string;
  updatedAt: string;
}

const AdminBadges = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      try {
        const res = await PortalSdk.getData('/api/badges', null);
        const data = res.data;
        setBadges(data);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, []);

  return (
    <MobileBox customClass="!w-[50%]">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
        Badge Template
      </p>
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="no-scrollbar my-2 flex max-h-full w-[90%] grow flex-col justify-start gap-4 overflow-y-auto text-white max-sm:max-h-[500px]">
          {badges.length > 0 ? (
            badges.map((badge) => (
              <Link
                href={`${APP_ROUTES.badgeEditor}?id=${badge.id}`}
                key={badge.id}
                className="flex cursor-pointer flex-col items-start rounded-lg bg-neutral-800 p-4 transition-colors duration-300 hover:bg-neutral-700"
              >
                <Image
                  src={badge.imageurl}
                  alt={badge.name}
                  width={500}
                  height={200}
                  className="mb-4 rounded-md object-cover"
                />
                <h3 className="text-sm font-semibold">{badge.name}</h3>
                <p className="mb-4 line-clamp-2 text-xs text-neutral-400">
                  {badge.description}
                </p>
              </Link>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <p>No badges found.</p>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col items-center justify-center gap-4">
        <Link href={APP_ROUTES.badgeEditor}>
          <GreyButton rightIcon={'add'}>Add New Badge</GreyButton>
        </Link>
      </div>
    </MobileBox>
  );
};

export default AdminBadges;
