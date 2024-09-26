import { ReferProcessSectionStyled } from "./ReferProcess.styles";
import { ReferScrollState } from "../types";
import Image from "next/image";
import Carousel from "react-multi-carousel";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";

const STEPS = [
  {
    title: "1. Tap Refer your friends",
    description:
      "which will take you to a page where you can quick-sign using your google account. Refer your friends or become a long-term partner for ongoing collaboration. ",
    image: "/images/referrals/signup.png",
  },
  {
    title: "2. Refer your friend",
    description:
      "You can refer friends in two ways: either share your unique referral link in your dashboard for them to join the 7-day risk-free trial, or connect us with them to get the process started.",
    image: "/images/referrals/refer.png",
  },
  {
    title: "3. Cash your earnings",
    description:
      "Watch your rewards Stack up! When your referrals are onboarded with us for a paid collaboration, you’ll earn 20% on every new onboarded engagement, of up to $2000 per referral.",
    image: "/images/referrals/earn.png",
  },
];

const responsive = {
  superLargeDesktop: {
    // the naming can be any, depends on you.
    breakpoint: { max: 4000, min: 3000 },
    items: 3,
  },
  desktop: {
    breakpoint: { max: 3000, min: 1024 },
    items: 3,
  },
  tablet: {
    breakpoint: { max: 1024, min: 464 },
    items: 3,
  },
  mobile: {
    breakpoint: { max: 464, min: 0 },
    items: 1,
  },
};

export const ReferProcessSection = () => {
  const isMobileView = useMediaQuery(media.largeMobile);
  return (
    <ReferProcessSectionStyled id={ReferScrollState.PROCESS}>
      <h1 className="section_title">
        Do it now, We made it{" "}
        <span className="highlighted_text">super-simple.</span>
      </h1>
      <Carousel
        responsive={responsive}
        removeArrowOnDeviceType={["tablet", "mobile"]}
        infinite={isMobileView}
        autoPlay={isMobileView}
        shouldResetAutoplay
        autoPlaySpeed={10000}
        keyBoardControl
        transitionDuration={500}
        className="steps_container"
        showDots={false}
      >
        {STEPS.map((step, index) => (
          <>
            <div className="step_box" key={step.title}>
              <h1 className="index_no">{index + 1}</h1>
              <Image
                className="step_graphic"
                src={step.image}
                alt={step.title}
                width={300}
                height={300}
              />
              <h3 className="step_title">{step.title}</h3>
              <p className="step_description">{step.description}</p>
            </div>
            {/* {index !== STEPS.length - 1 && (
              <Image
                src="/icons/stroke-twist.svg"
                alt="stroke"
                width={100}
                height={100}
              />
            )} */}
          </>
        ))}
      </Carousel>
    </ReferProcessSectionStyled>
  );
};
