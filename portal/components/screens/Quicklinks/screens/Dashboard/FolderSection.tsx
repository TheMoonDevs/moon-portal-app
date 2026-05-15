'use client';

import QuicklinksTabs from '../../elements/Tabs';
import UserRecentlyUsedDirectories from '../User/UserRecentlyUsed/UserRecentlyUsedDirectories';
import UserTopUsedDirectories from '../User/UserTopUsed/UserTopUsedDirectories';

const FolderSection = () => {
  return (
    <div>
      <h1 className="flex items-center gap-4 text-2xl font-bold">Folders</h1>
      <QuicklinksTabs tabs={['Recently Used', 'Top Used']}>
        {(value, searchQuery) => {
          return (
            <div>
              {value === 0 && (
                <UserRecentlyUsedDirectories
                  view="listView"
                  withTitle={false}
                  searchQuery={searchQuery}
                />
              )}
              {value === 1 && (
                // <></>
                <UserTopUsedDirectories
                  withTitle={false}
                  view="listView"
                  searchQuery={searchQuery}
                />
              )}
            </div>
          );
        }}
      </QuicklinksTabs>
    </div>
  );
};

export default FolderSection;
