/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { CompareSectionStyled } from "./CompareSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import theme from "@/styles/theme";

const weArePoints = [
  {
    point:
      "A collective of expert developers & teams available on demand at the world-class price.",
    icon: "check_circle",
  },
  {
    point:
      "Offer a Risk-Free trial & additional compensation that showcases our confidence to meet your complex needs.",
    icon: "check_circle",
  },
  {
    point:
      "Focused on a very select handful of experts & start-up founders on a rolling basis",
    icon: "check_circle",
  },
  {
    point:
      "A commitment to maintain confidentiality and privacy of both our experts and clients.",
    icon: "check_circle",
  },
];

const weAreNotPoints = [
  {
    point:
      "An agency/platform where you can hire junior/mediocre freelancers at lower costs.",
    icon: "error",
  },
  {
    point:
      "A multi-step screening/hiring procedure that does not guarantee any professionality from the candidates.",
    icon: "error",
  },
  {
    point:
      "Structured as a large enterprise connecting clients and freelancers on large scale.",
    icon: "error",
  },
  {
    point: "A public showcase of our talents for you to choose from.",
    icon: "error",
  },
];

export const CompareSection = () => {
  return (
    <CompareSectionStyled>
      <div className="compare_table">
        <div className="compare_col">
          <div className="compare_row">
            <h1 className="row_title">What we are</h1>
            <Image
              width={300}
              height={100}
              className="row_image simple"
              src={"/images/what_clubs.png"}
              alt="handshake"
            />
          </div>
          {weArePoints.map((point) => (
            <div key={point.point} className="compare_row muted">
              <div className="row_icon">
                <span className="material-symbols-outlined">{point.icon}</span>
              </div>
              <p className="row_point">{point.point}</p>
            </div>
          ))}
        </div>
        <div className="compare_col">
          <div className="compare_row">
            <h1 className="row_title">What we are not</h1>
            <img
              className="row_image"
              src={"/images/whatnot_picker.png"}
              alt="picker"
            />
          </div>
          {weAreNotPoints.map((point) => (
            <div key={point.point} className="compare_row muted">
              <div className="row_icon">
                <span className="material-symbols-outlined">{point.icon}</span>
              </div>
              <p className="row_point">{point.point}</p>
            </div>
          ))}
        </div>
      </div>
    </CompareSectionStyled>
  );
};

export const CompareSectionWithGrids = SectionWithGrids(CompareSection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
