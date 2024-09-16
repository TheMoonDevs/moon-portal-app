"use client";

import QuicklinksTabs from "../../elements/Tabs";
import UserRecentlyUsedDirectories from "../User/UserRecentlyUsed/UserRecentlyUsedDirectories";
import UserTopUsedDirectories from "../User/UserTopUsed/UserTopUsedDirectories";

const FolderSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-4">Folders</h1>
      <QuicklinksTabs tabs={["Recently Used", "Top Used"]}>
        {(value) => {
          return (
            <div>
              {value === 0 && (
                <UserRecentlyUsedDirectories
                  view="listView"
                  withTitle={false}
                />
              )}
              {value === 1 && (
                // <></>
                <UserTopUsedDirectories withTitle={false} view="listView" />
              )}
            </div>
          );
        }}
      </QuicklinksTabs>
    </div>
  );
};

export default FolderSection;
