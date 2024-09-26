import media from "@/styles/media";
import styled from "@emotion/styled";
import React from "react";
import { isFilled } from "@prismicio/client";
import { PrismicNextLink, PrismicNextImage } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import { AlternateGridSliceCustomImageOnly } from "@/prismicio-types";

export const CustomImageOnly = ({
  slice,
}: {
  slice: AlternateGridSliceCustomImageOnly;
}): JSX.Element => {
  return (
    <CustomImageOnlyStyled>
      <PrismicNextImage field={slice.primary.image} className="custom_image" />
      <div className="custom_image_caption">
        <PrismicRichText field={slice.primary.caption} />
      </div>
    </CustomImageOnlyStyled>
  );
};

const CustomImageOnlyStyled = styled.div`
  color: #000;
  background-color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 1.75rem;
  ${media.laptop} {
    font-size: 1.5rem;
  }
  ${media.tablet} {
    font-size: 1.25rem;
  }
  ${media.largeMobile} {
    font-size: 1rem;
  }
  padding: 0.5em 10em;
  ${media.laptop} {
    padding: 0.5em 2em;
  }
  & .custom_image {
    border-radius: 10px;
  }
  & .custom_image_caption {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    margin-top: 0.5em;
  }
`;
