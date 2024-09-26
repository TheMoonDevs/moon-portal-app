import { useState, useEffect, useRef } from "react";
import { ReferWhyUsAndYouStyled } from "./ReferWhyUsAndYou.styles";
import { ReferScrollState } from "../types";
import Image from "next/image";
import theme from "@/styles/theme";

const data = [
  {
    id: "1",
    title: "We understand business",
    type: "why-us",
    description:
      "We are seasoned developers with first principal thinking. We bring over 10 yrs of industrial experience and latest insights. We don’t just code, we solve!",
    image: "bg-black",
    image_url: "/images/referrals/why-global.jpg",
  },
  {
    id: "2",
    title: "We build for Scale",
    type: "why-us",

    description:
      "We write clean codes. Use latest technologies. Consider future trends to always keep our clients relevant. All this to help them build reliable, maintained & scalable products",
    image: "bg-black",
    image_url: "/images/referrals/why-projects.jpg",
  },
  {
    id: "3",
    title: "We provide unconditional Value",
    type: "why-us",
    description:
      "At TheMoonDevs, it's simple: great clients deserve great work. We go above and beyond to deliver exceptional results, every time.",
    image: "bg-black",
    image_url: "/images/referrals/why-retent.jpg",
  },
  {
    id: "4",
    title: "You are resourceful",
    type: "why-you",
    description:
      "You care about your network and share what's valuable. Hiring the right developer is often daunting, help your friends skip the rut and risks. A favour to a friend can go a long way, and we want to reward you for it.",
    image: "bg-black",
    image_url: "/images/referrals/why-referrers.jpg",
  },
  {
    id: "5",
    title: "You good intentions will be rewarded",
    type: "why-you",
    description:
      "Refer someone successfully, and you'll earn 20% of their total engagement, up to $2000. Plus, track your referrals' status transparently from your dashboard.\n💡 Our referral partners typically earn about $10k monthly!",
    image: "bg-black",
    image_url: "/images/referrals/why-rewarded.jpg",
  },
  {
    id: "6",
    title: "Your friends will thank you",
    type: "why-you",

    description:
      "We love what we do, so will your friends. All thanks to you :)",
    image: "bg-black",
    image_url: "/images/referrals/why-thanks.jpg",
  },
];

const titles = [
  {
    html: `Why <strong>clients</strong> refer us?`,
  },
  {
    html: `Why <strong>you</strong> should refer us?`,
  },
];

export const ReferWhyUsAndYou = () => {
  const [activeSection, setActiveSection] = useState<string>(data[0].id);
  const leftDivRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const rightTextRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const rightRef = useRef<HTMLDivElement>(null);
  const [activeType, setActiveType] = useState<string>("why-us");

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px 0px -65% 0px",
      threshold: 0,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);

          const target = entry.target as HTMLDivElement;
          if (target.dataset.set === "why-us") {
            setActiveType("why-us");
          } else if (target.dataset.set === "why-you") {
            setActiveType("why-you");
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);

    Object.values(leftDivRefs.current).forEach((ref) => {
      if (ref instanceof HTMLDivElement) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ReferWhyUsAndYouStyled id={ReferScrollState.WHY_US_AND_YOU}>
      <div className="wrapper" ref={rightRef}>
        <div className="left">
          {data.map((item) => (
            <div
              key={item.id}
              id={item.id}
              data-set={item.type}
              className=" image_wrapper"
              ref={(el) => {
                if (el) {
                  leftDivRefs.current[item.id] = el;
                }
              }}
            >
              <div className={` image ${item.image}`}>
                <Image
                  className={`image`}
                  src={item.image_url || ""}
                  alt={item.title}
                  width={400}
                  height={400}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="right">
          <div className="title">
            <span
              dangerouslySetInnerHTML={{
                __html:
                  activeType === "why-us" ? titles[0].html : titles[1].html,
              }}
            ></span>
          </div>
          {data.map((item) => {
            return (
              <div
                key={item.id}
                style={{
                  display: activeSection === item.id ? "block" : "none",
                }}
                className={`content`}
                id={item.id}
                ref={(el) => {
                  if (el) {
                    rightTextRefs.current[item.id] = el;
                  }
                }}
              >
                <div className="paragraph_container">
                  <p className="heading">
                    {item.title.split(" ").map((word, index, array) => (
                      <span
                        key={index}
                        style={{
                          color:
                            index === array.length - 1
                              ? theme.fixedColors.tealGreenText
                              : "",
                        }}
                      >
                        {word} {index !== array.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </p>
                  <p className="description">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ReferWhyUsAndYouStyled>
  );
};
