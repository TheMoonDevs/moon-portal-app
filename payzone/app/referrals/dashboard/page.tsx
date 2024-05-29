import { redirect } from "next/navigation";

const page = () => {
  redirect("/referrals/dashboard/user-referrals");
};

export default page;
