import Image from "next/image";
import { ReferScrollState } from "../types";
import { ReferStatsSectionStyled } from "./ReferStats.styles";

const Stats = [
  {
    number: "18",
    caption: "Global scale projects till date.",
    fulltext: "distributed in 44 countries.",
  },
  {
    number: "73",
    caption: "% of our clients refer us.",
    fulltext: "and have earned upto 10k USD.",
  },
  {
    number: "94",
    caption: "% of our clients have succeeded.",
    fulltext: "and return for more.",
  },
];

export const ReferStatsSection = () => {
  return (
    <ReferStatsSectionStyled className="section" id={ReferScrollState.STATS}>
      <Image
        src={"/images/referrals/scaleup.jpg"}
        alt=""
        className="stats_image"
        width={1080}
        height={1080}
      />

      <div className="stats_container">
        {Stats.map((stat, index) => {
          const splitTexts = stat.fulltext.split(" ");

          return (
            <div className="stat_card" key={index}>
              <h1 className="number">{stat.number}</h1>
              <div>
                <p className="caption">{stat.caption}</p>
                <p className="fulltext">
                  {
                    splitTexts.map((word, index) => {
                      return (
                        <span
                          className={`${index === splitTexts.length - 1 || index === splitTexts.length - 2 || index === splitTexts.length - 3 ? "highlighted_text" : ""}`}
                          key={word + index}
                        >
                          {word} {index !== word.length - 1 ? " " : ""}
                        </span>
                      );
                    })
                    // .join(" ")
                  }
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ReferStatsSectionStyled>
  );
};
