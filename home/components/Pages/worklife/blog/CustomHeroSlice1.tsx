import media from "@/styles/media";
import styled from "@emotion/styled";
import React from "react";
import { isFilled } from "@prismicio/client";
import { PrismicNextLink, PrismicNextImage } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import { BlogPageDocument, HeroSliceCustomHero1 } from "@/prismicio-types";
import { prettyPrintDateInMMMDD } from "@/helpers/prettyprint";

export const CustomHeroSlice1 = ({
  slice,
  publishedAt,
}: {
  slice: HeroSliceCustomHero1;
  publishedAt?: string;
}): JSX.Element => {
  return (
    <CustomHeroStyled>
      <div className="header_blank"></div>
      <div className="hero_container">
        {slice.primary.author_cta_link && (
          <div className="author_section">
            <PrismicNextLink
              className="author_image_wrapper"
              field={slice.primary.author_cta_link}
            >
              {isFilled.image(slice.primary.author_avatar) && (
                <PrismicNextImage
                  field={slice.primary.author_avatar}
                  className="author_image"
                />
              )}
            </PrismicNextLink>

            <div className="author_content">
              <h4 className="author_name">
                <PrismicNextLink field={slice.primary.author_cta_link}>
                  <PrismicRichText field={slice.primary.author_name} />
                </PrismicNextLink>
              </h4>
              <p className="date">
                Last updated on{" "}
                {prettyPrintDateInMMMDD(new Date(publishedAt as string))}
              </p>
            </div>
          </div>
        )}

        <div className="hero_header">
          <div className="hero_title">
            <PrismicRichText field={slice.primary.title} />
          </div>
          <div className="hero_subtitle">
            <PrismicRichText field={slice.primary.subtitle} />
          </div>
        </div>

        {isFilled.image(slice.primary.image) && (
          <PrismicNextImage
            field={slice.primary.image}
            className="hero_image"
          />
        )}
      </div>
    </CustomHeroStyled>
  );
};

const CustomHeroStyled = styled.div`
  color: #000;
  background-color: #fff;
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

  & .header_blank {
    height: 3.5em;
    background: #000;

    ${media.laptop} {
      height: 5em;
    }

    ${media.tablet} {
      height: 4em;
    }

    ${media.largeMobile} {
      height: 4.5em;
    }
  }

  & .hero_container {
    width: calc(100% - 2em);
    margin: auto;
    max-width: 50em;
  }

  & .hero_header {
    padding: 0 0em;
    ${media.laptop} {
      padding: 0 1em;
    }
  }

  & .hero_title {
    margin-bottom: 0.5em;
  }

  & .hero_subtitle {
    color: #00000080;
    margin: 1em 0;
  }

  & .author_section {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0.5em;
    margin: 1em 0 0 0;
  }

  & .author_image_wrapper {
    height: 2.2em;
    aspect-ratio: 1;
    border-radius: 100%;
    overflow: hidden;
  }

  & .author_image {
    aspect-ratio: 1;
    object-fit: cover;
    object-position: center center;
  }

  & .author_content {
    gap: 0em;
  }

  & .author_name {
    font-size: 0.8em;
    font-weight: 600;
    color: #000;
    margin: 0;
    padding: 0;
  }

  & .date {
    color: #00000080;
    font-size: 0.6em;
    text-align: left;
    margin: 0;
    padding: 0;
  }

  & .hero_image {
    display: block;
    width: 100%;
    border-radius: 0.5em;
    object-fit: cover;
    object-position: center;
  }
`;
