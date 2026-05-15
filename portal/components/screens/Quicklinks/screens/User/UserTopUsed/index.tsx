'use client';

import QuicklinksTabs from '../../../elements/Tabs';
import UserTopUsedDirectories from './UserTopUsedDirectories';
import UserTopUsedLinks from './UserTopUsedLinks';

const UserTopUsed = () => {
  return (
    <div>
      <h1 className="flex items-center gap-4 text-xl font-bold">
        {/* <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
          link
        </span> */}
        <span>Top Used By You</span>
      </h1>

      <QuicklinksTabs tabs={['Links', 'Folders']}>
        {(value) => {
          return (
            <div>
              {value === 0 && <UserTopUsedLinks />}
              {value === 1 && <UserTopUsedDirectories />}
            </div>
          );
        }}
      </QuicklinksTabs>
    </div>
  );
};

export default UserTopUsed;
