import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const CompareSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};

  & .compare_table {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.fixedColors.lightSilver};

    ${media.largeMobile} {
      flex-direction: column;
    }
  }

  & .compare_col {
    border-right: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
    flex: 1;
  }

  & .compare_row {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
    padding: 2rem 3rem;
    gap: 1rem;
    padding-top: 8rem;
    position: relative;

    ${media.laptop} {
      padding: 2rem;
    }

    ${media.tablet} {
      padding: 0rem 1rem;
      padding-top: 3rem;
      justify-content: space-between;
    }

    ${media.largeMobile} {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      padding: 2rem 1rem;
    }

    &.muted {
      background-color: ${(props) => props.theme.fixedColors.perfectWhite};
      padding: 1.5rem 3rem;
      align-items: center;

      ${media.tablet} {
        flex-wrap: nowrap;
        flex-direction: row;
        padding: 0.75rem 1.5rem;
      }

      ${media.largeMobile} {
        flex-wrap: nowrap;
        flex-direction: row;
        padding: 0.5rem 0.75rem;
      }
    }
  }

  & .row_title {
    font-size: 2rem;
    font-weight: 800;
    cursor: pointer;

    ${media.tablet} {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      margin-left: 0.5rem;
    }

    ${media.largeMobile} {
      font-size: 2rem;
      margin-bottom: 1rem;
      margin-left: 0;
    }
  }

  & .row_image {
    position: absolute;
    bottom: 2em;
    right: 2.5em;
    height: 40%;
    width: auto;
    object-fit: cover;
    object-position: right;

    ${media.tablet} {
      bottom: 0em;
      right: 1em;
      width: 8em;
      height: auto;
    }

    ${media.largeMobile} {
      position: initial;
      width: 10em;
      height: auto;
    }

    &.simple {
      ${media.largeMobile} {
        margin-top: -10%;
      }
    }
  }

  & .row_icon {
    > span {
      font-size: 1.5rem;
      opacity: 0.5;
    }
  }

  & .row_point {
    font-size: 1.15rem;
    font-weight: 100;
    opacity: 0.75;
    min-height: 4rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    max-width: 80%;

    ${media.tablet} {
      font-size: 0.9rem;
      max-width: 90%;
    }

    ${media.largeMobile} {
      font-size: 0.85rem;
      max-width: 90%;
    }
  }
`;
