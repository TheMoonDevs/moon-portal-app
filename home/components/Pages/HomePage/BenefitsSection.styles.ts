import media from "@/styles/media";
import styled from "@emotion/styled";

export const BenefitsSectionStyled = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 4rem;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.silver};

  ${media.laptop} {
    height: 100vh;
    padding: 2rem;
  }

  ${media.tablet} {
    height: auto;
    padding: 1rem;
    padding-bottom: 4rem;
  }

  ${media.largeMobile} {
    padding-bottom: 3rem;
  }

  & .title {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 2rem;
    cursor: pointer;
    gap: 1.5rem;

    ${media.tablet} {
      font-size: 2rem;
      margin-top: 2rem;
      margin-bottom: 0rem;
    }
  }

  & .benefits_flexbox {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 5rem;
    margin-top: 2rem;
    flex: 1;

    ${media.tablet} {
      flex-wrap: wrap;
      gap: 2em;
    }
  }

  & .benefit_col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 1rem;
    flex-basis: 27%;
    margin-top: 3rem;
    position: relative;

    ${media.laptop} {
      flex-basis: 90%;
    }
  }

  & .benefit_icon {
    > span {
      font-size: 8rem;
    }

    &.reflection {
      position: absolute;
      top: 4.5rem;
      filter: blur(18px);
      opacity: 1;
      transform: rotate(0deg) scale(1.5, -0.45);
    }
  }

  & .benefit_description {
    margin-top: 1rem;
    font-size: 1.5rem;

    ${media.laptop} {
      font-size: 1rem;
    }

    ${media.tablet} {
      font-size: 1.75rem;
    }
  }

  & .benefit_subtag {
    color: ${(props) => props.theme.fixedColors.midGrey};

    > span {
      position: relative ;
      padding-bottom: 4px;
      
      ${media.largeMobile}{ 
        display: inline-block;
      }
    }

    > span::after {
      content: '';
      position: absolute;
      margin-top: 4px;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, transparent 50%, ${(props) => props.theme.fixedColors.midGrey} 100%);
      background-size: 200% 100%;
      transform-origin: bottom left;
      animation: 3s borderAnim infinite;
    }

    & .subtag_first::after {
      animation-delay: 0s;
    }

    & .subtag_second::after {
      animation-delay: 1s;
    }

    & .subtag_third::after {
      animation-delay: 2s;
    }


    ${media.laptop} {
      font-size: 0.75rem;
    }

    ${media.largeMobile} {
      font-size: 1rem;
    }
  }

  @keyframes borderAnim {
  0% {
    background-position: 0% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
`;
