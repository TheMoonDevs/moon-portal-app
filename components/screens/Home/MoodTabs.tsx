/* eslint-disable @next/next/no-img-element */
import { User } from "@prisma/client";
import React, { useState } from "react";
import Slider from "react-slick";
import { QuotesData } from "@/utils/constants/quotesData";
import { HomeTabs } from "@/utils/@types/enums";

const DAY_MOOD = [{}];

const randomQuote = QuotesData[Math.floor(Math.random() * QuotesData.length)];

export const MoodTabs = ({
  user,
  setTab,
}: {
  user: User;
  setTab: React.Dispatch<React.SetStateAction<HomeTabs>>;
}) => {
  const [activeSlide2, setActiveSlide2] = useState(0);

  return (
    <div className=" flex flex-col mx-2 mt-2 mb-3 gap-3 bg-white rounded-[1.15em]">
      <Slider
        dots={true}
        infinite={true}
        speed={300}
        slidesToShow={1}
        slidesToScroll={1}
        arrows={false}
        afterChange={(current: number) => {
          switch (current) {
            case 0:
              setTab(HomeTabs.START);
              break;
            case 1:
              setTab(HomeTabs.ACTIONS);
              break;
            default:
              break;
          }
        }}
        className="h-[150px]"
      >
        <div className="w-full relative bg-black rounded-[1.15em]">
          <img
            src={"/images/lexica/man_walk_landscape_fields.jpg"}
            alt={""}
            className="static w-full h-[150px] opacity-[0.9] object-cover object-center rounded-[1.15em]"
          />
          <div className="absolute text-4xl left-[20px] right-[20px] top-0 bottom-0 h-[150px] flex items-center justify-between">
            <div>
              <p className="text-xl  bottom-auto text-left font-black tracking-[0.2em] text-neutral-100 text-sm">
                GOOD MORNING
              </p>
              <p className="text-xs text-left font-mono text-neutral-100 text-sm">
                Swipe to start your day..
              </p>
            </div>
            <span className="icon_size text-neutral-100 material-icons-outlined">
              arrow_forward_ios
            </span>
          </div>
        </div>
        <div className="w-full relative bg-black rounded-[1.15em]">
          <img
            src={"/images/lexica/blowing_green.jpg"}
            alt={""}
            className="static w-full h-[150px] opacity-[0.9] object-cover object-center rounded-[1.15em]"
          />
          <div className="absolute text-4xl left-[20px] right-[20px] top-0 bottom-0 h-[150px] flex items-center justify-between">
            <div>
              <p className="text-xl  bottom-auto text-left font-black tracking-[0.2em] text-neutral-100 text-sm">
                CHARGING
              </p>
              <p className="text-xs text-left font-mono text-neutral-100 text-sm">
                Planning the day...
              </p>
            </div>
            <span className="icon_size text-neutral-100 material-symbols-outlined">
              charger
            </span>
          </div>
        </div>
        <div className="w-full relative bg-black rounded-[1.15em]">
          <img
            src={"/images/lexica/workroom.jpg"}
            alt={""}
            className="static w-full h-[150px] opacity-[0.9] object-cover object-center rounded-[1.15em]"
          />
          <div className="absolute text-4xl left-[20px] right-[20px] top-0 bottom-0 h-[150px] flex items-center justify-between">
            <div>
              <p className="text-xl  bottom-auto text-left font-black tracking-[0.2em] text-neutral-100 text-sm">
                IN THE ZONE
              </p>
              <p className="text-xs text-left font-mono text-neutral-100 text-sm">
                Getting things done..
              </p>
            </div>
            <span className="icon_size text-neutral-100 material-symbols-outlined">
              whatshot
            </span>
          </div>
        </div>
        <div className="w-full relative bg-black rounded-[1.15em]">
          <img
            src={"/images/lexica/universe_orange.jpg"}
            alt={""}
            className="static w-full h-[150px] opacity-[0.9] object-cover object-center rounded-[1.15em]"
          />
          <div className="absolute text-4xl left-[20px] right-[20px] top-0 bottom-0 h-[150px] flex items-center justify-between">
            <div>
              <p className="text-xl  bottom-auto text-left font-black tracking-[0.2em] text-neutral-100 text-sm">
                PLAN TOMORROW
              </p>
              <p className="text-xs text-left font-mono text-neutral-100 text-sm">
                Whats coming next?
              </p>
            </div>
            <span className="icon_size text-neutral-100 material-symbols-outlined">
              explore
            </span>
          </div>
        </div>
        {/* <div>
          <h3>3</h3>
        </div> */}
      </Slider>
    </div>
  );
};
