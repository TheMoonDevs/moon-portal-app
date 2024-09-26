import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const HomePageStyled = styled.div``;

export const HeroSectionStyled = styled.div<{ hovered?: string }>`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};

  &:has(.bottom_bar):has(.button:hover) {
    .tagline > .text_box::after {
      width: 100%;
    }
  }

  & .tagline {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    font-size: 5rem;
    font-weight: 300;
    margin-bottom: 2rem;
    cursor: pointer;
    gap: 1.5rem;

    ${media.largeLaptop} {
      font-size: 4rem;
      flex-wrap: wrap;
      line-height: 1.1;
      gap: 0 0.3em;
    }

    ${media.largeMobile} {
      font-size: 3rem;
    }
  }

  & .text_box {
    position: relative;
    &::after {
      content: '';
      display: block;
      width: 0;
      height: 3px;
      background: ${(props) => props.theme.fixedColors.black};
      transition: width .3s;
    }
  }

  & .attached_skeleton {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    //background-color: rgba(255,255,255,0.5);
  }

  & .highlight {
    
    //font-style: italic;
    //font-weight: 800;
  }

  & .description {
    max-width: 55%;
    text-align: center;
    font-size: 1.35rem;
    font-weight: 300;
    opacity: 0.65;

    ${media.tablet} {
      max-width: 90%;
      font-size: 1.15rem;
    }

    ${media.largeMobile} {
      font-size: 1rem;
    }
  }

  & .bottom_bar {
    position: absolute;
    bottom: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
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
    margin-top: 0.5em;
    opacity: 0.5;

    ${media.largeMobile} {
      font-size: 0.75rem;
    }
  }

  & .border_box {
    position: relative;
    height: 3rem;
    padding: 1rem 2rem;
    overflow: visible;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      & .border_v,
      & .border_h {
        //margin-left: -10vw;
        //opacity: 0.5;
        //background-color: ${(props) => props.theme.fixedColors.black};
      }
    }

    & .border_h {
      position: absolute;
      width: 1px;
      height: 8rem;
      margin-top: -2.5rem;
      top: 0;
      background-color: ${(props) => props.theme.fixedColors.black};
      transition: 0.3s ease-in-out;
      opacity: 0.1;
    }

    & .border_v {
      position: absolute;
      width: 300%;
      margin-left: -105%;
      height: 1px;
      left: 0;
      background-color: ${(props) => props.theme.fixedColors.black};
      transition: 0.1s ease-in-out;
      opacity: 0.1;
    }

    & .left {
      left: 1rem;
    }

    & .right {
      right: 1rem;
    }

    & .top {
      top: -2rem;
    }

    & .bottom {
      bottom: -2.5rem;
    }
  }
`;
