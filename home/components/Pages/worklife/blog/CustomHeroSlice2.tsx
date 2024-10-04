import media from "@/styles/media";
import styled from "@emotion/styled";
import React from "react";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import { HeroSliceCustomHero2 } from "@/prismicio-types";

const CustomHero2Styled = styled.div`
  font-size: 1.5rem;
  font-family: system-ui, sans-serif;
  ${media.laptop} {
    font-size: 1.25rem;
  }
  ${media.tablet} {
    font-size: 1rem;
  }
  ${media.largeMobile} {
    font-size: 0.8rem;
  }

  h1 {
    font-size: 2.2em;
  }

  h2 {
    font-size: 2em;
  }

  h3 {
    font-size: 1.7em;
  }

  h4 {
    font-size: 1.5em;
  }

  h5 {
    font-size: 1.3em;
  }

  h6 {
    font-size: 1.1em;
  }

  p {
    font-size: 0.8em;
  }

  & .hero_container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1em;
    padding: 1em;
    color: #fff;
    text-align: center;
    height: 100vh;
    background: #000;
    ${media.tablet} {
      height: fit-content;
      min-height: 50vh;
    }
  }

  & .hero_title {
    // font-size: 3em;
    padding: 0.5em 1em;
    border: 8px solid #fff;
  }

  & .hero_subtitle {
    // font-size: 1.5em;
    padding: 0em 1em;

    
  }

  & .hero_image_container {
    position: absolute;
    inset: 0;
    height: fit-content;
    z-index: -1;
  }

  & .hero_bg_image {
    object-fit: cover;
    object-position: center;
    filter: brightness(0.5);
    height: 100vh;
    width: 100%;
    ${media.tablet} {
      height: fit-content;
      min-height: 50vh;
    }
  }
`;

export const CustomHeroSlice2 = ({
  slice,
}: {
  slice: HeroSliceCustomHero2;
}): JSX.Element => {
  return (
    <CustomHero2Styled>
      <div className="hero_container">
        <div className="hero_title">
          <PrismicRichText field={slice.primary.title} />
        </div>
        <div className="hero_subtitle">
          <PrismicRichText field={slice.primary.subtitle} />
        </div>
      </div>
      <div className="hero_image_container">
        {isFilled.image(slice.primary.image) && (
          <PrismicNextImage
            field={slice.primary.image}
            className="hero_bg_image"
          />
        )}
      </div>
    </CustomHero2Styled>
  );
};
