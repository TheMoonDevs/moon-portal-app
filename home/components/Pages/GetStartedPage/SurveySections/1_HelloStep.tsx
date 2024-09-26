import styled from "@emotion/styled";
import { StepParams, SurveySteps } from "./_SurveySection";
import { AppButton } from "@/components/App/Global/Button";
import { StepStyled } from "./_stepStyles";

export const HelloStep = ({ setStep }: StepParams) => {
  return (
    <StepStyled>
      <h1 className="title hello-step-h1">Hello.</h1>
      <p className="subtitle hello-step-p">
        There&apos;s a Latin saying
        <i>&quot;Ex nihilo nihil fit&quot;</i> — Nothing comes from nothing. To
        grasp what we can offer to you, we must first understand what your needs
        are. Please take this quick 1-minute survey to help us tailor a solution
        specifically for you.
      </p>
      <AppButton
        startIcon="arrow_forward_ios"
        onClick={() => setStep(SurveySteps.TEAM_SIZE)}
        className="hello-step-button"
      >
        {"Let's Begin"}
      </AppButton>
    </StepStyled>
  );
};
