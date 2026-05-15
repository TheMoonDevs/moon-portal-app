import type { User } from '@db/client';

import type { LoggedInUser } from '../ProfileDrawer';

export const ProfileImagesSection = ({
  bannerLoading,
  selectedUser,
  loggedinUser,
  handleBannerChange,
  handleAvatarChange,
  avatarLoading,
}: {
  bannerLoading: boolean;
  selectedUser: User;
  loggedinUser: LoggedInUser;
  handleBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  avatarLoading: boolean;
}) => {
  return (
    <div className="relative h-[120px]">
      {bannerLoading ? (
        <div className="size-full animate-pulse bg-gray-300" />
      ) : (
        <img
          src={selectedUser?.banner || '/images/gradientBanner.jpg'}
          className="absolute size-full object-cover"
          alt="Profile Banner"
        />
      )}
      {loggedinUser.user.id === selectedUser?.id && (
        <label className="absolute -right-2 top-2 flex cursor-pointer items-center justify-center rounded-full bg-white">
          <span
            className="material-symbols-outlined absolute right-2 top-0 cursor-pointer rounded-full bg-white p-[6px]"
            style={{ fontSize: '16px' }}
          >
            add_a_photo
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleBannerChange}
            className="hidden"
          />
        </label>
      )}
      <div className="absolute -bottom-[3.25rem] left-5 size-24 rounded-full border-4 border-white">
        {avatarLoading ? (
          <div className="rounded-full bg-white">
            <div className="size-24 animate-pulse rounded-full bg-gray-300" />
          </div>
        ) : (
          <img
            src={selectedUser?.avatar || '/icons/placeholderAvatar.svg'}
            alt={selectedUser?.name?.charAt(0) || ''}
            className="size-full rounded-full bg-white object-cover"
          />
        )}

        {loggedinUser.user.id === selectedUser?.id && (
          <label className="absolute -right-2 top-2 flex cursor-pointer items-center justify-center rounded-full bg-white p-[2px]">
            <span
              className="material-symbols-outlined rounded-full bg-white p-[4px]"
              style={{ fontSize: '16px' }}
            >
              add_a_photo
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
};
