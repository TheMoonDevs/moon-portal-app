"use client";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import Searchbar from "./Searchbar";
import { USERROLE, USERSTATUS, USERTYPE, User } from "@prisma/client";
import { useEffect, useState } from "react";
import {
  MyServerApi,
  SERVER_API_ENDPOINTS,
  PORTAL_SERVER_API_URL,
} from "@/utils/service/MyServerApi";
import ToggleButton from "./ToggleButton";
import {
  setAdminView,
  setAllUsers,
} from "@/utils/redux/cerificatesUpload/certificate.slice";
import DropzoneAdminButton from "./DropzoneAdminButton";
import CertificatesTable from "./CertificatesTable";

export const Certificates = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isAdminView = useAppSelector(
    (state) => state.certificatesUpload.isAdminView
  );
  const { users } = useAppSelector((state) => state.certificatesUpload);
  const dispatch = useAppDispatch();

  const toggleView = () => {
    dispatch(setAdminView(!isAdminView));
  };
  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.isAdmin) {
      MyServerApi.getAll(
        `${SERVER_API_ENDPOINTS.getUsers}?role=${USERROLE.CORETEAM}&userType=${USERTYPE.MEMBER}&status=${USERSTATUS.ACTIVE}`
      )
        .then((data: any) => {
          dispatch(setAllUsers(data?.data?.user as User[]));
        })
        .catch((err) => {
          console.error("Error fetching users:", err);
        });
    }
  }, [user, dispatch]);

  return (
    <main className="flex mx-4">
      <section className="w-full">
        <div className="flex w-full justify-between items-center mt-10">
          <Searchbar />
          {user?.isAdmin && (
            <div className="flex items-center gap-2 p-4 py-2 bg-neutral-200 rounded-md">
              <span>
                {isAdminView ? <span> Disable</span> : <span>Enable</span>}{" "}
                Admin View
              </span>
              <ToggleButton isActive={isAdminView} onClick={toggleView} />
            </div>
          )}
        </div>

        {user?.isAdmin && isAdminView && <DropzoneAdminButton users={users} />}
        <CertificatesTable />
      </section>
    </main>
  );
};
