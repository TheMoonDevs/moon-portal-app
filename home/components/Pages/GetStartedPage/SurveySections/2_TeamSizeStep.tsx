import styled from "@emotion/styled";
import { StepParams, SurveySteps } from "./_SurveySection";
import { AppButton } from "@/components/App/Global/Button";
import { StepStyled } from "./_stepStyles";

const TeamSizes = [
  {
    icon: "keyboard_command_key",
    value: "1-soloprenuer",
    title: "Just me",
    subtitle:
      "Solo adventurer here, hustling to make things happen : ), I want to start developing an MVP, taking action on my dream business.",
  },
  {
    icon: "people",
    value: "2-5-founders",
    title: "Small Team",
    subtitle:
      "We are a band of misfits between 2-5 people working together. Our MVP is a work-in-progress that needs to be built fast & perfect.",
  },
  {
    icon: "rocket_launch",
    value: "5-10-growing-team",
    title: "Growing Startup.",
    subtitle:
      "We are a fast-evolving team, bolstered by 5-10 passionate individuals. As we strive to expand, we seek the right assistance to scale up effectively.",
  },
  {
    icon: "domain",
    value: "10+-established-team",
    title: "Established Company",
    subtitle:
      "We are an established organisation with a team of 10+ and looking forward to out-source our sub-projects/features.",
  },
];

export const TeamSizeStep = ({ setStep, form, setForm }: StepParams) => {
  return (
    <StepStyled>
      {/* <h1 className="title">How big is your team?</h1> */}
      <p className="subtitle">{`How big is your team?`}</p>
      <div className="card_list">
        {TeamSizes.map((teamSize, index) => (
          <div
            key={teamSize.value}
            className={"selectable_card card-slideup"}
            style={
              { "--slideup-delay": `${index * 0.15}s` } as React.CSSProperties
            }
            onClick={() => {
              setForm((_form) => ({ ..._form, teamSize: teamSize.value }));
              setStep(() => SurveySteps.INDUSTRY);
            }}
          >
            <span
              className={`material-symbols-outlined icon small check_icon ${
                form?.teamSize === teamSize.value ? "active" : ""
              }`}
            >
              task_alt
            </span>
            <span className="material-symbols-outlined icon">
              {teamSize.icon}
            </span>
            <p className="card_title">{teamSize.title}</p>
            <p className="card_text">{teamSize.subtitle}</p>
          </div>
        ))}
      </div>
    </StepStyled>
  );
};
