import Image from "next/image";
import { TestimonialsStyled } from "./ReferTestimonials.styles";
import Carousel from "react-multi-carousel";
import { ReferScrollState } from "../types";
import { Link } from "react-transition-progress/next";
import { Engagement } from "next/font/google";
const Testimonials = [
  {
    name: "Matthew Russell",
    title: "New york | Co-Founder of a SaaS Startup",
    //linkedIn: "https://www.linkedin.com/in/johndoe/",
    description: `TheMoonDevs saved us!  A project went off the rails, but they rescued us, fixed the issues, and calmed our client.  True problem solvers, not just coders.`,
    engagement_span: "1 year",
  },
  {
    name: "Eynear",
    title: "Dubai | Building a Defi exchange",
    linkedIn: "",
    //linkedIn: "https://www.linkedin.com/in/johndoe/",
    description: `The team we worked with made sure to not to miss a single deadline, while maintaining the excellent service quality. They even provided a 1-week cushion period to implement any last-minute minor modifications.`,
    engagement_span: "6 months",
  },
  {
    name: "Gabriel Vasconcellos",
    title: "Brazil | Building Gen-Ai Project",
    //linkedIn: "https://www.linkedin.com/in/johndoe/",
    description:
      "No matter which developer I tried to hire, they would simply not work with me because of the messed up code. ****** helped me refactor my repo and made me understand the importance of technical debt, saving me a lot of time & resources.",
    engagement_span: "1 year",
  },
  {
    name: "Sameer",
    title: "New york | Founder of a LLM-based AI Startup",
    //linkedIn: "https://www.linkedin.com/in/sameer-khan/",
    description: `TheMoonDevs developer has been instrumental in our project's growth. They have helped us build and scale our platform, and browser extension and have adapted to any required needs`,
    Engagement_span: "1 year",
  },
  {
    name: "Neil",
    title: "London | Building a Web3 Startup",
    //linkedIn: "https://www.linkedin.com/in/johndoe/",
    description:
      "***** is always quick to catch my ideas and vision, implementing them smoothly and offering me advice and suggestions that really made a difference. Despite his huge contributions, he never asked for any equities or crossed the terms we’ve agreed on at first.",
    engagement_span: "1 year",
  },
];

const Stats = [
  //   {
  //     number: "36%",
  //     caption: "Projects Completed",
  //     fulltext: "in a span of 6 months",
  //   },
  {
    number: "18",
    caption: "Global scale projects till date.",
    fulltext: "distributed in 44 countries.",
  },
  {
    number: "73",
    caption: "% of our clients refer us.",
    fulltext: "and have earned upto 10k USD.",
  },
  {
    number: "91",
    caption: "% of our clients have succeeded.",
    fulltext: "and return for more.",
  },
];

const responsive = {
  superLargeDesktop: {
    // the naming can be any, depends on you.
    breakpoint: { max: 4000, min: 3000 },
    items: 5,
  },
  desktop: {
    breakpoint: { max: 3000, min: 1024 },
    items: 3,
  },
  tablet: {
    breakpoint: { max: 1024, min: 464 },
    items: 2,
  },
  mobile: {
    breakpoint: { max: 464, min: 0 },
    items: 1,
  },
};
export const ReferTestimonials = () => {
  return (
    <TestimonialsStyled id={ReferScrollState.TESTIMONIALS}>
      <div className="title">
        <h1 className="heading">
          We are <span className="highlighted_text"> celebrated!</span>
        </h1>
        <p className="subheading">
          Discover how our clients are spreading the word.
        </p>
      </div>

      <Carousel
        autoPlay
        autoPlaySpeed={2000}
        infinite
        draggable={true}
        shouldResetAutoplay
        keyBoardControl
        arrows
        customTransition="transform 500ms ease"
        renderButtonGroupOutside={true}
        focusOnSelect
        responsive={responsive}
        swipeable={true}
        containerClass="carousel-container"
        itemClass="carousel-item-padding-40-px"
        className="testimonials"
      >
        {Testimonials.map((testimonial, index) => (
          <div className="testimonial_card" key={index}>
            <div className="testimonial_content">
              <div className="review_box">
                <span className="material-symbols-outlined ms-thick quote_icon_left">
                  format_quote
                </span>

                <p className="review">
                  {testimonial.description}
                  <span className="material-symbols-outlined ms-thick quote_icon_bg">
                    format_quote
                  </span>
                </p>
              </div>
            </div>
            <div className="testimonial_footer">
              <div style={{ paddingLeft: "1.5em" }}>
                <Link href={testimonial.linkedIn || ""}>
                  <h3 className="name">
                    <span>{testimonial.name}</span>
                    {testimonial.linkedIn && (
                      <Image
                        src="/icons/linkedin.svg"
                        alt="linkedin"
                        width={14}
                        height={14}
                        style={{ marginTop: "0.1em" }}
                      />
                    )}
                  </h3>
                </Link>
                <h6 className="position">{testimonial.title}</h6>
                <span className="engagement_span">
                  Worked with us for {testimonial.engagement_span}
                </span>
              </div>
              {/* <Link className="icon_link" href={testimonial.linkedIn}>
                <span className="material-symbols-outlined ms-thick icon">
                  open_in_new
                </span>
                LinkedIn
              </Link>
              <span className="engagement_span">
                Worked with us for {testimonial.engagement_span}
              </span> */}
              {/* <Link className="icon_link" href={testimonial.linkedIn}>
                <span className="material-symbols-outlined ms-thick icon">
                  open_in_new
                </span>
                LinkedIn
              </Link> */}
            </div>
          </div>
        ))}
      </Carousel>
    </TestimonialsStyled>
  );
};
