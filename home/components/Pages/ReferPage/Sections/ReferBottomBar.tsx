import { APP_INFO, APP_ROUTES } from "@/utils/constants/AppInfo";
import { Link } from "react-transition-progress/next";
import { ReferScrollState } from "../types";

export const ReferBottomBar = ({
  clickedAction,
  getActionStyle,
  getActionIcon,
  scrollState,
}: {
  clickedAction: () => void;
  getActionStyle: () => string;
  getActionIcon: () => string;
  scrollState: ReferScrollState | undefined;
}) => {
  return (
    <div className="action_wrapper">
      <div className="action_container">
        {scrollState !== ReferScrollState.WHY_US_AND_YOU &&
          scrollState !== ReferScrollState.TESTIMONIALS &&
          scrollState !== ReferScrollState.FAQ && (
            <Link href={APP_ROUTES.getStarted}>
              <button className="act_button left" onClick={clickedAction}>
                <span className={`material-symbols-outlined icon`}>
                  chevron_left
                </span>
                <span>Start new project.</span>
              </button>
            </Link>
          )}
        <div
          className={`icon_container
         ${scrollState === ReferScrollState.WHY_US_AND_YOU ? "right" : ""}
        `}
        >
          <div
            className={`action_icon ${getActionStyle()}`}
            onClick={clickedAction}
          >
            <span className={`material-symbols-outlined icon`}>
              {getActionIcon()}
            </span>
          </div>
        </div>

        {scrollState !== ReferScrollState.TESTIMONIALS &&
          scrollState !== ReferScrollState.FAQ && (
            <Link href={APP_INFO.mail_refer}>
              <button className={`act_button right`} onClick={clickedAction}>
                <span>Refer your friends</span>
                <span className={`material-symbols-outlined icon`}>
                  chevron_right
                </span>
              </button>
            </Link>
          )}
      </div>
    </div>
  );
};
