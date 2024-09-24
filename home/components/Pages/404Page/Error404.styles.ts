import styled from "@emotion/styled";
import media from "@/styles/media";

export const Error404Styled = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  position: relative;
  /* background: rgba(0, 0, 0, 0.5); */
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.lightSilver};

  .blur_blob {
    --inset: 100px;
    --blur: 8px;

    position: absolute;
    inset: 0;
    border-radius: var(--radius);
    -webkit-backdrop-filter: blur(var(--blur));
    backdrop-filter: blur(var(--blur));

    -webkit-mask-image: radial-gradient(
        ellipse at top right,
        transparent 60%,
        black 70%,
        black 100%
      ),
      radial-gradient(
        ellipse at bottom left,
        transparent 60%,
        black 70%,
        black 100%
      );

    -webkit-mask-size: 130% 130%;

    -webkit-mask-position:
      100% 0,
      0 100%;

    -webkit-mask-repeat: no-repeat;
    animation: moveBlur 3s infinite ease-in-out;
  }

  & .background_404 {
    position: absolute;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 60rem;
    font-weight: 900;
    color: #2a2a2a;
    background: black;
    z-index: -1;
    transform: scale(0);
    animation:
      /* blurAnimation 3s infinite, */ scaleAnimation 2s forwards;

    > span {
      margin-top: -120px;
    }

    ${media.tablet} {
      font-size: 40rem;
    }

    ${media.largeMobile} {
      font-size: 20rem;
    }
  }

  & .top_heading,
  .bottom_heading,
  .center_heading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
  }

  & .top_heading {
    padding-top: 2rem;
    font-weight: 900;
    animation: fadeInDropTop 2s forwards;
    animation-delay: 2s;
    opacity: 0;
    color: ${(props) => props.theme.fixedColors.darkGrey};
  }

  & .bottom_heading {
    font-size: 0.8rem;
    padding-bottom: 2rem;
    font-weight: 600;
    animation: fadeInDropBottom 2s forwards;
    animation-delay: 2s;
    opacity: 0;
    color: ${(props) => props.theme.fixedColors.darkGrey};
  }

  & .center_heading {
    animation: fadeIn 2s forwards;
    animation-delay: 1.5s;
    opacity: 0;

    & .title {
      font-size: 1.5rem;
      font-weight: 900;
      /* margin-bottom: 1.5rem; */

      ${media.tablet} {
        font-size: 1.5rem;
      }
    }

    & .subtitle {
      text-transform: uppercase;
      font-weight: 500;
    }

    & .go_back {
      background-color: transparent;
      font-style: italic;
      /* border: 1px solid white; */
      color: white;
      font-size: 1rem;
      padding: 0.5rem 1rem;
      /* border-radius: 0.5rem; */
      cursor: pointer;
      /* transition: max-width 1s ease-in-out; */
      display: flex;
      align-items: center;
      gap: 0.5rem;

      > span {
        font-size: 1rem;
      }

      &:hover {
        & .go_back_text:after {
          max-width: 100%;
        }
      }
      & .go_back_text {
        position: relative;
        &:after {
          transition: max-width 0.2s ease-in;
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          max-width: 0;
          background-color: white;
        }
      }

      ${media.tablet} {
        font-size: 1rem;
        padding: 0.25rem 0.5rem;
      }
    }
  }

  @keyframes moveBlur {
    0%,
    100% {
      -webkit-mask-position:
        100% 0,
        0 100%;
    }
    50% {
      -webkit-mask-position:
        0 100%,
        100% 0;
    }
  }

  @keyframes scaleAnimation {
    0% {
      transform: scale(10);
    }
    100% {
      transform: scale(1.06);
    }
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes fadeInDropTop {
    0% {
      opacity: 0;
      transform: translateY(-50px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInDropBottom {
    0% {
      opacity: 0;
      transform: translateY(50px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
