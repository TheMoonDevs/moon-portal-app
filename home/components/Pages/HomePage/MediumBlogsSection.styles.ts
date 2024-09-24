import media from "@/styles/media";
import styled from "@emotion/styled";

export const MediumBlogsSectionStyled = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.black};
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;

  ${media.laptop} {
    padding: 2rem;
    display: block;
  }

  ${media.tablet} {
    padding: 1rem;
  }

  & .blogs_section {
    display: flex;
    flex-direction: column;
  }

  & .blogs_section_title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 3rem;
    text-transform: uppercase;
    letter-spacing: 1rem;
    text-align: center;
  }

  .carousel-item-padding {
    padding: 0 1rem;
  }

  & .blogs_carousel {
    display: flex;
    flex-direction: row;
  }
`;

export const MediumBlogCardStyled = styled.div`
  position: relative;
  flex-shrink: 1;
  overflow: hidden;
  border-radius: 1rem;
  cursor: pointer;
  margin: 0 1rem;
  width: 100%;
  height: 320px;

  & .blog_container {
    position: relative;
    height: 100%;
  }

  & .wl_details_blog {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 300ms ease-in-out;
  }

  & .wl_blog_description {
    position: absolute;
    bottom: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: between;
    align-items: flex-start;
    font-size: 1em;
    gap: 0.5em;
    padding: 0.8em 1.5em;
    color: white;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(1rem);

    & .wl_blog_title {
      width: 100%;
      flex-shrink: 1;
      overflow: hidden;
      white-space: nowrap;
      font-size: 1.3em;
      font-weight: 500;
      text-overflow: ellipsis;
      ${media.largeMobile} {
        font-size: 1.1em;
      }
    }

    & .wl_blog_subtitle {
      width: 100%;
      flex-shrink: 0;
      text-align: right;
      color: rgba(256, 256, 256, 0.8);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 0.8em;
    }
  }

  &:hover,
  &:focus {
    & .blog_bottom_box,
    & .bottom_gradient {
      /* opacity: 1; */ 
    }

    & .blog_bottom_box {
      transform: translateY(0%);
    }

    & .wl_details_blog {
      transform: scale(1.1);
    }
  }

  & .blog_bottom_box {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    width: 100%;
    opacity: 0;
    color: #fff;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    transition: all 300ms ease-in-out;
    transform: translateY(100%);
  }

  & .blog_details{
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  & .blog_title {
    font-weight: bold;
    font-size: 1.5em;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  & .blog_description {
    /* font-family: "DB Mono", monospace; */
    font-size: 0.85rem;
    opacity: 0.8;
    font-weight: 300;
    height: 70%;
    max-height: 70%;
    max-width: 90%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  & .bottom_gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    opacity: 0;
    transition: opacity 300ms ease-in-out;
    background: linear-gradient(to top, transparent, rgba(0, 0, 0, 1));
    backdrop-filter: blur(1rem);
  }
`;
