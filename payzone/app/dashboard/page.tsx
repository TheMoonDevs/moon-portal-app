"use client";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return router.push(APP_ROUTES.credits);
}
