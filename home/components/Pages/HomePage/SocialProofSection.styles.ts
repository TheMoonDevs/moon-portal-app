import media from "@/styles/media";
import styled from "@emotion/styled";

export const SocialProofSectionStyled = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.silver};

  ${media.tablet} {
    flex-direction: column;
    height: 100vh;
  }

  & .bg_banner {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: left;
    opacity: 0.02;
  }

  & .info_box {
    flex: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 4rem;
    position: relative;

    ${media.laptop} {
      padding: 2rem 1rem;
    }

    ${media.tablet} {
      padding: 1rem;
    }

    ${media.largeMobile} {
      flex: 1.5;
      padding-bottom: 0rem;
    }
  }

  & .title {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 2rem;
    cursor: pointer;
    gap: 1.5rem;
    max-width: 90%;

    ${media.laptop} {
      font-size: 2.5rem;
      max-width: 100%;
    }

    ${media.tablet} {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    ${media.largeMobile} {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
  }

  & .description {
    font-size: 1.5rem;
    font-weight: 300;
    opacity: 0.75;
    max-width: 70%;
    margin-top: 1rem;

    ${media.laptop} {
      max-width: 100%;
      font-size: 1rem;
    }

    ${media.tablet} {
      font-size: 1.05rem;
      margin-top: 0rem;
    }

    ${media.largeMobile} {
      margin-top: 0rem;
      font-size: 1rem;
    }

    & .underlined {
      font-weight: 300;
      opacity: 0.85;
    }
  }

  & .testimonials {
    flex: 1;
    overflow: hidden;
  }

  & .testimonials_inner_container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    animation: txroll 10s linear infinite alternate;

    ${media.tablet} {
      flex-direction: row;
      align-items: stretch;
      animation: txrollX 10s linear infinite alternate;
      position: relative;
      height: 100%;
    }
  }

  @keyframes txroll {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-50vh);
    }
  }

  @keyframes txrollX {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100vw);
    }
  }

  & .testimonial_box {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    border-bottom: 2px solid ${(props) => props.theme.fixedColors.darkGrey};
    border-left: 1px solid ${(props) => props.theme.fixedColors.darkGrey};
    height: 100%;

    ${media.laptop} {
      padding: 1rem;
    }

    ${media.tablet} {
      min-width: 50vw;
      border-bottom: none;
    }

    ${media.largeMobile} {
      min-width: 100vw;
      border-bottom: none;
    }
  }

  & .testimonial_info {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    align-items: center;
    font-size: 0.75rem;
    opacity: 0.75;
    gap: 1rem;
  }

  & .testimonial_industry {
    border-left: 1px solid ${(props) => props.theme.fixedColors.white};
    padding-left: 1rem;
  }

  & .testimonial_title {
    font-size: 1.5rem;
    font-weight: 300;
    margin: 1rem 0;
  }

  & .testimonial_comment {
    font-size: 0.95rem;
    font-weight: 300;
    opacity: 0.75;
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
  }

  & .benefit_subtag {
    color: ${(props) => props.theme.fixedColors.midGrey};
  }
`;
