"use client";

import { useEffect, useState } from "react";
import { MobileBox } from "../Home/Login";
import Image from "next/image";
import Link from "next/link";
import { Users } from "@/utils/services/models/User";
import { GreyButton } from "@/components/elements/Button";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useRouter } from "next/navigation";

export const AdminUsers = () => {
  const router = useRouter();
  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setUsers(data.users);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);
  return (
    <MobileBox>
      <div className="flex flex-col grow gap-4 items-center justify-start">
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
          CLIENTS / MEMBER
        </p>
      </div>
      <div className="flex flex-col grow gap-4 items-center justify-center">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex flex-row gap-4 items-center justify-center hover:bg-neutral-800 px-4 py-2 rounded-lg cursor-pointer"
            onClick={() => {
              console.log("clicked", user._id);
              router.push(`${APP_ROUTES.userEditor}?id=${user._id}`);
            }}
          >
            <div className="bg-neutral-900  p-4 rounded-full">
              <Image src={user.avatar} alt={user.name} width={10} height={10} />
            </div>
            <div>
              <p className="text-neutral-300">{user.name}</p>
              <p className="text-sm text-neutral-600">
                {user.usertype} | {user.username}-{user.password}
              </p>
            </div>
            <span className="material-icons text-neutral-400">
              chevron_right
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col grow gap-4 items-center justify-center">
        <Link href={APP_ROUTES.userEditor}>
          <GreyButton rightIcon={"chevron_right"}>Add New User</GreyButton>
        </Link>
      </div>
    </MobileBox>
  );
};
