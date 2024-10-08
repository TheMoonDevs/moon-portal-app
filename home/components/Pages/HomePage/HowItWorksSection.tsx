/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { HowItWorksSectionStyled } from "./HowItWorksSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import theme from "@/styles/theme";
import Link from "next/link";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";
import { APP_INFO } from "@/utils/constants/AppInfo";

const howItWorksPoints = [
  {
    //"/images/steps.jpg",
    image: "/images/sun.webp",
    //"https://image.lexica.art/full_webp/1109f863-f737-420d-a442-fea578bfe3cf",
    icon: "a",
    title: "Claim Your Risk-free Trial.",
    description:
      "Begin your 7 day trial by scheduling a call with our matcher team. Discuss your project goals and expectations to ensure a tailored fit. (We carefully select projects to ensure an exclusive fit for our 7-day trial.)",
  },
  {
    image: "/images/run.jpg",
    icon: "b",
    title: "Action-Packed 7 Days.",
    description:
      "Experience the skills of our pro developers firsthand as they start bringing your project to life.",
  },
  {
    image: "/images/pocket.jpg",
    //"https://image.lexica.art/full_webp/d879438c-2527-4ca1-8f29-1d08bffa181a",
    icon: "c",
    title: "Commitment is Your Choice.",
    description:
      "After the trial, you can choose to continue working with us or walk away with no strings attached. TheMoonDevs will bear the burden of the trial period and pay in your stead.",
  },
];

export const HowItWorksSection = () => {
  return (
    <HowItWorksSectionStyled>
      <div className="how_it_works">
        <div className="how_it_works_row">
          <h1 className="section_title">How it works</h1>
        </div>
        <div className="work_points">
          {howItWorksPoints.map((point, index) => (
            <div key={point.title} className="work_point ">
              <Image
                src={point.image}
                alt=""
                width={300}
                height={700}
                className={`work_image ${index != 2 ? "bottom" : ""}`}
              />
              {/* <div className="row_icon">
                <span className="material-symbols-outlined">{point.icon}</span>
              </div> */}
              <div className="work_info">
                <p className="work_title">{point.title}</p>
                <p className="work_subtitle">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bottom_bar">
          <Link href={APP_INFO.contactUrl} passHref legacyBehavior>
            <a target="_blank" rel="noopener noreferrer">
              <div
                className="button"
                onClick={() => {
                  // FirebaseSDK.logEvents(
                  //   FirebaseEvents.CLICKED_CTA_IN_HEROSECTION
                  // );
                }}
              >
                <div className="button_icon">
                  <span className="material-symbols-outlined">task_alt</span>
                </div>
                <div className="button_text">Start your 7-Day Trial</div>
              </div>
            </a>
          </Link>
          <p className="subtag">100% Confidential & Risk-Free</p>
        </div>
      </div>
    </HowItWorksSectionStyled>
  );
};

export const HowItWorksSectionWithGrids = SectionWithGrids(HowItWorksSection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
