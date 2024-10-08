import React, { useEffect, useState } from 'react';
import { MobileBox } from '../../Login/Login';
import Link from 'next/link';
import Image from 'next/image';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { GreyButton } from '@/components/elements/Button';
import { Spinner } from '@/components/elements/Loaders';
import { PortalSdk } from '@/utils/services/PortalSdk';

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
    <MobileBox>
      <p className='text-neutral-400 tracking-[0.5em] uppercase text-xs text-center mb-6'>
        Badge Template
      </p>
      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <Spinner />
        </div>
      ) : (
        <div className='flex flex-col grow gap-4 my-2 justify-start max-h-full overflow-y-auto no-scrollbar text-white max-sm:max-h-[500px]'>
          {badges.length > 0 ? (
            badges.map((badge) => (
              <Link
                href={`${APP_ROUTES.badgeEditor}?id=${badge.id}`}
                key={badge.id}
                className='cursor-pointer flex flex-col items-start bg-neutral-800 p-4 rounded-lg transition-colors duration-300 hover:bg-neutral-700'
              >
                <Image
                  src={badge.imageurl}
                  alt={badge.name}
                  width={500}
                  height={200}
                  className='object-cover rounded-md mb-4'
                />
                <h3 className='text-sm font-semibold'>{badge.name}</h3>
                <p className='text-xs text-neutral-400 mb-4 line-clamp-2'>
                  {badge.description}
                </p>
              </Link>
            ))
          ) : (
            <div className='flex flex-col items-center justify-center h-full'>
              <p>No badges found.</p>
            </div>
          )}
        </div>
      )}
      <div className='flex flex-col gap-4 items-center justify-center'>
        <Link href={APP_ROUTES.badgeEditor}>
          <GreyButton rightIcon={'add'}>Add New Badge</GreyButton>
        </Link>
      </div>
    </MobileBox>
  );
};

export default AdminBadges;
