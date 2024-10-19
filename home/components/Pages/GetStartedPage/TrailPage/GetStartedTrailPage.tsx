'use client'
import theme from "@/styles/theme";
import { SectionWithGrids } from "../../HomePage/SectionWithGrids";
import { TrailPageStyled } from "./TrailPageStyled";
import { SurveySection } from "../SurveySections/_SurveySection";

export const SurveySectionWithGrids = SectionWithGrids(SurveySection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});

export const TrailPage = () => {
  return (
    <TrailPageStyled>
      <SurveySectionWithGrids />
    </TrailPageStyled>
  );
};
