import { useEffect, useState } from "react";
import { SectionWithGrids } from "./SectionWithGrids";
import {
  MediumBlogCardStyled,
  MediumBlogsSectionStyled,
} from "./MediumBlogsSection.styles";
import { useMediaQuery } from "@mui/material";
import theme from "@/styles/theme";
import Carousel from "react-multi-carousel";
import media from "@/styles/media";
import { Link } from "react-transition-progress/next";
import "react-multi-carousel/lib/styles.css";
import { prettySinceTime } from "@/helpers/prettyprint";
import { MyServerApi } from "../../../utils/service/MyServerApi";
type Blog = {
  creator: string;
  title: string;
  articleUrl: string;
  publishDate: string;
  categories: string[];
  image: string;
  content: string;
};

const responsive = {
  superLargeDesktop: {
    breakpoint: { max: 4000, min: 2000 },
    items: 4,
    slidesToSlide: 1,
  },
  desktop: {
    breakpoint: { max: 2000, min: 1600 },
    items: 3,
    slidesToSlide: 1,
  },
  tablet: {
    breakpoint: { max: 1500, min: 600 },
    items: 2,
    slidesToSlide: 1,
  },
  mobile: {
    breakpoint: { max: 600, min: 0 },
    items: 1,
    slidesToSlide: 1,
  },
};

export const MediumBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const isMobileView = useMediaQuery(media.largeMobile);
  useEffect(() => {
    MyServerApi.getData('articles/medium')
      .then((data) => {
        setBlogs(data.blogs);
      });
  }, []);
  return (
    <MediumBlogsSectionStyled>
      <div className="blogs_section">
        <h1 className="blogs_section_title">Check out our blogs</h1>
        <Carousel
          removeArrowOnDeviceType={["mobile"]}
          shouldResetAutoplay
          responsive={responsive}
          infinite={isMobileView}
          autoPlay={isMobileView}
          autoPlaySpeed={2000}
          showDots={false}
          draggable
          renderButtonGroupOutside={true}
          swipeable
          itemClass="carousel-item-padding"
        >
          {blogs.map((blog) => {
            return <BlogCard key={blog.title} blog={blog} />;
          })}
        </Carousel>
      </div>
    </MediumBlogsSectionStyled>
  );
};

const BlogCard = ({ blog }: { blog: Blog }) => {
  if (!blog) return <div>loading</div>;
  return (
    <MediumBlogCardStyled>
      <Link href={blog.articleUrl} draggable={false}>
        <div className="blog_container">
          <img draggable={false} src={blog.image} className="wl_details_blog" />
        </div>
        <div className="bottom_gradient"></div>
        <div className={`wl_blog_description`}>
          <h1 className="wl_blog_title">{blog.title}</h1>
          <p className="blog_description">{blog.content}</p>
          <span className="wl_blog_subtitle">
            {prettySinceTime(blog.publishDate)}
          </span>
        </div>
      </Link>
    </MediumBlogCardStyled>
  );
};

export const MediumBlogsWithGrids = SectionWithGrids(MediumBlogs, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
