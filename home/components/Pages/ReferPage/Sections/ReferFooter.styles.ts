import media, { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferFooterStyles = styled.div`
  height: 70vh;
  background: ${(props) => props.theme.fixedColors.black};
  padding: 2em 2em;
  position: relative;

  ${reverseMedia.largeMobile} {
    height: unset;
  }

  ${reverseMedia.tablet} {
    padding: 2em 4em;
  }

  & .footer_logo {
    width: 2rem;
    height: 2rem;
  }

  & .footer_content {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0;
    padding: 4rem 0;

    ${reverseMedia.largeMobile} {
      width: 90%;
      margin: 0 auto;
      padding: 3rem 0;
      padding-bottom: 0;
    }
  }

  & .footer_text {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 5rem;
    color: ${(props) => props.theme.fixedColors.white};

    ${reverseMedia.largeMobile} {
      flex-direction: row;
      gap: 5em;
    }
  }

  & .footer_heading_container {
    padding-bottom: 4rem;
    & .outlined_first,
    .outlined_second {
      color: ${(props) => props.theme.fixedColors.tealGreen};
      opacity: 0.1;
      z-index: 1;
      position: absolute;
      /* color: ${(props) => props.theme.fixedColors.tealGreen}; */
    }

    & .outlined_first {
      display: none;
      top: -1.5rem;
      font-size: 3rem;
      font-weight: 900;

      ${reverseMedia.largeLaptop} {
        display: block;
        top: -3rem;
        font-size: 8rem;
        font-weight: 900;
      }
      ${reverseMedia.largeMobile} {
        display: block;
        top: -3rem;
        font-size: 5rem;
        font-weight: 900;
      }
    }

    & .outlined_second {
      display: none;
      top: 5rem;
      font-size: 2.5rem;
      font-weight: 900;

      ${reverseMedia.largeLaptop} {
        display: block;
        top: unset !important;
        bottom: -3rem;
        font-size: 8rem;
        font-weight: 900;
      }
      ${reverseMedia.largeMobile} {
        display: block;
        top: 10rem;
        font-size: 5rem;
        font-weight: 900;
      }
    }
  }

  & .footer_heading {
    z-index: 2;
  }

  & .footer_heading,
  .outlined_first,
  .outlined_second {
    position: relative;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5em;
    max-width: 10ch;
    margin: 0.3em 0;
    line-height: 2;

    ${reverseMedia.tablet} {
      font-size: 3rem;
      line-height: 1.5;
      letter-spacing: 0.1em;
      max-width: unset;
    }
  }

  & .footer_description {
    opacity: 0.5;
  }

  & .footer_cta_container {
    align-self: start;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    position: absolute;
    right: 0;
    top: 0;

    ${reverseMedia.tablet} {
      position: relative;
    }
  }

  & .footer_cta_wrapper {
    border: 2px solid ${(props) => props.theme.fixedColors.tealGreen};
    padding: 0.5rem;
    border-radius: 100%;
    position: relative;
    > img {
      animation: spin 15s linear infinite;
      min-width: 4rem;
      min-height: 4rem;
      max-width: 4rem;
      max-height: 4rem;

      ${reverseMedia.tablet} {
        min-width: 8rem;
        min-height: 8rem;
        max-width: 8rem;
        max-height: 8rem;
      }
    }

    > span {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: ${(props) => props.theme.fixedColors.tealGreen};
      font-weight: 900;
      font-size: 2rem;

      ${reverseMedia.tablet} {
        font-size: 3rem;
      }
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  & .footer_cta {
    width: 3rem;
    height: 3rem;
    display: flex;
    text-align: center;
    font-size: 1.5rem;
    /* padding: 2rem; */
    font-weight: 700;
    justify-content: center;
    align-items: center;
    color: ${(props) => props.theme.fixedColors.black};
    border-radius: 100%;
    background: ${(props) => props.theme.fixedColors.tealGreen};
  }

  & .refer_button {
    font-size: 0.7rem;
    ${reverseMedia.largeMobile} {
      width: 50%;
    }
  }
`;
