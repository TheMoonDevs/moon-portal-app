import theme from "@/styles/theme";
import { BenefitsSectionStyled } from "./BenefitsSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import { useEffect, useRef, useState } from "react";
import useOnScreen from "@/utils/hooks/useOnScreen";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";

export const BenefitsSection = () => {
  const [logged, setLogged] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref);

  // console.log({ isVisible });

  useEffect(() => {
    if (isVisible && !logged) {
      FirebaseSDK.logScreenView(
        FirebaseEvents.SCREEN_NAME_BENEFITSSECTION,
        FirebaseEvents.SCREEN_CLASS_BENEFITSSECTION
      );
      setLogged(true);
    }
  }, [isVisible, logged]);

  return (
    <BenefitsSectionStyled ref={ref}>
      <h1 className="title">Why do start-up founders love us?</h1>
      <div className="benefits_flexbox">
        <div className="benefit_col">
          <div className="benefit_icon">
            <span className="material-symbols-outlined ms-thin">steps</span>
          </div>
          <div className="benefit_icon reflection">
            <span className="material-symbols-outlined ms-thin">azm</span>
          </div>
          <p className="benefit_description">
            Kickstart your project in minutes with developers that meet your
            unique needs.
          </p>
          <p className="benefit_subtag">
            We find the right fit, <span className="subtag_first">save your time</span> & resources
          </p>
        </div>
        <div className="benefit_col">
          <div className="benefit_icon">
            <span className="material-symbols-outlined ms-thin">azm</span>
          </div>
          <div className="benefit_icon reflection">
            <span className="material-symbols-outlined ms-thin">azm</span>
          </div>
          <p className="benefit_description">
            Access seasoned developers whose skills and commitment will leave
            you satisfied.
          </p>
          <p className="benefit_subtag">
            Full Refund & <span className="subtag_second">Extra 1000$ compensation</span>
          </p>
        </div>
        <div className="benefit_col">
          <div className="benefit_icon">
            <span className="material-symbols-outlined ms-thin">
              all_inclusive
            </span>
          </div>
          <div className="benefit_icon reflection">
            <span className="material-symbols-outlined ms-thin">azm</span>
          </div>
          <p className="benefit_description">
            Enjoy a clear & transparent communication - no suprises, no false
            promises.
          </p>
          <p className="benefit_subtag">
            <span className="subtag_third">92% of our clients return</span> for more projects
          </p>
        </div>
      </div>
    </BenefitsSectionStyled>
  );
};

export const BenefitsSectionWithGrids = SectionWithGrids(BenefitsSection, {
  backgroundColor: theme.fixedColors.black,
  color: theme.fixedColors.darkGrey,
});
