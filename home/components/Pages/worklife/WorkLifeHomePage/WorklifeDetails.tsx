'use client'
import React from "react";
import {
  WorklifeDetailsStyled,
  WorklifeImageCardStyled,
} from "./WorklifeDetails.styles";
import { useImageColors } from "@/utils/hooks/useImageColors";
import { useTextBg } from "@/utils/hooks/useTextBg";
import { PrismicNextImage } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import { BlogPageDocument } from "@/prismicio-types";
import Link from "next/link";
import { prettyPrintDateInMMMDD } from "@/helpers/prettyprint";
export const WorklifeDetails = ({ blogs }: { blogs: BlogPageDocument[] }) => {
  const _mappedPosts = {
    small: blogs
      .filter((blog) => blog.data.card_type === "Small Card")
      .map((blog) => {
        return {
          url: blog.url,
          type: blog.type,
          id: blog.id,
          last_publication_date: blog.last_publication_date,
          info: blog.data.slices[0]?.primary,
          // info: blog.data.slices.find((slice) => slice.slice_type === "hero")
          //   ?.primary,
        };
      }),
    large: blogs
      .filter((blog) => blog.data.card_type === "Large Card")
      .map((blog) => {
        return {
          url: blog.url,
          type: blog.type,
          id: blog.id,
          last_publication_date: blog.last_publication_date,
          info: blog.data.slices[0]?.primary,
          // info: blog.data.slices.find((slice) => slice.slice_type === "hero")
          //   ?.primary,
        };
      }),
  };
  return (
    <WorklifeDetailsStyled>
      <h3 className="wl_details_heading">The Why</h3>
      <div className="wl_details_paragraph">
        <p>
          An Average Adult spends 50-70% of their life working, and the majority
          of them, do it for the sake of making a living, having no passion or
          enthusiasm for the work itself. Corporate structure and bureaucracies
          have dulled down the spirit of work-life, making weekdays boring, and
          weekends what people long for.
          <br />
          <br />
          When individuals work because they want to and not because they are
          forced to, is when life becomes interesting. When weekdays feel just
          as much exciting as weekends, productivity would truly hit an
          exponential curve (not by increasing work-hours).
        </p>
      </div>
      <div className="wl_images_container">
        {_mappedPosts?.large.map((blog: any, index: number) => (
          <div key={index} className="large_container">
            <WorklifeImageCard blog={blog} />
          </div>
        ))}
      </div>
      <div className="wl_images_container">
        {_mappedPosts?.small.map((blog: any, index: number) => (
          <div key={index} className="small_container">
            <WorklifeImageCard blog={blog} />
          </div>
        ))}
      </div>
    </WorklifeDetailsStyled>
  );
};

const WorklifeImageCard = ({ blog }: { blog: any }) => {
  const { colors } = useImageColors({
    ImgSrc: blog?.info?.image?.url,
    settings: {
      cors: true,
      colors: 4,
      format: "hex",
    },
  });
  
  // We can also make the text color dynamic w.r.t image colors (darkest/lightest color or using bgColor and getting another bgColor for background)
  
  const { bgColor } = useTextBg({
    colors: colors,
    textSettings: {
      textColor: "#000000",
      textSize: "small",
      textLevel: "AA",
    },
  });

  return (
    <WorklifeImageCardStyled>
      <Link href={blog?.url}>
        <div className="image_container">
          <PrismicNextImage
            field={blog?.info?.image}
            className="wl_details_image"
          />
        </div>
        <div className="bottom_gradient"></div>
        <div className="image_bottom_box">
          <div>
            <div className="image_title">
              <PrismicRichText field={blog?.info?.title} />
            </div>
            <div className="image_description">
              <PrismicRichText field={blog?.info?.subtitle} />
            </div>
          </div>
          <div
            className="round_fab"
            style={{ backgroundColor: bgColor ? bgColor : "#ffffff" }}
          >
            <span className="material-symbols-outlined ms-thin">
              chevron_right
            </span>
          </div>
        </div>
        <div
          className={`wl_image_description`}
          style={{ backgroundColor: bgColor ? bgColor : "#ffffff" }}
        >
          <div className="wl_image_title">
            <PrismicRichText field={blog?.info?.caption} />
          </div>
          <span className="wl_image_subtitle">
            {prettyPrintDateInMMMDD(new Date(blog?.last_publication_date))}
          </span>
        </div>
      </Link>
    </WorklifeImageCardStyled>
  );
};
