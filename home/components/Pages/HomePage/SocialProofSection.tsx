/* eslint-disable @next/next/no-img-element */
import React from "react";
import { SectionWithGrids } from "./SectionWithGrids";
import { SocialProofSectionStyled } from "./SocialProofSection.styles";
import theme from "@/styles/theme";

const Testimonials = [
  {
    client: "C******a",
    industry: "Social, Mobile App",
    service: "Product",
    title: "Quality deliverance at it’s best.",
    comment:
      "The team we worked with made sure to not to miss a single deadline, while maintaining the excellent service quality. They even provided a 1-week cushion period to implement any last-minute minor modifications.",
  },
  {
    client: "A*********a",
    industry: "B2C Saas, Social",
    service: "Full Stack",
    title: "Resolved my Technical Debt",
    comment:
      "No matter which developer I tried to hire, they would simply not work with me because of the messed up code. ****** helped me refactor my repo and made me understand the importance of technical debt, saving me a lot of time & resources.",
  },
  {
    client: "A****d B******h",
    industry: "Crypto, Generative AI",
    product: "Frontend Web App",
    title: "A true partner in my journey.",
    comment:
      "***** is always quick to catch my ideas and vision, implementing them smoothly and offering me advice  and suggestions that really made a difference. Despite his huge contributions, he never asked for any equities or crossed the terms we’ve agreed on at first.",
  },
  {
    client: "N***********i",
    industry: "Crypto, Gaming",
    product: "Frontend Web App",
    title: "Delivered more than what I asked for.",
    comment:
      "I’ve been working with ****** for a long time now, repetitively coming back to him, because of his honesty and dedication to the work. Dude’s a perfectionist, never compromises on his work.",
  },
  {
    client: "C******a",
    industry: "Social, Mobile App",
    service: "Product",
    title: "Quality deliverance at it’s best.",
    comment:
      "The team we worked with made sure to not to miss a single deadline, while maintaining the excellent service quality. They even provided a 1-week cushion period to implement any last-minute minor modifications.",
  },
];

export const SocialProofSection = () => {
  return (
    <SocialProofSectionStyled>
      <div className="info_box">
        <h1 className="title">
          We understand the challenges of <br /> bringing your vision to life.
        </h1>
        <p className="description">
          Hence we offer a risk-free solution, to truly help you experience how
          much &nbsp;
          <span className="underlined">a single excellent variable</span> can
          change the outcome of your project.
        </p>
        {/* <img src="/images/steps.jpg" alt="" className="bg_banner" /> */}
      </div>
      <div className="testimonials">
        <div className="testimonials_inner_container">
          {Testimonials.map((testimonial, index) => (
            <div
              key={testimonial.client + "-" + index}
              className="testimonial_box"
            >
              <div className="testimonial_info">
                <div className="testimonial_client">{testimonial.client}</div>
                <div className="testimonial_industry">
                  {testimonial.industry}
                </div>
              </div>
              <div className="testimonial_title">{testimonial.title}</div>
              <div className="testimonial_comment">
                &apos;{testimonial.comment}&apos;
              </div>
            </div>
          ))}
        </div>
      </div>
    </SocialProofSectionStyled>
  );
};

export const SocialProofSectionWithGrids = SectionWithGrids(
  SocialProofSection,
  {
    backgroundColor: theme.fixedColors.charcoal,
    color: theme.fixedColors.darkGrey,
  }
);
