import { Button, Skeleton } from "@mui/material";
import { HeroSectionStyled } from "./HomePage.styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionWithGrids } from "./SectionWithGrids";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";
import { APP_INFO, APP_ROUTES } from "@/utils/constants/AppInfo";
import Link from "next/link";
import theme from "@/styles/theme";
import useOnScreen from "@/utils/hooks/useOnScreen";
import {
  SlackBotSdk,
  SlackChannelWebhooks,
  SlackMessageType,
} from "@/utils/service/slackBotSdk";
import { TMDSlackbot } from "@/utils/service/TMDSlackbotSdk";
import { useSearchParams } from "next/navigation";

export const HeroSection = () => {
  const [hovered, setHovered] = useState<string>("");
  const [logged, setLogged] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const query = useMemo(() => {
    if (searchParams) {
      return Object.fromEntries(searchParams);
    }
    return {};
  }, [searchParams]);

  // console.log(asPath);

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref);

  // console.log({ isVisible });

  useEffect(() => {
    if (isVisible && !logged && Object.keys(query).length > 0) {
      // console.log(query);
      FirebaseSDK.logScreenView(
        FirebaseEvents.SCREEN_NAME_HEROSECTION,
        FirebaseEvents.SCREEN_CLASS_HEROSECTION,
        query
      );
      setLogged(true);
    }
  }, [isVisible, logged, query]);

  return (
    <HeroSectionStyled hovered={hovered} ref={ref}>
      <div className="tagline">
        <span>Experience</span>
        <span className="text_box">
          <Skeleton
            className="attached_skeleton"
            variant="text"
            sx={{ fontSize: "1em" }}
          />
          <span className="highlight">excellence</span>
        </span>
        <span>at a click.</span>
      </div>
      <p className="description">
        Skip the risk of hiring & switching between junior/mediocre freelancers.
        <br /> Start your dream project with the MoonDevs’ expert developers,
        <br /> and commit only if you <span className="striked">like</span> love
        our work!
      </p>
      <div className="bottom_bar">
        <Link href={APP_ROUTES.getStarted}>
          <div
            className="button"
            onClick={async () => {
              FirebaseSDK.logEvents(
                FirebaseEvents.CLICKED_CTA_IN_HEROSECTION,
                Number(query)
              );
            }}
          >
            <div className="button_icon">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div className="button_text">Start your 7-Day Trial</div>
          </div>
        </Link>
        <p className="subtag">100% Confidential & Risk-Free</p>
      </div>
    </HeroSectionStyled>
  );
};

export const HeroSectionWithGrids = SectionWithGrids(HeroSection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
