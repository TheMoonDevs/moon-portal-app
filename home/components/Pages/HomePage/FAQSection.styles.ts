import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const FAQSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};
  display: flex;
  align-items: stretch;
  justify-content: space-between;

  ${media.laptop} {
    flex-direction: column;
  }

  & .faq_sidebar {
    flex-basis: 35%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1rem;
  }

  & .faq_title {
    font-size: 2rem;
    font-weight: 800;
    margin: 2rem;
    cursor: pointer;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.25rem;
  }

  & .faq_box {
    flex-grow: 1;
    padding: 4rem;
    border-left: 1px solid ${(props) => props.theme.fixedColors.lightSilver};

    ${media.laptop} {
      padding: 2rem;
    }

    ${media.tablet} {
      padding: 2rem;
    }
  }

  & .faq_flexbox {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 0.5rem;
    position: relative;
  }

  & .faq_point {
    cursor: pointer;
    overflow: hidden;

    &:hover {
      opacity: 0.75;
    }

    &.active {
      & .faq_answer {
        height: 5.8em;

        ${media.tablet} {
          height: 8em;
        }
      }
    }
  }

  & .faq_question {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    cursor: pointer;
    display: flex;
    gap: 1rem;
    align-items: center;

    ${media.tablet} {
      font-size: 1rem;
    }

    & .faq_icon {
      padding-top: 0.4rem;
      & .rotate {
        transform: rotate(180deg);
      }

      & .rotatable-icon {
        transition: transform 0.4s ease;
      }
    }
  }

  & .faq_answer {
    max-width: 60%;
    height: 0;
    transition: height 0.33s ease-in-out;

    ${media.tablet} {
      font-size: 0.9rem;
      max-width: 100%;
    }

    & .helper {
      display: none;
      font-style: italic;
      font-size: 0.9em;
      opacity: 0.75;
      color: orange;
    }
  }

  & .expand-icon {
    display: flex;
    align-items: center;

    gap: 0.5rem;
    cursor: pointer;
    // background: ${(props) => props.theme.fixedColors.silver};

    & p {
      font-size: 1.5rem;
      font-weight: 400;
      border-bottom: 1px solid ${(props) => props.theme.fixedColors.semiBlack};
    }

    &:hover {
      opacity: 0.75;
    }

    & span {
      font-size: 2.3rem;
      padding-top: 0.4rem;
    }

    & .rotate {
      transform: rotate(180deg);
    }

    & .rotate.padded {
      padding-top: 0;
      padding-bottom: 0.4rem;
    }

    & .rotatable-icon {
      transition: transform 0.4s ease;
    }
  }

  & .expand-div {
    margin-top: 0.5rem;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.5s ease-in-out;
  }

  & .expand-div.visible {
    max-height: 460px;
    overflow: unset;
  }
`;
