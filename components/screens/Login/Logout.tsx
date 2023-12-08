/* eslint-disable @next/next/no-img-element */

import { GreyButton } from "@/components/elements/Button";

export const Logout = ({ user, signOut }: any) => {
  return (
    <div className="mb-5 flex flex-col items-center">
      {/* <p className="text-blue-400 tracking-[0.5em] uppercase text-xs text-center">
        Logged in as
      </p> */}
      {user && (
        <div className="flex flex-row items-center mt-3 mb-5 gap-4">
          <div className=" rounded-full p-1 ">
            <img
              src={user?.avatar}
              alt={user?.name + " avatar"}
              className="w-12 h-12 object-cover object-center rounded-full "
            />
          </div>
          <div className="text-left">
            <h4 className="text-xl text-neutral-100">{user?.name}</h4>
            <p className="text-neutral-400 text-xs text-center">
              {user?.email}
            </p>
          </div>
        </div>
      )}
      <GreyButton onClick={signOut}>Sign out</GreyButton>
    </div>
  );
};
