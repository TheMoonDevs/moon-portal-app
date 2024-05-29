import { User } from "@prisma/client";
import React from "react";

interface UserSelectProps {
  users: User[] | null;
  selectedUser: string | null | undefined;
  setSelectedUser?: (userId: string) => void;
  setSelectedUserObj?: (user: User | null) => void;
  placeholder?: string;
  loadingMessage?: string;
  noUsersMessage?: string;
  handleSelectedUser?: (user: User | null) => void;
}

const UserSelect: React.FC<UserSelectProps> = ({
  users,
  selectedUser,
  setSelectedUser,
  setSelectedUserObj,
  placeholder = "Select your option",
  loadingMessage = "Loading...",
  noUsersMessage = "No users found",
  handleSelectedUser,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const selectedUser =
      users?.find((user) => user.id === selectedUserId) || null;
    handleSelectedUser && handleSelectedUser(selectedUser);
    setSelectedUser && setSelectedUser(selectedUserId);
    setSelectedUserObj && setSelectedUserObj(selectedUser);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700" htmlFor="user">
        Select a user
      </label>
      <select
        className="w-full rounded-md border bg-white border-gray-300 py-2 px-3 pr-10 text-base focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        id="user"
        value={selectedUser as string}
        onChange={handleChange}
      >
        <option value="" selected>
          {placeholder}
        </option>
        {users?.length === 0 ? (
          <option disabled>{loadingMessage}</option>
        ) : (
          users?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))
        )}
        {users?.length === 0 && !selectedUser && (
          <option disabled>{noUsersMessage}</option>
        )}
      </select>
    </div>
  );
};

export default UserSelect;
