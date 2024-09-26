import media from "@/styles/media";
import styled from "@emotion/styled";

export const WorklifeFooterStyled = styled.div`
  color: white !important;
  background: ${(props) => props.theme.fixedColors.charcoal};
  position: relative;

  & .wl_footer_bg {
    object-fit: cover;
    object-position: top center;
    width: 100vw;
    height: 50vh;
    opacity: 0.05;
    ${media.tablet} {
      height: 50vh;
    }
  }

  & .wl_footer_section {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: end;
    background: linear-gradient(to top, black, #000000ba, transparent);

    ${media.largeMobile} {
      justify-content: center;
      padding: 1em;
    }
  }

  & .wl_footer_content {
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 1em 1em 2rem 1em;

    ${media.largeMobile} {
      justify-content: center;
      flex-direction: column;
      text-align: center;
      gap: 1em;
      padding: 1em;
    }
  }

  & .wl_footer_logo {
    width: fit-content;
    padding: 0.5em 0.5em 0.5em 0em;
    img {
      filter: invert(100%);
      width: 3em;
    }
    ${media.largeMobile} {
      margin: 0 auto;
    }
  }

  & .wl_footer_title_container {
    width: 100%;
    padding: 0 1em;
  }

  & .wl_footer_title {
    font-size: 1.4em;
    font-weight: bold;

    ${media.largeMobile} {
      font-size: 1.2em;
    }
  }

  & .wl_footer_subtitle {
    opacity: 0.5;
    font-size: 0.8em;
    font-weight: semibold;
  }

  & .wl_footer_links_container {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    gap: 0.4em;
    font-size: 0.8em;
    font-weight: semibold;

    ${media.largeMobile} {
      justify-content: center;
      flex-direction: row;
      text-align: center;
      gap: 1em;
    }
  }

  & .wl_links {
    position: relative;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
    opacity: 0.5;

    ${media.largeMobile} {
      padding: 0.5em 1em;
    }
  }

  & .wl_links::after {
    content: "";
    position: absolute;
    display: block;
    width: 2px;
    height: 1.5em;
    top: 0;
    right: 0;
    background-color: #fff;
    transform: scaleY(0);
    transition: transform 0.3s ease;

    ${media.largeMobile} {
      display: none;
    }
  }

  & .wl_links:hover::after {
    transform: scaleY(1);
  }

  & .active {
    opacity: 1;
  }

  & .wl_footer_bottom {
    display: flex;
    justify-content: space-between;
    padding: 1em 2em;
    border-top: 1px solid rgb(255, 255, 255, 0.5);
    font-size: 0.7em;

    ${media.largeMobile} {
      flex-direction: column;
      text-align: center;
      gap: 1em;
      padding: 1em;
    }

    span {
      font-family: "Montserrat", sans-serif;
    }
    span:nth-of-type(2) {
      font-family: "Montserrat Alternates", sans-serif;
    }
  }
`;
