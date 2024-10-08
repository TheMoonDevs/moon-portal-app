import { StepParams, SurveySteps } from "./_SurveySection";
import { StepStyled } from "./_stepStyles";

const Stages = [
  {
    icon: "currency_exchange",
    value: "Bootstrapped",
    title: "Bootstrapped",
    subtitle:
      "We're bootstrapping our way up, building our dream with passion and resourcefulness.",
  },
  {
    icon: "savings",
    value: "Pre-seed",
    title: "Pre-seed",
    subtitle:
      "We're gathering the essentials, nurturing our idea for future growth.",
  },
  {
    icon: "spa",
    value: "Seed",
    title: "Seed",
    subtitle:
      "We're planting the seeds of success, ready to bloom with the right investment and care.",
  },
];

export const StageStep = ({ setStep, setForm, form }: StepParams) => {
  return (
    <StepStyled>
      <p className="subtitle">{`What stage is your company at?`}</p>
      <div className="card_list">
        {Stages.map((stage, index) => (
          <div
            key={stage.value}
            className="selectable_card card-slideup"
            style={
              { "--slideup-delay": `${index * 0.12}s` } as React.CSSProperties
            }
            onClick={() => {
              setForm((prev) => ({ ...prev, stage: stage.value }));
              setStep(SurveySteps.CONTACT);
            }}
          >
            <span
              className={`material-symbols-outlined icon small check_icon ${
                form?.stage === stage.value ? "active" : ""
              }`}
            >
              task_alt
            </span>
            <span className="material-symbols-outlined icon">{stage.icon}</span>
            <p className="card_title">{stage.title}</p>
            <p className="card_text">{stage.subtitle}</p>
          </div>
        ))}
      </div>
    </StepStyled>
  );
};
