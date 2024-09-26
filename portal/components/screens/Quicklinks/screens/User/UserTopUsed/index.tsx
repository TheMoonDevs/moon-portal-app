"use client";

import QuicklinksTabs from "../../../elements/Tabs";
import UserTopUsedDirectories from "./UserTopUsedDirectories";
import UserTopUsedLinks from "./UserTopUsedLinks";

const UserTopUsed = () => {
  return (
    <div>
      <h1 className="text-xl font-bold flex gap-4 items-center">
        {/* <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
          link
        </span> */}
        <span>Top Used By You</span>
      </h1>

      <QuicklinksTabs tabs={["Links", "Folders"]}>
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
