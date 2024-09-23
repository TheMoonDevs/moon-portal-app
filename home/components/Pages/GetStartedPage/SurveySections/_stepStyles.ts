import styled from "@emotion/styled";
import { SurveySteps } from "./_SurveySection";
import media from "@/styles/media";

export const StepStyled = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  ${media.tablet} {
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  & .title {
    font-size: 6rem;
    font-weight: 800;
    margin-bottom: 2rem;

    ${media.tablet} {
      font-weight: 700;
    }

    ${media.largeMobile} {
      font-size: 5rem;
      margin-top: 1rem;
      margin-bottom: 0rem;
      font-weight: 600;
    }
  }

  & .subtitle {
    font-size: 2rem;
    font-weight: 400;
    margin-bottom: 3rem;
    opacity: 0.7;
    animation: slideIn 0.5s ease-out 0s forwards;

    ${media.laptop} {
      margin-bottom: 2rem;
    }

    ${media.tablet} {
      font-size: 1.5rem;
      padding: 0 1rem;
    }
    ${media.largeMobile} {
      margin-top: 3rem;
    }
  }

  & .card_list {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: stretch;
    gap: 2rem;
    flex-wrap: wrap;

    ${media.laptop} {
      gap: 1rem;
      justify-content: center;
    }
    ${media.tablet} {
      gap: 0 1rem;
    }
    ${media.largeMobile} {
      display: block;
      padding: 0 0.8rem;
    }

    &.minified {
      > * {
        flex: 0 0 17.5%;
        margin-bottom: 0;
      }
    }

    &.squarefield {
      > * {
        flex: 0 0 45%;
        margin-bottom: 0;
      }
    }

    > * {
      flex: 1 0 17%;
      margin-bottom: 2rem;

      ${media.laptop} {
        flex: 1 0 45%;
        //margin-bottom: 2rem;
      }
    }
  }

  .card_list_industry {
    display: grid;
    gap: 2rem;
    justify-content: center;
    padding: 2rem;
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));

    ${media.laptop} {
      grid-template-columns: repeat(2, 50%);
      gap: 1rem;
    }
    ${media.tablet} {
      gap: 0 1rem;
    }

    ${media.largeMobile} {
      grid-template-columns: repeat(1, minmax(0, 1fr));
      padding: 0rem;
    }

    &.minified {
      > * {
        margin-bottom: 0;
      }
    }
  }

  & .selectable_card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    position: relative;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;

    ${media.tablet} {
      padding: 0.8rem;
      justify-content: center;
      align-items: center;
      text-align: center;
      flex-wrap: wrap;
      margin: 1rem 0;
    }
    ${media.largeMobile} {
      margin: 1.5rem 0;
    }

    &.items_start {
      justify-content: flex-start;
    }

    &:hover {
      box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.2);
      transform: translateY(-5px);

      & .check_icon {
        opacity: 1;
        transition: all 0.5s ease;
      }
    }

    & .header {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      ${media.tablet} {
        flex-direction: column;
        gap: 0rem;
      }
    }

    & .icon {
      font-size: 4rem;
      color: #333;

      ${media.tablet} {
        font-size: 3rem;
      }
      ${media.largeMobile} {
        font-size: 2.5rem;
      }

      &.small {
        font-size: 3rem;

        ${media.tablet} {
          font-size: 1.5rem;
        }
        ${media.largeMobile} {
          font-size: 2.5rem;
        }
      }

      &.xsmall {
        font-size: 1.68rem;
      }

      &.large {
        font-size: 6rem;
      }
    }

    & .check_icon {
      position: absolute;
      right: 10px;
      top: 3%;
      opacity: 0;
      color: ${(props) => props.theme.fixedColors.charcoalGrey};
    }

    & .active {
      opacity: 1;
    }

    & .card_title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 1rem 0;

      ${media.tablet} {
        font-size: 1.2rem;
        white-space: nowrap;
      }
      ${media.largeMobile} {
        font-size: 1rem;
      }

      &.mini {
        font-size: 1.3rem;

        ${media.tablet} {
          font-size: 1rem;
        }
      }
    }

    & .card_text {
      font-size: 1rem;
      opacity: 0.7;

      ${media.tablet} {
        font-size: 0.7rem;
      }
      ${media.largeMobile} {
        font-size: 0.7rem;
        padding: 0 1rem;
      }
    }

    & .card_text_small {
      font-size: 0.9rem;
      opacity: 0.7;

      ${media.tablet} {
        font-size: 0.7rem;
      }
      ${media.largeMobile} {
        font-size: 0.7rem;
        padding: 0 1rem;
      }
    }
  }

  & .card {
    height: 180px;
    box-sizing: border-box;
    width: 100%;
    margin: 0 auto;
    padding: 1rem;
  }

  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateX(-13%);
    }
    25% {
      opacity: 0.25;
    }
    50% {
      opacity: 0.5;
    }
    75% {
      opacity: 0.75;
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInP {
    0% {
      opacity: 0;
      transform: translateX(-3%);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  & .hello-step-h1 {
    animation: slideIn 0.5s ease-out 0s forwards;
  }

  & .hello-step-p {
    opacity: 0;
    animation: slideInP 0.5s ease-out 0.25s forwards;
  }

  & .hello-step-button {
    opacity: 0;
    animation: slideIn 0.5s ease-out 0.5s forwards;
  }

  @keyframes slideUp {
    0% {
      opacity: 0;
      transform: translateY(13%);
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  & .card-slideup {
    opacity: 0;
    animation: slideUp 0.25s ease-in-out var(--slideup-delay) forwards;
  }

  & .contact_card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    max-width: 32rem;
    width: 100%;
    padding: 3rem 0rem;
    gap: 1.5rem;

    & .contact_heading {
      > h1 {
        font-size: 3rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
      }

      > h2 {
        font-size: 1.2rem;
        font-weight: 400;
        color: ${(props) => props.theme.fixedColors.midGrey};
        margin-bottom: 1rem;
      }
    }

    & .contact_form {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      width: 100%;

      & input {
        width: 100%;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid ${(props) => props.theme.fixedColors.midGrey};
        background: ${(props) => props.theme.fixedColors.whiteSmoke};
        color: ${(props) => props.theme.fixedColors.black};
        transition: all 0.2s ease;

        ${media.tablet} {
          font-size: 1rem;
        }

        :focus {
          border: 1px solid ${(props) => props.theme.fixedColors.black};
          outline: none;
        }
      }
      & .contact_form_phone {
        display: flex;
        align-items: center;
        gap: 5px;
        padding-left: 0.3rem;
        width: 100%;
        border-radius: 0.5rem;
        border: 1px solid ${(props) => props.theme.fixedColors.midGrey};
      }
      & .contact_form_phone > img {
        margin-left: 0.2rem;
      }
      & .contact_form_phone > input {
        border: none;
        border-left: 1px solid ${(props) => props.theme.fixedColors.midGrey};
        border-radius: 0;
        padding-left: 0.5rem;
        margin-right: 1rem;
      }

      & .trial_button {
        width: 100%;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: none;
        background: ${(props) => props.theme.fixedColors.black};
        color: ${(props) => props.theme.fixedColors.white};
        text-transform: capitalize;
        cursor: pointer;

        :hover {
          box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }

        :disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    & .divider {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;

      ::before,
      ::after {
        display: block;
        content: "";
        width: 100%;
        height: 2px;
        background-color: ${(props) => props.theme.fixedColors.silver};
        margin-top: 0.4rem;
      }
    }

    & .google_button {
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: none;
      background: ${(props) => props.theme.fixedColors.white};
      color: ${(props) => props.theme.fixedColors.black};
      border: 1px solid ${(props) => props.theme.fixedColors.midGrey};
      text-transform: capitalize;

      :hover {
        box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
        transition: all 0.3s ease;
      }

      :disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
    }
  }
`;
