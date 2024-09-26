import media from "@/styles/media";
import styled from "@emotion/styled";
import React from "react";
import { isFilled } from "@prismicio/client";
import { PrismicNextLink, PrismicNextImage } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import {
  AlternateGridSliceCustomLeftImage,
  AlternateGridSliceCustomRightImage,
} from "@/prismicio-types";
import Image from "next/image";

export const CustomImageHorizontal = ({
  slice,
}: {
  slice: AlternateGridSliceCustomLeftImage | AlternateGridSliceCustomRightImage;
}): JSX.Element => {
  return (
    <CustomImageHorizontalStyled>
      <div className="image_container">
        <div className="custom_image_container">
          <PrismicNextImage
            field={slice.primary.image}
            className="custom_image"
          />
        </div>
        <div className="custom_image_caption">
          <PrismicRichText field={slice.primary.caption} />
        </div>
      </div>
      <div className="text_container">
        {slice.items.map((item, index) => (
          <PrismicRichText key={index} field={item.text} />
        ))}
      </div>
    </CustomImageHorizontalStyled>
  );
};

const CustomImageHorizontalStyled = styled.div`
  color: #000;
  background-color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 1.75rem;
  display: flex;
  ${media.laptop} {
    font-size: 1.5rem;
  }
  ${media.tablet} {
    font-size: 1.25rem;
    flex-direction: column;
  }
  ${media.largeMobile} {
    font-size: 1rem;
    flex-direction: column;
  }
  padding: 0.5em 10em;
  ${media.laptop} {
    padding: 0.5em 2em;
  }
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1em;

  &:last-child {
    padding-bottom: 3rem;
  }

  & .image_right {
    flex-direction: row-reverse;
  }

  & .image_container {
    max-width: 50%;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    align-items: center;
    justify-content: center;

    ${media.tablet} {
      width: 100%;
      max-width: 100%;
    }

    ${media.largeMobile} {
      width: 100%;
      max-width: 100%;
    }
  }

  & .custom_image_container {
    position: relative;
    width: 400px;
    height: auto;
    border-radius: 10px;
    overflow: hidden;
    ${media.tablet} {
      width: 100%;
      max-width: 100%;
    }
    ${media.largeMobile} {
      width: 100%;
      max-width: 100%;
    }
  }

  & .custom_image {
    border-radius: 10px;
  }

  & .custom_image_caption {
    font-size: 0.8em;
    color: #666;
    text-align: center;
  }

  ul {
    list-style-type: disc;
    padding-left: 1em;
    font-size: 0.8em;
  }

  ol {
    list-style-type: decimal;
    padding-left: 1em;
    font-size: 0.8em;
  }

  a {
    color: #1746a2;
  }

  h1 {
    font-size: 2.2em;
    padding: 0.3em 0;
  }

  h2 {
    font-size: 2em;
    padding: 0.3em 0;
  }

  h3 {
    font-size: 1.7em;
    padding: 0.3em 0;
  }

  h4 {
    font-size: 1.5em;
    padding: 0.3em 0;
  }

  h5 {
    font-size: 1.3em;
    padding: 0.3em 0;
  }

  h6 {
    font-size: 1.1em;
    padding: 0.3em 0;
  }

  p {
    text-align: justify;
    font-size: 0.8em;
    padding: 0.3em 0;
  }
`;
