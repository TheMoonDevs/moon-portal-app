import styled from "@emotion/styled";
import { StepParams, SurveySteps } from "./_SurveySection";
import { useEffect, useMemo, useState } from "react";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";
import store from "@/redux/store";
import media from "@/styles/media";

const SurveyFooterStyled = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2em;
  margin-top: 2em;
  gap: 2em;

  ${media.tablet} {
    justify-content: center;
    align-items: center;
    text-align: center;
    
  }

  & .step_container {
    display: flex;
    align-items: center;
    jusitfy-content: center;

    & .step {
      padding: 0.45em 0.25em;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;

      & .step_dot {
        width: 1em;
        height: 1em;
        border-radius: 50%;
        background-color: ${(props) => props.theme.fixedColors.lightSilver};
        transform: scale(0.5);
        transition: all 0.25s ease;

        &.active {
          background-color: ${(props) => props.theme.fixedColors.charcoalGrey};
        }
      }

      &:hover {
        & .hoverable_dot {
          transform: scale(1);
          background-color: ${(props) => props.theme.fixedColors.lightSilver};
          border: 2px solid ${(props) => props.theme.fixedColors.black};
        }
      }
    }
  }

  & .timer_text {
    font-size: 0.8em;
    color: ${(props) => props.theme.fixedColors.darkGrey};
    opacity: 0.5;

    ${media.tablet} {
      font-size: 0.6em;
    }
  }
`;

export const SurveyFooter = ({ step, setStep }: StepParams) => {
  const logStepEvent = (event: string, step: number) => {
    setActiveStep((prevSteps) => {
      if (!prevSteps.includes(step)) {
        FirebaseSDK.logEvents(event);
      }
      return [...prevSteps, step];
    });
    // console.log({ event, step });
  };
  // const [logged, setLogged] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number[]>([]);

  const totalSteps = Object.values(SurveySteps).length;
  const currentIndex = Object.values(SurveySteps).findIndex((s) => s === step);
  const percentageDone = (((currentIndex + 1) / totalSteps) * 100).toFixed(0);
  const timerData =
    60 - parseInt((((currentIndex + 1) / totalSteps) * 60).toFixed(0));

  useEffect(() => {
    if (currentIndex == 1) {
      logStepEvent(FirebaseEvents.SURVEY_STARTED, 1);
    } else if (parseFloat(percentageDone) >= 50) {
      logStepEvent(FirebaseEvents.SURVEY_FIFTY_PERCENT, 50);
    } else if (currentIndex === totalSteps - 1) {
      logStepEvent(FirebaseEvents.SURVEY_ENDED, 100);
    }
  }, [percentageDone, currentIndex, totalSteps]);

  return (
    <SurveyFooterStyled>
      <p className="timer_text ">{percentageDone}% done</p>
      <div className="step_container">
        {Object.values(SurveySteps).map((step, index) => (
          <div className="step" key={step} onClick={() => setStep(step)}>
            <span
              className={`step_dot hoverable_dot  ${
                currentIndex >= index && "active"
              }`}
            ></span>
          </div>
        ))}
      </div>
      <p className="timer_text">{timerData} of 60 seconds left.</p>
    </SurveyFooterStyled>
  );
};
