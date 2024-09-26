import media from "@/styles/media";
import { FonTextGradient, FontBgGradient } from "@/styles/snippets";
import styled from "@emotion/styled";

export const ExpertiseSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};

  & .skeleton_frame {
    position: relative;
    width: 100%;
    height: 60vh;
    overflow: hidden;

    ${media.laptop} {
      height: 80vh;
    }

    ${media.tablet} {
      height: 600px;
    }
  }

  & .exp_skeleton {
    position: absolute;
    background: ${(props) => props.theme.fixedGradients.smokeWhiteBgGradient270};
    z-index: 1;
  }

  & .skeleton_reg {
    position: absolute;
    z-index: 2;
    left: 1rem;
    right: 1rem;
    top: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: stretch;
    overflow: hidden;

    ${media.largeMobile} {
      left: 0.5rem;
      right: 0.5rem;
      top: 0.5rem;
      bottom: 0.5rem;
    }
  }

  & .exp_container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2rem 4rem;
    background: ${(props) => props.theme.fixedGradients.smokeWhiteBgGradient90};

    ${media.laptop} {
      padding: 2rem 2rem;
    }

    ${media.tablet} {
      padding: 1rem 1rem;
    }
  }

  & .title {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: 800;
    margin-top: 2rem;
    margin-bottom: 3rem;
    cursor: pointer;
    text-align: center;

    ${media.laptop} {
      font-size: 2.5rem;
      margin-top: 0.5rem;
      margin-bottom: 1.5rem;
    }

    ${media.tablet} {
      font-size: 2rem;
      margin-top: 2rem;
      margin-bottom: 1.5rem;
    }

    ${media.largeMobile} {
      font-size: 1.5rem;
      margin-top: 2rem;
      margin-bottom: 1.5rem;
      margin-left: 1rem;
      margin-right: 1rem;
      text-align: left;
    }
  }

  & .exp_box {
    width: 100%;
    //border-left: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
    //border-right: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
    //border-top: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
  }

  & .exp_table {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: stretch;
    gap: 1rem;
    padding: 4rem 3rem;
  }

  & .exp_flexbox {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 0 5rem;
    margin-bottom: 4rem;

    ${media.laptop} {
      margin: 0 0;
    }

    ${media.largeMobile} {
      align-items: flex-start;
      justify-content: flex-start;
      gap: 0.75rem;
    }
  }

  & .exp_highlight {
    background-color: ${(props) => props.theme.fixedColors.perfectWhite};
    display: flex;
    align-items: center;
    border-radius: 0.5rem;
    cursor: pointer;
    padding-left: 1rem;

    & .exp_icon {
      padding: 0.5rem;
      ${media.largeMobile} {
        font-size: 0.5rem;
      }
    }

    & .exp_buttontag {
      font-size: 0.85rem;
      padding: 0 1rem 0 0rem;

      ${media.largeMobile} {
        font-size: 0.75rem;
      }
    }
  }

  & .exp_point {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  & .exp_icon {
    cursor: pointer;

    &:hover {
      //opacity: 0.5;
    }
  }

  & .exp_subtag {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
  }

  & .subtitle {
    font-size: 1rem;
    text-decoration: underline;
    letter-spacing: 0.1rem;
    text-align: center;
    font-weight: 800;
    align-self: center;
    margin-bottom: 2rem;
  }
`;
