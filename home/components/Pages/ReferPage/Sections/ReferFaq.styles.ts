import media, { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferFaqSectionStyled = styled.div`
  width: 100%;
  position: relative;
  color: ${(props) => props.theme.fixedColors.black};
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  background: ${(props) => props.theme.fixedColors.white};
  margin: 0 auto;
  padding-bottom: 3rem;

  ${reverseMedia.largeMobile} {
    flex-direction: row;
    min-height: 100vh;
  }

  & .faq_container {
    width: 90%;
    position: relative;
    color: ${(props) => props.theme.fixedColors.black};
    display: flex;
    align-items: stretch;
    flex-direction: column;

    justify-content: space-between;
    background: ${(props) => props.theme.fixedColors.white};
    margin: 0 auto;
    ${reverseMedia.largeMobile} {
      flex-direction: row;
    }
  }

  & .faq_sidebar {
    border-right: none;
    ${reverseMedia.largeMobile} {
      border-right: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
    }

    flex-basis: 35%;
    ${reverseMedia.largeMobile} {
      flex-basis: unset;
    }
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1rem;
  }

  & .faq_title {
    position: sticky;
    top: 0;
    font-size: 2rem;
    font-weight: 800;
    margin: 1rem;
    ${reverseMedia.tablet} {
      font-size: 3rem;
      margin: 2rem 2rem;
    }
    cursor: pointer;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.25rem;
  }

  & .faq_box {
    height: fit-content;
    flex-grow: 1;
    padding: 1rem;

    ${reverseMedia.tablet} {
      padding: 2rem;
    }

    ${reverseMedia.laptop} {
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
        height: unset;

        ${reverseMedia.largeMobile} {
          max-height: 20em;
        }
      }
    }
  }

  & .faq_question {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    cursor: pointer;
    display: flex;
    gap: 1rem;
    align-items: center;

    ${reverseMedia.largeMobile} {
      font-size: 1.5rem;
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
    max-width: 80%;
    max-height: 0;
    transition: max-height 0.33s ease-in-out;

    ${reverseMedia.largeMobile} {
      font-size: 0.9rem;
      max-width: 100%;
    }

    ${reverseMedia.laptop} {
      max-width: 30vw;
    }

    & .helper {
      display: none;
      font-style: italic;
      font-size: 0.9em;
      opacity: 0.75;
      color: orange;
    }
    /* &::-webkit-scrollbar {
      width: 0px;
    }
    &:hover::-webkit-scrollbar {
      width: 2px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: #888;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-track {
      background-color: #f1f1f1;
    } */
  }

  & .expand-icon {
    display: flex;
    align-items: center;
    font-size: 0.85em;
    gap: 0.5rem;
    cursor: pointer;
    // background: ${(props) => props.theme.fixedColors.silver};

    & p {
      font-weight: 400;
      border-bottom: 1px solid ${(props) => props.theme.fixedColors.semiBlack};
    }

    &:hover {
      opacity: 0.75;
    }

    & span {
      font-size: 1.5rem;
      padding-top: 0.2rem;
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
