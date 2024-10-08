import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const FooterSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;

  color: ${(props) => props.theme.fixedColors.whiteSmoke};

  & .logobar {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 3rem 1.2rem;

    &::after {
      content: "";
      position: absolute;
      height: 1px;
      left: 0;
      right: 0;
      bottom: 0;
      width: 97%;
      margin: 0 auto;
      background-color: ${(props) => props.theme.fixedColors.charcoalGrey};
    }

    & .brand_logo {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
  }

  & .app_title {
    font-size: 1.35rem;
    font-weight: 300;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.25rem;
    text-align: center;
    // opacity: 0.7;

    ${media.largeMobile} {
      font-size: 1rem;
      letter-spacing: 0rem;
      text-align: left;
    }
  }

  & .subtitle {
    text-align: center;
    font-size: 1.35rem;

    ${media.largeMobile} {
      font-size: 1rem;
      letter-spacing: 0rem;
      text-align: right;
    }
  }

  & .footer_links {
    display: flex;
    justify-content: space-between;
    padding: 3rem 1.2rem;

    ${media.tablet} {
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    & .product_links {
      display: flex;
      justify-content: space-between;
      gap: 2rem;
      width: 50%;

      ${media.tablet} {
        width: 100%;
      }

      ${media.largeMobile} {
        flex-wrap: wrap;
      }

      & .product_link {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        & .title {
          font-size: 1rem;
          font-weight: 500;
        }

        & ul {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        & .link {
          font-size: 1rem;
          font-weight: 300;
          cursor: pointer;
          opacity: 0.7;

          &:hover {
            opacity: 1;
          }
        }
      }
    }

    & .social_links {
      display: flex;
      gap: 1rem;
      height: fit-content;
      align-items: center;

      ${media.tablet} {
        width: 100%;
        justify-content: space-between;
      }

      ${media.largeMobile} {
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      & .sign_up {
        font-size: 1rem;
        font-weight: 400;
        height: fit-content;
        padding: 0.3rem 1rem;
        cursor: pointer;
        background-color: transparent;
        color: ${(props) => props.theme.fixedColors.whiteSmoke};
        border: 1px solid ${(props) => props.theme.fixedColors.silver};
        transition: all 0.3s ease-in-out;

        &:hover {
          background-color: ${(props) => props.theme.fixedColors.silver};
          color: ${(props) => props.theme.fixedColors.black};
        }
      }

      & .social_icons {
        display: flex;
        align-items: center;
        gap: 1rem;

        & .icon {
          filter: ${(props) => props.theme.fixedColors.white_f};
          cursor: pointer;
          opacity: 0.5;

          &:hover {
            opacity: 1;
          }
        }
      }
    }
  }
`;
