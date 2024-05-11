import { useUser } from "@/utils/hooks/useUser";
import DropzoneAdminButton from "./DropzoneAdminButton";
import { DropzoneButton } from "./DropzoneButton";
import Searchbar from "./Searchbar";
import FilesTable from "./FilesTable";
import { Bottombar } from "@/components/global/Bottombar";
import { useEffect, useState } from "react";
import { User } from "@prisma/client";

export const FileUpload = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useUser();
  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.isAdmin) {
      const fetchUsers = async () => {
        try {
          const response = await fetch(`api/users`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const data = await response.json();
          setUsers(data?.data?.user as User[]);
        } catch (error) {
          console.error("Error:", error);
        }
      };

      fetchUsers();
    }
  }, [user]);

  return (
    <div className="md:mx-4 md:mt-6 flex flex-col gap-4">
      <h1 className="lg:text-2xl md:text-xl md:mx-3 font-semibold">
        Upload Files
      </h1>
      <Searchbar />
      {user?.isAdmin ? (
        <DropzoneAdminButton users={users} />
      ) : (
        <DropzoneButton />
      )}
      <FilesTable users={users} />
      <Bottombar />
    </div>
  );
};
