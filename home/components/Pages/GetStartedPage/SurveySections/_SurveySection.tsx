'use client'
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { HelloStep } from "./1_HelloStep";
import { TeamSizeStep } from "./2_TeamSizeStep";
import { SurveyFooter } from "./_Footer";
import { IndustryStep } from "./3_IndustryStep";
import { RequirementStep } from "./4_Requirement";
// import { StageStep } from "./5_StageStep";
import { ContactStep } from "./6_ContactStep";
import media from "@/styles/media";

const SurveySectionStyled = styled.div`
  min-height: calc(92vh);
  width: 100%;
  margin-top: 4em;
  color: ${(props) => props.theme.fixedColors.black};
  padding: 4em 4em 0 4em;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;

  ${media.largeMobile} {
    padding: 0;
  }
`;

export enum SurveySteps {
  HELLO = "HELLO",
  TEAM_SIZE = "TEAM_SIZE",
  INDUSTRY = "INDUSTRY",
  REQUIREMENT_TYPE = "REQUIREMENT_TYPE",
  // STAGE = "STAGE",
  //BUDGET = "BUDGET",
  //TIME = "TIME",
  CONTACT = "CONTACT",
}

export enum ListIds {
  MARKETING_LIST_TRACKER = "901601327235",
}

export interface FormInfo {
  teamSize?: string;
  industry?: string;
  requirementType?: string;
  budget?: number;
  time?: string;
  stage?: string;
  contact?: {
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    preferredDate?: any;
  };
}

export interface StepParams {
  step?: SurveySteps;
  form?: FormInfo;
  setStep: React.Dispatch<React.SetStateAction<SurveySteps>>;
  setForm: React.Dispatch<React.SetStateAction<FormInfo>>;
}

export const SurveySection = () => {
  const [step, setStep] = useState<SurveySteps>(SurveySteps.HELLO);
  const [form, setForm] = useState<FormInfo>({});

  const stepsArray = Object.values(SurveySteps);

  const handlePrevStep = () => {
    if (stepsArray.indexOf(step) > 0) {
      // console.log(stepsArray.indexOf(step) - 1, "prev step");

      setStep((prev) => stepsArray[stepsArray.indexOf(prev) - 1]);
    }
  };
  const handleNextStep = () => {
    if (stepsArray.indexOf(step) < stepsArray.length - 1) {
      // console.log(stepsArray.indexOf(step) + 1, "next step");
      setStep((prev) => stepsArray[stepsArray.indexOf(prev) + 1]);
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      handlePrevStep();
    } else if (event.key === "ArrowRight") {
      handleNextStep();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <SurveySectionStyled>
      {step === SurveySteps.HELLO && (
        <HelloStep setStep={setStep} form={form} setForm={setForm} />
      )}
      {step === SurveySteps.TEAM_SIZE && (
        <TeamSizeStep setStep={setStep} form={form} setForm={setForm} />
      )}
      {step === SurveySteps.INDUSTRY && (
        <IndustryStep setStep={setStep} form={form} setForm={setForm} />
      )}
      {step === SurveySteps.REQUIREMENT_TYPE && (
        <RequirementStep setStep={setStep} form={form} setForm={setForm} />
      )}
      {/* {step === SurveySteps.STAGE && (
        <StageStep setStep={setStep} form={form} setForm={setForm} />
      )} */}
      {step === SurveySteps.CONTACT && (
        <ContactStep setStep={setStep} form={form} setForm={setForm} />
      )}
      <SurveyFooter
        step={step}
        setStep={setStep}
        form={form}
        setForm={setForm}
      />
    </SurveySectionStyled>
  );
};
