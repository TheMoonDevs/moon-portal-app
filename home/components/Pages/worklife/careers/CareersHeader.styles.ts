import media from "@/styles/media";
import styled from "@emotion/styled";

export const CareerHeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2em;
  height: 6rem;
  background-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.85),
    transparent
  );
  position: fixed;
  left: 0;
  right: 0;
  z-index: 10;

  ${media.tablet} {
    padding: 1rem;
  }

  ${media.largeMobile} {
    padding: 0 1rem;
    height: 4rem;
  }

  & .header_logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5em;
  }

  & .logo_image {
    filter: invert(100%);
    width: 2rem;
    aspect-ratio: 1 / 1;
    ${media.tablet} {
      width: 1rem;
    }
    ${media.largeMobile} {
      width: 1.5rem;
    }
  }

  & .logo_text {
    color: #ffffff;
    font-weight: 400;
    font-size: 1rem;
    font-family: "Montserrat", "sans-serif";
    ${media.largeMobile} {
      display: none;
    }
  }

  & .home_btn {
    color: #fff;
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    opacity: 1;
    font-size: 0.8rem;
    display: flex;
    align-items: center;

    &:hover,
    &:focus {
      opacity: 0.5;
    }

    ${media.tablet} {
      font-size: 0.7rem;
    }

    ${media.largeMobile} {
      padding: 0.5rem 0.8rem;
      font-size: 0.5rem;
    }
  }

  & .page_header {
    ${media.largeMobile} {
      /* display: none; */
    }
  }

  & .page_text {
    font-size: 1.75rem;
    letter-spacing: 1em;
    font-family: "Montserrat", "sans-serif";
    font-weight: 300;
    animation: spacing 3s ease-in-out infinite alternate;

    ${media.tablet} {
      font-size: 1.25rem;
    }

    ${media.largeMobile} {
      font-size: 1rem;
    }
  }

  @keyframes spacing {
    0% {
      letter-spacing: 1em;
    }
    100% {
      letter-spacing: 1.2em;
    }
  }

  ${media.largeMobile} {
    @keyframes spacing {
      0% {
        letter-spacing: 0.3rem;
      }
      100% {
        letter-spacing: 0.6rem;
      }
    }
  }
`;
