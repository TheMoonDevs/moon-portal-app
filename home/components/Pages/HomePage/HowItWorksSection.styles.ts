import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const HowItWorksSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};
  padding: 4rem;
  display: flex;
  flex-direction: column;

  ${media.laptop} {
    padding: 2rem;
    display: block;
  }

  ${media.tablet} {
    padding: 1rem;
  }

  & .section_title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 3rem;
    text-transform: uppercase;
    letter-spacing: 1rem;
    text-align: center;

    ${media.tablet} {
      font-size: 1rem;
      margin-bottom: 2rem;
      margin-top: 2rem;
    }

    ${media.largeMobile} {
      font-size: 1.5rem;
    }
  }

  & .work_points {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 2rem;
  }

  & .work_point {
    display: flex;
    max-width: 75%;
    background: ${(props) => props.theme.fixedColors.white};
    color: ${(props) => props.theme.fixedColors.black};
    border-radius: 1rem;
    position: relative;
    overflow: hidden;

    ${media.laptop} {
      max-width: 100%;
    }

    ${media.tablet} {
      gap: 3em;
    }

    ${media.largeMobile} {
      flex-direction: column;
    }

    &:nth-of-type(2) {
      align-self: center;
    }

    &:nth-of-type(3) {
      align-self: flex-end;
    }
  }

  & .work_image {
    border-radius: 50%;
    min-width: 10rem;
    max-width: 10rem;
    height: 10rem;
    object-fit: cover;
    object-position: center;
    //position: absolute;
    transform: scale(1.75) translateX(-10%);

    &.bottom {
      object-position: bottom;
    }
  }

  & .work_info {
    padding: 2rem 3rem;

    ${media.tablet} {
      padding: 1.5rem;
    }

    & .work_title {
      font-size: 2rem;
      font-weight: 300;
    }

    & .work_subtitle {
      font-size: 1rem;
      font-weight: 300;
      opacity: 0.6;
    }
  }

  & .bottom_bar {
    bottom: 2rem;
    display: flex;
    flex-direction: row-reverse;
    gap: 1.5rem;
    justify-content: end;
    align-items: center;
    margin-top: 3rem;

    ${media.laptop} {
      justify-content: center;
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  & .button {
    cursor: pointer;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-size: 1.25rem;
    font-weight: 300;
    background-color: ${(props) => props.theme.fixedColors.black};
    color: ${(props) => props.theme.fixedColors.white};
    transform: scale(1);
    transition: 0.1s ease-in-out;
    display: flex;
    align-items: center;
    overflow: hidden;

    ${media.largeMobile} {
      font-size: 1rem;
    }

    &:hover {
      transform: scale(1.02);
      // background-color: ${(props) => props.theme.fixedColors.silver};
      // color: ${(props) => props.theme.fixedColors.black};
    }

    & .button_icon {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      transform: translateX(-1.5em) scale(2);
      background-color: rgba(255, 255, 255, 0.25);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;

      > span {
        font-size: 0.65em;
        transform: translateX(0.25em);
      }
    }

    & .button_text {
      transform: translateX(0em);
    }
  }

  & .subtag {
    margin-top: 0;
    opacity: 0.5;

    ${media.largeMobile} {
      font-size: 0.75rem;
    }
  }
`;
