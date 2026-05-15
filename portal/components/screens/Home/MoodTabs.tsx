/* eslint-disable @next/next/no-img-element */
import type { User } from '@db/client';
import React, { useState } from 'react';
import Slider from 'react-slick';

import { HomeTabs } from '@/utils/@types/enums';
import { QuotesData } from '@/utils/constants/quotesData';

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
    <div className="mx-2 mb-3 mt-2 flex flex-col gap-3 rounded-[1.15em] bg-white">
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
              setTab(HomeTabs.CHARGING);
              break;
            case 2:
              setTab(HomeTabs.INWORK);
              break;
            case 3:
              setTab(HomeTabs.PLANUP);
              break;
            default:
              break;
          }
        }}
        className="h-[150px]"
      >
        <div className="relative w-full rounded-[1.15em] bg-black">
          <img
            src={'/images/lexica/man_walk_landscape_fields.jpg'}
            alt={''}
            className="static h-[150px] w-full rounded-[1.15em] object-cover object-center opacity-90"
          />
          <div className="absolute inset-x-[20px] inset-y-0 flex h-[150px] items-center justify-between text-4xl">
            <div>
              <p className="bottom-auto text-left text-sm text-xl font-black tracking-[0.2em] text-neutral-100">
                GOOD MORNING
              </p>
              <p className="text-left font-mono text-sm text-xs text-neutral-100">
                Swipe to start your day..
              </p>
            </div>
            <span className="icon_size material-icons-outlined text-neutral-100">
              arrow_forward_ios
            </span>
          </div>
        </div>
        <div className="relative w-full rounded-[1.15em] bg-black">
          <img
            src={'/images/lexica/blowing_green.jpg'}
            alt={''}
            className="static h-[150px] w-full rounded-[1.15em] object-cover object-center opacity-90"
          />
          <div className="absolute inset-x-[20px] inset-y-0 flex h-[150px] items-center justify-between text-4xl">
            <div>
              <p className="bottom-auto text-left text-sm text-xl font-black tracking-[0.2em] text-neutral-100">
                CHARGING
              </p>
              <p className="text-left font-mono text-sm text-xs text-neutral-100">
                Planning the day...
              </p>
            </div>
            <span className="icon_size material-symbols-outlined text-neutral-100">
              charger
            </span>
          </div>
        </div>
        <div className="relative w-full rounded-[1.15em] bg-black">
          <img
            src={'/images/lexica/workroom.jpg'}
            alt={''}
            className="static h-[150px] w-full rounded-[1.15em] object-cover object-center opacity-90"
          />
          <div className="absolute inset-x-[20px] inset-y-0 flex h-[150px] items-center justify-between text-4xl">
            <div>
              <p className="bottom-auto text-left text-sm text-xl font-black tracking-[0.2em] text-neutral-100">
                IN THE ZONE
              </p>
              <p className="text-left font-mono text-sm text-xs text-neutral-100">
                Getting things done..
              </p>
            </div>
            <span className="icon_size material-symbols-outlined text-neutral-100">
              whatshot
            </span>
          </div>
        </div>
        <div className="relative w-full rounded-[1.15em] bg-black">
          <img
            src={'/images/lexica/universe_orange.jpg'}
            alt={''}
            className="static h-[150px] w-full rounded-[1.15em] object-cover object-center opacity-90"
          />
          <div className="absolute inset-x-[20px] inset-y-0 flex h-[150px] items-center justify-between text-4xl">
            <div>
              <p className="bottom-auto text-left text-sm text-xl font-black tracking-[0.2em] text-neutral-100">
                PLAN TOMORROW
              </p>
              <p className="text-left font-mono text-sm text-xs text-neutral-100">
                Whats coming next?
              </p>
            </div>
            <span className="icon_size material-symbols-outlined text-neutral-100">
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
