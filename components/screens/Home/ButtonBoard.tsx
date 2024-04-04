import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import Image from "next/image";
import Link from "next/link";

export const ButtonBoard = () => {
  const { user } = useUser();

  return (
    <div className="flex flex-row justify-between w-full py-2 px-3">
      <Link
        href={APP_ROUTES.userZeroTracker}
        className="relative flex flex-col items-center justify-center gap-1  w-[5em] h-[5em]  rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 top-0 left-0 right-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            calendar_month
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em] ">
            TRACK
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex flex-col items-center justify-center gap-1  w-[5em] h-[5em]  rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 top-0 left-0 right-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            rocket_launch
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em] ">
            GOALS
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex flex-col items-center justify-center gap-1  w-[5em] h-[5em]  rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 top-0 left-0 right-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            editor_choice
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em] ">
            BADGES
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex flex-col items-center justify-center gap-1  w-[5em] h-[5em]  rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 top-0 left-0 right-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            monitoring
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em] ">
            EARN
          </span>
        </div>
      </Link>
    </div>
  );
};
