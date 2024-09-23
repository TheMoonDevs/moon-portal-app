import { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferPageStyled = styled.div`
  & .action_wrapper {
    width: 100%;
  }
  & .action_container {
    /* width: 80%; */
    /* margin: 0 auto; */
    position: fixed;
    padding: 1rem;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 1000;
    //backdrop-filter: blur(5px);

    > * {
      flex: 1;
    }
  }

  & .icon_container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto;

    &.right {
      justify-content: flex-end;
    }
  }

  & .act_button {
    display: flex;
    ${reverseMedia.laptop} {
      flex-grow: unset;
    }

    align-items: center;
    font-size: 0.8rem;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-weight: 700;
    font-family: monospace;
    color: ${(props) => props.theme.fixedColors.tealGreen};
    //background: ${(props) => props.theme.fixedColors.white};
    ${reverseMedia.laptop} {
      font-size: 1.2rem;
    }

    ${reverseMedia.tablet} {
      font-size: 1rem;
    }

    &.hidden {
      span {
        display: none;
      }
    }

    &.left {
      text-align: left;
      margin: 0 auto;
    }

    &.right {
      text-align: right;
      margin: 0 auto;
    }
  }

  & .action_icon {
    padding: 10px;
    font-size: 1rem;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    width: 3rem;
    height: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;

    &.light {
      background: ${(props) => props.theme.fixedColors.white};
      color: ${(props) => props.theme.fixedColors.charcoal};
    }

    &.tealGreen {
      background: ${(props) => props.theme.fixedColors.black};
      border: 3px solid ${(props) => props.theme.fixedColors.tealGreen};
      color: ${(props) => props.theme.fixedColors.tealGreen};
    }

    &.dark {
      background: ${(props) => props.theme.fixedColors.black};
      color: ${(props) => props.theme.fixedColors.white};
    }

    &.video {
      width: 4rem;
      height: 4rem;
      background: radial-gradient(
        100% 100% at 0% 0%,
        rgba(255, 255, 255, 0.3) 0%,
        rgba(255, 255, 255, 0.1) 100%
      );
      color: ${(props) => props.theme.fixedColors.white};

      span {
        font-size: 2rem;
      }
    }
  }

  & .refer_button {
    margin: 0 auto;
    margin-top: 2em;
    width: 80%;
    border-radius: 0em;
    letter-spacing: 0.25em;

    padding: 0.8em 0.5em;
    box-shadow: unset;
    background-color: ${(props) => props.theme.fixedColors.bgGrey};
    color: ${(props) => props.theme.fixedColors.white};

    ${reverseMedia.tablet} {
      width: 100%;
    }
    &:hover {
      background: ${(props) => props.theme.fixedColors.tealGreen};
      color: ${(props) => props.theme.fixedColors.black};
    }
  }
`;
