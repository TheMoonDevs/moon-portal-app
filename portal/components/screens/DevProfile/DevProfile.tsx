import { APP_ROUTES } from '@/utils/constants/appInfo';
import Link from 'next/link';
import DevProfileLayout from './DevProfileLayout';
import { Toaster } from 'sonner';

const DevProfile = () => {
  return (
    <div className="h-screen w-full">
      <div className="w-full bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-2">
          <Link
            href={APP_ROUTES.home}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-800"
          >
            <span className="material-symbols-outlined text-base font-semibold">
              arrow_back
            </span>
            Back
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800">
            Add or Edit Your Dev Profile
          </h1>
          <p className="text-sm text-gray-600">
            Complete your profile to showcase your development skills and
            experience.
          </p>
        </div>
      </div>
      <div className="relative z-50">
        <Toaster richColors duration={3000} closeButton position="bottom-right" />
      </div>
      <DevProfileLayout />
    </div>
  );
};

export default DevProfile;
