"use client";

import { useAuthSession } from "../hooks/useAuthSession";
import { useAppSelector } from "../redux/store";

export const AdminWrapper = ({ children }: any) => {
  const { user } = useAuthSession();

  if (!user?.isAdmin) {
    return (
      <div className="py-12 bg-gray-50 md:py-24 lg:py-32 xl:py-48">
        <div className="container flex flex-col items-center justify-center space-y-4 px-4 md:px-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              You are not authorized to view this page.
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Please contact the admin for more information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
