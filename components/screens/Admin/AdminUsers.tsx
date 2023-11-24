"use client";

import { useEffect, useState } from "react";
import { MobileBox } from "../Home/Login";
import Image from "next/image";
import Link from "next/link";
import { Users } from "@/utils/services/models/User";
import { GreyButton } from "@/components/elements/Button";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export const AdminUsers = () => {
  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
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
            className="flex flex-row gap-4 items-center justify-center"
          >
            <div className="bg-neutral-100  p-4 rounded-full">
              <Image
                src={user.avatar}
                alt={user.username}
                width={80}
                height={80}
              />
            </div>
            <p>{user.username}</p>
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
