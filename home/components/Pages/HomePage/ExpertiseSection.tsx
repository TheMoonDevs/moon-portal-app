import { ExpertiseSectionStyled } from "./ExpertiseSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import Image from "next/image";
import crypto from "@/public/icons/exp/crypto.svg";
import media from "@/public/icons/exp/media.svg";
import social from "@/public/icons/exp/social.svg";
import ecommerce from "@/public/icons/exp/ecommerce.svg";
import deep from "@/public/icons/exp/deep.svg";
import integration from "@/public/icons/exp/integration.svg";
import { Skeleton } from "@mui/material";
import theme from "@/styles/theme";

const industries = [
  {
    icon: crypto,
    title: "Crypto & Web3",
  },
  {
    icon: ecommerce,
    title: "E-commerce",
  },
  {
    icon: media,
    title: "Media & gaming",
  },
  {
    icon: integration,
    title: "AI integrations",
  },
  {
    icon: deep,
    title: "Deep Learning",
  },
];

const experiences = [
  {
    icon: "monetization_on",
    title: "Crypto Wallet & Coin Exchange Platform",
  },
  {
    icon: "bolt",
    title: "PWA app for a Business Mangement Service (KPIs, CRM, etc.)",
  },
  {
    icon: "chat_bubble",
    title: "LLM based Browser Extension (Similar to Grammerly)",
  },
  {
    icon: "casino",
    title: "E-Sports based Crypto Casino (500k+ Holders)",
  },
  {
    icon: "precision_manufacturing",
    title: "AI automation for a gaming software",
  },
  {
    icon: "playing_cards",
    title: "Gen AI based MMORPG Card game",
  },
  {
    icon: "celebration",
    title: "Cross platform social-app for Event Management",
  },
];

export const ExpertiseSection = () => {
  return (
    <ExpertiseSectionStyled>
      <div className="skeleton_frame">
        <Skeleton
          className="exp_skeleton"
          variant="rectangular"
          width="100%"
          height="100%"
        ></Skeleton>
        <div className="skeleton_reg">
          <div className="exp_container">
            <h1 className="title">A few engagements we recently concluded</h1>
            <div className="exp_box">
              {/* <div className="exp_table">
          {industries.map((industry) => (
            <div key={industry.title} className="exp_point">
              <div className="exp_icon">
                <Image src={industry.icon} alt="" width={100} height={100} />
              </div>
              <p className="exp_subtag">{industry.title}</p>
            </div>
          ))}
        </div> */}
              {/* <h1 className="subtitle">Our Recent Projects</h1> */}
              <div className="exp_flexbox">
                {experiences.map((experience) => (
                  <div key={experience.title} className="exp_highlight">
                    <div className="exp_icon">
                      <span className="material-symbols-outlined">
                        {experience.icon}
                      </span>
                    </div>
                    <p className="exp_buttontag">{experience.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpertiseSectionStyled>
  );
};

export const ExpertiseSectionWithGrids = SectionWithGrids(ExpertiseSection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
