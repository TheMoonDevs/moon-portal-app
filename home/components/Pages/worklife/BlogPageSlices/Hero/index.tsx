'use client'
import { type Content, isFilled } from "@prismicio/client";
import { PrismicNextLink, PrismicNextImage } from "@prismicio/next";
import { SliceComponentProps, PrismicRichText } from "@prismicio/react";
import styled from "@emotion/styled";
import { CustomHeroSlice1 } from "@/components/Pages/worklife/blog/CustomHeroSlice1";
import { CustomHeroSlice2 } from "@/components/Pages/worklife/blog/CustomHeroSlice2";
import { BlogPageDocument, HeroSlice } from "@/prismicio-types";
// export type HeroProps = SliceComponentProps<Content.HeroSlice>;

const Hero = ({
  slice,
  context,
}: {
  slice: HeroSlice;
  context: BlogPageDocument;
}) => {
  if (slice.variation === "customHero1") {
    return (
      <CustomHeroSlice1
        publishedAt={context?.last_publication_date}
        slice={slice}
      />
    );
  } else if (slice.variation === "customHero2") {
    return <CustomHeroSlice2 slice={slice} />;
  } else
    return (
      <HeroStyled
        data-slice-type={slice.slice_type}
        data-slice-variation={slice.variation}
        className="es-bounded es-fullpage-hero"
      >
        <div
          className={`
            es-fullpage-hero__content
            ${
              slice.variation === "imageRight"
                ? "es-fullpage-hero__image--right"
                : "es-fullpage-hero__image--left"
            }
        `}
        >
          <div>
            {isFilled.image(slice.primary.image) && (
              <PrismicNextImage
                field={slice.primary.image}
                className="es-fullpage-hero__image"
              />
            )}
          </div>

          <div className="es-fullpage-hero__content-right">
            <div className="es-fullpage-hero__content__intro">
              {isFilled.keyText(slice.primary.eyebrowHeadline) && (
                <p className="es-fullpage-hero__content__intro__eyebrow">
                  {slice.primary.eyebrowHeadline}
                </p>
              )}
              {isFilled.richText(slice.primary.title) && (
                <div className="es-fullpage-hero__content__intro__headline">
                  <PrismicRichText field={slice.primary.title} />
                </div>
              )}
              {isFilled.richText(slice.primary.description) && (
                <div className="es-fullpage-hero__content__intro__description">
                  <PrismicRichText field={slice.primary.description} />
                </div>
              )}
              {isFilled.link(slice.primary.callToActionLink) && (
                <PrismicNextLink
                  className="es-call-to-action__link"
                  field={slice.primary.callToActionLink}
                >
                  {slice.primary.callToActionLabel || "Learn more…"}
                </PrismicNextLink>
              )}
            </div>
          </div>
        </div>
      </HeroStyled>
    );
};

export default Hero;

const HeroStyled = styled.section`
  background-color: #fff;
  color: #333;

  .es-bounded {
    margin: 0px;
    min-width: 0px;
    position: relative;
  }

  .es-fullpage-hero {
    font-family: system-ui, sans-serif;
    background-color: #fff;
    color: #333;
  }

  .es-fullpage-hero__image {
    max-width: 100%;
    height: auto;
    max-height: 100dvh;
    object-fit: cover;
    object-position: center center;
    align-self: center;
  }

  .es-fullpage-hero__image--left > div:first-child {
    order: 1;
  }

  .es-fullpage-hero__image--left > div:nth-child(2) {
    order: 2;
  }

  .es-fullpage-hero__image--right > div:first-child {
    order: 2;
  }

  .es-fullpage-hero__image--right > div:nth-child(2) {
    order: 1;
  }

  .es-fullpage-hero__content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .es-fullpage-hero__content-right {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding: 1.5rem;
  }

  @media (min-width: 1080px) {
    .es-fullpage-hero__content {
      flex-direction: row;
    }

    .es-fullpage-hero__content > div {
      width: 50%;
    }
  }

  .es-fullpage-hero__content__intro {
    display: grid;
    gap: 1rem;
  }

  .es-fullpage-hero__content__intro__eyebrow {
    color: #47c1af;
    font-size: 1.15rem;
    font-weight: 500;
    margin: 0;
  }

  .es-fullpage-hero__content__intro__headline {
    font-size: 1.625rem;
    font-weight: 700;
  }

  .es-fullpage-hero__content__intro__headline * {
    margin: 0;
  }

  @media (min-width: 640px) {
    .es-fullpage-hero__content__intro__headline {
      font-size: 2rem;
    }
  }

  @media (min-width: 1024px) {
    .es-fullpage-hero__content__intro__headline {
      font-size: 2.5rem;
    }
  }

  @media (min-width: 1200px) {
    .es-fullpage-hero__content__intro__headline {
      font-size: 2.75rem;
    }
  }

  .es-fullpage-hero__content__intro__description {
    font-size: 1.15rem;
    max-width: 38rem;
  }

  .es-fullpage-hero__content__intro__description > p {
    margin: 0;
  }

  @media (min-width: 1200px) {
    .es-fullpage-hero__content__intro__description {
      font-size: 1.4rem;
    }
  }

  .es-call-to-action__link {
    justify-self: flex-start;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    line-height: 1.3;
    padding: 1rem 2.625rem;
    transition: background-color 100ms linear;
    background-color: #16745f;
    color: #fff;
  }

  .es-call-to-action__link:hover {
    background-color: #0d5e4c;
  }
`;
