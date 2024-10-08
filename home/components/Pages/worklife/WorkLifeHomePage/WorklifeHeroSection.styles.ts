import media from "@/styles/media";
import {
  UpDownAnimation,
  FadeInAnimation,
  SlideInBlurredLeft,
} from "@/styles/snippets";
import styled from "@emotion/styled";

export const WorklifeHeroStyled = styled.div`
  position: relative;
  background: #000;

  & .wl_hero_bg {
    opacity: 1;
    object-fit: cover;
    width: 100%;
    max-height: 100vh;
    min-height: 50vh;

    ${media.largeMobile} {
      height: 100vh;
    }
  }

  & .wl_hero_section {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

  & .hero_header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2em;
    height: 6rem;
    background-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.75),
      transparent
    );
    ${media.tablet} {
      padding: 1rem;
    }

    ${media.largeMobile} {
      padding: 0 1rem;
      height: 4rem;
    }
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
  }

  & .logo_text {
    color: #ffffff;
    font-weight: 400;
    font-size: 1rem;
    font-family: "Montserrat", "sans-serif";
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
  }

  & .wl_hero_body {
    padding: 0 3em;
    ${media.largeMobile} {
      padding: 0rem 3em 0 1em;
    }
  }

  & .wl_hero_body_heading {
    font-weight: 700;
    line-height: 1;
    color: #ffffff;
    font-size: 5em;

    ${media.largeMobile} {
      font-size: 3em;
    }
  }

  & .wl_hero_body_text {
    color: #d3d3d3;
    max-width: 50%;
    font-size: 0.9em;
    font-weight: 400;
    line-height: 1.5;
    margin-top: 1em;
    font-family: monospace;

    ${media.largeMobile} {
      font-size: 1.1em;
      max-width: 100%;
    }
  }

  & .icon_scroll {
    transform: translateY(20px);
  }

  & .wl_hero_bottom_div {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    width: 100%;
    padding: 2em 0;
    background-image: linear-gradient(to top, black, transparent);
  }

  & .wl_hero_bottom_text {
    background-color: ${(props) => props.theme.colors.white};
    border: 4px solid ${(props) => props.theme.colors.Green};
    color: rgba(255, 255, 255, 1);
    font-size: 0.65em;
    font-family: "Didact Gothic", sans-serif;
    border-radius: 0 3rem 0 3rem;
    padding: 0.6em 2em;
    white-space: nowrap;

    ${media.largeMobile} {
      font-size: 0.8em;
    }
  }

  ${SlideInBlurredLeft(1, "slide_in_herosection")}
  ${FadeInAnimation(1, "fade_in_herosection")}
  ${UpDownAnimation(-10, 1.5, "up_down_herosection")}
`;
