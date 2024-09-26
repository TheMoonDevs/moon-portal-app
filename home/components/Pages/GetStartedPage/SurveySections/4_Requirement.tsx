import styled from "@emotion/styled";
import { StepParams, SurveySteps } from "./_SurveySection";
import { AppButton } from "@/components/App/Global/Button";
import { StepStyled } from "./_stepStyles";

const Requirements = [
  {
    icon: "category",
    value: "project-scratch",
    title: "Build my project from the ground up.",
    subtitle:
      "A Senior Developer or a Product Team will take full charge and assist in bringing your ideas to reality. This is a highly suggested option, if you are in your idea phase.",
    //or even just started with your project, as our developers are experts that will provide right guidance that will save you a lot of time and resources
  },
  {
    icon: "how_to_reg",
    value: "innovation-hub",
    title: "Guide me for my tech setup.",
    subtitle:
      "Not sure where to start? Our experts will guide you through the process of setting up your tech stack, architecture, and development process.",
  },
  {
    icon: "linked_services",
    value: "project-features",
    title: "Improve my product with New Features.",
    subtitle:
      "Enhance your product with innovative features. Our developers will work closely with you to understand your needs and integrate new capabilities.",
    // that elevate your project to the next level while resolving all the old bug fixes and deprecations in your project
  },
  {
    icon: "bubble",
    value: "project-scaleup",
    title: "Revamp / Scale up of an Existing Project.",
    subtitle:
      "Transform and expand your existing project, to meet growing demands. we will identify areas for improvement, and enhance scalability and performance at a larger scale.",
  },
];

export const RequirementStep = ({ setStep, setForm, form }: StepParams) => {
  return (
    <StepStyled>
      {/* <h1 className="title">How big is your team?</h1> */}
      <p className="subtitle">{`How can we help?`}</p>
      <div className="card_list " style={{ justifyContent: "center" }}>
        {Requirements.map((requirement, index) => (
          <div
            key={requirement.value}
            className="selectable_card items_start card-slideup"
            style={
              { "--slideup-delay": `${index * 0.12}s` } as React.CSSProperties
            }
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                requirementType: requirement.value,
              }));
              // setStep(SurveySteps.STAGE);
              setStep(SurveySteps.CONTACT);
            }}
          >
            <div className="header">
              <span className="material-symbols-outlined icon">
                {requirement.icon}
              </span>
            </div>
            <span
              className={`material-symbols-outlined icon small check_icon ${
                form?.requirementType === requirement.value ? "active" : ""
              }`}
            >
              task_alt
            </span>
            <p className="card_title">{requirement.title}</p>
            <p className="card_text_small">{requirement.subtitle}</p>
          </div>
        ))}
      </div>
    </StepStyled>
  );
};
