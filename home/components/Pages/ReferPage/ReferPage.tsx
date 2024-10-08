import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReferHeroSection } from "./Sections/ReferHero";
import { ReferPageStyled } from "./ReferPage.style";
import { ReferVideoSection } from "./Sections/ReferVideo";
import { ReferScrollState } from "./types";
import { ReferStatsSection } from "./Sections/ReferStats";
import { ReferProcessSection } from "./Sections/ReferProcess";
import { ReferWhyUsAndYou } from "./Sections/ReferWhyUsAndYou";
import { ReferFooter } from "./Sections/ReferFooter";
import { ReferFaq } from "./Sections/ReferFaq";
import { ReferTestimonials } from "./Sections/ReferTestimonials";
import useCampaignAnalytics from "@/utils/hooks/useCampaignAnalytics";
import { ReferBottomBar } from "./Sections/ReferBottomBar";
import { useMediaQuery } from "@mui/material";
import { reverseMedia } from "@/styles/media";

export const ReferPage = () => {
  const [play, setPlay] = useState(false);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [scrollState, setScrollState] = useState<ReferScrollState>();
  // ReferScrollState.HERO
  useCampaignAnalytics(true);
  const isTabletAndUp = useMediaQuery(reverseMedia.largeMobile);
  const disableIntersection = useRef(false);
  const sectionContainer = useRef<HTMLDivElement>(null);
  const [playButtonClicked, setPlayButtonClicked] = useState(false);
  const bottomButtonClickedFromFooter = useRef(false);
  const getActionStyle = () => {
    switch (scrollState) {
      case ReferScrollState.HERO:
        return "dark";
      case ReferScrollState.STATS:
        return "tealGreen";
      case ReferScrollState.VIDEO:
        return isVideoFinished ? "light" : "video";
      case ReferScrollState.PROCESS:
        return "tealGreen";
      case ReferScrollState.WHY_US_AND_YOU:
        return "tealGreen";
      case ReferScrollState.FAQ:
        return "tealGreen";
      case ReferScrollState.FOOTER:
        return "tealGreen";
      default:
        return "tealGreen";
    }
  };

  const getActionIcon = () => {
    switch (scrollState) {
      case ReferScrollState.HERO:
        return "keyboard_double_arrow_up";
      case ReferScrollState.STATS:
        return "keyboard_double_arrow_up";
      case ReferScrollState.VIDEO:
        return isVideoFinished
          ? "keyboard_double_arrow_up"
          : !play
            ? "play_arrow"
            : "pause";
      default:
        return "keyboard_double_arrow_up";
    }
  };

  const clickedAction = () => {
    switch (scrollState) {
      case ReferScrollState.HERO:
        setScrollState(ReferScrollState.STATS);
        break;
      case ReferScrollState.STATS:
        setScrollState(ReferScrollState.TESTIMONIALS);
        break;
      case ReferScrollState.TESTIMONIALS:
        setScrollState(ReferScrollState.PROCESS);
        break;
      case ReferScrollState.VIDEO:
        // setScrollState(ReferScrollState.PROCESS);
        if (isVideoFinished) setScrollState(ReferScrollState.PROCESS);
        else setPlay((prev) => !prev);
        break;
      case ReferScrollState.PROCESS:
        setScrollState(ReferScrollState.WHY_US_AND_YOU);
        break;
      case ReferScrollState.WHY_US_AND_YOU:
        setScrollState(ReferScrollState.FAQ);
        break;
      case ReferScrollState.FAQ:
        setScrollState(ReferScrollState.FOOTER);
        break;
      case ReferScrollState.FOOTER:
        bottomButtonClickedFromFooter.current = true;
        setScrollState(ReferScrollState.HERO);
        break;
      default:
        break;
    }
  };

  // scroll to an  id
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (scrollState) {
      scrollTo(scrollState);
    }
  }, [scrollState]);

  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          handleIntersectingEntry(entry);
        }
      });
    };

    const handleIntersectingEntry = (entry: IntersectionObserverEntry) => {
      const { target } = entry;

      if (!bottomButtonClickedFromFooter.current) {
        disableIntersection.current = false;
      }
      if (target.id === ReferScrollState.FOOTER) {
        handleFooterIntersection();
        return;
      }

      if (target.id === ReferScrollState.HERO) {
        bottomButtonClickedFromFooter.current = false;
        disableIntersection.current = false;
      }

      if (
        (target.id !== scrollState || !scrollState) &&
        !disableIntersection.current
      ) {
        setScrollState(target.id as ReferScrollState);
      }
    };

    const handleFooterIntersection = () => {
      disableIntersection.current = true;
      setScrollState(ReferScrollState.FOOTER);
    };

    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -50% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver(
      handleIntersection,
      observerOptions
    );

    let referSections: NodeListOf<ChildNode>;
    if (sectionContainer.current) {
      referSections = sectionContainer.current.childNodes;
      referSections.forEach((section: ChildNode) => {
        if (section instanceof HTMLElement) {
          observer.observe(section);
        }
      });
    }

    return () => {
      if (referSections)
        referSections.forEach((section: ChildNode) => {
          if (section instanceof HTMLElement) {
            observer.unobserve(section);
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReferPageStyled>
      <div className="refer_sections_container" ref={sectionContainer}>
        <ReferHeroSection />
        <ReferStatsSection />
        <ReferTestimonials />
        {/* <ReferVideoSection
          play={play}
          setPlayButtonClicked={setPlayButtonClicked}
          setPlay={setPlay}
          isVideoFinished={isVideoFinished}
          setScrollState={setScrollState}
          setIsVideoFinished={setIsVideoFinished}
        /> */}
        <ReferProcessSection />
        <ReferWhyUsAndYou />
        <ReferFaq />
        <ReferFooter />
      </div>

      {!isTabletAndUp && (
        <ReferBottomBar
          scrollState={scrollState}
          clickedAction={clickedAction}
          getActionStyle={getActionStyle}
          getActionIcon={getActionIcon}
        />
      )}
    </ReferPageStyled>
  );
};
